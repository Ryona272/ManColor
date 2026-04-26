/**
 * optim_testKyubi.js — testKyubi パラメータ座標降下最適化
 *
 * Kisin（OniV3, depth=3）vs testKyubi で勝率を最大化する
 *
 * ビルド & 実行:
 *   node node_modules/esbuild/bin/esbuild tools/optim_testKyubi.js --bundle --platform=node --outfile=dist-sim/optim_testKyubi.cjs --format=cjs && node dist-sim/optim_testKyubi.cjs
 *
 * 出力:
 *   dist-sim/testkyubi_best.json — 最良パラメータ（スイープごとに上書き）
 */

import { DEFAULT_TEST_KYUBI_PARAMS } from "../src/sim/SimParams.js";
import { runManyTestKyubiVsKisin } from "../src/sim/SimRunnerTestKyubi.js";
import { writeFileSync, mkdirSync } from "fs";

// ─── 設定 ───────────────────────────────────────────────────────
const N_EVAL = 400; // 評価ゲーム数（ノイズ低減）
const N_VERIFY = 1500; // 最終検証ゲーム数
const MAX_SWEEPS = 10; // 最大スイープ数
const MAX_EXTEND = 6; // 1方向の最大延長ステップ数
const KISIN_DEPTH = 3; // 対戦相手の DFS 深さ

// ─── パラメータとステップ幅 ─────────────────────────────────────
const STEPS = {
  tkGuruguruScore: 1,
  tkChirachiraScore: 1,
  tkChirachiraOptScore: 1,
  tkChirachiraForce: 1,
  tkZakuzakuBase: 1,
  tkOppZakuzakuPenalty: 1,
  tkGuruguruBlockBonus: 2,
  tkOppGuruguruPenalty: 1,
  tkOppChirachiraPenalty: 1,
  tkChirachiraNegBonus: 2,
  tkOppChirachiraNegBonus: 2,
  tkTakeZakuzakuBias: 2,
  tkMagatamaBias: 2,
  tkMusubiGuruguruBias: 1,
  tkChirachiraSetupBias: 1,
  tkZakuzakuStoneBias: 1,
  tkPoipoiOwnFortune: 5,
  tkPoipoiInferred: 5,
  tkPoipoiKnownPos: 5,
  tkKutakutaBias: 1,
};
const PARAM_KEYS = Object.keys(STEPS);

// パラメータ下限（0未満にしない）
const MINS = {
  tkGuruguruScore: 0,
  tkChirachiraScore: 0,
  tkChirachiraOptScore: 0,
  tkChirachiraForce: 0,
  tkZakuzakuBase: 0,
  tkOppZakuzakuPenalty: 0,
  tkGuruguruBlockBonus: 0,
  tkOppGuruguruPenalty: 0,
  tkOppChirachiraPenalty: 0,
  tkChirachiraNegBonus: 0,
  tkOppChirachiraNegBonus: 0,
  tkTakeZakuzakuBias: 0,
  tkMagatamaBias: 0,
  tkMusubiGuruguruBias: 0,
  tkChirachiraSetupBias: 0,
  tkZakuzakuStoneBias: 0,
  tkPoipoiOwnFortune: 0,
  tkPoipoiInferred: 0,
  tkPoipoiKnownPos: 0,
  tkKutakutaBias: -5,
};

const fix = (v) => parseFloat(v.toFixed(4));
const tkRate = (r) => r.tkWinPct;

function sep(title) {
  console.log("\n" + "=".repeat(62) + "\n  " + title + "\n" + "=".repeat(62));
}

// ─── ライン探索 ─────────────────────────────────────────────────
function lineSearch(key, current, curScore) {
  const step = STEPS[key];
  const cur = current[key];
  const evalFn = (params) =>
    tkRate(runManyTestKyubiVsKisin(params, N_EVAL, KISIN_DEPTH));

  const vp = Math.max(MINS[key] ?? 0, fix(cur + step));
  const vm = Math.max(MINS[key] ?? 0, fix(cur - step));

  const sp = evalFn({ ...current, [key]: vp });
  const sm = evalFn({ ...current, [key]: vm });

  let best = curScore;
  let bestVal = cur;
  if (sp > best) {
    best = sp;
    bestVal = vp;
  }
  if (sm > best) {
    best = sm;
    bestVal = vm;
  }

  // 最良方向に延長
  if (bestVal !== cur) {
    const dir = bestVal > cur ? 1 : -1;
    let v = bestVal;
    for (let ext = 0; ext < MAX_EXTEND; ext++) {
      const vNext = Math.max(MINS[key] ?? 0, fix(v + dir * step));
      if (vNext === v) break;
      const s = evalFn({ ...current, [key]: vNext });
      if (s > best) {
        best = s;
        v = vNext;
      } else break;
    }
    bestVal = v;
  }

  return { bestVal: fix(bestVal), bestScore: best };
}

// ─── メインループ ────────────────────────────────────────────────
function main() {
  mkdirSync("dist-sim", { recursive: true });

  let current = { ...DEFAULT_TEST_KYUBI_PARAMS };
  let curScore = tkRate(runManyTestKyubiVsKisin(current, N_EVAL, KISIN_DEPTH));

  sep(`初期評価: tkWinPct = ${curScore.toFixed(2)}%`);
  console.log("初期パラメータ:", JSON.stringify(current, null, 2));

  for (let sweep = 1; sweep <= MAX_SWEEPS; sweep++) {
    sep(`スイープ ${sweep} / ${MAX_SWEEPS}`);
    let improved = false;

    for (const key of PARAM_KEYS) {
      const { bestVal, bestScore } = lineSearch(key, current, curScore);
      if (bestVal !== current[key]) {
        console.log(
          `  ${key}: ${current[key]} → ${bestVal}  (+${(bestScore - curScore).toFixed(2)}%)`,
        );
        current = { ...current, [key]: bestVal };
        curScore = bestScore;
        improved = true;
      }
    }

    console.log(`\nスイープ ${sweep} 完了: tkWinPct = ${curScore.toFixed(2)}%`);
    console.log("現在のベスト:", JSON.stringify(current, null, 2));

    // 中間保存
    writeFileSync(
      "dist-sim/testkyubi_best.json",
      JSON.stringify({ sweep, tkWinPct: curScore, params: current }, null, 2),
    );

    if (!improved) {
      console.log("収束: 改善なし → 終了");
      break;
    }
  }

  // 最終検証
  sep(`最終検証 (N=${N_VERIFY})`);
  const final = runManyTestKyubiVsKisin(current, N_VERIFY, KISIN_DEPTH);
  console.log(`最終 tkWinPct: ${final.tkWinPct}%`);
  console.log(`最終 kisinWinPct: ${final.kisinWinPct}%`);
  console.log(
    `最終 avgScore: tk=${final.avgTkScore}, kisin=${final.avgKisinScore}`,
  );
  console.log("\n最終パラメータ:");
  console.log(JSON.stringify(current, null, 2));

  writeFileSync(
    "dist-sim/testkyubi_best.json",
    JSON.stringify(
      {
        sweep: "final",
        tkWinPct: final.tkWinPct,
        kisinWinPct: final.kisinWinPct,
        avgTkScore: final.avgTkScore,
        avgKisinScore: final.avgKisinScore,
        params: current,
      },
      null,
      2,
    ),
  );

  console.log("\n✓ dist-sim/testkyubi_best.json に保存しました");
}

main();
