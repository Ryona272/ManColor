/**
 * neg_fear_bench.js -- 動的マイナス恐怖 vs 現鬼 比較
 *
 * 新AI: dynamicUnknownPenalty=true
 *   未確定色が自賽壇に入る時のペナルティを確率ベースで計算
 *   - 0回ちらちら（4色未確定）: -25
 *   - 1回ちらちら（3色未確定）: -33
 *   - 2回ちらちら（2色未確定）: -50
 *   - neg判明後: 0（未確定石は安全）
 *
 * 現鬼: 未確定石を +10 で喜んで賽壇に入れる（変更なし）
 *
 * npx.cmd esbuild tools/neg_fear_bench.js --bundle --platform=node --outfile=dist-sim/neg_fear_bench.cjs --format=cjs ; node dist-sim/neg_fear_bench.cjs
 */
import { runManyOniVsOni } from "../src/sim/SimRunnerRobo.js";

const N = 500;
const DEPTH = 3;

const NEW_OPTS = { dynamicUnknownPenalty: true };
const OLD_OPTS = {};

console.log("=".repeat(60));
console.log(
  "  動的マイナス恐怖 vs 現鬼  (" + N + " games, depth=" + DEPTH + ")",
);
console.log("=".repeat(60));

// 新AI (A) vs 現鬼 (B)
const result = runManyOniVsOni(DEPTH, DEPTH, N, NEW_OPTS, OLD_OPTS);

const newPct = result.depthAWinPct.toFixed(1);
const oldPct = result.depthBWinPct.toFixed(1);
const drawPct = (100 - result.depthAWinPct - result.depthBWinPct).toFixed(1);

console.log("");
console.log("  新AI（動的恐怖）: " + result.depthAWins + "勝  " + newPct + "%");
console.log("  現鬼（固定+10）: " + result.depthBWins + "勝  " + oldPct + "%");
console.log("  引分:             " + result.draws + "  " + drawPct + "%");
console.log("");
if (result.depthAWinPct > result.depthBWinPct + 3) {
  console.log("  → 新AIが有意に強い。ゲームにも導入を推奨。");
} else if (result.depthBWinPct > result.depthAWinPct + 3) {
  console.log("  → 現鬼の方が強い。ペナルティ値を再調整が必要。");
} else {
  console.log("  → 差なし（±3%以内）。追加で large N テスト推奨。");
}
