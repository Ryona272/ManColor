/**
 * depth_bench.js
 * OniV3 深さ比較ベンチ: depth3 / depth4 / depth5 総当たり
 * 各カード 1000 ゲーム（先後各 500）
 */
import { runManyOniVsOni } from "../src/sim/SimRunnerRobo.js";

const N_GAMES = 500;
const DEPTHS = [3, 4, 5];

console.log(`=== OniV3 深さ比較ベンチ ===`);
console.log(`各対戦 ${N_GAMES} ゲーム（先後各 ${N_GAMES / 2}）\n`);

const matchups = [];
for (let i = 0; i < DEPTHS.length; i++) {
  for (let j = i + 1; j < DEPTHS.length; j++) {
    matchups.push([DEPTHS[i], DEPTHS[j]]);
  }
}

const results = [];

for (const [dA, dB] of matchups) {
  const label = `depth${dA} vs depth${dB}`;
  process.stdout.write(`${label} ... `);
  const t0 = Date.now();
  const r = runManyOniVsOni(dA, dB, N_GAMES);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `depth${dA}: ${r.depthAWinPct.toFixed(1)}%  depth${dB}: ${r.depthBWinPct.toFixed(1)}%  引分: ${r.draws}  (${elapsed}s)`,
  );
  results.push({ dA, dB, ...r });
}

// 各深さのスコア集計（総当たり勝率平均）
console.log(`\n=== 総合 ===`);
const scoreMap = {};
for (const d of DEPTHS) scoreMap[d] = { wins: 0, games: 0 };
for (const r of results) {
  scoreMap[r.dA].wins += r.depthAWins;
  scoreMap[r.dA].games += N_GAMES;
  scoreMap[r.dB].wins += r.depthBWins;
  scoreMap[r.dB].games += N_GAMES;
}
for (const d of DEPTHS) {
  const { wins, games } = scoreMap[d];
  console.log(
    `  depth${d}: ${((wins / games) * 100).toFixed(1)}% (${wins}/${games})`,
  );
}
