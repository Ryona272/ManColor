const assert = require("node:assert/strict");
const test = require("node:test");
const crypto = require("node:crypto");
const {
  createFirestoreStats,
  loadServiceAccount,
  applyIncrement,
  emptyCounts,
  incrementPaths,
} = require("./firestoreStats.js");

function fakeAccount() {
  const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 1024 });
  return {
    project_id: "demo-project",
    client_email: "svc@demo-project.iam.gserviceaccount.com",
    private_key: privateKey.export({ type: "pkcs8", format: "pem" }),
  };
}

function fakeFirestore(initialFields) {
  const calls = [];
  const fetchImpl = async (url, opts = {}) => {
    calls.push({ url, opts });
    if (url.includes("oauth2")) {
      return { ok: true, json: async () => ({ access_token: "tok", expires_in: 3600 }) };
    }
    if (url.endsWith(":commit")) return { ok: true, json: async () => ({}) };
    if (!initialFields) return { ok: false, status: 404 };
    return { ok: true, json: async () => ({ fields: initialFields }) };
  };
  return { calls, fetchImpl };
}

test("service account is read from JSON or base64 and disabled when missing", () => {
  const sa = fakeAccount();
  assert.equal(loadServiceAccount(""), null);
  assert.equal(loadServiceAccount(JSON.stringify(sa)).project_id, "demo-project");
  const b64 = Buffer.from(JSON.stringify(sa)).toString("base64");
  assert.equal(loadServiceAccount(b64).client_email, sa.client_email);
  assert.equal(createFirestoreStats({ serviceAccount: null }).enabled, false);
});

test("increments only safe field names", () => {
  const paths = incrementPaths({
    mode: "solo",
    difficulty: "kugutsu",
    result: "lose",
    lossReason: "score_gap",
  });
  assert.deepEqual(paths, [
    "total",
    "byDifficulty.kugutsu.total",
    "byDifficulty.kugutsu.losses",
    "byDifficulty.kugutsu.lossReasons.score_gap",
    "byMode.solo.total",
    "byMode.solo.losses",
  ]);
  assert.deepEqual(incrementPaths({ mode: "solo", difficulty: "a.b`c", result: "win" }), [
    "total",
    "byMode.solo.total",
    "byMode.solo.wins",
  ]);
  const counts = applyIncrement(emptyCounts(), { mode: "solo", difficulty: "kugutsu", result: "win" });
  assert.equal(counts.byDifficulty.kugutsu.wins, 1);
});

test("loads persisted counts and commits increments after load", async () => {
  const { calls, fetchImpl } = fakeFirestore({
    total: { integerValue: "12" },
    byDifficulty: {
      mapValue: {
        fields: {
          kugutsu: {
            mapValue: { fields: { total: { integerValue: "10" }, wins: { integerValue: "3" } } },
          },
        },
      },
    },
  });
  const store = createFirestoreStats({ serviceAccount: fakeAccount(), fetchImpl, logger: {} });
  store.record({ mode: "solo", difficulty: "kugutsu", result: "win" });
  assert.equal(calls.filter((c) => c.url.endsWith(":commit")).length, 0);
  const counts = await store.load();
  assert.equal(counts.total, 12);
  assert.equal(counts.byDifficulty.kugutsu.wins, 3);
  await new Promise((r) => setTimeout(r, 20));
  const commit = calls.find((c) => c.url.endsWith(":commit"));
  assert.ok(commit, "commit was sent after load");
  const body = JSON.parse(commit.opts.body);
  const transforms = body.writes[0].transform.fieldTransforms.map((t) => t.fieldPath);
  assert.ok(transforms.includes("byDifficulty.kugutsu.wins"));
  assert.match(body.writes[0].transform.document, /mancolorStats\/global$/);
});

test("missing document starts from zero", async () => {
  const { fetchImpl } = fakeFirestore(null);
  const store = createFirestoreStats({ serviceAccount: fakeAccount(), fetchImpl, logger: {} });
  const counts = await store.load();
  assert.equal(counts.total, 0);
});
