/**
 * sente_gote_check.js -- 先手/後手戦略の1000試合検証
 * npx.cmd esbuild src/sim/sente_gote_check.js --bundle --platform=node --outfile=dist-sim/sente_gote_check.cjs --format=cjs ; node dist-sim/sente_gote_check.cjs
 */
import { DEFAULT_PARAMS, PRESETS, mergeParams } from "./SimParams.js";
import { runMany } from "./SimRunner.js";

const N = 1000;

function pr(label, s) {
  const draw = (
    100 -
    parseFloat(s.selfWinRate) -
    parseFloat(s.oppWinRate)
  ).toFixed(1);
  console.log(`  ${label}`);
  console.log(
    `    self win: ${s.selfWinRate}  opp win: ${s.oppWinRate}  draw: ${draw}%  avgDiff: ${s.avgScoreDiff}  med: ${s.medianScoreDiff}`,
  );
  console.log(`    guru  self:${s.avgSelfGuru} opp:${s.avgOppGuru}`);
  console.log(
    `    peeks self:${s.avgSelfPeeks} opp:${s.avgOppPeeks}  turns:${s.avgTurns}`,
  );
}

function sep(title) {
  console.log("\n" + "=".repeat(60));
  console.log("  " + title);
  console.log("=".repeat(60));
}

const SENTE = PRESETS.senteStrategy;
const GOTE = PRESETS.goteStrategy;
const DEF = DEFAULT_PARAMS;

// ─── 1. 先手特化 vs DEFAULT ───
sep("1. senteStrategy(先手=self) vs DEFAULT(後手=opp)");
pr("senteStrategy vs DEFAULT", runMany(SENTE, DEF, N));

// ─── 2. DEFAULT vs 後手特化 ───
sep("2. DEFAULT(先手=self) vs goteStrategy(後手=opp)");
pr("DEFAULT vs goteStrategy", runMany(DEF, GOTE, N));

// ─── 3. 先手特化 vs 後手特化（直接対決）───
sep("3. senteStrategy(先手) vs goteStrategy(後手)  直接対決");
pr("senteStrategy vs goteStrategy", runMany(SENTE, GOTE, N));

// ─── 4. 対称確認: DEFAULT vs DEFAULT ───
sep("4. DEFAULT(先手) vs DEFAULT(後手)  ベースライン対称チェック");
pr("DEFAULT vs DEFAULT", runMany(DEF, DEF, N));

// ─── 5. ミラー確認 ───
sep("5. goteStrategy(先手) vs senteStrategy(後手)  逆ロール");
pr("goteStrategy(先手) vs senteStrategy(後手)", runMany(GOTE, SENTE, N));
