// 対戦統計の集計値を Firestore に永続化する（Render の休止・再起動で消えないようにする）。
// 認証情報は環境変数 FIREBASE_SERVICE_ACCOUNT_JSON（JSON そのもの or Base64）からのみ読む。
// 未設定なら永続化せず、従来どおりメモリ内だけで集計する。
const crypto = require("crypto");

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/datastore";
const FIELD_KEY = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;

function loadServiceAccount(raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  if (!raw || !raw.trim()) return null;
  try {
    const text = raw.trim().startsWith("{")
      ? raw
      : Buffer.from(raw.trim(), "base64").toString("utf8");
    const sa = JSON.parse(text);
    if (!sa.client_email || !sa.private_key || !sa.project_id) return null;
    sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    return sa;
  } catch (_e) {
    return null;
  }
}

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function isFieldKey(key) {
  return typeof key === "string" && FIELD_KEY.test(key);
}

// Firestore の Value 形式 → 素の JS 値
function fromFirestoreValue(value) {
  if (!value || typeof value !== "object") return null;
  if ("integerValue" in value) return Number(value.integerValue) || 0;
  if ("doubleValue" in value) return Number(value.doubleValue) || 0;
  if ("mapValue" in value) {
    const out = {};
    const fields = value.mapValue?.fields ?? {};
    for (const [k, v] of Object.entries(fields)) out[k] = fromFirestoreValue(v);
    return out;
  }
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  return null;
}

function emptyCounts() {
  return { total: 0, byDifficulty: {}, byMode: {} };
}

function normalizeCounts(raw) {
  const counts = emptyCounts();
  if (!raw || typeof raw !== "object") return counts;
  counts.total = Number(raw.total) || 0;
  const bucket = (src, withReasons) => {
    const b = {
      total: Number(src?.total) || 0,
      wins: Number(src?.wins) || 0,
      losses: Number(src?.losses) || 0,
      draws: Number(src?.draws) || 0,
    };
    if (withReasons) {
      b.lossReasons = {};
      for (const [k, v] of Object.entries(src?.lossReasons ?? {})) {
        if (isFieldKey(k)) b.lossReasons[k] = Number(v) || 0;
      }
    }
    return b;
  };
  for (const [k, v] of Object.entries(raw.byDifficulty ?? {})) {
    if (isFieldKey(k)) counts.byDifficulty[k] = bucket(v, true);
  }
  for (const [k, v] of Object.entries(raw.byMode ?? {})) {
    if (isFieldKey(k)) counts.byMode[k] = bucket(v, false);
  }
  return counts;
}

// 1件の対戦記録で増やすフィールドパス一覧（Firestore の increment 用）
function incrementPaths(record) {
  const resultKey =
    record.result === "win" ? "wins" : record.result === "lose" ? "losses" : "draws";
  const paths = ["total"];
  if (isFieldKey(record.difficulty)) {
    const d = `byDifficulty.${record.difficulty}`;
    paths.push(`${d}.total`, `${d}.${resultKey}`);
    if (record.result === "lose" && isFieldKey(record.lossReason)) {
      paths.push(`${d}.lossReasons.${record.lossReason}`);
    }
  }
  if (isFieldKey(record.mode)) {
    const m = `byMode.${record.mode}`;
    paths.push(`${m}.total`, `${m}.${resultKey}`);
  }
  return paths;
}

function applyIncrement(counts, record) {
  for (const path of incrementPaths(record)) {
    const keys = path.split(".");
    let node = counts;
    for (let i = 0; i < keys.length - 1; i++) {
      node[keys[i]] = node[keys[i]] ?? {};
      node = node[keys[i]];
    }
    const last = keys[keys.length - 1];
    node[last] = (Number(node[last]) || 0) + 1;
  }
  return counts;
}

function createFirestoreStats({
  serviceAccount = loadServiceAccount(),
  fetchImpl = globalThis.fetch,
  collection = "mancolorStats",
  docId = "global",
  retryMs = 30000,
  logger = console,
} = {}) {
  const enabled = !!serviceAccount && typeof fetchImpl === "function";
  const docName = enabled
    ? `projects/${serviceAccount.project_id}/databases/(default)/documents/${collection}/${docId}`
    : null;
  const apiBase = "https://firestore.googleapis.com/v1";
  let token = null;
  let tokenExp = 0;
  let loaded = !enabled;
  let loading = null;
  const queue = [];
  let flushing = false;

  async function getToken() {
    const now = Math.floor(Date.now() / 1000);
    if (token && now < tokenExp - 60) return token;
    const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claim = base64url(
      JSON.stringify({
        iss: serviceAccount.client_email,
        scope: SCOPE,
        aud: TOKEN_URL,
        iat: now,
        exp: now + 3600,
      }),
    );
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(`${header}.${claim}`);
    const signature = base64url(signer.sign(serviceAccount.private_key));
    const res = await fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${header}.${claim}.${signature}`,
      }).toString(),
    });
    if (!res.ok) throw new Error(`token ${res.status}`);
    const json = await res.json();
    token = json.access_token;
    tokenExp = now + (Number(json.expires_in) || 3600);
    return token;
  }

  // 起動時に一度だけ読み込む。読み込み完了までは書き込みを保留し、二重加算を防ぐ。
  function load() {
    if (!enabled) return Promise.resolve(emptyCounts());
    if (loading) return loading;
    loading = (async () => {
      for (;;) {
        try {
          const t = await getToken();
          const res = await fetchImpl(`${apiBase}/${docName}`, {
            headers: { Authorization: `Bearer ${t}` },
          });
          let counts = emptyCounts();
          if (res.ok) {
            const json = await res.json();
            counts = normalizeCounts(
              fromFirestoreValue({ mapValue: { fields: json.fields ?? {} } }),
            );
          } else if (res.status !== 404) {
            throw new Error(`load ${res.status}`);
          }
          loaded = true;
          flush();
          return counts;
        } catch (error) {
          logger.warn?.(`[firestoreStats] 読み込み失敗。${retryMs}ms後に再試行: ${error.message}`);
          await new Promise((r) => setTimeout(r, retryMs));
        }
      }
    })();
    return loading;
  }

  async function flush() {
    if (!enabled || !loaded || flushing || queue.length === 0) return;
    flushing = true;
    try {
      while (queue.length > 0) {
        const batch = queue.splice(0, 50);
        const sums = new Map();
        for (const record of batch) {
          for (const p of incrementPaths(record)) sums.set(p, (sums.get(p) ?? 0) + 1);
        }
        try {
          const t = await getToken();
          const res = await fetchImpl(`${apiBase}/projects/${serviceAccount.project_id}/databases/(default)/documents:commit`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${t}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              writes: [
                {
                  transform: {
                    document: docName,
                    fieldTransforms: [...sums].map(([fieldPath, n]) => ({
                      fieldPath,
                      increment: { integerValue: String(n) },
                    })),
                  },
                },
              ],
            }),
          });
          if (!res.ok) throw new Error(`commit ${res.status}`);
        } catch (error) {
          queue.unshift(...batch);
          logger.warn?.(`[firestoreStats] 保存失敗。${retryMs}ms後に再試行: ${error.message}`);
          setTimeout(() => flush(), retryMs);
          return;
        }
      }
    } finally {
      flushing = false;
    }
  }

  function record(rec) {
    if (!enabled) return;
    if (queue.length >= 5000) queue.shift();
    queue.push(rec);
    flush();
  }

  return { enabled, load, record, flush, _queue: queue };
}

module.exports = {
  createFirestoreStats,
  loadServiceAccount,
  emptyCounts,
  normalizeCounts,
  applyIncrement,
  incrementPaths,
  fromFirestoreValue,
};
