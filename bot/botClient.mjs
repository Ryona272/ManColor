/**
 * botClient.mjs
 * ManColor AI ボットクライアント
 * サーバーに WebSocket で接続し、SimAI を使ってマッチメイキング対戦を自動プレイする
 *
 * 起動方法:
 *   node bot/botClient.mjs
 *
 * 環境変数:
 *   BOT_SERVER_HOST  - 接続先ホスト (デフォルト: localhost)
 *   BOT_SERVER_PORT  - 接続先ポート (デフォルト: 8787)
 *   BOT_NAME         - ボットの表示名 (デフォルト: ManColorBot)
 *   BOT_DELAY_MS     - 行動前の待機時間ms (デフォルト: 700)
 *   BOT_REMATCH      - 自動再戦するか 1/0 (デフォルト: 1)
 *   BOT_COUNT        - 起動するボット数 (デフォルト: 1)
 */

import { WebSocket } from "ws";
import {
  pickPit,
  decidePlacements,
  decideSpecialAction,
  createMemo,
  updateMemo,
} from "../src/sim/SimAI.js";
import { DEFAULT_PARAMS } from "../src/sim/SimParams.js";

// ─── 設定 ──────────────────────────────────────────────────────
const SERVER_HOST = process.env.BOT_SERVER_HOST || "localhost";
const SERVER_PORT = Number(process.env.BOT_SERVER_PORT || 8787);
const BOT_NAME = process.env.BOT_NAME || "ManColorBot";
const BOT_DELAY = Number(process.env.BOT_DELAY_MS || 700);
const AUTO_REMATCH = process.env.BOT_REMATCH !== "0";
const BOT_COUNT = Math.max(1, Number(process.env.BOT_COUNT || 1));

// ─── ユーティリティ ────────────────────────────────────────────
function makeKey() {
  return `bot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function log(id, ...args) {
  console.log(`[Bot#${id}]`, ...args);
}

// ─── ボットクラス ──────────────────────────────────────────────
class ManColorBot {
  constructor(id) {
    this.id = id;
    this.ws = null;
    this.role = null; // "self" | "opp"
    this.roomCode = null;
    this.memo = createMemo();
    this._lastState = null;
    this.lastActionId = -1;
    this.actionTimer = null;
    this.reconnectTimer = null;
    this.gamesPlayed = 0;
  }

  // ─── 接続 ─────────────────────────────────────────────────
  connect() {
    const key = makeKey();
    const url = `ws://${SERVER_HOST}:${SERVER_PORT}/?clientKey=${encodeURIComponent(key)}`;
    log(this.id, `接続中: ${url}`);

    this.ws = new WebSocket(url);

    this.ws.on("open", () => {
      log(this.id, "接続成功");
      this._joinMatchmaking();
    });

    this.ws.on("message", (raw) => {
      try {
        this._handleMessage(JSON.parse(String(raw)));
      } catch (e) {
        console.error(`[Bot#${this.id}] メッセージ解析エラー:`, e.message);
      }
    });

    this.ws.on("close", () => {
      log(this.id, "切断。3秒後に再接続します...");
      this._clearActionTimer();
      this.ws = null;
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    });

    this.ws.on("error", (e) => {
      console.error(`[Bot#${this.id}] WebSocket エラー:`, e.message);
    });
  }

  _send(payload) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  _clearActionTimer() {
    clearTimeout(this.actionTimer);
    this.actionTimer = null;
  }

  // ─── マッチメイキング ──────────────────────────────────────
  _joinMatchmaking() {
    log(this.id, `マッチメイキング参加: ${BOT_NAME}`);
    this._resetGame();
    this._send({ type: "join_matchmaking", playerName: BOT_NAME });
  }

  _resetGame() {
    this.role = null;
    this._lastState = null;
    this.lastActionId = -1;
    this.roomCode = null;
    this.memo = createMemo();
    this._clearActionTimer();
  }

  // ─── メッセージハンドラ ────────────────────────────────────
  _handleMessage(msg) {
    switch (msg.type) {
      case "welcome":
        log(this.id, `ウェルカム (clientId=${msg.clientId})`);
        break;

      case "matchmaking_waiting":
        log(this.id, "対戦相手を待っています…");
        break;

      case "match_state":
      case "match_start":
        this._handleMatchState(msg);
        break;

      case "opponent_surrendered":
        log(this.id, "相手が降参しました");
        this._endGame(null);
        break;

      case "rematch_status":
        // 両者リクエスト済みのとき votes.self && votes.opp が true になる
        // サーバーが自動で新試合を開始するので特に何もしない
        break;

      case "error":
        console.error(`[Bot#${this.id}] サーバーエラー: ${msg.message}`);
        break;

      default:
        break;
    }
  }

  // ─── match_state 処理 ─────────────────────────────────────
  _handleMatchState(msg) {
    if (msg.role) this.role = msg.role;
    if (msg.roomCode) this.roomCode = msg.roomCode;

    const {
      state,
      currentTurn,
      phase,
      sowPending,
      sowTargets,
      placementPending,
      poipoiStoreIndex,
      ended,
      result,
      finalPhase,
      action,
    } = msg;

    if (!state) return;
    this._lastState = state;

    // ゲーム終了
    if (ended && result) {
      this._endGame(result);
    }

    // 相手ターンは何もしない
    if (currentTurn !== this.role) {
      this._clearActionTimer();
      return;
    }

    // ─── 重複防止 ─────────────────────────────────────────
    // sowing / placing は actionSeq が変わらないため actionId では判定しない
    const isContinuous = phase === "sowing" || phase === "placing";
    if (!isContinuous) {
      const actionId = action?.id ?? -1;
      if (actionId !== -1 && actionId <= this.lastActionId) return;
      this.lastActionId = actionId;
    }

    // memo 更新（占い推定用）
    const knownCenterColors =
      state.fortune?.center
        ?.filter((c) => c.seenBy?.length > 0)
        .map((c) => c.color) ?? [];
    updateMemo(this.memo, state, knownCenterColors);

    // 一定遅延後に行動（最新 state を使う）
    this._clearActionTimer();
    this.actionTimer = setTimeout(() => {
      this._decide(
        phase,
        state,
        sowPending ?? [],
        sowTargets ?? [],
        placementPending ?? [],
        poipoiStoreIndex ?? null,
        ended ?? false,
        finalPhase ?? null,
      );
    }, BOT_DELAY);
  }

  // ─── 行動決定 ─────────────────────────────────────────────
  _decide(
    phase,
    state,
    sowPending,
    sowTargets,
    placementPending,
    poipoiStoreIndex,
    ended,
    finalPhase,
  ) {
    const { role, memo, roomCode } = this;
    const fortune = state.fortune;
    const peeksDone = this._peeksDone(state);

    // ファイナルフェーズ
    if (ended && phase === "final-phase" && finalPhase) {
      this._decideFinalPhase(finalPhase, state, fortune);
      return;
    }

    switch (phase) {
      // ──── 通常ターン ─────────────────────────────────────
      case "turn": {
        const [laneMin, laneMax] = role === "opp" ? [6, 10] : [0, 4];
        const validPits = [];
        for (let i = laneMin; i <= laneMax; i++) {
          if (state.pits[i].stones.length > 0) validPits.push(i);
        }
        if (validPits.length === 0) return;

        const pit = pickPit(role, validPits, state, memo, fortune, peeksDone);
        log(this.id, `手番: pit${pit} を選択`);
        this._send({ type: "request_move", roomCode, pitIndex: pit });
        break;
      }

      // ──── 撒き ───────────────────────────────────────────
      case "sowing": {
        if (sowPending.length === 0) return;
        // 石の種類を選ぶ（常に先頭 0 を選択）
        log(this.id, `撒き: 残り ${sowPending.length} 個 → pendingIndex=0`);
        this._send({
          type: "request_sowing_choice",
          roomCode,
          pendingIndex: 0,
        });
        break;
      }

      // ──── 配置 ───────────────────────────────────────────
      case "placing": {
        if (placementPending.length === 0) return;
        const placements = decidePlacements(
          placementPending,
          state,
          memo,
          fortune,
          DEFAULT_PARAMS,
          role,
        );
        const first = placements[0];
        if (!first) return;
        log(this.id, `配置: stone[0] → pit${first.pitIndex}`);
        this._send({
          type: "request_placement",
          roomCode,
          pitIndex: first.pitIndex,
          pendingIndex: 0,
        });
        break;
      }

      // ──── 特殊選択（ちらちら/ぽいぽい）──────────────────
      case "special-choice": {
        const d = decideSpecialAction(
          state,
          memo,
          fortune,
          peeksDone,
          true,
          role,
        );
        // "none" はちらちら回数を消費しないスキップだが、サーバーは "chirachira" か "poipoi" のみ受理
        const action = d.action === "none" ? "chirachira" : d.action;
        log(this.id, `特殊選択: ${action}`);
        this._send({ type: "request_special_choice", roomCode, action });
        break;
      }

      // ──── ぽいぽい: 賽壇選択 ─────────────────────────────
      case "poipoi-store": {
        const d = decideSpecialAction(
          state,
          memo,
          fortune,
          peeksDone,
          true,
          role,
        );
        let storeIndex = d.removePitIndex;
        if (storeIndex == null) {
          storeIndex = state.pits[5].stones.length > 0 ? 5 : 11;
        }
        log(this.id, `ぽいぽい賽壇: store${storeIndex}`);
        this._send({ type: "request_poipoi_store", roomCode, storeIndex });
        break;
      }

      // ──── ぽいぽい: 石選択 ───────────────────────────────
      case "poipoi-stone": {
        const storeIdx = poipoiStoreIndex ?? (role === "opp" ? 5 : 11);
        const stones = state.pits[storeIdx]?.stones ?? [];
        const d = decideSpecialAction(
          state,
          memo,
          fortune,
          peeksDone,
          true,
          role,
        );
        let stoneIndex = d.removeStoneIndex ?? 0;
        if (stoneIndex >= stones.length) stoneIndex = 0;
        log(this.id, `ぽいぽい石: store${storeIdx}[${stoneIndex}]`);
        this._send({ type: "request_poipoi_stone", roomCode, stoneIndex });
        break;
      }

      // ──── くたくた選択 ───────────────────────────────────
      case "kutakuta-choice": {
        const myStore = state.pits[role === "self" ? 5 : 11].stones.length;
        const oppStore = state.pits[role === "self" ? 11 : 5].stones.length;
        // 鬼と同じ閾値: 6石差まで許容
        const action = myStore >= oppStore - 6 ? "kutakuta" : "madamada";
        log(this.id, `くたくた: ${action} (自=${myStore} 相=${oppStore})`);
        this._send({ type: "request_kutakuta_choice", roomCode, action });
        break;
      }

      default:
        break;
    }
  }

  // ─── ファイナルフェーズ ────────────────────────────────────
  _decideFinalPhase(fp, state, fortune) {
    const { role, roomCode } = this;

    // 占い予測
    if (fp.stage === "predict-self" || fp.stage === "predict-opp") {
      const guess = this._guessOpponentFortune(state, fortune);
      log(this.id, `占い予測: ${guess}`);
      this._send({ type: "request_final_prediction", roomCode, color: guess });
      return;
    }

    // ぽいぽい: 賽壇選択
    if (fp.stage === "poipoi-store") {
      const selfCount = state.pits[5].stones.length;
      const oppCount = state.pits[11].stones.length;
      // 相手の賽壇から取るのを優先（より得点にダメージ）
      let storeIndex;
      const oppStore = role === "opp" ? 5 : 11;
      const ownStore = role === "opp" ? 11 : 5;
      if (state.pits[oppStore].stones.length > 0) {
        storeIndex = oppStore;
      } else if (state.pits[ownStore].stones.length > 0) {
        storeIndex = ownStore;
      } else {
        // 両方空（サーバーが自動処理するが念のため）
        storeIndex = 5;
      }
      log(this.id, `ファイナルぽいぽい賽壇: store${storeIndex}`);
      this._send({ type: "request_final_poipoi_store", roomCode, storeIndex });
      return;
    }

    // ぽいぽい: 石選択
    if (fp.stage === "poipoi-stone") {
      const storeIdx = fp.poipoiStoreIndex ?? 5;
      const stones = state.pits[storeIdx]?.stones ?? [];
      const stoneIndex = this._pickPoipoiStoneIndex(stones, storeIdx, fortune);
      log(this.id, `ファイナルぽいぽい石: store${storeIdx}[${stoneIndex}]`);
      this._send({ type: "request_final_poipoi_stone", roomCode, stoneIndex });
      return;
    }
  }

  // ─── ヘルパー ─────────────────────────────────────────────

  /** 相手の個人占い色を推測する */
  _guessOpponentFortune(state, fortune) {
    const ownFortune =
      this.role === "self" ? fortune?.self?.color : fortune?.opp?.color;
    const knownCenterColors = fortune?.center?.map((c) => c.color) ?? [];
    const allColors = ["red", "blue", "green", "yellow", "purple"];
    const candidates = allColors.filter(
      (c) => c !== ownFortune && !knownCenterColors.includes(c),
    );

    // memo の inferred が候補にあれば使う
    const inferred = this.memo.inferredPlayerColor;
    if (inferred && candidates.includes(inferred)) return inferred;

    // fallback: 相手賽壇で最も多い色
    const oppStoreIndex = this.role === "opp" ? 5 : 11;
    const freq = {};
    for (const s of state.pits[oppStoreIndex].stones) {
      freq[s.color] = (freq[s.color] ?? 0) + 1;
    }
    candidates.sort((a, b) => (freq[b] ?? 0) - (freq[a] ?? 0));
    return candidates[0] ?? allColors[0];
  }

  /** ぽいぽいで除去する石のインデックスを選ぶ */
  _pickPoipoiStoneIndex(stones, storeIdx, fortune) {
    if (stones.length === 0) return 0;
    const isOppStore = storeIdx === (this.role === "opp" ? 5 : 11);
    const ownFortune =
      this.role === "self" ? fortune?.self?.color : fortune?.opp?.color;
    const oppFortune =
      this.role === "self" ? fortune?.opp?.color : fortune?.self?.color;
    const knownNeg =
      fortune?.center?.find((c) => c.bonus < 0 && c.seenBy?.includes(this.role))
        ?.color ?? null;

    let bestIdx = 0;
    let bestVal = -Infinity;

    stones.forEach((stone, idx) => {
      let val = 0;
      if (isOppStore) {
        // 相手賽壇から取る: 相手に有利な石を優先除去
        if (stone.color === ownFortune)
          val = 50; // 自分占い色（+3点）
        else if (stone.color === oppFortune)
          val = 30; // 相手占い色（+5点相当、相手には有利）
        else val = 5;
        if (knownNeg && stone.color === knownNeg) val = -50; // -4点石は取っても損
      } else {
        // 自賽壇から捨てる: 価値の低い石を優先除去
        if (knownNeg && stone.color === knownNeg)
          val = 100; // -4点石を真っ先に捨てる
        else if (stone.color === ownFortune)
          val = -100; // 自占い色は捨てない
        else val = 1;
      }
      if (val > bestVal) {
        bestVal = val;
        bestIdx = idx;
      }
    });

    return bestIdx;
  }

  /** 自分役のちらちら回数（center を何個覗いたか）*/
  _peeksDone(state) {
    return (
      state.fortune?.center?.filter((c) => c.seenBy?.includes(this.role))
        .length ?? 0
    );
  }

  /** ゲーム終了処理 */
  _endGame(result) {
    if (result) {
      this.gamesPlayed++;
      const myScore = this.role === "self" ? result.selfScore : result.oppScore;
      const oppScore =
        this.role === "self" ? result.oppScore : result.selfScore;
      const outcome =
        result.winner === this.role
          ? "勝利"
          : result.winner === "draw"
            ? "引き分け"
            : "敗北";
      log(
        this.id,
        `第${this.gamesPlayed}戦終了: ${outcome} (自=${myScore} 相=${oppScore})`,
      );
    }

    if (AUTO_REMATCH && this.roomCode) {
      // 再戦リクエスト（相手もリクエストしたらサーバーが自動で次戦を開始）
      setTimeout(() => {
        log(this.id, "再戦リクエスト送信");
        this._send({ type: "request_rematch", roomCode: this.roomCode });
      }, 1500);
    } else {
      setTimeout(() => this._joinMatchmaking(), 2000);
    }
  }
}

// ─── エントリーポイント ────────────────────────────────────────
const bots = [];
for (let i = 0; i < BOT_COUNT; i++) {
  const bot = new ManColorBot(i + 1);
  bots.push(bot);
  // 複数ボット時は少しずらして接続
  setTimeout(() => bot.connect(), i * 500);
}

// グレースフルシャットダウン
function shutdown() {
  log("ALL", "シャットダウン中…");
  bots.forEach((b) => b.ws?.close());
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
