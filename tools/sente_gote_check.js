/**
 * sente_gote_check.js -- 先手/後手戦略の1000試合検証
 * npx.cmd esbuild tools/sente_gote_check.js --bundle --platform=node --outfile=dist-sim/sente_gote_check.cjs --format=cjs ; node dist-sim/sente_gote_check.cjs
 */
import { DEFAULT_PARAMS, PRESETS, mergeParams } from "../src/sim/SimParams.js";
import { runMany } from "../src/sim/SimRunner.js";

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

// ─── 1. senteStrategy(先手) vs DEFAULT(後手) ───
sep("1. senteStrategy(先手) vs DEFAULT(後手)");
pr("senteStrategy vs DEFAULT", runMany(SENTE, DEF, N));

// ─── 2. DEFAULT(先手) vs senteStrategy(後手) ───
sep("2. DEFAULT(先手) vs senteStrategy(後手)");
pr("DEFAULT vs senteStrategy", runMany(DEF, SENTE, N));

// ─── 3. goteStrategy(先手) vs DEFAULT(後手) ───
sep("3. goteStrategy(先手) vs DEFAULT(後手)");
pr("goteStrategy vs DEFAULT", runMany(GOTE, DEF, N));

// ─── 4. DEFAULT(先手) vs goteStrategy(後手) ───
sep("4. DEFAULT(先手) vs goteStrategy(後手)");
pr("DEFAULT vs goteStrategy", runMany(DEF, GOTE, N));

// ─── 5. senteStrategy(先手) vs goteStrategy(後手)  直接対決 ───
sep("5. senteStrategy(先手) vs goteStrategy(後手)  直接対決");
pr("senteStrategy vs goteStrategy", runMany(SENTE, GOTE, N));

// ─── 6. ベースライン: DEFAULT vs DEFAULT ───
sep("6. DEFAULT(先手) vs DEFAULT(後手)  ベースライン");
pr("DEFAULT vs DEFAULT", runMany(DEF, DEF, N));
