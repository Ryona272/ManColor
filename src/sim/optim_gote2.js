/**
 * optim_gote2.js
 * goteStrategy を固定 senteStrategy（先手）に勝てるよう座標降下法で最適化
 * tiebreaker方式の新防御アーキテクチャ対応版
 *
 * npx.cmd esbuild src/sim/optim_gote2.js --bundle --platform=node --outfile=dist-sim/optim_gote2.cjs --format=cjs && node dist-sim/optim_gote2.cjs
 */
import { DEFAULT_PARAMS, PRESETS, mergeParams } from "./SimParams.js";
import { runMany } from "./SimRunner.js";

const N_EVAL = 400;
const N_VERIFY = 1000;
const MAX_SWEEPS = 10;
const MAX_EXTEND = 8;

// gote は opp 側なので oppWinRate を最大化
const oppRate = (s) => parseFloat(s.oppWinRate);

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
  poipoiStoneOwnFortune: 1,
  poipoiStoneInferred: 1,
  poipoiStoneKnownPos: 1,
  zakuzakuBase: 1,
  zakuzakuStoneMult: 1,
  zakuzakuOwnFortune: 1,
  zakuzakuInferred: 1,
  zakuzakuKnownPos: 1,
  zakuzakuOppStoreColor: 1,
  zakuzakuExposedBase: 1,
  zakuzakuExposedMult: 1,
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
  defensiveTiebreakWindow: 1,
  oppGuruguruCreate: 1,
  oppChirachiraCreate: 1,
  kutakutaLanePenalty: 1,
};
const PARAM_KEYS = Object.keys(STEPS);

const fix = (v) => parseFloat(v.toFixed(4));

function sep(title) {
  console.log("\n" + "=".repeat(62) + "\n  " + title + "\n" + "=".repeat(62));
}

function lineSearch(key, current, curScore, sente) {
  const step = STEPS[key];
  const cur = current[key];
  const evalFn = (p) => oppRate(runMany(sente, p, N_EVAL));

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

function sweep(params, sente, label) {
  console.log(`\n  -- ${label} --`);
  let cur = { ...params };
  let score = oppRate(runMany(sente, cur, N_EVAL));
  console.log(`  開始: ${score.toFixed(1)}%`);
  let improved = 0;
  for (const key of PARAM_KEYS) {
    const r = lineSearch(key, cur, score, sente);
    if (r.value !== cur[key]) {
      cur = { ...cur, [key]: r.value };
      score = r.score;
      improved++;
    }
  }
  console.log(`  終了: ${score.toFixed(1)}%  (${improved}パラメータ改善)`);
  return { params: cur, score, improved };
}

// 先手は最適化済み senteStrategy で固定
const SENTE = PRESETS.senteStrategy;
let best = { ...PRESETS.goteStrategy };

sep("初期値確認");
{
  const r = runMany(SENTE, best, N_EVAL);
  console.log(
    `  gote(opp) vs sente(self): opp:${r.oppWinRate}  self:${r.selfWinRate}  diff:${r.avgScoreDiff}`,
  );
}

// 座標降下ループ
for (let sw = 1; sw <= MAX_SWEEPS; sw++) {
  const result = sweep(best, SENTE, `スイープ ${sw}/${MAX_SWEEPS}`);
  best = result.params;
  if (result.improved === 0) {
    console.log("\n  収束しました。");
    break;
  }
}

sep("最終検証 (N=" + N_VERIFY + ")");
{
  const r = runMany(SENTE, best, N_VERIFY);
  console.log(
    `  sente vs gote: self ${r.selfWinRate}  opp ${r.oppWinRate}  avgDiff:${r.avgScoreDiff}`,
  );
  console.log(`  guru  self:${r.avgSelfGuru} opp:${r.avgOppGuru}`);
  console.log(
    `  peeks self:${r.avgSelfPeeks} opp:${r.avgOppPeeks}  turns:${r.avgTurns}`,
  );
}

sep("goteStrategy 更新差分");
const base = { ...PRESETS.goteStrategy };
for (const key of PARAM_KEYS) {
  if (best[key] !== base[key])
    console.log(`  ${key}: ${base[key]} → ${best[key]}`);
}

sep("goteStrategy mergeParams 出力（SimParams.js に貼り付け）");
const overrides = {};
for (const key of Object.keys(DEFAULT_PARAMS)) {
  if (best[key] !== DEFAULT_PARAMS[key]) overrides[key] = best[key];
}
console.log("  goteStrategy: mergeParams({");
for (const [k, v] of Object.entries(overrides)) console.log(`    ${k}: ${v},`);
console.log("  }),");
