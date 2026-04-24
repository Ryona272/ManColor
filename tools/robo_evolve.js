/**
 * robo_evolve.js — RoboV1 対 OniV3 進化的最適化
 *
 * 戦略: (1+λ) 進化戦略
 *   1. DEFAULT_ROBO_PARAMS を初期個体として開始
 *   2. λ 個の突然変異体を生成
 *   3. 各変異体を OniV3 と先手・後手両方で対戦させ勝率を計測
 *   4. 最良変異体が現行を上回れば更新
 *   5. VERIFY_EVERY 世代ごとに多めのゲームで収束判定
 *   6. 改善が CONVERGE_THRESHOLD(%) 未満を CONVERGE_PATIENCE 回連続で観測→停止
 *
 * ビルド & 実行:
 *   npx.cmd esbuild tools/robo_evolve.js --bundle --platform=node ^
 *     --outfile=dist-sim/robo_evolve.cjs --format=cjs && ^
 *     node dist-sim/robo_evolve.cjs
 *
 * 出力:
 *   dist-sim/robo_best.json  — 最良パラメータ（VERIFY_EVERY 世代ごとに上書き）
 */

import { DEFAULT_ROBO_PARAMS } from "../src/sim/SimParams.js";
import { runManyRoboVsOni } from "../src/sim/SimRunnerRobo.js";
import { writeFileSync, mkdirSync } from "fs";

// ────────────────────────────────────────────────────────────────
// 設定
// ────────────────────────────────────────────────────────────────
const LAMBDA = 12; // 1世代あたりの変異体数
const MAX_GENERATIONS = 200; // 安全上限
const N_EVAL = 400; // 変異体評価ゲーム数（先後200ずつ）
const N_VERIFY = 2000; // 収束判定ゲーム数（先後1000ずつ）
const VERIFY_EVERY = 5; // この世代ごとに収束チェック
const CONVERGE_THRESHOLD = 1.0; // 勝率改善幅がこれ未満なら収束カウント++（%）
const CONVERGE_PATIENCE = 3; // 収束条件を連続でこの回数満たしたら停止

const MUTATION_RATE = 0.4; // パラメータ1本あたりの突然変異確率
const MUTATION_SCALE = 0.3; // 突然変異幅 = range × ±MUTATION_SCALE

// パラメータごとの探索範囲 [min, max]
const RANGES = {
  roboGuruguruScore: [1, 25],
  roboChirachiraScore: [0, 30],
  roboChirachiraNegBonus: [0, 25],
  roboChirachiraLimit: [1, 10], // 整数 (10=事実上無制限)
  roboZakuzakuBase: [0, 20],
  roboKutakutaBonus: [0, 10],
  roboTopN: [2, 5], // 整数
  roboDepth: [3, 7], // 整数
};

const PARAM_KEYS = Object.keys(RANGES);

// ────────────────────────────────────────────────────────────────
// 個体操作
// ────────────────────────────────────────────────────────────────
function mutate(params) {
  const child = { ...params };
  for (const key of PARAM_KEYS) {
    if (Math.random() < MUTATION_RATE) {
      const [lo, hi] = RANGES[key];
      const span = hi - lo;
      let v = child[key] + span * MUTATION_SCALE * (Math.random() * 2 - 1);
      v = Math.max(lo, Math.min(hi, v));
      // 整数パラメータは丸める
      child[key] = Number.isInteger(DEFAULT_ROBO_PARAMS[key])
        ? Math.round(v)
        : parseFloat(v.toFixed(4));
    }
  }
  return child;
}

// ────────────────────────────────────────────────────────────────
// 評価
// ────────────────────────────────────────────────────────────────
function evaluate(params, n) {
  const r = runManyRoboVsOni(params, n);
  return r.roboWinPct;
}

// ────────────────────────────────────────────────────────────────
// メインループ
// ────────────────────────────────────────────────────────────────
function main() {
  mkdirSync("dist-sim", { recursive: true });

  let best = { ...DEFAULT_ROBO_PARAMS };
  let bestPct = evaluate(best, N_VERIFY);
  console.log(`=== RoboV1 進化的最適化 開始 ===`);
  console.log(`初期勝率 (vs OniV3, ${N_VERIFY}G): ${bestPct.toFixed(2)}%`);
  console.log(
    `上限 ${MAX_GENERATIONS} 世代 / 収束: ${CONVERGE_THRESHOLD}% × ${CONVERGE_PATIENCE}連続\n`,
  );

  let convergePct = bestPct;
  let convergeCount = 0;

  for (let gen = 1; gen <= MAX_GENERATIONS; gen++) {
    // λ 個の変異体を評価
    const candidates = Array.from({ length: LAMBDA }, () => mutate(best));

    let genBestPct = -Infinity;
    let genBestParams = null;

    for (let i = 0; i < candidates.length; i++) {
      const pct = evaluate(candidates[i], N_EVAL);
      if (pct > genBestPct) {
        genBestPct = pct;
        genBestParams = candidates[i];
      }
    }

    // 改善なら更新
    if (genBestPct > bestPct) {
      bestPct = genBestPct;
      best = genBestParams;
      console.log(`Gen ${String(gen).padStart(3)}: ↑ ${bestPct.toFixed(2)}%`);
    } else {
      console.log(
        `Gen ${String(gen).padStart(3)}: — ${bestPct.toFixed(2)}% (変化なし)`,
      );
    }

    // 収束チェック
    if (gen % VERIFY_EVERY === 0) {
      const verifyPct = evaluate(best, N_VERIFY);
      const improvement = verifyPct - convergePct;

      console.log(
        `\n[Verify gen ${gen}] ${verifyPct.toFixed(2)}% (前回比 ${improvement >= 0 ? "+" : ""}${improvement.toFixed(2)}%)`,
      );

      if (improvement < CONVERGE_THRESHOLD) {
        convergeCount++;
        console.log(`収束カウント: ${convergeCount}/${CONVERGE_PATIENCE}`);
        if (convergeCount >= CONVERGE_PATIENCE) {
          console.log(`\n=== ${gen} 世代で収束 ===`);
          _save(best, verifyPct, gen);
          _printSummary(best, verifyPct);
          return;
        }
      } else {
        convergeCount = 0;
      }

      convergePct = verifyPct;
      _save(best, verifyPct, gen);
      console.log();
    }
  }

  // 上限到達
  const finalPct = evaluate(best, N_VERIFY);
  console.log(`\n=== ${MAX_GENERATIONS} 世代上限到達 ===`);
  _save(best, finalPct, MAX_GENERATIONS);
  _printSummary(best, finalPct);
}

function _save(params, winPct, gen) {
  writeFileSync(
    "dist-sim/robo_best.json",
    JSON.stringify(
      { gen, winPct: parseFloat(winPct.toFixed(2)), params },
      null,
      2,
    ),
  );
}

function _printSummary(params, winPct) {
  console.log(`\n最終勝率 vs OniV3: ${winPct.toFixed(2)}%`);
  console.log("最適パラメータ:");
  for (const key of PARAM_KEYS) {
    console.log(`  ${key}: ${params[key]}`);
  }
  console.log("\n→ dist-sim/robo_best.json に保存済み");
}

main();
