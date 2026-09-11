/**
 * 石デザイン（スキンセット）管理
 * 5色（red/blue/green/yellow/purple）はセットで販売・解放される。
 * 例: 「ノーマル」(初期・塗りつぶし) / 「宝玉」(傀儡討伐で解放、画像デザイン)
 * 所持状況・選択状況は localStorage に保存する。
 */
import { STONE_COLORS } from "./constants.js";

const OWNED_KEY = "stoneSkinSetsOwned";
const SELECTED_KEY = "stoneSkinSetSelected";

/**
 * スキンセット定義（表示順）
 * renderStyle: "fill"(塗りつぶし) | "ring"(輪郭) | "glow"(スライム) | "image"(画像デザイン)
 * isDefault のセットは追加素材なしで作れる無料の初期デザイン（インストール時から選択可）。
 */
export const SKIN_SETS = [
  {
    id: "normal",
    label: "ノーマル",
    isDefault: true,
    renderStyle: "fill",
    unlockInfo: null,
  },
  {
    id: "ring",
    label: "リング",
    isDefault: true,
    renderStyle: "ring",
    unlockInfo: null,
  },
  {
    id: "glow",
    label: "スライム",
    isDefault: false,
    renderStyle: "glow",
    unlockInfo: {
      type: "ad",
      label: "動画を見て入手",
    },
  },
  {
    id: "hougyoku",
    label: "宝玉",
    isDefault: false,
    renderStyle: "image",
    unlockInfo: {
      type: "achievement",
      label: "傀儡を撃破すると入手",
    },
  },
];

/** 「宝玉」セットの各色画像パス */
export const HOUGYOKU_SOURCES = {
  red: "/img/stones/stone_red.png",
  blue: "/img/stones/stone_blue.png",
  green: "/img/stones/stone_green.png",
  yellow: "/img/stones/stone_yellow.png",
  purple: "/img/stones/stone_purple.png",
};

/** セットID・色ごとのテクスチャキー（画像デザイン以外は Graphics 描画のためテクスチャなし） */
export function stoneSkinTextureKey(setId, color) {
  const def = SKIN_SETS.find((s) => s.id === setId);
  if (!def || def.renderStyle !== "image") return null;
  return `${color}_${setId}`;
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback;
  } catch (_e) {
    return fallback;
  }
}

export function getOwnedSkinSets() {
  return readJson(OWNED_KEY, {});
}

export function getSkinSetDef(setId) {
  return SKIN_SETS.find((s) => s.id === setId) ?? null;
}

/** Graphics に石の見た目を描画する（画像デザインは呼び出し側でImage表示すること） */
export function drawStoneGraphic(g, setId, hex, x, y, radius, alpha = 1) {
  const style = getSkinSetDef(setId)?.renderStyle;
  switch (style) {
    case "ring":
      g.fillStyle(hex, alpha * 0.25);
      g.fillCircle(x, y, radius);
      g.lineStyle(6, hex, alpha);
      g.strokeCircle(x, y, radius - 4);
      break;
    case "glow":
      // 半透明のぷにぷにボディ
      g.fillStyle(hex, alpha * 0.82);
      g.fillCircle(x, y, radius);
      // 底の影でぷるっとした厚みを表現
      g.fillStyle(0x000000, alpha * 0.16);
      g.fillCircle(x, y + radius * 0.22, radius * 0.78);
      g.fillStyle(hex, alpha * 0.82);
      g.fillCircle(x, y - radius * 0.06, radius * 0.9);
      // ぷるぷるの縁取り
      g.lineStyle(2, 0xffffff, alpha * 0.4);
      g.strokeCircle(x, y, radius - 1);
      // 大きなハイライト＋小さな光の粒
      g.fillStyle(0xffffff, alpha * 0.7);
      g.fillEllipse(
        x - radius * 0.32,
        y - radius * 0.35,
        radius * 0.85,
        radius * 0.55,
      );
      g.fillStyle(0xffffff, alpha * 0.9);
      g.fillCircle(x + radius * 0.3, y - radius * 0.12, radius * 0.13);
      break;
    default:
      g.fillStyle(hex, alpha);
      g.fillCircle(x, y, radius);
  }
}

/** 対局相手（ソロAI）用に、無料の初期デザインからランダムに1つ選ぶ（宝玉など解放限定デザインは対象外） */
export function pickRandomFreeSkinSetId() {
  const freeSets = SKIN_SETS.filter((s) => s.isDefault);
  const pick = freeSets[Math.floor(Math.random() * freeSets.length)];
  return pick?.id ?? "normal";
}

export function isSkinSetOwned(setId) {
  const def = SKIN_SETS.find((s) => s.id === setId);
  if (def?.isDefault) return true;
  return !!getOwnedSkinSets()[setId];
}

export function unlockSkinSet(setId) {
  if (!SKIN_SETS.some((s) => s.id === setId)) return false;
  const owned = getOwnedSkinSets();
  if (owned[setId]) return false;
  owned[setId] = true;
  localStorage.setItem(OWNED_KEY, JSON.stringify(owned));
  return true;
}

/** 現在選択中のスキンセットID（未所持なら "normal" にフォールバック） */
export function getSelectedSkinSet() {
  const selected = localStorage.getItem(SELECTED_KEY) ?? "normal";
  return isSkinSetOwned(selected) ? selected : "normal";
}

export function selectSkinSet(setId) {
  if (!isSkinSetOwned(setId)) return false;
  localStorage.setItem(SELECTED_KEY, setId);
  return true;
}

/** 石の色から、現在装備中デザインのテクスチャキーを取得（ノーマルなら null＝塗りつぶし） */
export function getStoneTextureKey(color) {
  if (!STONE_COLORS[color]) return null;
  return stoneSkinTextureKey(getSelectedSkinSet(), color);
}

/**
 * 対局中の石デザイン表示モード設定
 * "mixed"(混合・持ち主基準/既定) | "self"(自分のデザインに統一) | "opponent"(相手のデザインに統一)
 */
const DISPLAY_MODE_KEY = "stoneDesignDisplayMode";
export const STONE_DISPLAY_MODES = ["mixed", "self", "opponent"];
export const STONE_DISPLAY_MODE_LABELS = {
  mixed: "混合",
  self: "自分のみ",
  opponent: "相手のみ",
};

export function getStoneDesignMode() {
  const mode = localStorage.getItem(DISPLAY_MODE_KEY);
  return STONE_DISPLAY_MODES.includes(mode) ? mode : "self";
}

export function setStoneDesignMode(mode) {
  if (!STONE_DISPLAY_MODES.includes(mode)) return false;
  localStorage.setItem(DISPLAY_MODE_KEY, mode);
  return true;
}

/** 表示モード設定を踏まえて、この石に使うスキンセットIDを決定する */
export function pickDisplaySkinSetId(
  isOwnStone,
  localSkinSetId,
  opponentSkinSetId,
) {
  const mode = getStoneDesignMode();
  if (mode === "self") return localSkinSetId;
  if (mode === "opponent") return opponentSkinSetId;
  return isOwnStone ? localSkinSetId : opponentSkinSetId;
}

/**
 * ソロ「傀儡」を先手・後手両方で撃破していれば「宝玉」セットを解放する。
 * @param {object} beatenData localStorage "soloBeaten" の内容
 * @returns {boolean} 新規に解放された場合 true
 */
export function checkKugutsuStoneUnlock(beatenData) {
  const done = !!(beatenData?.kugutsu?.first && beatenData?.kugutsu?.second);
  if (!done) return false;
  return unlockSkinSet("hougyoku");
}

/** 阿修羅を先手・後手両方で倒しているか（＝傀儡の名前がホームで判明しているか） */
function isAshuraFullyBeaten() {
  try {
    const beatenData = JSON.parse(localStorage.getItem("soloBeaten") ?? "{}");
    return !!(beatenData?.ashura?.first && beatenData?.ashura?.second);
  } catch (_e) {
    return false;
  }
}

/** ショップの入手方法表示テキスト。傀儡の名前が未判明なら「？？？」に隠す */
export function getSkinUnlockLabel(setId) {
  const def = getSkinSetDef(setId);
  if (!def?.unlockInfo) return null;
  if (setId === "hougyoku" && !isAshuraFullyBeaten()) {
    return "？？？を撃破すると入手";
  }
  return def.unlockInfo.label;
}
