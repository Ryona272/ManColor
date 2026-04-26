/**
 * neg_fear_optim.js -- 動的マイナス恐怖スケールの最適化
 *
 * unknownPenaltyScale を grid search して現鬼に勝率が高い値を探す。
 * scale=S のとき:
 *   4色未確定: -(S/4)    (例 S=100 → -25)
 *   3色未確定: -(S/3)    (例 S=100 → -33)
 *   2色未確定: -(S/2)    (例 S=100 → -50)
 *   neg判明後: 0
 *
 * npx.cmd esbuild tools/neg_fear_optim.js --bundle --platform=node --outfile=dist-sim/neg_fear_optim.cjs --format=cjs ; node dist-sim/neg_fear_optim.cjs
 */
import { runManyOniVsOni } from "../src/sim/SimRunnerRobo.js";

const N = 300; // 各スケールのゲーム数（多いほど精度↑速度↓）
const DEPTH = 3;
const SCALES = [10, 20, 30, 40, 50, 60, 80, 100, 120, 150, 200];

const OLD_OPTS = {}; // 現鬼（比較基準）

console.log("=".repeat(60));
console.log("  マイナス恐怖スケール最適化 (N=" + N + ", depth=" + DEPTH + ")");
console.log("=".repeat(60));
console.log("");
console.log("  scale | 新AI勝% | 現鬼勝% | 引分%");
console.log("  ------|---------|---------|------");

const results = [];

for (const scale of SCALES) {
  const newOpts = { dynamicUnknownPenalty: true, unknownPenaltyScale: scale };
  const r = runManyOniVsOni(DEPTH, DEPTH, N, newOpts, OLD_OPTS);
  const newPct = r.depthAWinPct.toFixed(1);
  const oldPct = r.depthBWinPct.toFixed(1);
  const drawPct = (100 - r.depthAWinPct - r.depthBWinPct).toFixed(1);
  const label = scale.toString().padStart(5);
  console.log(
    `  ${label} | ${newPct.padStart(7)} | ${oldPct.padStart(7)} | ${drawPct.padStart(5)}`,
  );
  results.push({ scale, winPct: r.depthAWinPct });
}

// 最良スケールを表示
results.sort((a, b) => b.winPct - a.winPct);
const best = results[0];

console.log("");
console.log("=".repeat(60));
console.log(
  `  最良スケール: ${best.scale}  (新AI勝率 ${best.winPct.toFixed(1)}%)`,
);
console.log(
  `  → ペナルティ値 4色未確定:${Math.round(-best.scale / 4)}  3色:${Math.round(-best.scale / 3)}  2色:${Math.round(-best.scale / 2)}`,
);
console.log("=".repeat(60));
