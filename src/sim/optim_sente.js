/**
 * optim_sente.js
 * senteStrategy を固定 goteStrategy に勝てるよう座標降下法で最適化
 *
 * npx.cmd esbuild src/sim/optim_sente.js --bundle --platform=node --outfile=dist-sim/optim_sente.cjs --format=cjs && node dist-sim/optim_sente.cjs
 */
import { DEFAULT_PARAMS, PRESETS, mergeParams } from "./SimParams.js";
import { runMany } from "./SimRunner.js";

// ─── 設定 ───
const N_EVAL = 400; // 評価精度（ノイズ低減）
const N_VERIFY = 1000; // 最終検証
const MAX_SWEEPS = 8; // 収束するまで最大スイープ数
const MAX_EXTEND = 8; // 1方向の最大延長ステップ

// ─── 全パラメータとステップ幅 ───
const STEPS = {
  guruguruBaseEarly: 1,
  guruguruChainMultEarly: 1,
  guruguruBase: 1,
  guruguruChainMult: 1,
  guruguruFollowupMult: 0.05,
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
  forceChirachiraMinLane: 1,
  kutakutaThresholdOffset: 1,
};
const PARAM_KEYS = Object.keys(STEPS);

const fix = (v) => parseFloat(v.toFixed(4));
const selfRate = (s) => parseFloat(s.selfWinRate);

function sep(title) {
  console.log("\n" + "=".repeat(62) + "\n  " + title + "\n" + "=".repeat(62));
}

// ─── 1パラメータのライン探索（self勝率を最大化）───
function lineSearch(key, current, curScore, gote) {
  const step = STEPS[key];
  const cur = current[key];
  const evalFn = (p) => selfRate(runMany(p, gote, N_EVAL));

  const sp = evalFn({ ...current, [key]: fix(cur + step) });
  const sm = evalFn({ ...current, [key]: fix(cur - step) });

  let best = cur,
    bestScore = curScore;
  if (sp > bestScore) {
    best = fix(cur + step);
    bestScore = sp;
  }
  if (sm > bestScore) {
    best = fix(cur - step);
    bestScore = sm;
  }

  if (best !== cur) {
    const dir = best > cur ? step : -step;
    for (let ex = 0; ex < MAX_EXTEND; ex++) {
      const nxt = fix(best + dir);
      const score = evalFn({ ...current, [key]: nxt });
      if (score > bestScore) {
        bestScore = score;
        best = nxt;
      } else break;
    }
    const delta = (bestScore - curScore).toFixed(1);
    console.log(
      `    [${key}] ${cur} → ${best}  (${delta >= 0 ? "+" : ""}${delta}%  now:${bestScore.toFixed(1)}%)`,
    );
  }
  return { value: best, score: bestScore };
}

// ─── 1スイープ ───
function sweep(params, gote, label) {
  console.log(`\n  -- ${label} --`);
  let cur = { ...params };
  let score = selfRate(runMany(cur, gote, N_EVAL));
  console.log(`  開始: ${score.toFixed(1)}%`);
  let improved = 0;
  for (const key of PARAM_KEYS) {
    const r = lineSearch(key, cur, score, gote);
    if (r.value !== cur[key]) {
      cur = { ...cur, [key]: r.value };
      score = r.score;
      improved++;
    }
  }
  console.log(`  完了: ${improved}個改善 → ${score.toFixed(1)}%`);
  return { params: cur, improved, score };
}

// ─── メイン最適化 ───
const GOTE = PRESETS.goteStrategy; // 固定の対戦相手（後手）
let sente = { ...PRESETS.senteStrategy }; // 最適化対象（先手）
const initSente = { ...sente };

sep(`senteStrategy 最適化 vs 固定 goteStrategy  N_EVAL=${N_EVAL}`);
console.log(`  初期: ${selfRate(runMany(sente, GOTE, N_EVAL)).toFixed(1)}%`);

for (let i = 1; i <= MAX_SWEEPS; i++) {
  const r = sweep(sente, GOTE, `Sweep ${i}`);
  sente = r.params;
  if (r.improved === 0) {
    console.log("  → 収束");
    break;
  }
}

// ─── 最終検証 ───
sep(`最終検証 ${N_VERIFY}試合`);
const vSG = runMany(sente, GOTE, N_VERIFY);
const vSD = runMany(sente, DEFAULT_PARAMS, N_VERIFY);
const vDD = runMany(DEFAULT_PARAMS, DEFAULT_PARAMS, N_VERIFY);

console.log(
  `  sente vs gote:    self ${vSG.selfWinRate}  opp ${vSG.oppWinRate}  avgDiff:${vSG.avgScoreDiff}`,
);
console.log(
  `  sente vs default: self ${vSD.selfWinRate}  opp ${vSD.oppWinRate}  avgDiff:${vSD.avgScoreDiff}`,
);
console.log(
  `  default vs default: self ${vDD.selfWinRate}  opp ${vDD.oppWinRate}`,
);
console.log(`  peeks sente:${vSG.avgSelfPeeks}  gote:${vSG.avgOppPeeks}`);
console.log(`  guru  sente:${vSG.avgSelfGuru}  gote:${vSG.avgOppGuru}`);

// ─── 変更点サマリ ───
console.log("\n【最適化済み senteStrategy (変更点のみ)】");
const diffs = PARAM_KEYS.filter(
  (k) => sente[k] !== undefined && sente[k] !== initSente[k],
);
if (diffs.length === 0) {
  console.log("  (変更なし)");
} else {
  console.log("  senteStrategy: mergeParams({");
  diffs.forEach((k) =>
    console.log(`    ${k}: ${sente[k]},  // (was ${initSente[k]})`),
  );
  console.log("  }),");
}
