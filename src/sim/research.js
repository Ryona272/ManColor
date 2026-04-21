/**
 * research.js
 * Node.js で直接実行するリサーチスクリプト
 * esbuild でバンドルして node で実行する:
 *   npx esbuild src/sim/research.js --bundle --platform=node --outfile=dist-sim/research.cjs --format=cjs ; node dist-sim/research.cjs
 */

import { DEFAULT_PARAMS, mergeParams } from "./SimParams.js";
import { runMany } from "./SimRunner.js";

// ─── 設定 ────────────────────────────────────────────────────────
const N_AB = 600; // A/B対戦の試合数
const N_GRID = 400; // グリッドサーチの試合数
const N_EVO = 200; // 進化的探索の試合数/個体
const EVO_GENS = 10; // 進化的探索の世代数
const EVO_POP = 20; // 進化的探索の個体数

// ─── ヘルパー ─────────────────────────────────────────────────────
function printSep(title) {
  console.log("\n" + "═".repeat(60));
  console.log("  " + title);
  console.log("═".repeat(60));
}

function printStats(label, stats) {
  console.log(`  ${label}`);
  console.log(
    `    self勝率: ${stats.selfWinRate}  opp勝率: ${stats.oppWinRate}  引分: ${((stats.draws / stats.n) * 100).toFixed(1)}%`,
  );
  console.log(
    `    avg点差(self-opp): ${stats.avgScoreDiff}  中央値: ${stats.medianScoreDiff}`,
  );
  console.log(
    `    avg self点: ${stats.avgSelfScore}  avg opp点: ${stats.avgOppScore}`,
  );
  console.log(
    `    avgターン: ${stats.avgTurns}  self ぐるぐる: ${stats.avgSelfGuru}  opp ぐるぐる: ${stats.avgOppGuru}`,
  );
}

function gridSearch(paramKey, values, baseParams, n) {
  const results = [];
  for (const v of values) {
    const params = mergeParams({ ...baseParams, [paramKey]: v });
    const s = runMany(params, DEFAULT_PARAMS, n);
    results.push({
      value: v,
      selfWinRate: s.selfWinRate,
      avgDiff: parseFloat(s.avgScoreDiff),
    });
  }
  results.sort((a, b) => b.avgDiff - a.avgDiff);
  return results;
}

function evolve(gens, popSize, n, mutRate, mutScale, seed) {
  let pop = Array.from({ length: popSize }, () =>
    mutate(seed, mutRate, mutScale),
  );
  let bestEver = { params: seed, score: -Infinity };

  for (let g = 0; g < gens; g++) {
    const scored = pop.map((params) => {
      const s = runMany(params, DEFAULT_PARAMS, n);
      return { params, score: parseFloat(s.avgScoreDiff) };
    });
    scored.sort((a, b) => b.score - a.score);
    if (scored[0].score > bestEver.score) bestEver = scored[0];
    const avg = scored.reduce((sum, e) => sum + e.score, 0) / scored.length;
    console.log(
      `  世代 ${g + 1}/${gens}: 最高=${scored[0].score.toFixed(2)} 平均=${avg.toFixed(2)}`,
    );
    const survivors = scored.slice(0, Math.floor(popSize / 2));
    pop = [
      ...survivors.map((s) => s.params),
      ...Array.from({ length: popSize - survivors.length }, () =>
        mutate(
          survivors[Math.floor(Math.random() * survivors.length)].params,
          mutRate,
          mutScale,
        ),
      ),
    ];
  }
  return bestEver;
}

function mutate(params, rate, scale) {
  const r = { ...params };
  for (const k of Object.keys(r)) {
    if (Math.random() < rate) {
      const d = r[k] * scale * (Math.random() * 2 - 1);
      r[k] = Number.isInteger(params[k]) ? Math.round(r[k] + d) : r[k] + d;
    }
  }
  return r;
}

// ─── STEP 1: ベースライン (DEFAULT vs DEFAULT) ───────────────────
printSep("STEP 1: ベースライン DEFAULT vs DEFAULT");
const baseline = runMany(DEFAULT_PARAMS, DEFAULT_PARAMS, N_AB);
printStats("DEFAULT(self) vs DEFAULT(opp)", baseline);

// ─── STEP 2: ぐるぐるHeavy vs DEFAULT ────────────────────────────
const guruguruHeavy = mergeParams({
  guruguruBase: 40,
  guruguruChainMult: 22,
  guruguruFollowupMult: 1.6,
  guruguruBaseEarly: 22,
  chirachira1st: 38,
  chirachira2nd: 30,
});
printSep("STEP 2: guruguruHeavy(self) vs DEFAULT(opp)");
const guruS = runMany(guruguruHeavy, DEFAULT_PARAMS, N_AB);
printStats("guruguruHeavy vs DEFAULT", guruS);

// ─── STEP 3: ぐるぐる主要パラメータのグリッドサーチ ──────────────
printSep("STEP 3: グリッドサーチ — guruguruBase");
const gridBase = gridSearch(
  "guruguruBase",
  [16, 24, 32, 40, 48, 56, 64],
  DEFAULT_PARAMS,
  N_GRID,
);
console.log("  guruguruBase グリッド結果（点差降順）:");
gridBase.forEach((r) =>
  console.log(
    `    ${r.value}: selfWin=${r.selfWinRate}  avgDiff=${r.avgDiff.toFixed(2)}`,
  ),
);

printSep("STEP 4: グリッドサーチ — guruguruChainMult");
const gridChain = gridSearch(
  "guruguruChainMult",
  [8, 12, 16, 20, 26, 32],
  DEFAULT_PARAMS,
  N_GRID,
);
console.log("  guruguruChainMult グリッド結果:");
gridChain.forEach((r) =>
  console.log(
    `    ${r.value}: selfWin=${r.selfWinRate}  avgDiff=${r.avgDiff.toFixed(2)}`,
  ),
);

printSep("STEP 5: グリッドサーチ — guruguruDisrupt");
const gridDisrupt = gridSearch(
  "guruguruDisrupt",
  [10, 18, 26, 34, 42, 50],
  DEFAULT_PARAMS,
  N_GRID,
);
console.log("  guruguruDisrupt グリッド結果:");
gridDisrupt.forEach((r) =>
  console.log(
    `    ${r.value}: selfWin=${r.selfWinRate}  avgDiff=${r.avgDiff.toFixed(2)}`,
  ),
);

// ─── STEP 6: グリッドサーチ結果で最良値を組み合わせたプリセット ──
const bestBase = gridBase[0].value;
const bestChain = gridChain[0].value;
const bestDisrupt = gridDisrupt[0].value;
const optimizedV1 = mergeParams({
  guruguruBase: bestBase,
  guruguruChainMult: bestChain,
  guruguruDisrupt: bestDisrupt,
});

printSep(
  `STEP 6: グリッド最良組み合わせ(base=${bestBase},chain=${bestChain},disrupt=${bestDisrupt}) vs DEFAULT`,
);
const optV1S = runMany(optimizedV1, DEFAULT_PARAMS, N_AB);
printStats("optimizedV1 vs DEFAULT", optV1S);

// ─── STEP 7: 進化的探索（guruguruHeavyシード）────────────────────
printSep(
  "STEP 7: 進化的探索 (guruguruHeavy シード, " +
    EVO_GENS +
    "世代×" +
    EVO_POP +
    "個体×" +
    N_EVO +
    "試合)",
);
const best = evolve(EVO_GENS, EVO_POP, N_EVO, 0.3, 0.25, guruguruHeavy);
console.log(`\n  ★ 進化最終ベスト (avg点差: ${best.score.toFixed(2)}):`);
console.log(JSON.stringify(best.params, null, 2));

// ─── STEP 8: 進化ベストをDEFAULTと最終対戦 ──────────────────────
printSep("STEP 8: 進化ベスト vs DEFAULT (最終検証)");
const finalS = runMany(best.params, DEFAULT_PARAMS, N_AB);
printStats("進化ベスト(self) vs DEFAULT(opp)", finalS);

// ─── STEP 9: 進化ベスト先後対称チェック ─────────────────────────
printSep("STEP 9: 先後対称チェック (DEFAULT(self) vs 進化ベスト(opp))");
const symS = runMany(DEFAULT_PARAMS, best.params, N_AB);
printStats("DEFAULT(self) vs 進化ベスト(opp)", symS);

// ─── 最終サマリー ─────────────────────────────────────────────────
printSep("最終サマリー");
console.log("  DEFAULT基準点差:        " + baseline.avgScoreDiff);
console.log("  guruguruHeavy点差:      " + guruS.avgScoreDiff);
console.log("  グリッド最良組み合わせ: " + optV1S.avgScoreDiff);
console.log("  進化ベスト(先手):       " + finalS.avgScoreDiff);
console.log(
  "  進化ベスト(後手):       " +
    (parseFloat(symS.avgScoreDiff) * -1).toFixed(2) +
    " (DEFAULTとして換算)",
);
console.log("\n  推奨パラメータ（GameScene _aiPickPitOniV2 に適用可能）:");
console.log(JSON.stringify(best.params, null, 2));
