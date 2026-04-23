/**
 * mood_check.js -- 気分システムの影響を切り分け検証
 */
import { DEFAULT_PARAMS, mergeParams } from "../src/sim/SimParams.js";
import { runMany } from "../src/sim/SimRunner.js";

const N = 2000;

// A: 現在(両修正あり)
const CURRENT = DEFAULT_PARAMS;

// B: moodFortuneStoreMult 下限なし(=0.3まで下がる旧挙動) を再現
// → SimAI.js のロジックはパラメータで制御できないので、
//   earlyOwnFortune を下げて "低いときの下限なし" 相当に近似
// ※ 完全再現はできないが比較用

function pr(label, s) {
  const draw = (
    100 -
    parseFloat(s.selfWinRate) -
    parseFloat(s.oppWinRate)
  ).toFixed(1);
  const adv = (parseFloat(s.selfWinRate) - parseFloat(s.oppWinRate)).toFixed(1);
  console.log(`  ${label}`);
  console.log(
    `    先手 win: ${s.selfWinRate}  後手 win: ${s.oppWinRate}  draw: ${draw}%  先手優位: ${adv}pt`,
  );
  console.log(
    `    avgDiff: ${s.avgScoreDiff}  guru 先手:${s.avgSelfGuru} 後手:${s.avgOppGuru}`,
  );
}

console.log("=== 先手優位の変化確認 ===\n");

// 現在の設定(center除外 + storeMult下限あり)
const s1 = runMany(CURRENT, CURRENT, N);
pr("CURRENT vs CURRENT (両修正あり)", s1);

console.log("");

// earlyOwnFortune を大きくして「もっと積極的に自占い色入れる」版
const AGGRESSIVE = mergeParams({ earlyOwnFortune: 40, midOwnFortune: 32 });
const s2 = runMany(AGGRESSIVE, AGGRESSIVE, N);
pr("AGGRESSIVE (ownFortune強化) vs AGGRESSIVE", s2);

console.log("");

// earlyOwnFortune を小さくして「ブラフ多め」版
const BLUFF = mergeParams({ earlyOwnFortune: 20, midOwnFortune: 18 });
const s3 = runMany(BLUFF, BLUFF, N);
pr("BLUFF (ownFortune弱め) vs BLUFF", s3);

console.log("");

// 先手後手の非対称: 先手が積極自占い、後手がブラフ
const s4 = runMany(AGGRESSIVE, BLUFF, N);
pr("AGGRESSIVE(先手) vs BLUFF(後手)", s4);
const s5 = runMany(BLUFF, AGGRESSIVE, N);
pr("BLUFF(先手) vs AGGRESSIVE(後手)", s5);
