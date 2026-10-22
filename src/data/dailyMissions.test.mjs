import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  claimDailyMission,
  getDailyMissionState,
  hasRedeemedSkinWithPoints,
  recordCompletedMatch,
  redeemSkinWithPoints,
} from "./dailyMissions.mjs";
import { LEGACY_SKIN_REPLACEMENTS, POINT_SKINS, SKIN_POINT_COSTS } from "./pointSkins.mjs";
import {
  getOwnedSkinSets,
  getSelectedSkinSet,
  getSkinImageSources,
  getSkinSetDef,
  getPlayerIcon,
  setPlayerIcon,
  isSkinSetOwned,
  selectSkinSet,
  stoneSkinTextureKey,
} from "./stoneSkins.js";

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

function resetStorage() {
  globalThis.localStorage = new MemoryStorage();
}

test("daily progress is saved once and only the matching mission advances", () => {
  resetStorage();
  const date = new Date(2026, 9, 24, 12);

  recordCompletedMatch({ mode: "solo", result: "lose" }, date);
  let state = getDailyMissionState(date);
  assert.equal(state.progress.play_match, true);
  assert.equal(state.progress.win_solo, false);
  assert.equal(state.progress.play_online, false);

  recordCompletedMatch({ mode: "online", result: "draw" }, date);
  state = getDailyMissionState(date);
  assert.equal(state.progress.play_online, true);
  assert.equal(state.progress.play_match, true);
});

test("claims award base or doubled points once", () => {
  resetStorage();
  const date = new Date(2026, 9, 24, 12);
  recordCompletedMatch({ mode: "solo", result: "win" }, date);

  assert.deepEqual(claimDailyMission("play_match", false, date), {
    claimed: true,
    points: 1,
  });
  assert.deepEqual(claimDailyMission("win_solo", true, date), {
    claimed: true,
    points: 3,
  });
  assert.deepEqual(claimDailyMission("win_solo", true, date), {
    claimed: false,
    points: 3,
  });
});

test("daily reset occurs at 05:00 local time and preserves points", () => {
  resetStorage();
  const beforeReset = new Date(2026, 9, 24, 4, 59);
  const afterReset = new Date(2026, 9, 24, 5, 0);
  recordCompletedMatch({ mode: "solo", result: "win" }, beforeReset);
  claimDailyMission("play_match", false, beforeReset);
  claimDailyMission("win_solo", false, beforeReset);
  assert.equal(claimDailyMission("play_match", false, beforeReset).claimed, false);

  let state = getDailyMissionState(afterReset);
  assert.equal(state.dayKey, "2026-10-24");
  assert.equal(state.progress.play_match, false);
  assert.equal(state.points, 2);

  recordCompletedMatch({ mode: "online", result: "draw" }, afterReset);
  state = getDailyMissionState(afterReset);
  assert.equal(state.progress.play_online, true);
});

function seedPoints(points, date = new Date(2026, 9, 24, 12)) {
  recordCompletedMatch({ mode: "solo", result: "win" }, date);
  const saved = JSON.parse(localStorage.getItem("mancolor_daily_missions"));
  saved.points = points;
  localStorage.setItem("mancolor_daily_missions", JSON.stringify(saved));
}

test("catalog has ten 20-point and five 100-point five-color designs", () => {
  assert.equal(POINT_SKINS.length, 15);
  assert.equal(new Set(POINT_SKINS.map(s => s.id)).size, 15);
  assert.equal(POINT_SKINS.filter(s => s.pointCost === 20).length, 10);
  assert.equal(POINT_SKINS.filter(s => s.pointCost === 100).length, 5);
  assert.equal(Object.hasOwn(SKIN_POINT_COSTS, "glow"), false);
  assert.deepEqual(POINT_SKINS.filter(s => s.pointCost === 20).map(s => s.id),
    ["kikkou", "sakura", "seigaiha", "yagasuri", "uroko", "sayagata", "asanoha", "tatewaku", "kiku", "ume"]);
  assert.ok(POINT_SKINS.filter(s => s.pointCost === 20)
    .every(s => s.folder === "mancolor_stones_wagara"));
  const sources = getSkinImageSources();
  assert.equal(sources.length, 80);
  assert.equal(sources.filter(s => s.src.startsWith("/img/mancolor_stones_wagara/")).length, 50);
  assert.equal(sources.filter(s => s.src.startsWith("/img/mancolor_stones_premium2/")).length, 25);
  assert.equal(sources.filter(s => s.src.startsWith("/img/stones/")).length, 5);
});

test("old purchases and equipment inherit the corresponding wagara without a second payment", () => {
  const date = new Date();
  for (const [oldId, newId] of Object.entries(LEGACY_SKIN_REPLACEMENTS)) {
    for (const store of ["stoneSkinSetsOwned", "mancolor_daily_missions"]) {
      resetStorage();
      seedPoints(100, date);
      if (store === "stoneSkinSetsOwned") {
        localStorage.setItem(store, JSON.stringify({ [oldId]: true }));
      } else {
        const state = JSON.parse(localStorage.getItem(store));
        state.redeemedSkinSets[oldId] = true;
        localStorage.setItem(store, JSON.stringify(state));
        assert.equal(hasRedeemedSkinWithPoints(newId, date), true);
      }
      localStorage.setItem("stoneSkinSetSelected", oldId);
      assert.equal(isSkinSetOwned(newId), true);
      assert.equal(isSkinSetOwned(oldId), true);
      assert.equal(getSelectedSkinSet(), newId);
      assert.equal(stoneSkinTextureKey(oldId, "blue"), `blue_${newId}`);
      assert.equal(getOwnedSkinSets()[newId], true);
      assert.deepEqual(POINT_SKINS.filter(s => isSkinSetOwned(s.id)).map(s => s.id), [newId]);
      assert.deepEqual(redeemSkinWithPoints(newId, date),
        { redeemed: false, reason: "owned", points: 100 });
      assert.equal(selectSkinSet(newId), true);
      assert.equal(localStorage.getItem("stoneSkinSetSelected"), newId);
      assert.equal(isSkinSetOwned("opal"), false);
      assert.equal(isSkinSetOwned("hougyoku"), false);
      assert.equal(getDailyMissionState(date).points, 100);
      const tomorrow = new Date(date);
      tomorrow.setDate(tomorrow.getDate() + 1);
      getDailyMissionState(tomorrow);
      assert.equal(isSkinSetOwned(newId), true);
    }
  }
});

test("updated premium artwork preserves every owned and equipped design at 100 points", () => {
  const date = new Date();
  const premium = POINT_SKINS.filter(s => s.pointCost === 100);
  assert.deepEqual(premium.map(s => s.id), ["kintsugi", "shippo", "opal", "celestial", "kaleido"]);
  for (const { id, folder } of premium) {
    assert.equal(folder, "mancolor_stones_premium2");
    for (const store of ["stoneSkinSetsOwned", "mancolor_daily_missions"]) {
      resetStorage();
      seedPoints(100, date);
      if (store === "stoneSkinSetsOwned") {
        localStorage.setItem(store, JSON.stringify({ [id]: true }));
      } else {
        const state = JSON.parse(localStorage.getItem(store));
        state.redeemedSkinSets[id] = true;
        localStorage.setItem(store, JSON.stringify(state));
      }
      localStorage.setItem("stoneSkinSetSelected", id);
      assert.equal(isSkinSetOwned(id), true);
      assert.equal(getSelectedSkinSet(), id);
      assert.deepEqual(redeemSkinWithPoints(id, date),
        { redeemed: false, reason: "owned", points: 100 });
      for (const color of ["red", "blue", "green", "yellow", "purple"]) {
        assert.ok(getSkinImageSources().some(source =>
          source.key === `${color}_${id}` && source.src === `/img/${folder}/${id}_${color}.png`));
      }
    }
  }
});

test("all fifteen designs have five 256px PNG assets", () => {
  for (const { id, folder } of POINT_SKINS) {
    for (const color of ["red", "blue", "green", "yellow", "purple"]) {
      const png = readFileSync(new URL(`../../public/img/${folder}/${id}_${color}.png`, import.meta.url));
      assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
      assert.equal(png.readUInt32BE(16), 256);
      assert.equal(png.readUInt32BE(20), 256);
    }
  }
});

test("each design enforces the exact price and cannot be bought twice", () => {
  const date = new Date(2026, 9, 24, 12);
  for (const [id, cost] of Object.entries(SKIN_POINT_COSTS)) {
    resetStorage();
    seedPoints(cost - 1, date);
    assert.deepEqual(redeemSkinWithPoints(id, date),
      { redeemed: false, reason: "insufficient-points", points: cost - 1 });
    assert.equal(hasRedeemedSkinWithPoints(id, date), false);
    seedPoints(cost, date);
    assert.deepEqual(redeemSkinWithPoints(id, date), { redeemed: true, points: 0 });
    assert.equal(hasRedeemedSkinWithPoints(id, date), true);
    seedPoints(cost + 5, date);
    assert.deepEqual(redeemSkinWithPoints(id, date),
      { redeemed: false, reason: "owned", points: cost + 5 });
  }
});

test("legacy and ad ownership does not spend points again", () => {
  resetStorage();
  const date = new Date(2026, 9, 24, 12);
  seedPoints(100, date);
  localStorage.setItem("stoneSkinSetsOwned", JSON.stringify({ glow: true, hougyoku: true }));
  assert.equal(isSkinSetOwned("glow"), true);
  assert.equal(getSkinSetDef("glow").pointCost, undefined);
  assert.equal(getSkinSetDef("glow").unlockInfo.type, "ad");
  assert.throws(() => redeemSkinWithPoints("glow", date), TypeError);
  localStorage.setItem("stoneSkinSetsOwned", "{}");
  const saved = JSON.parse(localStorage.getItem("mancolor_daily_missions"));
  saved.redeemedSkinSets.glow = true;
  localStorage.setItem("mancolor_daily_missions", JSON.stringify(saved));
  const thirdDay = new Date(2026, 9, 26, 12);
  assert.equal(hasRedeemedSkinWithPoints("glow", thirdDay), true);
  assert.equal(isSkinSetOwned("glow"), true);
  assert.equal(getDailyMissionState(thirdDay).points, 100);
});

test("purchases preserve other skins across daily reset and reload", () => {
  resetStorage();
  const date = new Date(2026, 9, 24, 12);
  seedPoints(140, date);
  for (const id of ["kikkou", "sakura", "opal"]) assert.equal(redeemSkinWithPoints(id, date).redeemed, true);
  const nextDay = new Date(2026, 9, 25, 5);
  for (const id of ["kikkou", "sakura", "opal"]) assert.equal(hasRedeemedSkinWithPoints(id, nextDay), true);
  assert.equal(getDailyMissionState(nextDay).points, 0);
});

test("invalid skin IDs and storage failures are explicit and do not spend points", () => {
  resetStorage();
  const date = new Date(2026, 9, 24, 12);
  seedPoints(100, date);
  for (const id of ["glow", "normal", "hougyoku", "missing", "toString"]) {
    assert.throws(() => redeemSkinWithPoints(id, date), TypeError);
  }
  assert.equal(getDailyMissionState(date).points, 100);
  const saved = localStorage.getItem("mancolor_daily_missions");
  localStorage.setItem = () => { throw new Error("storage full"); };
  assert.throws(() => redeemSkinWithPoints("sakura", date), /storage full/);
  assert.equal(localStorage.getItem("mancolor_daily_missions"), saved);
});

test("player icons support every owned design and color independently of equipment", () => {
  resetStorage();
  assert.deepEqual(getPlayerIcon(), { setId: "normal", color: "red" });
  localStorage.setItem("stoneSkinSetSelected", "ring");
  localStorage.setItem("stoneSkinSetsOwned", JSON.stringify({
    glow: true, hougyoku: true, ...Object.fromEntries(POINT_SKINS.map(s => [s.id, true])),
  }));
  for (const id of ["normal", "ring", "glow", "hougyoku", ...POINT_SKINS.map(s => s.id)]) {
    for (const color of ["red", "blue", "green", "yellow", "purple"]) {
      setPlayerIcon(id, color);
      assert.deepEqual(getPlayerIcon(), { setId: id, color });
      assert.equal(getSelectedSkinSet(), "ring");
    }
  }
  localStorage.setItem("stonePlayerIcon", JSON.stringify({ setId: "glass", color: "green" }));
  assert.deepEqual(getPlayerIcon(), { setId: "kikkou", color: "green" });
});

test("player icons reject unowned designs, invalid colors and storage errors", () => {
  resetStorage();
  setPlayerIcon("ring", "purple");
  const saved = localStorage.getItem("stonePlayerIcon");
  for (const [id, color] of [["opal", "red"], ["missing", "red"], ["normal", "black"], ["normal", "toString"]]) {
    assert.throws(() => setPlayerIcon(id, color), TypeError);
    assert.equal(localStorage.getItem("stonePlayerIcon"), saved);
  }
  localStorage.setItem("stonePlayerIcon", JSON.stringify({ setId: "opal", color: "blue" }));
  assert.deepEqual(getPlayerIcon(), { setId: "normal", color: "blue" });
  localStorage.setItem("stonePlayerIcon", saved);
  localStorage.setItem = () => { throw new Error("storage full"); };
  assert.throws(() => setPlayerIcon("normal", "green"), /storage full/);
  assert.equal(localStorage.getItem("stonePlayerIcon"), saved);
});
