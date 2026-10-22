import { SKIN_POINT_COSTS, getSkinOwnershipIds } from "./pointSkins.mjs";

export const DAILY_MISSION_RESET_HOUR = 5;
export const DAILY_MISSION_POINTS = 1;
export const DAILY_MISSION_DOUBLE_POINTS = 2;

export const DAILY_MISSIONS = [
  {
    id: "play_match",
    title: "対局を1回遊ぶ",
    description: "ソロ・オンラインのどちらでも達成",
  },
  {
    id: "win_solo",
    title: "ソロ対局に1回勝つ",
    description: "AIとの対局で勝利する",
  },
  {
    id: "play_online",
    title: "オンライン対局を1回遊ぶ",
    description: "友達・ランダム対戦のどちらでも達成",
  },
];

const STORAGE_KEY = "mancolor_daily_missions";
const MISSION_IDS = DAILY_MISSIONS.map((mission) => mission.id);

function getDayKey(date) {
  const resetDate = new Date(date);
  resetDate.setHours(resetDate.getHours() - DAILY_MISSION_RESET_HOUR);
  const year = resetDate.getFullYear();
  const month = String(resetDate.getMonth() + 1).padStart(2, "0");
  const day = String(resetDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createState(dayKey, points = 0) {
  return {
    dayKey,
    progress: Object.fromEntries(MISSION_IDS.map((id) => [id, false])),
    claimed: Object.fromEntries(MISSION_IDS.map((id) => [id, false])),
    points,
    redeemedSkinSets: {},
  };
}

function isValidState(state) {
  return (
    state &&
    typeof state === "object" &&
    typeof state.dayKey === "string" &&
    Number.isInteger(state.points) &&
    state.points >= 0 &&
    state.progress &&
    MISSION_IDS.every((id) => typeof state.progress[id] === "boolean") &&
    state.claimed &&
    MISSION_IDS.every((id) => typeof state.claimed[id] === "boolean") &&
    state.redeemedSkinSets &&
    typeof state.redeemedSkinSets === "object" &&
    Object.values(state.redeemedSkinSets).every(
      (redeemed) => typeof redeemed === "boolean",
    )
  );
}

function loadState(date = new Date()) {
  const dayKey = getDayKey(date);
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return createState(dayKey);

  const saved = JSON.parse(raw);
  if (!isValidState(saved)) {
    throw new Error("毎日ミッションの保存データが不正です");
  }

  if (saved.dayKey > dayKey) return saved;

  if (saved.dayKey !== dayKey) {
    const reset = createState(dayKey, saved.points);
    reset.redeemedSkinSets = saved.redeemedSkinSets;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
    return reset;
  }

  return saved;
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getDailyMissionState(date = new Date()) {
  const state = loadState(date);
  return {
    dayKey: state.dayKey,
    progress: { ...state.progress },
    claimed: { ...state.claimed },
    points: state.points,
  };
}

export function recordCompletedMatch({ mode, result }, date = new Date()) {
  if (mode !== "solo" && mode !== "online") {
    throw new TypeError(`未対応の対局モードです: ${mode}`);
  }
  if (!["win", "lose", "draw"].includes(result)) {
    throw new TypeError(`未対応の対局結果です: ${result}`);
  }

  const state = loadState(date);
  state.progress.play_match = true;
  if (mode === "solo" && result === "win") state.progress.win_solo = true;
  if (mode === "online") state.progress.play_online = true;
  saveState(state);
  return getDailyMissionState(date);
}

export function claimDailyMission(missionId, doubleReward = false, date = new Date()) {
  if (!MISSION_IDS.includes(missionId)) {
    throw new TypeError(`未対応のミッションです: ${missionId}`);
  }
  if (typeof doubleReward !== "boolean") {
    throw new TypeError("報酬倍率の指定が不正です");
  }

  const state = loadState(date);
  if (!state.progress[missionId] || state.claimed[missionId]) {
    return { claimed: false, points: state.points };
  }

  state.claimed[missionId] = true;
  state.points += doubleReward
    ? DAILY_MISSION_DOUBLE_POINTS
    : DAILY_MISSION_POINTS;
  saveState(state);
  return { claimed: true, points: state.points };
}

export function redeemSkinWithPoints(skinSetId, date = new Date()) {
  if (!Object.hasOwn(SKIN_POINT_COSTS, skinSetId)) {
    throw new TypeError(`ポイント交換対象ではないデザインです: ${skinSetId}`);
  }
  const state = loadState(date);
  const owned = JSON.parse(localStorage.getItem("stoneSkinSetsOwned") ?? "{}");
  const cost = SKIN_POINT_COSTS[skinSetId];
  if (getSkinOwnershipIds(skinSetId).some((id) => state.redeemedSkinSets[id] || owned[id])) {
    return { redeemed: false, reason: "owned", points: state.points };
  }
  if (state.points < cost) {
    return { redeemed: false, reason: "insufficient-points", points: state.points };
  }

  state.points -= cost;
  state.redeemedSkinSets[skinSetId] = true;
  saveState(state);
  return { redeemed: true, points: state.points };
}

export function hasRedeemedSkinWithPoints(skinSetId, date = new Date()) {
  const state = loadState(date);
  return getSkinOwnershipIds(skinSetId).some((id) => Boolean(state.redeemedSkinSets[id]));
}
