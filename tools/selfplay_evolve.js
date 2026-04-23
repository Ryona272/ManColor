/**
 * selfplay_evolve.js — 自己対戦型進化的強化学習
 *
 * ランダムな弱いAI集団が自己対戦（ラウンドロビン）を繰り返し、
 * 勝者の戦略が次世代に引き継がれることで鬼越えを目指す。
 *
 * 起動:
 *   npx.cmd esbuild tools/selfplay_evolve.js --bundle --platform=node \
 *     --outfile=dist-sim/selfplay_evolve.cjs --format=cjs && \
 *     node dist-sim/selfplay_evolve.cjs
 *
 * 出力:
 *   dist-sim/selfplay_best.json  — 各世代のベストパラメータ（上書き保存）
 *   コンソール                    — 世代ごとの勝率・進捗
 */

import { DEFAULT_PARAMS } from "../src/sim/SimParams.js";
import { runMany } from "../src/sim/SimRunner.js";
import { writeFileSync, mkdirSync } from "fs";

// ────────────────────────────────────────────────────────────────
// 設定
// ────────────────────────────────────────────────────────────────
const POP_SIZE = 20; // 個体数（偶数推奨）
const MAX_GENERATIONS = 300; // 安全上限（収束しない場合の打ち切り）
const N_GAMES_PAIR = 100; // 1ペアの対戦ゲーム数
const N_VERIFY = 800; // 鬼との比較検証数
const MUTATION_RATE = 0.25; // 突然変異確率（パラメータ1本あたり）
const MUTATION_SCALE = 0.25; // 突然変異幅（範囲 span の ±この割合）
const CROSSOVER_PROB = 0.5; // 交叉で各パラメータを親Aから引き継ぐ確率
const ELITE_COUNT = 4; // エリート（そのまま次世代に持ち越す個体数）
const VERIFY_EVERY = 3; // この世代ごとに鬼と比較ベンチマーク
const CONVERGE_THRESHOLD = 1.0; // 対鬼勝率の改善幅がこれ未満なら収束とみなす（%）
const CONVERGE_PATIENCE = 2; // 収束条件を連続でこの回数満たしたら停止

// パラメータごとの探索範囲 [min, max]
const RANGES = {
  earlyGamePeekThreshold: [1, 3],
  guruguruBaseEarly: [5, 80],
  guruguruChainMultEarly: [1, 25],
  guruguruBase: [10, 150],
  guruguruChainMult: [5, 70],
  guruguruFollowupMult: [0.2, 3.5],
  guruguruDisrupt: [0, 60],
  chirachira1st: [5, 70],
  chirachira2nd: [5, 60],
  chirachira1stMid: [5, 70],
  chirachira2ndMid: [5, 60],
  chirachira3rd: [0, 45],
  poipoiWithFortune: [0, 60],
  poipoiGeneral: [0, 25],
  poipoiEmpty: [0, 15],
  chirachiraThresholdHigh: [2, 50],
  chirachiraThresholdLow: [0, 25],
  poipoiStoneOwnFortune: [5, 70],
  poipoiStoneInferred: [0, 50],
  poipoiStoneKnownPos: [0, 20],
  zakuzakuBase: [0, 25],
  zakuzakuStoneMult: [1, 30],
  zakuzakuOwnFortune: [0, 25],
  zakuzakuInferred: [0, 25],
  zakuzakuKnownPos: [0, 25],
  earlyOwnFortune: [0, 60],
  earlyCancelMult: [1, 25],
  earlyCancelThreshold: [1, 5],
  earlyUnknownPenalty: [-50, 5],
  midInferred: [5, 80],
  midOwnFortune: [0, 60],
  midKnownPos: [0, 30],
  midKnownNeg: [-100, -5],
  midAvoidedColor: [-60, 0],
  midUnknownPenalty: [-40, 10],
  midCancelMult: [1, 25],
  midCancelThreshold: [1, 5],
  laneOwnFortune: [0, 25],
  laneInferred: [0, 25],
  laneKnownPos: [0, 20],
  laneKnownNegPenalty: [2, 40],
  laneAvoidedPenalty: [0, 20],
  sendKnownNegToOpp: [0, 40],
  forceChirachiraThreshold: [1, 3],
  forceChirachiraMinLane: [1, 6],
  kutakutaThresholdOffset: [-15, 0],
  defensiveTiebreakWindow: [2, 25],
  oppChirachiraCreate: [2, 30],
  ownChirachiraLost: [0, 20],
  playerThreatGrowthMult: [0.2, 3.0],
  lookaheadOwnMult: [0.05, 1.5],
  lookaheadPlayerMult: [0.05, 2.0],
  kutakutaLanePenalty: [0, 20],
  pitColorOwnFortune: [0, 10],
  pitColorInferred: [0, 10],
  pitColorKnownPos: [0, 8],
  pitColorKnownNeg: [0, 18],
  pitColorAvoided: [0, 12],
};

const PARAM_KEYS = Object.keys(RANGES);

// ────────────────────────────────────────────────────────────────
// 個体操作
// ────────────────────────────────────────────────────────────────

/** ランダムな弱い個体を生成（範囲内の一様乱数）*/
function randomIndividual() {
  const p = { ...DEFAULT_PARAMS };
  for (const key of PARAM_KEYS) {
    const [lo, hi] = RANGES[key];
    let v = lo + Math.random() * (hi - lo);
    p[key] = Number.isInteger(DEFAULT_PARAMS[key])
      ? Math.round(v)
      : parseFloat(v.toFixed(4));
  }
  return p;
}

/** 突然変異 */
function mutate(p) {
  const child = { ...p };
  for (const key of PARAM_KEYS) {
    if (Math.random() < MUTATION_RATE) {
      const [lo, hi] = RANGES[key];
      const span = hi - lo;
      let v = child[key] + span * MUTATION_SCALE * (Math.random() * 2 - 1);
      v = Math.max(lo, Math.min(hi, v));
      child[key] = Number.isInteger(DEFAULT_PARAMS[key])
        ? Math.round(v)
        : parseFloat(v.toFixed(4));
    }
  }
  return child;
}

/** 交叉（一様交叉）*/
function crossover(a, b) {
  const child = { ...DEFAULT_PARAMS };
  for (const key of PARAM_KEYS) {
    child[key] = Math.random() < CROSSOVER_PROB ? a[key] : b[key];
  }
  return child;
}

// ────────────────────────────────────────────────────────────────
// トーナメント（ラウンドロビン）
// ────────────────────────────────────────────────────────────────

/**
 * 全個体ペアで対戦し、勝ち点（勝利数）を集計
 * 引き分けは双方に 0.5点
 * 戻り値: { params, wins, totalGames }[] の降順ソート済み配列
 */
function roundRobin(population) {
  const wins = new Float64Array(population.length);
  const games = new Float64Array(population.length);
  let pairs = 0;

  for (let i = 0; i < population.length; i++) {
    for (let j = i + 1; j < population.length; j++) {
      // 先後手両方で対戦して合算（先後バイアスを消す）
      const ab = runMany(population[i], population[j], N_GAMES_PAIR);
      const ba = runMany(population[j], population[i], N_GAMES_PAIR);

      // ab: i = self, j = opp
      const iWinAB = (parseFloat(ab.selfWinRate) / 100) * N_GAMES_PAIR;
      const jWinAB = (parseFloat(ab.oppWinRate) / 100) * N_GAMES_PAIR;
      // ba: j = self, i = opp
      const jWinBA = (parseFloat(ba.selfWinRate) / 100) * N_GAMES_PAIR;
      const iWinBA = (parseFloat(ba.oppWinRate) / 100) * N_GAMES_PAIR;

      wins[i] += iWinAB + iWinBA;
      wins[j] += jWinAB + jWinBA;
      games[i] += N_GAMES_PAIR * 2;
      games[j] += N_GAMES_PAIR * 2;
      pairs++;
    }
  }

  return population
    .map((params, i) => ({ params, wins: wins[i], totalGames: games[i] }))
    .sort((a, b) => b.wins - a.wins);
}

// ────────────────────────────────────────────────────────────────
// 次世代生成
// ────────────────────────────────────────────────────────────────

function nextGeneration(ranked) {
  const next = [];

  // エリート: そのまま引き継ぐ
  for (let i = 0; i < ELITE_COUNT && i < ranked.length; i++) {
    next.push(ranked[i].params);
  }

  // 残りは上位半分を親としてランダムに交叉 + 突然変異
  const elites = ranked.slice(0, Math.ceil(POP_SIZE / 2));
  while (next.length < POP_SIZE) {
    const a = elites[Math.floor(Math.random() * elites.length)].params;
    const b = elites[Math.floor(Math.random() * elites.length)].params;
    const child = a === b ? mutate(a) : mutate(crossover(a, b));
    next.push(child);
  }

  return next;
}

// ────────────────────────────────────────────────────────────────
// ユーティリティ
// ────────────────────────────────────────────────────────────────

function saveCheckpoint(params, gen, vsOniRate) {
  mkdirSync("dist-sim", { recursive: true });
  const data = {
    generation: gen,
    vsOniWinRate: vsOniRate,
    params,
  };
  writeFileSync("dist-sim/selfplay_best.json", JSON.stringify(data, null, 2));
}

// ────────────────────────────────────────────────────────────────
// メインループ
// ────────────────────────────────────────────────────────────────

console.log(
  `自己対戦型進化学習 開始 (個体数:${POP_SIZE} 上限:${MAX_GENERATIONS}世代 収束:<${CONVERGE_THRESHOLD}% × ${CONVERGE_PATIENCE}回)`,
);

let population = Array.from({ length: POP_SIZE }, randomIndividual);

let bestEver = null;
let bestEverVsOni = -Infinity;
let lastVerifiedVsOni = null; // 直前の検証値
let convergeCount = 0; // 収束条件を満たした連続回数
let stopReason = "";

for (let gen = 1; gen <= MAX_GENERATIONS; gen++) {
  const ranked = roundRobin(population);

  // ─── 定期ベンチマーク: 鬼と比較 ───
  if (gen % VERIFY_EVERY === 0) {
    const best = ranked[0].params;
    const asSente = runMany(best, DEFAULT_PARAMS, N_VERIFY);
    const asGote = runMany(DEFAULT_PARAMS, best, N_VERIFY);
    const vsOniAvgNum =
      (parseFloat(asSente.selfWinRate) + parseFloat(asGote.oppWinRate)) / 2;
    const vsOniAvg = vsOniAvgNum.toFixed(1);
    const delta =
      lastVerifiedVsOni !== null ? vsOniAvgNum - lastVerifiedVsOni : Infinity;

    const deltaStr =
      lastVerifiedVsOni !== null
        ? `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}%`
        : "初回";
    console.log(
      `世代${gen}: 対鬼 ${vsOniAvg}% (${deltaStr})${vsOniAvgNum > 50 ? " ★鬼超え" : ""}`,
    );

    if (lastVerifiedVsOni !== null && Math.abs(delta) < CONVERGE_THRESHOLD) {
      convergeCount++;
    } else {
      convergeCount = 0;
    }
    lastVerifiedVsOni = vsOniAvgNum;

    if (vsOniAvgNum > bestEverVsOni) {
      bestEverVsOni = vsOniAvgNum;
      bestEver = best;
      saveCheckpoint(best, gen, vsOniAvg);
    }

    if (convergeCount >= CONVERGE_PATIENCE) {
      stopReason = `収束 (${CONVERGE_PATIENCE}回連続で改善幅 <${CONVERGE_THRESHOLD}%)`;
      break;
    }
  }

  population = nextGeneration(ranked);

  if (gen === MAX_GENERATIONS) {
    stopReason = `上限 ${MAX_GENERATIONS} 世代に到達`;
  }
}

// ────────────────────────────────────────────────────────────────
// 最終結果
// ────────────────────────────────────────────────────────────────

console.log(`\n=== 完了: ${stopReason || "不明"} ===`);
if (bestEver) {
  const finalSente = runMany(bestEver, DEFAULT_PARAMS, N_VERIFY);
  const finalGote = runMany(DEFAULT_PARAMS, bestEver, N_VERIFY);
  const finalVsOni = (
    (parseFloat(finalSente.selfWinRate) + parseFloat(finalGote.oppWinRate)) /
    2
  ).toFixed(1);
  console.log(
    `対鬼 先手:${finalSente.selfWinRate}% 後手:${finalGote.oppWinRate}% 平均:${finalVsOni}%`,
  );
  console.log("\nベストパラメータ差分 (DEFAULT_PARAMSから変化したもの):");
  const diffs = {};
  for (const key of PARAM_KEYS) {
    if (Math.abs(bestEver[key] - DEFAULT_PARAMS[key]) > 0.0001)
      diffs[key] = bestEver[key];
  }
  console.log(JSON.stringify(diffs, null, 2));
  console.log("\n全パラメータ: dist-sim/selfplay_best.json");
} else {
  console.log("鬼超えには至りませんでした。");
}
