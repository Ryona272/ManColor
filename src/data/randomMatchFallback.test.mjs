import assert from "node:assert/strict";
import test from "node:test";
import {
  getRandomMatchFallbackOpponent,
  RANDOM_MATCH_FALLBACK_DELAY_MS,
} from "./randomMatchFallback.mjs";

test("random match fallback begins after one minute", () => {
  assert.equal(RANDOM_MATCH_FALLBACK_DELAY_MS, 60_000);
});

test("fallback chooses only fully unlocked AI difficulties", () => {
  const beaten = {
    kooni: { first: true, second: true },
    yasha: { first: true, second: false },
  };
  assert.deepEqual(getRandomMatchFallbackOpponent(beaten, () => 0), {
    aiDifficulty: "kooni",
    aiLabel: "小鬼",
  });
  assert.deepEqual(getRandomMatchFallbackOpponent(beaten, () => 0.999), {
    aiDifficulty: "yasha",
    aiLabel: "夜叉",
  });
});

test("unlocked split branches and advanced AI tiers are included", () => {
  const beaten = {
    kooni: { first: true, second: true },
    yasha: { first: true, second: true },
    rasetsu: { first: true, second: true },
    kisin: { first: true, second: true },
    kyubi: { first: true, second: true },
    ashura: { first: true, second: true },
  };
  assert.deepEqual(getRandomMatchFallbackOpponent(beaten, () => 0.999), {
    aiDifficulty: "kugutsu",
    aiLabel: "傀儡",
  });
});

const pick = (beaten, opts) => {
  const seen = new Set();
  for (let i = 0; i < 100; i++) {
    seen.add(getRandomMatchFallbackOpponent(beaten, () => i / 100, opts).aiDifficulty);
  }
  return [...seen].sort();
};
const both = { first: true, second: true };

test("ashura is excluded until the fusion animation has been shown", () => {
  const beaten = { kooni: both, yasha: both, rasetsu: both, kisin: both, kyubi: both };
  assert.deepEqual(pick(beaten, { ashuraShown: false }), ["kisin", "kooni", "kyubi", "rasetsu", "yasha"]);
  assert.deepEqual(pick(beaten, { ashuraShown: true }), ["ashura", "kooni", "rasetsu", "yasha"]);
});

test("kisin and kyubi return after kugutsu is fully beaten", () => {
  const beaten = {
    kooni: both, yasha: both, rasetsu: both, kisin: both, kyubi: both, ashura: both, kugutsu: both,
  };
  assert.deepEqual(pick(beaten, { ashuraShown: true }), [
    "ashura", "kisin", "kooni", "kugutsu", "kyubi", "rasetsu", "yasha",
  ]);
});
