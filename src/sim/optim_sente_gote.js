/**
 * optim_sente_gote.js
 * 座標降下法で先手/後手最強パラメータを探索
 *
 * Phase1: senteStrategy を固定goteStrategy に対して最適化
 * Phase2: goteStrategy を 最適化済みsenteStrategy に対して最適化
 * Phase3: 交互繰り返し（収束まで）
 *
 * npx.cmd esbuild src/sim/optim_sente_gote.js --bundle --platform=node --outfile=dist-sim/optim_sente_gote.cjs --format=cjs && node dist-sim/optim_sente_gote.cjs
 */
import { DEFAULT_PARAMS, PRESETS, mergeParams } from "./SimParams.js";
import { runMany } from "./SimRunner.js";

// ─── 設定 ───
const N_EVAL = 200; // 1回の評価あたり試合数（速度優先）
const N_VERIFY = 1000; // 最終検証試合数
const MAX_SWEEPS = 6; // フェーズごとの最大スイープ数
const MAX_EXTEND = 6; // 1方向の最大延長ステップ
const ROUNDS = 2; // 交互最適化ラウンド数

// ─── 全パラメータとステップ幅（1ずつずらし）───
const STEPS = {
  guruguruBaseEarly: 1,
  guruguruChainMultEarly: 1,
  guruguruBase: 1,
  guruguruChainMult: 1,
  guruguruFollowupMult: 0.1,
  guruguruDisrupt: 1,
  chirachira1st: 1,
  chirachira2nd: 1,
  chirachira1stMid: 1,
  chirachira2ndMid: 1,
  chirachira3rd: 1,
  poipoiWithFortune: 1,
  poipoiGeneral: 1,
  poipoiEmpty: 1,
  chirachiraThresholdHigh: 1,
  chirachiraThresholdLow: 1,
  poipoiStoneOwnFortune: 1,
  poipoiStoneInferred: 1,
  poipoiStoneKnownPos: 1,
  zakuzakuBase: 1,
  zakuzakuStoneMult: 1,
  zakuzakuOwnFortune: 1,
  zakuzakuInferred: 1,
  zakuzakuKnownPos: 1,
  earlyOwnFortune: 1,
  earlyCancelMult: 1,
  earlyCancelThreshold: 1,
  earlyUnknownPenalty: 1,
  midInferred: 1,
  midOwnFortune: 1,
  midKnownPos: 1,
  midKnownNeg: 1,
  midAvoidedColor: 1,
  midUnknownPenalty: 1,
  midCancelMult: 1,
  midCancelThreshold: 1,
  laneOwnFortune: 1,
  laneInferred: 1,
  laneKnownPos: 1,
  laneKnownNegPenalty: 1,
  sendKnownNegToOpp: 1,
  forceChirachiraThreshold: 1,
  kutakutaThresholdOffset: 1,
};
const PARAM_KEYS = Object.keys(STEPS);

// ─── ユーティリティ ───
const fix3 = (v) => parseFloat(v.toFixed(3));
const selfRate = (s) => parseFloat(s.selfWinRate);
const oppRate = (s) => parseFloat(s.oppWinRate);

// evalFn: params → 勝率(%) を返す関数
// self側最適化: evalFn = (p) => selfRate(runMany(p, opp, N))
// opp側最適化:  evalFn = (p) => oppRate(runMany(sente, p, N))

function sep(title) {
  const line = "=".repeat(62);
  console.log(`\n${line}\n  ${title}\n${line}`);
}

// ─── 1パラメータのライン探索 ───
function lineSearch(key, current, curScore, evalFn) {
  const step = STEPS[key];
  const cur = current[key];

  const scorePlus = evalFn({ ...current, [key]: fix3(cur + step) });
  const scoreMinus = evalFn({ ...current, [key]: fix3(cur - step) });

  let best = cur,
    bestScore = curScore;
  if (scorePlus > bestScore) {
    best = fix3(cur + step);
    bestScore = scorePlus;
  }
  if (scoreMinus > bestScore) {
    best = fix3(cur - step);
    bestScore = scoreMinus;
  }

  // 改善した方向にさらに延長
  if (best !== cur) {
    const dir = best > cur ? step : -step;
    for (let ex = 0; ex < MAX_EXTEND; ex++) {
      const next = fix3(best + dir);
      const score = evalFn({ ...current, [key]: next });
      if (score > bestScore) {
        bestScore = score;
        best = next;
      } else {
        break;
      }
    }
    const delta = (bestScore - curScore).toFixed(1);
    console.log(
      `    [${key}] ${cur} → ${best}  (${delta >= 0 ? "+" : ""}${delta}%  現在:${bestScore.toFixed(1)}%)`,
    );
  }

  return { value: best, score: bestScore };
}

// ─── 1スイープ: 全パラメータを順番に最適化 ───
function sweep(params, evalFn, sweepLabel) {
  console.log(`\n  -- ${sweepLabel} --`);
  let current = { ...params };
  let curScore = evalFn(current);
  console.log(`  開始勝率: ${curScore.toFixed(1)}%`);

  let improved = 0;
  for (const key of PARAM_KEYS) {
    const result = lineSearch(key, current, curScore, evalFn);
    if (result.value !== current[key]) {
      current = { ...current, [key]: result.value };
      curScore = result.score;
      improved++;
    }
  }

  console.log(`  完了: ${improved}個改善 → 勝率 ${curScore.toFixed(1)}%`);
  return { params: current, improved, score: curScore };
}

// ─── フェーズ最適化（複数スイープ）───
function optimizePhase(startParams, evalFn, phaseLabel) {
  sep(phaseLabel);
  let params = { ...startParams };
  let lastScore = evalFn(params);
  console.log(`  初期勝率: ${lastScore.toFixed(1)}%`);

  for (let i = 1; i <= MAX_SWEEPS; i++) {
    const result = sweep(params, evalFn, `Sweep ${i}`);
    params = result.params;

    if (result.improved === 0) {
      console.log("  → 改善なし: 収束");
      break;
    }
    lastScore = result.score;
  }

  console.log(`  最終勝率: ${lastScore.toFixed(1)}%`);
  return params;
}

// ─── 差分出力 ───
function printDiff(label, optimized, initial) {
  console.log(`\n【${label}】`);
  const entries = PARAM_KEYS.filter(
    (k) => optimized[k] !== undefined && optimized[k] !== initial[k],
  ).map((k) => `    ${k}: ${optimized[k]},  // (was ${initial[k]})`);
  if (entries.length === 0) {
    console.log("  (変更なし)");
    return;
  }
  console.log("  mergeParams({");
  entries.forEach((e) => console.log(e));
  console.log("  }),");
}

// ─── メイン ───
sep("先手/後手 座標降下法最適化  N_EVAL=" + N_EVAL);

let sente = { ...PRESETS.senteStrategy };
let gote = { ...PRESETS.goteStrategy };

const initSente = { ...sente };
const initGote = { ...gote };

for (let round = 1; round <= ROUNDS; round++) {
  sep(`Round ${round} / ${ROUNDS}`);

  // Phase A: sente を固定 gote に対して最適化（self勝率を最大化）
  sente = optimizePhase(
    sente,
    (p) => selfRate(runMany(p, gote, N_EVAL)),
    `Round${round} Phase A: senteStrategy 最適化  (対 現在のgoteStrategy)`,
  );

  // Phase B: gote を最適化済み sente に対して最適化（opp勝率を最大化）
  gote = optimizePhase(
    gote,
    (p) => oppRate(runMany(sente, p, N_EVAL)),
    `Round${round} Phase B: goteStrategy 最適化  (対 最適化済みsenteStrategy)`,
  );
}

// ─── 最終検証 ───
sep("最終検証 " + N_VERIFY + "試合");
const finalSG = runMany(sente, gote, N_VERIFY);
console.log(`  senteStrategy(先手=self) vs goteStrategy(後手=opp)`);
console.log(
  `  self win: ${finalSG.selfWinRate}  opp win: ${finalSG.oppWinRate}`,
);
console.log(
  `  avgDiff: ${finalSG.avgScoreDiff}  med: ${finalSG.medianScoreDiff}`,
);
console.log(`  peeks self:${finalSG.avgSelfPeeks} opp:${finalSG.avgOppPeeks}`);
console.log(`  guru  self:${finalSG.avgSelfGuru}  opp:${finalSG.avgOppGuru}`);

console.log(`\n  vs DEFAULT(先手) 比較:`);
const finalDef = runMany(DEFAULT_PARAMS, DEFAULT_PARAMS, N_VERIFY);
console.log(
  `  DEFAULT vs DEFAULT: self ${finalDef.selfWinRate}  opp ${finalDef.oppWinRate}`,
);

// ─── 変更点サマリ ───
printDiff("最適化済み senteStrategy (変更点のみ)", sente, initSente);
printDiff("最適化済み goteStrategy (変更点のみ)", gote, initGote);
