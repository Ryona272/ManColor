export const RANDOM_MATCH_FALLBACK_DELAY_MS = 60_000;

const AI_DIFFICULTIES = [
  { id: "kooni", label: "小鬼", requires: [] },
  { id: "yasha", label: "夜叉", requires: ["kooni"] },
  { id: "rasetsu", label: "羅刹", requires: ["yasha"] },
  { id: "kisin", label: "鬼神", requires: ["rasetsu"] },
  { id: "kyubi", label: "九尾", requires: ["rasetsu"] },
  { id: "ashura", label: "阿修羅", requires: ["kisin", "kyubi"] },
  { id: "kugutsu", label: "傀儡", requires: ["ashura"] },
];

function isFullyBeaten(beatenData, difficulty) {
  return Boolean(
    beatenData?.[difficulty]?.first && beatenData?.[difficulty]?.second,
  );
}

// ホームのAI選択で実際に選べるAIだけを候補にする。
// 阿修羅は融合演出を見るまで出さず、融合後の鬼神・九尾は傀儡を先後手とも倒すまで出さない。
export function getRandomMatchFallbackOpponent(
  beatenData,
  random = Math.random,
  { ashuraShown = false } = {},
) {
  const rematchOpen =
    ashuraShown &&
    ["kisin", "kyubi", "kugutsu"].every((d) => isFullyBeaten(beatenData, d));
  const available = AI_DIFFICULTIES.filter((difficulty) => {
    if (!difficulty.requires.every((required) => isFullyBeaten(beatenData, required))) {
      return false;
    }
    if (difficulty.id === "ashura") return ashuraShown;
    if (difficulty.id === "kisin" || difficulty.id === "kyubi") {
      return !ashuraShown || rematchOpen;
    }
    return true;
  });
  const index = Math.min(
    available.length - 1,
    Math.floor(random() * available.length),
  );
  const selected = available[index];
  if (!selected) throw new Error("ランダム対戦用のAIを選べませんでした");
  return { aiDifficulty: selected.id, aiLabel: selected.label };
}
