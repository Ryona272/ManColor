/**
 * ManColor ソロ対戦ログ分析スクリプト
 * 使い方: node analyze.mjs [難易度] [サーバーURL]
 * 例:     node analyze.mjs                    # 全難易度
 *         node analyze.mjs rasetsu            # 羅刹のみ
 *         node analyze.mjs kisin              # 鬼神のみ
 *         node analyze.mjs all https://...    # 全難易度 + サーバー指定
 */

// 引数解析: 難易度名っぽいものとURLっぽいものを仕分ける
const DIFFICULTIES = ["kooni", "yasha", "rasetsu", "kisin", "kyubi", "kugutsu"];
let FILTER_DIFF = null;
let SERVER = "https://mancolor.onrender.com";
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith("http")) SERVER = arg;
  else if (DIFFICULTIES.includes(arg)) FILTER_DIFF = arg;
  else if (arg !== "all") console.warn(`⚠ 不明な引数: ${arg}`);
}

const DIFF_JA = {
  kooni: "小鬼",
  yasha: "夜叉",
  rasetsu: "羅刹",
  kisin: "鬼神",
  kyubi: "九尾",
  kugutsu: "傀儡",
};
const PIT_NAMES = [
  "路1",
  "路2",
  "路3",
  "路4",
  "路5",
  "賽壇(自)",
  "路6(AI)",
  "路7(AI)",
  "路8(AI)",
  "路9(AI)",
  "路10(AI)",
  "賽壇(AI)",
];
const COLOR_JA = {
  red: "赤",
  blue: "青",
  green: "緑",
  yellow: "黄",
  purple: "紫",
};

async function fetchLogs(limit = 10000) {
  const res = await fetch(`${SERVER}/logs?limit=${limit}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function splitIntoGames(logs) {
  const games = [];
  let cur = [];
  for (const e of logs) {
    cur.push(e);
    if (e.type === "game_result") {
      games.push(cur);
      cur = [];
    }
  }
  if (cur.length > 0) games.push(cur); // 未完了ゲーム
  return games;
}

function pct(n, d) {
  if (d === 0) return "- ";
  return `${Math.round((n / d) * 100)}%`;
}

function bar(n, max, width = 20) {
  const filled = max > 0 ? Math.round((n / max) * width) : 0;
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function analyze(logs) {
  const games = splitIntoGames(logs);
  const completed = games.filter((g) =>
    g.some((e) => e.type === "game_result"),
  );

  console.log("=".repeat(60));
  console.log("  ManColor ソロ対戦ログ分析");
  console.log("=".repeat(60));
  console.log(
    `総ログ件数: ${logs.length}  /  完了ゲーム数: ${completed.length}\n`,
  );

  if (completed.length === 0) {
    console.log("完了ゲームがまだありません。もっと対戦を積み重ねてください。");
    return;
  }

  // ── 1. 勝敗サマリ ────────────────────────────────────
  console.log("【1. 勝敗サマリ（難易度別）】");
  const byDiff = {};
  for (const g of completed) {
    const result = g.find((e) => e.type === "game_result");
    if (!result) continue;
    const d = result.difficulty || "?";
    if (!byDiff[d]) byDiff[d] = { win: 0, loss: 0, draw: 0 };
    byDiff[d][result.result] = (byDiff[d][result.result] || 0) + 1;
  }
  for (const [d, s] of Object.entries(byDiff)) {
    const total = s.win + s.loss + s.draw;
    console.log(
      `  ${d.padEnd(10)} 勝:${s.win} 負:${s.loss} 引:${s.draw || 0}  勝率:${pct(s.win, total)}`,
    );
  }
  console.log();

  // ── 2. 予測精度 ────────────────────────────────────
  console.log("【2. 最終予測の正誤】");
  const predStats = { correct: 0, wrong: 0 };
  for (const g of completed) {
    const r = g.find((e) => e.type === "game_result");
    if (!r) continue;
    if (r.selfPredictionCorrect) predStats.correct++;
    else predStats.wrong++;
  }
  const predTotal = predStats.correct + predStats.wrong;
  console.log(
    `  的中: ${predStats.correct}  外れ: ${predStats.wrong}  正答率: ${pct(predStats.correct, predTotal)}`,
  );
  console.log();

  // ── 3. ネガティブイベント頻度 ────────────────────────────────────
  console.log("【3. ネガティブイベント（1ゲームあたりの平均回数）】");
  const negTypes = ["ai_zakuzaku", "ai_chirachira", "ai_poipoi", "ai_kutakuta"];
  const negCounts = {};
  for (const t of negTypes) negCounts[t] = 0;
  for (const g of completed) {
    for (const e of g) {
      if (negTypes.includes(e.type)) negCounts[e.type]++;
    }
  }
  const maxNeg = Math.max(...Object.values(negCounts));
  for (const t of negTypes) {
    const avg = (negCounts[t] / completed.length).toFixed(2);
    console.log(
      `  ${t.padEnd(16)} 合計:${String(negCounts[t]).padStart(3)}  平均/ゲーム:${avg}`,
    );
  }
  console.log();

  // ── 4. 負けゲームだけのネガティブイベント ────────────────────────────────────
  const lostGames = completed.filter(
    (g) => g.find((e) => e.type === "game_result")?.result === "loss",
  );
  const wonGames = completed.filter(
    (g) => g.find((e) => e.type === "game_result")?.result === "win",
  );
  if (lostGames.length > 0 && wonGames.length > 0) {
    console.log(
      `【4. 勝ち(${wonGames.length}ゲーム) vs 負け(${lostGames.length}ゲーム) のネガティブイベント比較】`,
    );
    for (const t of negTypes) {
      const lostAvg =
        lostGames.reduce(
          (acc, g) => acc + g.filter((e) => e.type === t).length,
          0,
        ) / lostGames.length;
      const wonAvg =
        wonGames.reduce(
          (acc, g) => acc + g.filter((e) => e.type === t).length,
          0,
        ) / wonGames.length;
      const diff = lostAvg - wonAvg;
      const marker = diff > 0.5 ? " ← 負けで多い!" : "";
      console.log(
        `  ${t.padEnd(16)} 負け平均:${lostAvg.toFixed(2)}  勝ち平均:${wonAvg.toFixed(2)}${marker}`,
      );
    }
    console.log();
  }

  // ── 5. ざくざくの直前に打った路 ────────────────────────────────────
  console.log("【5. AIざくざくの直前に打っていた路 (pit)】");
  const beforeZakuzaku = {};
  for (const g of completed) {
    let lastMove = null;
    for (const e of g) {
      if (e.type === "move") lastMove = e;
      if (e.type === "ai_zakuzaku" && lastMove) {
        const k = `pit${lastMove.pit} (${PIT_NAMES[lastMove.pit] || lastMove.pit})`;
        beforeZakuzaku[k] = (beforeZakuzaku[k] || 0) + 1;
      }
    }
  }
  if (Object.keys(beforeZakuzaku).length === 0) {
    console.log("  データなし");
  } else {
    const maxBZ = Math.max(...Object.values(beforeZakuzaku));
    for (const [k, v] of Object.entries(beforeZakuzaku).sort(
      (a, b) => b[1] - a[1],
    )) {
      console.log(`  ${k.padEnd(20)} ${v}回  ${bar(v, maxBZ, 15)}`);
    }
  }
  console.log();

  // ── 6. ぽいぽいで除去された石の色 ────────────────────────────────────
  console.log("【6. AIぽいぽいで除去された石の色】");
  const poipoiColors = {};
  for (const e of logs) {
    if (e.type === "ai_poipoi" && e.stoneColor) {
      const k = COLOR_JA[e.stoneColor] || e.stoneColor;
      poipoiColors[k] = (poipoiColors[k] || 0) + 1;
    }
  }
  if (Object.keys(poipoiColors).length === 0) {
    console.log("  データなし");
  } else {
    const maxPC = Math.max(...Object.values(poipoiColors));
    for (const [k, v] of Object.entries(poipoiColors).sort(
      (a, b) => b[1] - a[1],
    )) {
      console.log(`  ${k.padEnd(8)} ${v}回  ${bar(v, maxPC, 15)}`);
    }
  }
  console.log();

  // ── 7. プレイヤーがよく打つ路 ────────────────────────────────────
  console.log("【7. プレイヤーがよく打つ路（全ゲーム）】");
  const pitFreq = {};
  for (const e of logs) {
    if (e.type === "move" && e.pit != null) {
      const k = `pit${e.pit} (${PIT_NAMES[e.pit] || e.pit})`;
      pitFreq[k] = (pitFreq[k] || 0) + 1;
    }
  }
  const maxPF = Math.max(...Object.values(pitFreq));
  for (const [k, v] of Object.entries(pitFreq).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(20)} ${v}回  ${bar(v, maxPF, 15)}`);
  }
  console.log();

  // ── 8. 最終スコア分布 ────────────────────────────────────
  console.log("【8. ゲーム終了時スコア分布】");
  for (const g of completed) {
    const r = g.find((e) => e.type === "game_result");
    if (!r) continue;
    const icon = r.result === "win" ? "勝" : r.result === "loss" ? "負" : "引";
    const predMark = r.selfPredictionCorrect ? "予測○" : "予測✗";
    console.log(
      `  [${icon}] 自:${r.selfScore} 相:${r.oppScore}  ${predMark}  難易度:${r.difficulty || "?"}`,
    );
  }
  console.log();
}

let logs = await fetchLogs();

if (FILTER_DIFF) {
  const diffJa = DIFF_JA[FILTER_DIFF] || FILTER_DIFF;
  console.log(`\n🔍 難易度フィルタ: ${FILTER_DIFF} (${diffJa})\n`);
  // ゲーム単位でフィルタ（game_resultのdifficultyで判定）
  const allGames = splitIntoGames(logs);
  const filtered = allGames.filter((g) =>
    g.some((e) => e.type === "game_result" && e.difficulty === FILTER_DIFF),
  );
  if (filtered.length === 0) {
    console.log(`${FILTER_DIFF} の完了ゲームがありません。`);
    process.exit(0);
  }
  logs = filtered.flat();
} else {
  // 難易度一覧を表示
  const allGames = splitIntoGames(logs);
  const completed = allGames.filter((g) =>
    g.some((e) => e.type === "game_result"),
  );
  const diffs = [
    ...new Set(
      completed
        .map((g) => g.find((e) => e.type === "game_result")?.difficulty)
        .filter(Boolean),
    ),
  ];
  if (diffs.length > 1) {
    console.log(`\n💡 難易度別に分析するには: node analyze.mjs <難易度>`);
    console.log(`   利用可能: ${diffs.join(", ")}\n`);
  }
}

analyze(logs);
