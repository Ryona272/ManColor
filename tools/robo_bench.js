/**
 * robo_bench.js
 * 指定パラメータで winrate のみ計測するベンチマーク
 * topN=5, depth=10 フル探索テスト用
 */
import { runManyRoboVsOni } from "../src/sim/SimRunnerRobo.js";
import { DEFAULT_ROBO_PARAMS } from "../src/sim/SimParams.js";
import fs from "fs";

const N_GAMES = 2000;

// robo_best.json があれば読み込む、なければ DEFAULT_ROBO_PARAMS を使用
let baseParams = { ...DEFAULT_ROBO_PARAMS };
try {
  const best = JSON.parse(fs.readFileSync("dist-sim/robo_best.json", "utf8"));
  baseParams = { ...baseParams, ...best.params };
  console.log(
    `robo_best.json 読み込み (gen ${best.gen}, 前回勝率 ${best.winPct}%)`,
  );
} catch {
  console.log("robo_best.json なし → DEFAULT_ROBO_PARAMS 使用");
}

const benchParams = {
  ...baseParams,
  roboTopN: 5,
  roboDepth: 7,
};

console.log(`\n=== ベンチマーク開始 ===`);
console.log(
  `topN=${benchParams.roboTopN}, depth=${benchParams.roboDepth}, ${N_GAMES}ゲーム`,
);
console.log(`開始時刻: ${new Date().toLocaleTimeString()}\n`);

const t0 = Date.now();
const result = runManyRoboVsOni(benchParams, N_GAMES);
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

console.log(`完了: ${elapsed}秒`);
console.log(
  `勝率: ${result.roboWinPct.toFixed(2)}% (robo) vs ${result.oniWinPct.toFixed(2)}% (oni)`,
);
console.log(
  `  robo勝: ${result.roboWins}, oni勝: ${result.oniWins}, 引き分け: ${result.draws}`,
);
