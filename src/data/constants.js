/**
 * ゲーム状態の初期値
 * pits[0-4]:  自分の路（桜→四葉→結び→勾玉→竹）
 * pits[5]:    自分の賽壇
 * pits[6-10]: 相手の路（桜→四葉→結び→勾玉→竹）
 * pits[11]:   相手の賽壇
 */
export const INITIAL_STATE = {
  pits: [
    { stones: [] }, // 0 自分の桜
    { stones: [] }, // 1 自分の四葉
    { stones: [] }, // 2 自分の結び
    { stones: [] }, // 3 自分の勾玉
    { stones: [] }, // 4 自分の竹
    { stones: [] }, // 5 自分の賽壇
    { stones: [] }, // 6 相手の桜
    { stones: [] }, // 7 相手の四葉
    { stones: [] }, // 8 相手の結び
    { stones: [] }, // 9 相手の勾玉
    { stones: [] }, // 10 相手の竹
    { stones: [] }, // 11 相手の賽壇
  ],
  fortune: {
    self: { color: null, seen: false },
    opp: { color: null, seen: false },
    center: [
      { color: null, seenBy: [] }, // 左 +1
      { color: null, seenBy: [] }, // 中央 -2
      { color: null, seenBy: [] }, // 右 +1
    ],
  },
  turn: 1,
};

/** 路の名前（ざくざくの説明用） */
export const PIT_NAMES = {
  0: "桜",
  1: "四葉",
  2: "結び",
  3: "勾玉",
  4: "竹",
  6: "桜",
  7: "四葉",
  8: "結び",
  9: "勾玉",
  10: "竹",
};

/** 中央石の位置名（ちらちらの説明用） */
export const CENTER_POSITION_NAMES = ["左", "中央", "右"];

/** 石の色定義 */
export const STONE_COLORS = {
  red: { label: "赤", value: 3, hex: 0xe05050 },
  blue: { label: "青", value: 1, hex: 0x5080e0 },
  green: { label: "緑", value: 1, hex: 0x50c050 },
  yellow: { label: "黄", value: 1, hex: 0xe0d050 },
  purple: { label: "紫", value: 1, hex: 0xa050c0 },
};

/** 各プレイヤーの全石（各色3個 = 15個） */
export function createPlayerStones() {
  const stones = [];
  for (const [color] of Object.entries(STONE_COLORS)) {
    for (let i = 0; i < 3; i++) {
      stones.push({ color, face: "front" });
    }
  }
  return stones;
}

/** 配列をシャッフル（Fisher–Yates） */
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
