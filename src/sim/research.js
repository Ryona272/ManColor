/**
 * research.js -- params validation
 * npx.cmd esbuild src/sim/research.js --bundle --platform=node --outfile=dist-sim/research.cjs --format=cjs ; node dist-sim/research.cjs
 */
import { DEFAULT_PARAMS, mergeParams } from "./SimParams.js";
import { runMany } from "./SimRunner.js";

const N_AB = 800;
const N_GRID = 500;

const EVO_BEST = mergeParams({
  guruguruBaseEarly: 30, guruguruChainMultEarly: 9,
  guruguruBase: 71, guruguruChainMult: 28,
  guruguruFollowupMult: 1.725, guruguruDisrupt: 28,
  chirachira1st: 34, chirachira2nd: 30,
  chirachira1stMid: 37, chirachira2ndMid: 30, chirachira3rd: 21,
  poipoiWithFortune: 27, poipoiGeneral: 7, poipoiEmpty: 3,
  chirachiraThresholdHigh: 10, chirachiraThresholdLow: 4,
  poipoiStoneOwnFortune: 30, poipoiStoneInferred: 22, poipoiStoneKnownPos: 4,
  zakuzakuBase: 8, zakuzakuStoneMult: 4,
  zakuzakuOwnFortune: 6, zakuzakuInferred: 7, zakuzakuKnownPos: 10,
  earlyOwnFortune: 28, earlyCancelMult: 9, earlyCancelThreshold: 2, earlyUnknownPenalty: -17,
  midInferred: 41, midOwnFortune: 18, midKnownPos: 10,
  midKnownNeg: -42, midAvoidedColor: -21, midUnknownPenalty: -12,
  midCancelMult: 7, midCancelThreshold: 2,
});

function sep(t) { console.log("\n" + "=".repeat(60) + "\n  " + t + "\n" + "=".repeat(60)); }
function pr(label, s) {
  console.log("  " + label);
  console.log("    win: " + s.selfWinRate + " / " + s.oppWinRate + "  avgDiff: " + s.avgScoreDiff + "  med: " + s.medianScoreDiff);
  console.log("    guru self:" + s.avgSelfGuru + " opp:" + s.avgOppGuru + "  peeks self:" + s.avgSelfPeeks + " opp:" + s.avgOppPeeks + "  turns:" + s.avgTurns);
}
function grid(key, values, base) {
  const rows = values.map(v => {
    const s = runMany(mergeParams({ ...base, [key]: v }), DEFAULT_PARAMS, N_GRID);
    return { v, win: s.selfWinRate, diff: parseFloat(s.avgScoreDiff) };
  });
  rows.sort((a,b) => b.diff - a.diff);
  rows.forEach(r => console.log("    " + key + "=" + r.v + "  win=" + r.win + "  avgDiff=" + r.diff.toFixed(2)));
  return rows[0].v;
}

// 0. baseline
sep("0. baseline: EVO_BEST(self) vs DEFAULT(opp)");
pr("EVO_BEST vs DEFAULT", runMany(EVO_BEST, DEFAULT_PARAMS, N_AB));

// 1a. poipoi decision: poipoiWithFortune
sep("1a. poipoi-decision: poipoiWithFortune (inferred color in store)");
grid("poipoiWithFortune", [10, 16, 22, 27, 34, 42, 55], EVO_BEST);

// 1b. poipoi decision: poipoiGeneral
sep("1b. poipoi-decision: poipoiGeneral (stones present, color unknown)");
grid("poipoiGeneral", [0, 4, 7, 10, 14, 20], EVO_BEST);

// 1c. chirachira threshold: high
sep("1c. chirachira compare val: chirachiraThresholdHigh (remaining>=2)");
grid("chirachiraThresholdHigh", [4, 7, 10, 14, 18, 25], EVO_BEST);

// 1d. chirachira threshold: low
sep("1d. chirachira compare val: chirachiraThresholdLow (remaining<2)");
grid("chirachiraThresholdLow", [1, 3, 4, 6, 8, 12], EVO_BEST);

// 1e. poipoi stone: own fortune
sep("1e. poipoi stone select: poipoiStoneOwnFortune (take AI fortune color)");
grid("poipoiStoneOwnFortune", [15, 22, 28, 35, 45, 60], EVO_BEST);

// 1f. poipoi stone: inferred
sep("1f. poipoi stone select: poipoiStoneInferred (take inferred player fortune)");
grid("poipoiStoneInferred", [10, 16, 22, 28, 36, 45], EVO_BEST);

// 2. earlyGamePeekThreshold (forced chirachira count)
sep("2. forced chirachira count: earlyGamePeekThreshold");
grid("earlyGamePeekThreshold", [0, 1, 2, 3], EVO_BEST);

// 3. zakuzaku
sep("3a. zakuzakuBase");
grid("zakuzakuBase", [2, 5, 8, 12, 16, 22], EVO_BEST);
sep("3b. zakuzakuStoneMult");
grid("zakuzakuStoneMult", [2, 4, 6, 8, 11], EVO_BEST);
sep("3c. zakuzakuInferred");
grid("zakuzakuInferred", [0, 4, 7, 11, 16, 22], EVO_BEST);

// 4. mid color eval
sep("4a. midInferred");
grid("midInferred", [28, 34, 41, 48, 56, 64], EVO_BEST);
sep("4b. midOwnFortune");
grid("midOwnFortune", [8, 12, 18, 24, 30], EVO_BEST);
sep("4c. midUnknownPenalty");
grid("midUnknownPenalty", [-4, -8, -12, -18, -24, -32], EVO_BEST);
sep("4d. midKnownNeg");
grid("midKnownNeg", [-24, -32, -42, -55, -70], EVO_BEST);

// 5. kutakuta offset
sep("5. kutakutaThresholdOffset");
grid("kutakutaThresholdOffset", [-6, -4, -2, 0, 2, 4], EVO_BEST);

// 6. symmetry check
sep("6. symmetry: DEFAULT(self) vs EVO_BEST(opp)");
pr("DEFAULT vs EVO_BEST", runMany(DEFAULT_PARAMS, EVO_BEST, N_AB));
sep("7. mirror: EVO_BEST(self) vs EVO_BEST(opp)");
pr("EVO_BEST vs EVO_BEST", runMany(EVO_BEST, EVO_BEST, N_AB));