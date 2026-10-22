export const POINT_SKINS = [
  ["kikkou", "亀甲", 20, "mancolor_stones_wagara"],
  ["sakura", "桜", 20, "mancolor_stones_wagara"],
  ["seigaiha", "青海波", 20, "mancolor_stones_wagara"],
  ["yagasuri", "矢絣", 20, "mancolor_stones_wagara"],
  ["uroko", "鱗", 20, "mancolor_stones_wagara"],
  ["sayagata", "紗綾形", 20, "mancolor_stones_wagara"],
  ["asanoha", "麻の葉", 20, "mancolor_stones_wagara"],
  ["tatewaku", "立涌", 20, "mancolor_stones_wagara"],
  ["kiku", "菊", 20, "mancolor_stones_wagara"],
  ["ume", "梅", 20, "mancolor_stones_wagara"],
  ["kintsugi", "金継ぎ", 100, "mancolor_stones_premium2"],
  ["shippo", "七宝", 100, "mancolor_stones_premium2"],
  ["opal", "オパール", 100, "mancolor_stones_premium2"],
  ["celestial", "天体", 100, "mancolor_stones_premium2"],
  ["kaleido", "万華鏡", 100, "mancolor_stones_premium2"],
].map(([id, label, pointCost, folder]) => ({ id, label, pointCost, folder }));

export const LEGACY_SKIN_REPLACEMENTS = Object.freeze({
  glass: "kikkou",
  star: "yagasuri",
  moon: "uroko",
  ripple: "sayagata",
  makie: "tatewaku",
  snow: "kiku",
  tomoe: "ume",
});

export function resolveSkinSetId(id) {
  return Object.hasOwn(LEGACY_SKIN_REPLACEMENTS, id) ? LEGACY_SKIN_REPLACEMENTS[id] : id;
}

// 保存済みIDを消さずに、旧デザインの所持権を対応する和柄へ引き継ぐ。
export function getSkinOwnershipIds(id) {
  const currentId = resolveSkinSetId(id);
  return [currentId, ...Object.keys(LEGACY_SKIN_REPLACEMENTS)
    .filter((oldId) => LEGACY_SKIN_REPLACEMENTS[oldId] === currentId)];
}

export const SKIN_POINT_COSTS = Object.freeze({
  ...Object.fromEntries(POINT_SKINS.map(({ id, pointCost }) => [id, pointCost])),
});
