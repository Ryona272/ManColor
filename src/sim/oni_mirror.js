/**
 * oni_mirror.js -- 鬼 vs 鬼（DEFAULT_PARAMS 同士）先後手勝率確認
 * npx.cmd esbuild src/sim/oni_mirror.js --bundle --platform=node --outfile=dist-sim/oni_mirror.cjs --format=cjs ; node dist-sim/oni_mirror.cjs
 */
import { DEFAULT_PARAMS } from "./SimParams.js";
import { runMany } from "./SimRunner.js";

const N = 3000;
const P = DEFAULT_PARAMS;

const s1 = runMany(P, P, N);
const draw1 = (
  100 -
  parseFloat(s1.selfWinRate) -
  parseFloat(s1.oppWinRate)
).toFixed(1);

console.log("=== 鬼 vs 鬼（DEFAULT_PARAMS 同士）N=" + N + " ===");
console.log("");
console.log(
  `先手 win: ${s1.selfWinRate}  後手 win: ${s1.oppWinRate}  draw: ${draw1}%`,
);
console.log(`avgDiff: ${s1.avgScoreDiff}  med: ${s1.medianScoreDiff}`);
console.log(
  `guru  先手:${s1.avgSelfGuru} 後手:${s1.avgOppGuru}  turns:${s1.avgTurns}`,
);
console.log("");

// 最大連鎖分布
function printChainDist(label, dist, maxEver) {
  console.log(`${label}  最大連鎖 ever: ${maxEver}`);
  const keys = Object.keys(dist)
    .map(Number)
    .sort((a, b) => a - b);
  for (const k of keys) {
    const pct = ((dist[k] / N) * 100).toFixed(1);
    const bar = "█".repeat(Math.round((dist[k] / N) * 40));
    console.log(
      `  chain=${k}: ${String(dist[k]).padStart(5)}回 (${pct}%) ${bar}`,
    );
  }
}

console.log("=== ぐるぐる最大連鎖分布（1ゲームあたりの最大連続着地回数）===");
printChainDist("先手", s1.selfChainDist, s1.selfMaxChainEver);
console.log("");
printChainDist("後手", s1.oppChainDist, s1.oppMaxChainEver);
