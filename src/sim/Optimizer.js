/**
 * Optimizer.js
 * A/B 対戦・グリッドサーチ・進化的探索を行うモジュール
 */

import { DEFAULT_PARAMS, mergeParams } from "./SimParams.js";
import { runMany } from "./SimRunner.js";

/**
 * A/B 対戦: 2つのパラメータセットを N 試合対戦させて比較
 * @param {object} paramsA
 * @param {object} paramsB
 * @param {number} n 試合数
 * @param {string} labelA
 * @param {string} labelB
 */
export function abTest(paramsA, paramsB, n = 500, labelA = "A", labelB = "B") {
  console.log(`\n▶ A/B テスト: ${labelA} vs ${labelB} (${n} 試合)`);
  const stats = runMany(paramsA, paramsB, n);
  console.table({
    [labelA + " (self)  勝率"]: stats.selfWinRate,
    [labelB + " (opp)  勝率"]: stats.oppWinRate,
    引き分け率: ((stats.draws / n) * 100).toFixed(1) + "%",
    [labelA + " 平均点"]: stats.avgSelfScore,
    [labelB + " 平均点"]: stats.avgOppScore,
    "平均点差 (A-B)": stats.avgScoreDiff,
    中央値点差: stats.medianScoreDiff,
    平均ターン: stats.avgTurns,
    [labelA + " ぐるぐる/試合"]: stats.avgSelfGuru,
    [labelB + " ぐるぐる/試合"]: stats.avgOppGuru,
    [labelA + " ちらちら/試合"]: stats.avgSelfPeeks,
    [labelB + " ちらちら/試合"]: stats.avgOppPeeks,
  });
  return stats;
}

/**
 * グリッドサーチ: 1つのパラメータを段階的に変化させて最強値を探す
 * @param {string} paramKey   変化させるパラメータキー
 * @param {number[]} values   試す値の配列
 * @param {object} baseParams ベースとなるパラメータ（他は固定）
 * @param {number} n          各セットの試合数
 */
export function gridSearch(
  paramKey,
  values,
  baseParams = DEFAULT_PARAMS,
  n = 300,
) {
  console.log(
    `\n▶ グリッドサーチ: ${paramKey} を ${values.join(", ")} で試行 (各 ${n} 試合)`,
  );
  const results = [];

  for (const v of values) {
    const params = mergeParams({ ...baseParams, [paramKey]: v });
    const stats = runMany(params, baseParams, n);
    results.push({
      パラメータ値: v,
      A勝率: stats.selfWinRate,
      A平均点: stats.avgSelfScore,
      "平均点差(A-B)": stats.avgScoreDiff,
      _key: v,
      _diff: parseFloat(stats.avgScoreDiff),
    });
  }

  const display = results.map(({ _key, _diff, ...rest }) => rest);
  console.table(display);
  const best = results.reduce((a, b) => (a._diff > b._diff ? a : b));
  console.log(
    `★ 最強値: ${paramKey} = ${best._key} (avg差 ${best._diff.toFixed(2)})`,
  );
  return results;
}

/**
 * 複数パラメータの同時グリッドサーチ（組み合わせ爆発に注意）
 * @param {Object<string, number[]>} paramGrid { key: [val1, val2, ...] }
 * @param {object} baseParams
 * @param {number} n
 */
export function multiGridSearch(
  paramGrid,
  baseParams = DEFAULT_PARAMS,
  n = 200,
) {
  const keys = Object.keys(paramGrid);
  const valueSets = keys.map((k) => paramGrid[k]);
  const combinations = _cartesian(valueSets);

  console.log(
    `\n▶ 多次元グリッドサーチ: ${combinations.length} 組み合わせ × ${n} 試合`,
  );
  const results = [];

  for (const combo of combinations) {
    const overrides = {};
    keys.forEach((k, i) => (overrides[k] = combo[i]));
    const params = mergeParams({ ...baseParams, ...overrides });
    const stats = runMany(params, baseParams, n);
    results.push({
      ...overrides,
      A勝率: stats.selfWinRate,
      "平均点差(A-B)": parseFloat(stats.avgScoreDiff),
      _diff: parseFloat(stats.avgScoreDiff),
    });
  }

  results.sort((a, b) => b._diff - a._diff);
  const display = results.slice(0, 20).map(({ _diff, ...rest }) => rest);
  console.table(display); // 上位20件
  const best = results[0];
  const { _diff: _d, ...bestClean } = best;
  console.log("★ 最強パラメータセット:", bestClean);
  return results;
}

/**
 * 進化的アルゴリズム（シンプル版）
 * 世代ごとに上位50%を保持してランダム突然変異
 * @param {number} generations 世代数
 * @param {number} populationSize 1世代の個体数
 * @param {number} n 各個体の評価試合数
 * @param {number} mutationRate 突然変異率（各パラメータが変化する確率）
 * @param {number} mutationScale 突然変異の幅（現在値 × ±この値）
 */
export function evolve(
  generations = 10,
  populationSize = 20,
  n = 200,
  mutationRate = 0.3,
  mutationScale = 0.3,
  seedParams = DEFAULT_PARAMS,
) {
  console.log(
    `\n▶ 進化的探索: ${generations}世代 × ${populationSize}個体 × ${n}試合`,
  );

  // 初期集団（seedの変異）
  let population = Array.from({ length: populationSize }, () =>
    _mutate(seedParams, mutationRate, mutationScale),
  );

  let bestEver = { params: seedParams, score: -Infinity };

  for (let gen = 0; gen < generations; gen++) {
    // 各個体をデフォルトと対戦させて評価
    const scored = population.map((params) => {
      const stats = runMany(params, DEFAULT_PARAMS, n);
      return { params, score: parseFloat(stats.avgScoreDiff) };
    });

    scored.sort((a, b) => b.score - a.score);

    if (scored[0].score > bestEver.score) {
      bestEver = scored[0];
    }

    console.log(
      `  世代 ${gen + 1}: 最高 ${scored[0].score.toFixed(2)} / 平均 ${(
        scored.reduce((s, e) => s + e.score, 0) / scored.length
      ).toFixed(2)}`,
    );

    // 上位50%を次世代の親に
    const survivors = scored.slice(0, Math.floor(populationSize / 2));
    const nextGen = survivors.map((s) => s.params); // エリート保持
    while (nextGen.length < populationSize) {
      const parent =
        survivors[Math.floor(Math.random() * survivors.length)].params;
      nextGen.push(_mutate(parent, mutationRate, mutationScale));
    }
    population = nextGen;
  }

  console.log(
    "\n★ 最終ベストパラメータ (avg得点差:",
    bestEver.score.toFixed(2),
    "):",
  );
  console.log(JSON.stringify(bestEver.params, null, 2));
  return bestEver;
}

// ─── 内部ヘルパー ──────────────────────────────────────────────

function _mutate(params, rate, scale) {
  const result = { ...params };
  for (const key of Object.keys(result)) {
    if (Math.random() < rate) {
      const delta = result[key] * scale * (Math.random() * 2 - 1);
      result[key] = result[key] + delta;
      // 整数値パラメータは丸める
      if (Number.isInteger(params[key])) {
        result[key] = Math.round(result[key]);
      }
    }
  }
  return result;
}

function _cartesian(arrays) {
  return arrays.reduce(
    (acc, arr) => acc.flatMap((combo) => arr.map((val) => [...combo, val])),
    [[]],
  );
}
