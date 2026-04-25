/**
 * robo_reset_evolve.js — RoboV1 リセット & OniV3(depth=3) 対戦進化
 *
 * 戦略: (1+λ) 進化戦略
 *   - 弱い初期値からスタート（robo_best.json を無視）
 *   - 相手: OniV3 depth=3
 *   - 目標: 先手・後手合計で 50% 超え
 *   - 収束: 1% 未満の改善が続いたら停止
 *   - 上限: 50 世代
 *
 * 実行:
 *   npx.cmd esbuild tools/robo_reset_evolve.js --bundle --platform=node ^
 *     --outfile=dist-sim/robo_reset_evolve.cjs --format=cjs && ^
 *     node dist-sim/robo_reset_evolve.cjs
 */

import { runManyRoboVsOni } from "../src/sim/SimRunnerRobo.js";
import { writeFileSync, mkdirSync } from "fs";

// ────────────────────────────────────────────────────────────────
// 設定
// ────────────────────────────────────────────────────────────────
const ONI_DEPTH = 3;
const LAMBDA = 12;
const MAX_GENERATIONS = 50;
const N_EVAL = 800; // 変異体評価ゲーム数
const N_VERIFY = 1000; // 収束判定ゲーム数
const VERIFY_EVERY = 5;
const CONVERGE_THRESHOLD = 1.0; // %
const CONVERGE_PATIENCE = 3;

const MUTATION_RATE = 0.4;
const MUTATION_SCALE = 0.3;

// パラメータ範囲
// バイアス値: 1.0 = 均等ランダム、大きいほどその手を好む
const RANGES = {
  roboGuruguruBias: [0.1, 20.0], // ぐるぐる着地pitを優先
  roboZakuzakuBias: [0.1, 20.0], // ざくざく着地pitを優先
  roboChirachiraBias: [0.1, 20.0], // ちらちら着地pitを優先
  roboPlacementGuruBias: [0.1, 20.0], // ざくざく後の配置: ぐるぐるセットアップ路を優先
};

const PARAM_KEYS = Object.keys(RANGES);

// 弱い初期値（全バイアス=1.0 → 均等ランダムと同等）
const WEAK_START = {
  roboGuruguruBias: 1.0,
  roboZakuzakuBias: 1.0,
  roboChirachiraBias: 1.0,
  roboPlacementGuruBias: 1.0,
};

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
      child[key] = Number.isInteger(WEAK_START[key])
        ? Math.round(v)
        : parseFloat(v.toFixed(4));
    }
  }
  return child;
}

function evaluate(params, n) {
  const r = runManyRoboVsOni(params, n, ONI_DEPTH);
  return r.roboWinPct;
}

// ────────────────────────────────────────────────────────────────
// メインループ
// ────────────────────────────────────────────────────────────────
function main() {
  mkdirSync("dist-sim", { recursive: true });

  let best = { ...WEAK_START };

  // パラメータなし → ベースライン（easy相当）勝率を計測して終了
  if (PARAM_KEYS.length === 0) {
    console.log(`=== easy ベースライン計測 (vs OniV3 depth=${ONI_DEPTH}) ===`);
    const pct = evaluate(best, N_VERIFY);
    console.log(`easy相当勝率 (${N_VERIFY}G): ${pct.toFixed(2)}%`);
    return;
  }

  let bestPct = evaluate(best, N_VERIFY);

  console.log(`=== RoboV1 リセット進化 (vs OniV3 depth=${ONI_DEPTH}) ===`);
  console.log(`初期勝率 (弱い初期値, ${N_VERIFY}G): ${bestPct.toFixed(2)}%`);
  console.log(
    `目標: 50%超え / 上限 ${MAX_GENERATIONS} 世代 / 収束: ${CONVERGE_THRESHOLD}% × ${CONVERGE_PATIENCE}連続\n`,
  );

  let convergePct = bestPct;
  let convergeCount = 0;

  for (let gen = 1; gen <= MAX_GENERATIONS; gen++) {
    const candidates = Array.from({ length: LAMBDA }, () => mutate(best));

    let genBestPct = -Infinity;
    let genBestParams = null;

    for (const c of candidates) {
      const pct = evaluate(c, N_EVAL);
      if (pct > genBestPct) {
        genBestPct = pct;
        genBestParams = c;
      }
    }

    if (genBestPct > bestPct) {
      bestPct = genBestPct;
      best = genBestParams;
      console.log(`Gen ${String(gen).padStart(3)}: ↑ ${bestPct.toFixed(2)}%`);
    } else {
      console.log(
        `Gen ${String(gen).padStart(3)}: — ${bestPct.toFixed(2)}% (変化なし)`,
      );
    }

    if (gen % VERIFY_EVERY === 0) {
      const verifyPct = evaluate(best, N_VERIFY);
      const improvement = verifyPct - convergePct;

      console.log(
        `\n[Verify gen ${gen}] ${verifyPct.toFixed(2)}% (前回比 ${improvement >= 0 ? "+" : ""}${improvement.toFixed(2)}%)`,
      );

      if (verifyPct >= 50.0) {
        console.log(
          `\n=== 目標達成: ${verifyPct.toFixed(2)}% >=50% (gen ${gen}) ===`,
        );
        _save(best, verifyPct, gen);
        _printSummary(best, verifyPct);
        return;
      }

      if (improvement < CONVERGE_THRESHOLD) {
        convergeCount++;
        console.log(`収束カウント: ${convergeCount}/${CONVERGE_PATIENCE}`);
        if (convergeCount >= CONVERGE_PATIENCE) {
          console.log(
            `\n=== ${gen} 世代で収束 (勝率 ${verifyPct.toFixed(2)}%) ===`,
          );
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

  const finalPct = evaluate(best, N_VERIFY);
  console.log(
    `\n=== ${MAX_GENERATIONS} 世代上限到達 (勝率 ${finalPct.toFixed(2)}%) ===`,
  );
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
  console.log(`\n最終勝率 vs OniV3(depth=${ONI_DEPTH}): ${winPct.toFixed(2)}%`);
  console.log("最適パラメータ:");
  for (const key of PARAM_KEYS) {
    console.log(`  ${key}: ${params[key]}`);
  }
  console.log("\n→ dist-sim/robo_best.json に保存済み");
}

main();
