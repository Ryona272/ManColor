const http = require("http");
const { WebSocketServer } = require("ws");

const PORT = Number(process.env.PORT || process.env.ROOM_SERVER_PORT || 8787);
const DISCONNECT_GRACE_MS = 120000;
const DEBUG_NEAR_KUTAKUTA = process.env.DEBUG_NEAR_KUTAKUTA === "1";

const rooms = new Map();
const clients = new Map();
const keyToClientId = new Map();

const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("ok");
});

const wss = new WebSocketServer({ server: httpServer });

function makeClientId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseClientKey(requestUrl = "") {
  try {
    const parsed = new URL(requestUrl, "ws://localhost");
    return parsed.searchParams.get("clientKey") || null;
  } catch (_error) {
    return null;
  }
}

function safeSend(ws, payload) {
  if (!ws || ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(payload));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createEmptyPits() {
  return Array.from({ length: 12 }, () => ({ stones: [] }));
}

function createPlayerStones() {
  const colors = ["red", "blue", "green", "yellow", "purple"];
  const stones = [];
  colors.forEach((color) => {
    for (let i = 0; i < 3; i += 1) {
      stones.push({ color, face: "front" });
    }
  });
  return stones;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createFortune() {
  const colors = shuffle(["red", "blue", "green", "yellow", "purple"]);
  const center = colors.slice(0, 3);
  const selfColor = colors[3];
  const oppColor = colors[4];
  return {
    self: { color: selfColor, seen: false },
    opp: { color: oppColor, seen: false },
    center: center.map((color, index) => ({
      color,
      seenBy: [],
      selfPeekOrder: 0,
      oppPeekOrder: 0,
      bonus: index === 1 ? -2 : +1,
    })),
  };
}

function createInitialMatchState() {
  const pits = createEmptyPits();
  const selfStones = shuffle(createPlayerStones());
  const oppStones = shuffle(createPlayerStones());

  for (let i = 0; i < 5; i += 1) {
    pits[i].stones = selfStones.splice(0, 3);
    pits[6 + i].stones = oppStones.splice(0, 3);
  }

  return {
    pits,
    fortune: createFortune(),
    turn: 1,
    discard: [],
  };
}

function applyDebugNearKutakutaState(state) {
  // Debug-only setup: one move later, kutakuta choice becomes available.
  state.pits = createEmptyPits();

  state.pits[0].stones = [{ color: "red", face: "front" }];
  state.pits[1].stones = [{ color: "blue", face: "front" }];
  state.pits[2].stones = [{ color: "red", face: "front" }];
  state.pits[3].stones = [{ color: "blue", face: "front" }];
  state.pits[4].stones = [{ color: "red", face: "front" }];

  state.pits[6].stones = [{ color: "green", face: "front" }];
  state.pits[7].stones = [{ color: "yellow", face: "front" }];
  state.pits[8].stones = [{ color: "purple", face: "front" }];
  state.pits[9].stones = [{ color: "green", face: "front" }];
  state.pits[10].stones = [{ color: "yellow", face: "front" }];

  state.pits[5].stones = [
    { color: "red", face: "front" },
    { color: "blue", face: "front" },
  ];
  state.pits[11].stones = [
    { color: "green", face: "front" },
    { color: "yellow", face: "front" },
  ];

  state.fortune = {
    self: { color: "red", seen: false },
    opp: { color: "green", seen: false },
    center: [
      {
        color: "blue",
        seenBy: ["self"],
        selfPeekOrder: 1,
        oppPeekOrder: 0,
        bonus: +1,
      },
      {
        color: "purple",
        seenBy: ["opp"],
        selfPeekOrder: 0,
        oppPeekOrder: 1,
        bonus: -2,
      },
      {
        color: "yellow",
        seenBy: [],
        selfPeekOrder: 0,
        oppPeekOrder: 0,
        bonus: +1,
      },
    ],
  };

  state.turn = 25;
  state.discard = [];
}

function generateRoomCode() {
  const chars = "0123456789";
  let code = "";
  for (let i = 0; i < 4; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function memberRoleByIndex(index) {
  return index === 0 ? "self" : "opp";
}

function getRoomState(code) {
  const room = rooms.get(code);
  if (!room) return null;

  return {
    code,
    hostId: room.hostId,
    members: room.members.map((member, index) => ({
      clientId: member.clientId,
      ready: !!member.ready,
      online: !!member.online,
      role: memberRoleByIndex(index),
    })),
  };
}

function getPlayerRole(room, clientId) {
  const index = room.members.findIndex(
    (member) => member.clientId === clientId,
  );
  if (index < 0) return null;
  return memberRoleByIndex(index);
}

function getLaneRange(role) {
  return role === "self" ? [0, 4] : [6, 10];
}

function getStoreIndex(role) {
  return role === "self" ? 5 : 11;
}

function getMatchingPit(role, pitIndex) {
  if (role === "self") {
    const distance = 5 - pitIndex;
    return 11 - distance;
  }
  const distance = 11 - pitIndex;
  return 5 - distance;
}

function distributeCaptured(state, role, captured) {
  if (!captured.length) return;
  const lane = role === "self" ? [0, 1, 2, 3, 4] : [6, 7, 8, 9, 10];
  let cursor = 0;
  captured.forEach((stone) => {
    state.pits[lane[cursor]].stones.push(stone);
    cursor = (cursor + 1) % lane.length;
  });
}

function calcScore(state, role) {
  const storeIndex = getStoreIndex(role);
  const store = state.pits[storeIndex].stones;
  const ownFortune =
    role === "self" ? state.fortune.self.color : state.fortune.opp.color;
  const oppFortune =
    role === "self" ? state.fortune.opp.color : state.fortune.self.color;

  let score = 0;
  store.forEach((stone) => {
    if (stone.color === ownFortune) {
      score += 3;
      return;
    }
    if (stone.color === oppFortune) {
      score += 5;
      return;
    }

    const center = state.fortune.center.find(
      (item) => item.color === stone.color,
    );
    if (center) score += center.bonus;
  });

  return score;
}

function isGameOver(state) {
  const selfEmpty = state.pits
    .slice(0, 5)
    .every((pit) => pit.stones.length === 0);
  const oppEmpty = state.pits
    .slice(6, 11)
    .every((pit) => pit.stones.length === 0);
  return selfEmpty || oppEmpty;
}

function buildSowTargets(startPit, stoneCount) {
  const targets = [];
  let cursor = startPit;
  for (let i = 0; i < stoneCount; i += 1) {
    cursor = (cursor + 1) % 12;
    targets.push(cursor);
  }
  return targets;
}

// ─── フェーズチェーン用ヘルパー ────────────────────────────────────────────

function canActivateKutakuta(state, role) {
  const laneIndexes = role === "self" ? [0, 1, 2, 3, 4] : [6, 7, 8, 9, 10];
  const colors = new Set();
  for (const i of laneIndexes) {
    for (const stone of state.pits[i].stones) {
      colors.add(stone.color);
    }
  }
  return colors.size <= 2;
}

function canUseChirachira(room, role) {
  return ((room.match.centerPeekProgress || {})[role] ?? 0) < 3;
}

function revealNextCenter(room, role) {
  const order = [0, 1, 2];
  if (!room.match.centerPeekProgress) {
    room.match.centerPeekProgress = { self: 0, opp: 0 };
  }
  const progress = room.match.centerPeekProgress[role] ?? 0;
  if (progress >= 3) return null;
  room.match.centerPeekProgress[role] = progress + 1;
  const viewIndex = order[progress];
  const targetIndex =
    role === "opp" ? (viewIndex != null ? 2 - viewIndex : null) : viewIndex;
  if (targetIndex == null) return null;
  const centerStone = room.match.state.fortune.center[targetIndex];
  if (!centerStone.seenBy.includes(role)) {
    centerStone.seenBy.push(role);
  }
  const orderKey = role === "self" ? "selfPeekOrder" : "oppPeekOrder";
  centerStone[orderKey] = progress + 1;
  return { index: targetIndex };
}

function getPreferredPoipoiStore(state, role) {
  const oppStore = role === "self" ? 11 : 5;
  const ownStore = role === "self" ? 5 : 11;
  if (state.pits[oppStore].stones.length > 0) return oppStore;
  if (state.pits[ownStore].stones.length > 0) return ownStore;
  return null;
}

function clearFinalPhaseTimer(room) {
  if (room?.match?.finalPhaseTimer) {
    clearTimeout(room.match.finalPhaseTimer);
    room.match.finalPhaseTimer = null;
  }
}

function queueFinalPhaseStep(room, delayMs, nextStage) {
  clearFinalPhaseTimer(room);
  room.match.finalPhaseTimer = setTimeout(() => {
    const liveRoom = rooms.get(room.code);
    if (!liveRoom || !liveRoom.match || !liveRoom.match.ended) return;
    nextStage(liveRoom);
    broadcastMatchState(liveRoom.code);
  }, delayMs);
}

function openPoipoiForActor(room, actor) {
  room.match.currentTurn = actor;
  room.match.phase = "final-phase";
  room.match.finalPhase.stage = "poipoi-store";
  room.match.finalPhase.poipoiActor = actor;
  room.match.finalPhase.poipoiStoreIndex = null;
}

function enterScoreIntro(room) {
  room.match.phase = "final-phase";
  room.match.finalPhase.stage = "score-intro";
  room.match.finalPhase.poipoiActor = null;
  room.match.finalPhase.poipoiStoreIndex = null;
  queueFinalPhaseStep(room, 1500, (liveRoom) => {
    const state = liveRoom.match.state;
    const selfScore = calcScore(state, "self");
    const oppScore = calcScore(state, "opp");
    liveRoom.match.result = {
      selfScore,
      oppScore,
      winner:
        selfScore === oppScore ? "draw" : selfScore > oppScore ? "self" : "opp",
    };
    liveRoom.match.finalPhase.stage = "score-ready";
  });
}

function continueFinalPoipoi(room) {
  const fp = room.match.finalPhase;
  if (!fp) return;

  if ((fp.poipoiRemaining?.self ?? 0) > 0) {
    openPoipoiForActor(room, "self");
    return;
  }

  if ((fp.poipoiRemaining?.opp ?? 0) > 0) {
    openPoipoiForActor(room, "opp");
    return;
  }

  enterScoreIntro(room);
}

function startFinalPhase(room, action) {
  room.match.ended = true;
  room.match.phase = "final-phase";
  room.match.currentTurn = "self";
  room.match.result = null;
  room.match.finalPhase = {
    stage: "ending-intro",
    predictions: { self: null, opp: null },
    poipoiRemaining: { self: 0, opp: 0 },
    poipoiActor: null,
    poipoiStoreIndex: null,
  };
  room.match.actionSeq = (room.match.actionSeq || 0) + 1;
  room.match.lastAction = { ...action, id: room.match.actionSeq };

  queueFinalPhaseStep(room, 1400, (liveRoom) => {
    if (!liveRoom.match?.finalPhase) return;
    liveRoom.match.currentTurn = "self";
    liveRoom.match.finalPhase.stage = "predict-self";
  });
}

/** 撒き完了後: special-choice チェック → finishMove に進む */
function continueAfterSowing(room, role, lastPit, extraTurn, action) {
  const oppStore = role === "self" ? 11 : 5;
  if (lastPit === oppStore) {
    room.match.phase = "special-choice";
    room.match.pendingExtraTurn = false;
    room.match.pendingAction = clone(action);
    room.match.actionSeq = (room.match.actionSeq || 0) + 1;
    room.match.lastAction = { ...action, id: room.match.actionSeq };
    return;
  }
  finishMove(room, role, extraTurn, action);
}

/** ゲーム終了・くたくた・手番切替を処理してフェーズを "turn" に戻す */
function finishMove(room, role, extraTurn, action) {
  const state = room.match.state;
  state.turn += 1;

  if (isGameOver(state)) {
    startFinalPhase(room, action);
    return;
  }

  if (canActivateKutakuta(state, role)) {
    room.match.phase = "kutakuta-choice";
    room.match.pendingExtraTurn = extraTurn;
    room.match.pendingAction = clone(action);
    room.match.actionSeq = (room.match.actionSeq || 0) + 1;
    room.match.lastAction = { ...action, id: room.match.actionSeq };
    return;
  }

  if (!extraTurn) {
    room.match.currentTurn = role === "self" ? "opp" : "self";
  }
  room.match.phase = "turn";
  room.match.actionSeq = (room.match.actionSeq || 0) + 1;
  room.match.lastAction = { ...action, id: room.match.actionSeq };
}

function completeTurnAfterSowing(room, role, lastPit) {
  const state = room.match.state;
  const action = {
    type: "move",
    actor: role,
    lastPit,
    captureTarget: null,
    capturedCount: 0,
    extraTurn: false,
    technique: null,
  };

  room.match.sowPending = [];
  room.match.sowTargets = [];
  room.match.sowLastPit = null;
  room.match.sowSourcePitIndex = null;
  room.match.sowHistory = [];

  const [laneStart, laneEnd] = getLaneRange(role);
  if (
    lastPit >= laneStart &&
    lastPit <= laneEnd &&
    state.pits[lastPit].stones.length === 1
  ) {
    const matching = getMatchingPit(role, lastPit);
    const targetPit = state.pits[matching];
    if (targetPit && targetPit.stones.length > 0) {
      const captured = [...targetPit.stones];
      targetPit.stones = [];
      action.captureTarget = matching;
      action.capturedCount = captured.length;
      // 手動配置フェーズへ
      room.match.phase = "placing";
      room.match.placementPending = captured;
      room.match.placementHistory = [];
      room.match.pendingAction = {
        type: "move",
        actor: role,
        lastPit: null,
        captureTarget: null,
        capturedCount: 0,
        extraTurn: false,
        technique: null,
      };
      room.match.pendingExtraTurn = false;
      room.match.actionSeq = (room.match.actionSeq || 0) + 1;
      room.match.lastAction = { ...action, id: room.match.actionSeq };
      return;
    }
  }

  const ownStore = getStoreIndex(role);
  const extraTurn = lastPit === ownStore;
  action.extraTurn = extraTurn;
  continueAfterSowing(room, role, lastPit, extraTurn, action);
}

function applyMove(room, role, pitIndex) {
  const state = room.match.state;
  const [start, end] = getLaneRange(role);
  if (pitIndex < start || pitIndex > end) {
    return { ok: false, reason: "この路は選択できません" };
  }

  const pit = state.pits[pitIndex];
  if (!pit || pit.stones.length === 0) {
    return { ok: false, reason: "石がない路です" };
  }

  const stones = [...pit.stones];
  pit.stones = [];
  room.match.phase = "sowing";
  room.match.sowPending = stones;
  room.match.sowTargets = buildSowTargets(pitIndex, stones.length);
  room.match.sowLastPit = null;
  room.match.sowSourcePitIndex = pitIndex;
  room.match.sowHistory = [];

  return { ok: true };
}

function requestSowingChoice(clientId, pendingIndex) {
  const client = clients.get(clientId);
  if (!client || !client.roomCode) return;

  const room = rooms.get(client.roomCode);
  if (!room || !room.match || room.match.ended) return;
  if (room.match.phase !== "sowing") return;

  const role = getPlayerRole(room, clientId);
  if (!role) return;
  if (room.match.currentTurn !== role) return;

  const pending = room.match.sowPending || [];
  const targets = room.match.sowTargets || [];
  const index = Number(pendingIndex);
  if (!Number.isInteger(index) || index < 0 || index >= pending.length) {
    safeSend(client.ws, {
      type: "error",
      message: "撒く石の選択が不正です",
    });
    return;
  }
  if (targets.length === 0) return;

  const targetPit = targets.shift();
  const [stone] = pending.splice(index, 1);
  room.match.state.pits[targetPit].stones.push(stone);
  room.match.sowHistory = room.match.sowHistory || [];
  room.match.sowHistory.push({ targetPit, stone, pendingIndex: index });
  room.match.sowLastPit = targetPit;

  if (pending.length === 0) {
    completeTurnAfterSowing(room, role, targetPit);
  }

  broadcastMatchState(room.code);
}

function requestUndoSowing(clientId) {
  const client = clients.get(clientId);
  if (!client || !client.roomCode) return;

  const room = rooms.get(client.roomCode);
  if (!room || !room.match || room.match.ended) return;
  if (room.match.phase !== "sowing") return;

  const role = getPlayerRole(room, clientId);
  if (!role || room.match.currentTurn !== role) return;

  const history = room.match.sowHistory || [];
  const pending = room.match.sowPending || [];
  const targets = room.match.sowTargets || [];

  if (history.length === 0) {
    const sourcePit = room.match.sowSourcePitIndex;
    if (sourcePit == null) {
      safeSend(client.ws, { type: "error", message: "これ以上戻せません" });
      return;
    }
    room.match.state.pits[sourcePit].stones = [...pending];
    room.match.phase = "turn";
    room.match.sowPending = [];
    room.match.sowTargets = [];
    room.match.sowLastPit = null;
    room.match.sowSourcePitIndex = null;
    room.match.sowHistory = [];
    broadcastMatchState(room.code);
    return;
  }

  const last = history.pop();
  const pit = room.match.state.pits[last.targetPit];
  const restoredStone = pit.stones.pop();
  if (!restoredStone) {
    safeSend(client.ws, { type: "error", message: "戻し処理に失敗しました" });
    return;
  }

  targets.unshift(last.targetPit);
  pending.splice(last.pendingIndex, 0, restoredStone);
  room.match.sowLastPit =
    history.length > 0 ? history[history.length - 1].targetPit : null;
  broadcastMatchState(room.code);
}

function requestPlacement(clientId, pitIndex, pendingIndex) {
  const client = clients.get(clientId);
  if (!client || !client.roomCode) return;
  const room = rooms.get(client.roomCode);
  if (!room || !room.match || room.match.ended) return;
  if (room.match.phase !== "placing") return;

  const role = getPlayerRole(room, clientId);
  if (!role || room.match.currentTurn !== role) {
    safeSend(client.ws, {
      type: "error",
      message: "あなたの手番ではありません",
    });
    return;
  }

  const [laneStart, laneEnd] = getLaneRange(role);
  const pit = Number(pitIndex);
  if (!Number.isInteger(pit) || pit < laneStart || pit > laneEnd) {
    safeSend(client.ws, { type: "error", message: "この路には置けません" });
    return;
  }

  const pending = room.match.placementPending || [];
  const idx = Number(pendingIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx >= pending.length) {
    safeSend(client.ws, { type: "error", message: "石の選択が不正です" });
    return;
  }

  const [stone] = pending.splice(idx, 1);
  room.match.state.pits[pit].stones.push(stone);
  room.match.placementHistory = room.match.placementHistory || [];
  room.match.placementHistory.push({ pitIndex: pit, pendingIndex: idx });

  if (pending.length === 0) {
    const pendingAction = room.match.pendingAction || {};
    room.match.placementPending = [];
    room.match.placementHistory = [];
    room.match.pendingAction = null;
    finishMove(room, role, false, pendingAction);
  }

  broadcastMatchState(room.code);
}

function requestUndoPlacement(clientId) {
  const client = clients.get(clientId);
  if (!client || !client.roomCode) return;
  const room = rooms.get(client.roomCode);
  if (!room || !room.match || room.match.ended) return;
  if (room.match.phase !== "placing") return;

  const role = getPlayerRole(room, clientId);
  if (!role || room.match.currentTurn !== role) return;

  const history = room.match.placementHistory || [];
  const pending = room.match.placementPending || [];
  const last = history.pop();
  if (!last) {
    safeSend(client.ws, { type: "error", message: "これ以上戻せません" });
    return;
  }

  const pit = room.match.state.pits[last.pitIndex];
  const restoredStone = pit.stones.pop();
  if (!restoredStone) {
    safeSend(client.ws, { type: "error", message: "戻し処理に失敗しました" });
    return;
  }

  pending.splice(last.pendingIndex, 0, restoredStone);
  broadcastMatchState(room.code);
}

function requestSpecialChoice(clientId, choiceAction) {
  const client = clients.get(clientId);
  if (!client || !client.roomCode) return;
  const room = rooms.get(client.roomCode);
  if (!room || !room.match || room.match.ended) return;
  if (room.match.phase !== "special-choice") return;

  const role = getPlayerRole(room, clientId);
  if (!role || room.match.currentTurn !== role) return;

  const pendingAction = room.match.pendingAction || {};
  room.match.pendingAction = null;

  if (choiceAction === "chirachira") {
    if (!canUseChirachira(room, role)) {
      safeSend(client.ws, { type: "error", message: "ちらちらは使い切りです" });
      return;
    }
    const revealInfo = revealNextCenter(room, role);
    finishMove(room, role, false, {
      ...pendingAction,
      technique: "chirachira",
      revealIndex: revealInfo?.index ?? null,
    });
    broadcastMatchState(room.code);
    return;
  }

  if (choiceAction === "poipoi") {
    const preferredStore = getPreferredPoipoiStore(room.match.state, role);
    if (preferredStore == null) {
      finishMove(room, role, false, pendingAction);
      broadcastMatchState(room.code);
      return;
    }
    room.match.phase = "poipoi-store";
    room.match.pendingAction = pendingAction;
    broadcastMatchState(room.code);
    return;
  }

  safeSend(client.ws, { type: "error", message: "不正な選択です" });
}

function requestPoipoiStore(clientId, storeIndex) {
  const client = clients.get(clientId);
  if (!client || !client.roomCode) return;
  const room = rooms.get(client.roomCode);
  if (!room || !room.match || room.match.ended) return;
  if (room.match.phase !== "poipoi-store") return;

  const role = getPlayerRole(room, clientId);
  if (!role || room.match.currentTurn !== role) return;

  const idx = Number(storeIndex);
  if (idx !== 5 && idx !== 11) {
    safeSend(client.ws, { type: "error", message: "賽壇を選択してください" });
    return;
  }
  const selfStoreCount = room.match.state.pits[5].stones.length;
  const oppStoreCount = room.match.state.pits[11].stones.length;
  if (selfStoreCount === 0 && oppStoreCount === 0) {
    const pendingAction = room.match.pendingAction || {};
    room.match.pendingAction = null;
    room.match.poipoiStoreIndex = null;
    finishMove(room, role, false, { ...pendingAction, technique: "poipoi" });
    broadcastMatchState(room.code);
    return;
  }

  if (room.match.state.pits[idx].stones.length === 0) {
    safeSend(client.ws, {
      type: "error",
      message: "石がある賽壇を選択してください",
    });
    return;
  }

  room.match.phase = "poipoi-stone";
  room.match.poipoiStoreIndex = idx;
  broadcastMatchState(room.code);
}

function requestPoipoiStone(clientId, stoneIndex) {
  const client = clients.get(clientId);
  if (!client || !client.roomCode) return;
  const room = rooms.get(client.roomCode);
  if (!room || !room.match || room.match.ended) return;
  if (room.match.phase !== "poipoi-stone") return;

  const role = getPlayerRole(room, clientId);
  if (!role || room.match.currentTurn !== role) return;

  const storeIdx = room.match.poipoiStoreIndex;
  if (storeIdx == null) return;

  const storePit = room.match.state.pits[storeIdx];
  const idx = Number(stoneIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx >= storePit.stones.length) {
    safeSend(client.ws, { type: "error", message: "石の選択が不正です" });
    return;
  }

  const [removed] = storePit.stones.splice(idx, 1);
  if (!room.match.state.discard) room.match.state.discard = [];
  room.match.state.discard.push(removed);

  const pendingAction = {
    ...(room.match.pendingAction || {}),
    technique: "poipoi",
  };
  room.match.pendingAction = null;
  room.match.poipoiStoreIndex = null;
  finishMove(room, role, false, pendingAction);
  broadcastMatchState(room.code);
}

function requestKutakutaChoice(clientId, choiceAction) {
  const client = clients.get(clientId);
  if (!client || !client.roomCode) return;
  const room = rooms.get(client.roomCode);
  if (!room || !room.match || room.match.ended) return;
  if (room.match.phase !== "kutakuta-choice") return;

  const role = getPlayerRole(room, clientId);
  if (!role || room.match.currentTurn !== role) return;

  const extraTurn = room.match.pendingExtraTurn || false;
  const pendingAction = room.match.pendingAction || {};
  room.match.pendingAction = null;
  room.match.pendingExtraTurn = false;

  if (choiceAction === "kutakuta") {
    const action = { ...pendingAction, technique: "kutakuta" };
    startFinalPhase(room, action);
    broadcastMatchState(room.code);
    return;
  }

  // "madamada" — くたくたをスキップ
  if (!extraTurn) {
    room.match.currentTurn = role === "self" ? "opp" : "self";
  }
  room.match.phase = "turn";
  room.match.actionSeq = (room.match.actionSeq || 0) + 1;
  room.match.lastAction = {
    ...pendingAction,
    extraTurn,
    id: room.match.actionSeq,
  };
  broadcastMatchState(room.code);
}

function requestRematch(clientId) {
  const client = clients.get(clientId);
  if (!client || !client.roomCode) return;

  const room = rooms.get(client.roomCode);
  if (!room || !room.match || !room.match.ended) return;

  const role = getPlayerRole(room, clientId);
  if (!role) return;

  if (!room.rematchVotes) {
    room.rematchVotes = { self: false, opp: false };
  }

  room.rematchVotes[role] = true;

  room.members.forEach((member) => {
    const target = clients.get(member.clientId);
    if (!target || !target.online) return;
    safeSend(target.ws, {
      type: "rematch_status",
      requesterRole: role,
      votes: clone(room.rematchVotes),
    });
  });

  if (!(room.rematchVotes.self && room.rematchVotes.opp)) {
    return;
  }

  // Alternate colors every rematch by swapping member order.
  room.members.reverse();
  room.rematchVotes = { self: false, opp: false };
  startMatch(room);
}

function getMatchPayload(room, forClientId) {
  if (!room.match) return null;
  const role = getPlayerRole(room, forClientId);
  return {
    type: "match_state",
    roomCode: room.code,
    role,
    currentTurn: room.match.currentTurn,
    state: clone(room.match.state),
    action: room.match.lastAction || null,
    phase: room.match.phase || "turn",
    sowPending: clone(room.match.sowPending || []),
    sowTargets: clone(room.match.sowTargets || []),
    placementPending: clone(room.match.placementPending || []),
    poipoiStoreIndex: room.match.poipoiStoreIndex ?? null,
    ended: !!room.match.ended,
    result: room.match.result || null,
    finalPhase: clone(room.match.finalPhase || null),
  };
}

function requestFinalPrediction(clientId, color) {
  const client = clients.get(clientId);
  if (!client || !client.roomCode) return;
  const room = rooms.get(client.roomCode);
  if (!room || !room.match || !room.match.ended) return;
  if (room.match.phase !== "final-phase") return;
  const fp = room.match.finalPhase;
  if (!fp) return;

  const role = getPlayerRole(room, clientId);
  if (!role || room.match.currentTurn !== role) return;
  if (fp.stage !== "predict-self" && fp.stage !== "predict-opp") return;

  const allowed = new Set(["red", "blue", "green", "yellow", "purple"]);
  if (!allowed.has(color)) {
    safeSend(client.ws, { type: "error", message: "予測色が不正です" });
    return;
  }

  fp.predictions[role] = color;

  if (fp.stage === "predict-self") {
    fp.stage = "predict-opp";
    room.match.currentTurn = "opp";
    broadcastMatchState(room.code);
    return;
  }

  fp.stage = "reveal";
  const selfActual = room.match.state.fortune.self.color;
  const oppActual = room.match.state.fortune.opp.color;
  const selfHit = fp.predictions.self === oppActual;
  const oppHit = fp.predictions.opp === selfActual;
  fp.poipoiRemaining.self = selfHit ? 2 : 0;
  fp.poipoiRemaining.opp = oppHit ? 2 : 0;

  queueFinalPhaseStep(room, 1800, (liveRoom) => {
    continueFinalPoipoi(liveRoom);
  });

  broadcastMatchState(room.code);
}

function requestFinalPoipoiStore(clientId, storeIndex) {
  const client = clients.get(clientId);
  if (!client || !client.roomCode) return;
  const room = rooms.get(client.roomCode);
  if (!room || !room.match || !room.match.ended) return;
  if (room.match.phase !== "final-phase") return;
  const fp = room.match.finalPhase;
  if (!fp || fp.stage !== "poipoi-store") return;

  const role = getPlayerRole(room, clientId);
  if (!role || role !== fp.poipoiActor || room.match.currentTurn !== role)
    return;

  const selfStoreCount = room.match.state.pits[5].stones.length;
  const oppStoreCount = room.match.state.pits[11].stones.length;
  if (selfStoreCount === 0 && oppStoreCount === 0) {
    fp.poipoiRemaining[role] = 0;
    continueFinalPoipoi(room);
    broadcastMatchState(room.code);
    return;
  }

  const idx = Number(storeIndex);
  if (idx !== 5 && idx !== 11) {
    safeSend(client.ws, { type: "error", message: "賽壇を選択してください" });
    return;
  }

  if (room.match.state.pits[idx].stones.length === 0) {
    safeSend(client.ws, {
      type: "error",
      message: "石がある賽壇を選択してください",
    });
    return;
  }

  fp.stage = "poipoi-stone";
  fp.poipoiStoreIndex = idx;
  broadcastMatchState(room.code);
}

function requestFinalPoipoiStone(clientId, stoneIndex) {
  const client = clients.get(clientId);
  if (!client || !client.roomCode) return;
  const room = rooms.get(client.roomCode);
  if (!room || !room.match || !room.match.ended) return;
  if (room.match.phase !== "final-phase") return;
  const fp = room.match.finalPhase;
  if (!fp || fp.stage !== "poipoi-stone") return;

  const role = getPlayerRole(room, clientId);
  if (!role || role !== fp.poipoiActor || room.match.currentTurn !== role)
    return;

  const storeIdx = fp.poipoiStoreIndex;
  if (storeIdx == null) return;
  const storePit = room.match.state.pits[storeIdx];
  const idx = Number(stoneIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx >= storePit.stones.length) {
    safeSend(client.ws, { type: "error", message: "石の選択が不正です" });
    return;
  }

  const [removed] = storePit.stones.splice(idx, 1);
  room.match.state.discard = room.match.state.discard || [];
  room.match.state.discard.push(removed);

  fp.poipoiStoreIndex = null;
  fp.poipoiRemaining[role] = Math.max(0, (fp.poipoiRemaining[role] ?? 0) - 1);
  continueFinalPoipoi(room);
  broadcastMatchState(room.code);
}

function broadcastRoomState(code) {
  const room = rooms.get(code);
  if (!room) return;
  const payload = { type: "room_state", room: getRoomState(code) };
  room.members.forEach((member) => {
    const client = clients.get(member.clientId);
    if (!client || !client.online) return;
    safeSend(client.ws, payload);
  });
}

function broadcastMatchState(code) {
  const room = rooms.get(code);
  if (!room || !room.match) return;

  room.members.forEach((member) => {
    const client = clients.get(member.clientId);
    if (!client || !client.online) return;
    safeSend(client.ws, getMatchPayload(room, member.clientId));
  });
}

function cleanupClient(clientId) {
  const client = clients.get(clientId);
  if (!client) return;

  if (client.cleanupTimer) {
    clearTimeout(client.cleanupTimer);
    client.cleanupTimer = null;
  }

  if (client.roomCode) {
    const room = rooms.get(client.roomCode);
    if (room) {
      room.members = room.members.filter(
        (member) => member.clientId !== clientId,
      );
      if (room.members.length === 0) {
        rooms.delete(client.roomCode);
      } else {
        if (room.hostId === clientId) {
          room.hostId = room.members[0].clientId;
        }
        broadcastRoomState(room.code);
      }
    }
  }

  keyToClientId.delete(client.clientKey);
  clients.delete(clientId);
}

function markClientOffline(clientId) {
  const client = clients.get(clientId);
  if (!client) return;

  client.online = false;
  client.ws = null;

  if (client.roomCode) {
    const room = rooms.get(client.roomCode);
    if (room) {
      const member = room.members.find((item) => item.clientId === clientId);
      if (member) member.online = false;
      broadcastRoomState(room.code);
    }
  }

  if (client.cleanupTimer) {
    clearTimeout(client.cleanupTimer);
  }

  client.cleanupTimer = setTimeout(
    () => cleanupClient(clientId),
    DISCONNECT_GRACE_MS,
  );
}

function attachConnection(client, ws) {
  client.ws = ws;
  client.online = true;

  if (client.cleanupTimer) {
    clearTimeout(client.cleanupTimer);
    client.cleanupTimer = null;
  }

  if (client.roomCode) {
    const room = rooms.get(client.roomCode);
    if (room) {
      const member = room.members.find(
        (item) => item.clientId === client.clientId,
      );
      if (member) member.online = true;
      broadcastRoomState(room.code);
      if (room.match) {
        safeSend(ws, getMatchPayload(room, client.clientId));
      }
    }
  }
}

function removeClientFromRoom(clientId, notify = true) {
  const client = clients.get(clientId);
  if (!client || !client.roomCode) return;

  const roomCode = client.roomCode;
  const room = rooms.get(roomCode);
  client.roomCode = null;

  if (!room) return;

  room.members = room.members.filter((member) => member.clientId !== clientId);

  if (room.members.length === 0) {
    rooms.delete(roomCode);
    return;
  }

  // 退室で対戦は中断するが、残ったメンバーのready状態は維持する
  room.match = null;

  if (room.hostId === clientId) {
    room.hostId = room.members[0].clientId;
  }

  if (notify) {
    broadcastRoomState(roomCode);
  }
}

function createRoom(clientId) {
  const client = clients.get(clientId);
  if (!client) return;

  removeClientFromRoom(clientId, false);

  let code = generateRoomCode();
  while (rooms.has(code)) {
    code = generateRoomCode();
  }

  const room = {
    code,
    hostId: clientId,
    members: [{ clientId, ready: false, online: true }],
    match: null,
    rematchVotes: { self: false, opp: false },
  };

  rooms.set(code, room);
  client.roomCode = code;

  safeSend(client.ws, {
    type: "room_joined",
    room: getRoomState(code),
    clientId,
  });

  broadcastRoomState(code);
}

function joinRoom(clientId, roomCode) {
  const code = String(roomCode || "")
    .replace(/\D/g, "")
    .slice(0, 4);
  const client = clients.get(clientId);
  if (!client) return;

  if (code.length !== 4) {
    safeSend(client.ws, {
      type: "error",
      message: "参加コードは4桁の数字です",
    });
    return;
  }

  const room = rooms.get(code);
  if (!room) {
    safeSend(client.ws, { type: "error", message: "ルームが見つかりません" });
    return;
  }

  if (room.members.length >= 2) {
    safeSend(client.ws, { type: "error", message: "ルームが満員です" });
    return;
  }

  removeClientFromRoom(clientId, false);
  room.members.push({ clientId, ready: false, online: true });
  client.roomCode = code;

  safeSend(client.ws, {
    type: "room_joined",
    room: getRoomState(code),
    clientId,
  });

  broadcastRoomState(code);
}

function startMatch(room) {
  room.rematchVotes = { self: false, opp: false };
  const initialState = createInitialMatchState();
  if (DEBUG_NEAR_KUTAKUTA) {
    applyDebugNearKutakutaState(initialState);
  }

  room.match = {
    currentTurn: "self",
    state: initialState,
    ended: false,
    result: null,
    actionSeq: 0,
    lastAction: null,
    phase: "turn",
    sowPending: [],
    sowTargets: [],
    sowLastPit: null,
    sowSourcePitIndex: null,
    sowHistory: [],
    centerPeekProgress: { self: 0, opp: 0 },
    placementPending: [],
    placementHistory: [],
    pendingAction: null,
    pendingExtraTurn: false,
    poipoiStoreIndex: null,
    finalPhase: null,
    finalPhaseTimer: null,
  };

  room.members.forEach((member) => {
    const client = clients.get(member.clientId);
    if (!client || !client.online) return;
    const role = getPlayerRole(room, member.clientId);
    safeSend(client.ws, {
      type: "match_start",
      roomCode: room.code,
      role,
      currentTurn: room.match.currentTurn,
      state: clone(room.match.state),
    });
  });

  broadcastMatchState(room.code);
}

function setReady(clientId, ready) {
  const client = clients.get(clientId);
  if (!client || !client.roomCode) return;

  const room = rooms.get(client.roomCode);
  if (!room) return;

  const member = room.members.find((item) => item.clientId === clientId);
  if (!member) return;

  member.ready = !!ready;
  broadcastRoomState(client.roomCode);

  if (room.members.length === 2 && room.members.every((item) => item.ready)) {
    startMatch(room);
  }
}

function requestMove(clientId, pitIndex) {
  const client = clients.get(clientId);
  if (!client || !client.roomCode) return;

  const room = rooms.get(client.roomCode);
  if (!room || !room.match || room.match.ended) return;
  if (room.match.phase !== "turn") return;

  const role = getPlayerRole(room, clientId);
  if (!role) return;

  if (room.match.currentTurn !== role) {
    safeSend(client.ws, {
      type: "error",
      message: "現在はあなたの手番ではありません",
    });
    return;
  }

  // Safety net: if a turn starts while one side is already empty,
  // jump into final prediction phase instead of leaving the match stuck.
  if (isGameOver(room.match.state)) {
    const fallbackAction = room.match.lastAction || {
      type: "move",
      actor: role,
      lastPit: null,
      captureTarget: null,
      capturedCount: 0,
      extraTurn: false,
      technique: null,
    };
    startFinalPhase(room, fallbackAction);
    broadcastMatchState(room.code);
    return;
  }

  const result = applyMove(room, role, Number(pitIndex));
  if (!result.ok) {
    safeSend(client.ws, {
      type: "error",
      message: result.reason || "不正な手です",
    });
    return;
  }

  broadcastMatchState(room.code);
}

function requestSurrender(clientId) {
  const client = clients.get(clientId);
  if (!client || !client.roomCode) return;

  const room = rooms.get(client.roomCode);
  if (!room || !room.match) return;

  // 降参したプレイヤーの相手を取得
  const opponentClientId = room.members.find(
    (member) => member.clientId !== clientId
  )?.clientId;

  if (opponentClientId) {
    const opponentClient = clients.get(opponentClientId);
    if (opponentClient) {
      // 相手に降参通知を送る
      safeSend(opponentClient.ws, {
        type: "opponent_surrendered",
      });
    }
  }

  // 部屋をリセット（降参したプレイヤーには通知しない）
  room.match = null;
  room.members.forEach((member) => {
    const memberClient = clients.get(member.clientId);
    if (memberClient) {
      memberClient.roomCode = null;
    }
  });
  room.members = [];
}

function requestSync(clientId, roomCode) {
  const client = clients.get(clientId);
  if (!client) return;

  const code = String(roomCode || client.roomCode || "")
    .replace(/\D/g, "")
    .slice(0, 4);
  if (code.length !== 4) return;

  const room = rooms.get(code);
  if (!room) return;

  const member = room.members.find((item) => item.clientId === clientId);
  if (!member) return;

  client.roomCode = code;
  safeSend(client.ws, {
    type: "room_state",
    room: getRoomState(code),
  });

  if (room.match) {
    safeSend(client.ws, getMatchPayload(room, clientId));
  }
}

wss.on("connection", (ws, request) => {
  const clientKey = parseClientKey(request?.url) || makeClientId();

  let client = null;
  const existingClientId = keyToClientId.get(clientKey);
  if (existingClientId) {
    client = clients.get(existingClientId) || null;
  }

  if (!client) {
    const clientId = makeClientId();
    client = {
      clientId,
      clientKey,
      ws,
      roomCode: null,
      online: true,
      cleanupTimer: null,
    };
    clients.set(clientId, client);
    keyToClientId.set(clientKey, clientId);
  } else {
    attachConnection(client, ws);
  }

  safeSend(ws, {
    type: "welcome",
    clientId: client.clientId,
    clientKey,
  });

  if (client.roomCode) {
    safeSend(ws, {
      type: "room_joined",
      room: getRoomState(client.roomCode),
      clientId: client.clientId,
    });
  }

  ws.on("message", (raw) => {
    let message = null;
    try {
      message = JSON.parse(String(raw));
    } catch (_error) {
      safeSend(ws, { type: "error", message: "不正なメッセージ形式です" });
      return;
    }

    if (!message || typeof message.type !== "string") {
      safeSend(ws, { type: "error", message: "type が必要です" });
      return;
    }

    const messageType = message.type.trim();

    if (messageType === "create_room") {
      createRoom(client.clientId);
      return;
    }

    if (messageType === "join_room") {
      joinRoom(client.clientId, message.code);
      return;
    }

    if (messageType === "leave_room") {
      removeClientFromRoom(client.clientId, true);
      safeSend(ws, { type: "room_left" });
      return;
    }

    if (messageType === "set_ready") {
      setReady(client.clientId, message.ready);
      return;
    }

    if (messageType === "request_move") {
      requestMove(client.clientId, message.pitIndex);
      return;
    }

    if (
      messageType === "surrender" ||
      messageType === "request_surrender" ||
      messageType === "requestSurrender"
    ) {
      requestSurrender(client.clientId);
      return;
    }

    if (messageType === "request_sowing_choice") {
      requestSowingChoice(client.clientId, message.pendingIndex);
      return;
    }

    if (
      messageType === "request_undo_sowing" ||
      messageType === "requestUndoSowing"
    ) {
      requestUndoSowing(client.clientId);
      return;
    }

    // Backward compatibility for older clients that send generic undo type.
    if (messageType === "request_undo" || messageType === "requestUndo") {
      const room = getClientRoom(client.clientId);
      if (!room || !room.matchState) {
        safeSend(ws, { type: "error", message: "対戦中ではありません" });
        return;
      }
      if (room.matchState.mode === "sowing") {
        requestUndoSowing(client.clientId);
        return;
      }
      if (room.matchState.mode === "placing") {
        requestUndoPlacement(client.clientId);
        return;
      }
      safeSend(ws, { type: "error", message: "このフェーズでは戻せません" });
      return;
    }

    if (messageType === "request_sync") {
      requestSync(client.clientId, message.roomCode);
      return;
    }

    if (messageType === "request_placement") {
      requestPlacement(client.clientId, message.pitIndex, message.pendingIndex);
      return;
    }

    if (
      messageType === "request_undo_placement" ||
      messageType === "requestUndoPlacement"
    ) {
      requestUndoPlacement(client.clientId);
      return;
    }

    if (messageType === "request_special_choice") {
      requestSpecialChoice(client.clientId, message.action);
      return;
    }

    if (messageType === "request_poipoi_store") {
      requestPoipoiStore(client.clientId, message.storeIndex);
      return;
    }

    if (messageType === "request_poipoi_stone") {
      requestPoipoiStone(client.clientId, message.stoneIndex);
      return;
    }

    if (messageType === "request_kutakuta_choice") {
      requestKutakutaChoice(client.clientId, message.action);
      return;
    }

    if (messageType === "request_final_prediction") {
      requestFinalPrediction(client.clientId, message.color);
      return;
    }

    if (messageType === "request_final_poipoi_store") {
      requestFinalPoipoiStore(client.clientId, message.storeIndex);
      return;
    }

    if (messageType === "request_final_poipoi_stone") {
      requestFinalPoipoiStone(client.clientId, message.stoneIndex);
      return;
    }

    if (messageType === "request_rematch") {
      requestRematch(client.clientId);
      return;
    }

    safeSend(ws, { type: "error", message: `未対応のtype: ${messageType}` });
  });

  ws.on("close", () => {
    markClientOffline(client.clientId);
  });
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
  if (DEBUG_NEAR_KUTAKUTA) {
    console.log(
      "[room-server] DEBUG_NEAR_KUTAKUTA=1 (near-kutakuta board enabled)",
    );
  }
});
