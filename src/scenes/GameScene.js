import Phaser from "phaser";
import { GameState } from "../logic/GameState.js";
import { roomClient } from "../net/roomClient.js";
import { STONE_COLORS, PIT_NAMES } from "../data/constants.js";

const CENTER_VIEW_NAMES = ["左", "真ん中", "右"];

const W = 1080;
const H = 1920;
const CELL_W = 248;
const CELL_H = 248;
const STORE_DIAMOND_SIZE = 300;
const STONE_R = 22;
const COLORS = STONE_COLORS;
const UI_FONT = '"Yu Gothic UI", "Hiragino Sans", sans-serif';
const DISPLAY_FONT = '"Yu Mincho", "Hiragino Mincho ProN", serif';
const ALL_PIT_INDEXES = Array.from({ length: 12 }, (_, index) => index);

const PIT_POSITIONS = {
  0: { x: W / 2 - 340, y: 1320 },
  1: { x: W / 2 - 170, y: 1430 },
  2: { x: W / 2, y: 1540 },
  3: { x: W / 2 + 170, y: 1430 },
  4: { x: W / 2 + 340, y: 1320 },
  5: { x: W - 150, y: H * 0.5 },
  6: { x: W / 2 + 340, y: 600 },
  7: { x: W / 2 + 170, y: 490 },
  8: { x: W / 2, y: 380 },
  9: { x: W / 2 - 170, y: 490 },
  10: { x: W / 2 - 340, y: 600 },
  11: { x: 150, y: H * 0.5 },
};

const PATTERN_TEXTURE_BY_DISTANCE = {
  5: "sakura",
  4: "yotsuba",
  3: "musubi",
  2: "magatama",
  1: "take",
};

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
    this.gameState = new GameState();
    this.pitZones = [];
    this.stoneSprites = [];
    this.highlightTweens = [];
    this.playerTurn = true;
    this.mode = "turn";

    this.selectedPlacementStoneIndex = null;
    this.sowPending = [];
    this.sowTargets = [];
    this.sowHistory = [];
    this.sowSourcePitIndex = null;

    this.poipoiStoreIndex = null;
    this.autoSowingInProgress = false;
    this.pendingExtraTurnAfterChoice = null;
    this.matchMode = "solo";
    this.onlineRoomCode = null;
    this.onlineSide = "self";
    this.onlineMovePending = false;
    this.roomUnsubscribe = null;
    this.onlineInputLockUntil = 0;
    this.waitingForInitialSync = false;
    this.hasShownOnlineRoleBanner = false;
    this.lastOnlineActionId = 0;
    this.pendingOnlineUndoRequest = null;
    this.turnGuideSprites = [];
    this.turnGuideTweens = [];
    this.turnStartSweepSprites = [];
    this.turnStartSweepTweens = [];
    this.hasShownOnlineResultPhase = false;
    this.onlineFinalPhase = null;
    this.hasShownOnlineInitialTurnBanner = false;
    this.rematchRequestedLocal = false;
    this.personalFortunesRevealedSticky = false;
    this.aiDifficulty = "normal";
    this._initialConnectionEstablished = false;
    this._connectionErrorCount = 0;
  }

  init(data) {
    this.matchMode = data?.mode === "online-room" ? "online-room" : "solo";
    this.onlineRoomCode = data?.roomCode ?? null;
    this.onlineSide = data?.side === "opp" ? "opp" : "self";
    this.onlineMovePending = false;
    this.onlineInputLockUntil = 0;
    this.waitingForInitialSync = false;
    this.hasShownOnlineRoleBanner = false;
    this.lastOnlineActionId = 0;
    this.pendingOnlineUndoRequest = null;
    this.hasShownOnlineResultPhase = false;
    this.onlineFinalPhase = null;
    this.hasShownOnlineInitialTurnBanner = false;
    this.rematchRequestedLocal = false;
    this.personalFortunesRevealedSticky = false;
    this.aiDifficulty = data?.aiDifficulty ?? "normal";
    this._initialConnectionEstablished = false;
    this._connectionErrorCount = 0;
    // 強いAI用: プレイヤー行動の観察メモ
    this._aiMemo = {
      playerColorFreq: {},
      inferredPlayerColor: null,
      playerAvoidedColor: null,
    };
    // プレイヤー名 (オンライン対戦用)
    this.selfPlayerName = data?.playerName ?? null;
    this.oppPlayerName = data?.oppPlayerName ?? null;
  }

  requestOnlineRematch() {
    if (!this._isOnlineRoomMode()) return false;
    if (!this.onlineRoomCode) return false;
    if (this.rematchRequestedLocal) return true;

    const sent = roomClient.send({
      type: "request_rematch",
      roomCode: this.onlineRoomCode,
    });
    if (!sent) {
      this.scene
        .get("UIScene")
        .showCenterBanner("通信切断", 0xffa6c9, "再接続を待っています");
      return false;
    }

    this.rematchRequestedLocal = true;
    this.scene
      .get("UIScene")
      .showCenterBanner(
        "相手の同意を待っています",
        0x9fd6ff,
        "再戦リクエスト送信済み",
        false,
        true,
      );
    return true;
  }

  surrender() {
    if (this._isOnlineRoomMode()) {
      // オンライン対戦時は相手に降参を通知
      if (!this.onlineRoomCode) return;

      const sent = roomClient.sendGuaranteed({
        type: "surrender",
        roomCode: this.onlineRoomCode,
      });
      if (!sent) {
        this.scene
          .get("UIScene")
          .showCenterBanner("通信切断", 0xffa6c9, "再接続を待っています");
        return;
      }

      // 降参通知送信後、ホームに戻る
      this.scene
        .get("UIScene")
        .showCenterBanner("降参しました", 0xffd77a, "ホームに戻ります");
      this.time.delayedCall(2000, () => {
        this._returnToHome();
      });
    } else {
      // ソロプレイ時は即座にホームに戻る
      this._returnToHome();
    }
  }

  _returnToHome() {
    // ルーム接続を切断
    if (this.roomUnsubscribe) {
      this.roomUnsubscribe();
      this.roomUnsubscribe = null;
    }
    roomClient.disconnect();

    // シーンをクリーンアップしてホームに戻る
    this.scene.stop("UIScene");
    this.scene.start("LobbyScene");
  }

  preload() {
    this.load.image("pattern-self-sakura", "/img/opp_sakura.png");
    this.load.image("pattern-self-yotsuba", "/img/opp_yotsuba.png");
    this.load.image("pattern-self-musubi", "/img/opp_musubi.png");
    this.load.image("pattern-self-magatama", "/img/opp_magatama.png");
    this.load.image("pattern-self-take", "/img/opp_take.png");

    this.load.image("pattern-opp-sakura", "/img/self_sakura.png");
    this.load.image("pattern-opp-yotsuba", "/img/self_yotsuba.png");
    this.load.image("pattern-opp-musubi", "/img/self_musubi.png");
    this.load.image("pattern-opp-magatama", "/img/self_magatama.png");
    this.load.image("pattern-opp-take", "/img/self_take.png");
  }

  create() {
    this.gameState.reset();
    // オンライン時は白(self)が先手、黒(opp)が後手
    this.playerTurn = this._isOnlineRoomMode()
      ? this.onlineSide === "self"
      : this.aiDifficulty !== "oni-gote";
    this.mode = "turn";
    this.selectedPlacementStoneIndex = null;
    this.sowPending = [];
    this.sowTargets = [];
    this.sowHistory = [];
    this.sowSourcePitIndex = null;
    this.poipoiStoreIndex = null;
    this.autoSowingInProgress = false;
    this.pendingExtraTurnAfterChoice = null;
    this._drawBoard();
    this._renderStones();
    this._setupInput();
    this.scene.launch("UIScene", { gameScene: this });

    if (!this._isOnlineRoomMode()) {
      // ソロ対戦: AI難易度バナーを表示
      const diffLabels = {
        easy: "弱い",
        normal: "普通",
        hard: "強い",
        oni: "鬼",
        "oni-sente": "鬼",
        "oni-gote": "鬼",
      };
      const diffColors = {
        easy: 0x3a9e66,
        normal: 0x4a7bbf,
        hard: 0xbf4a55,
        oni: 0x4a0e6e,
        "oni-sente": 0x4a0e6e,
        "oni-gote": 0x4a0e6e,
      };
      const label = diffLabels[this.aiDifficulty] ?? "普通";
      const color = diffColors[this.aiDifficulty] ?? 0x4a7bbf;
      this.time.delayedCall(300, () => {
        if (!this.scene.isActive("UIScene")) return;
        this.scene
          .get("UIScene")
          .showCenterBanner(
            `AI難易度: ${label}`,
            color,
            this.aiDifficulty === "oni-gote"
              ? "鬼の手番です。"
              : "あなたのターンから始まります",
          );
      });

      // oni-gote: プレイヤーは後手 → バナー表示後にAIターンを起動
      if (this.aiDifficulty === "oni-gote") {
        this.time.delayedCall(1600, () => {
          if (this.mode === "turn" && !this.playerTurn) this._aiTurn();
        });
      }
    }

    if (this._isOnlineRoomMode()) {
      this._initialConnectionEstablished = false;
      this._connectionErrorCount = 0;
      this.waitingForInitialSync = true;
      this.onlineInputLockUntil = this.time.now + 1700;
      this.roomUnsubscribe = roomClient.subscribe((message) => {
        this._handleRoomClientMessage(message);
      });
      roomClient.connect();

      this.scene
        .get("UIScene")
        .showCenterBanner("オンライン対戦", 0x9fd6ff, "盤面を同期しています");

      this.time.delayedCall(1100, () => this._showOnlineRoleBanner());

      // 接続済みなら初回同期を明示要求（再接続直後にも同じ要求を使う）
      this._requestRoomSync();
    }

    this.events.once("shutdown", () => {
      this._clearTurnLaneGuidance();
      this._clearTurnStartSweep();
      if (this.roomUnsubscribe) {
        this.roomUnsubscribe();
        this.roomUnsubscribe = null;
      }
    });
  }

  _isOnlineRoomMode() {
    return this.matchMode === "online-room";
  }

  _showOnlineRoleBanner() {
    if (!this._isOnlineRoomMode() || this.hasShownOnlineRoleBanner) return;
    this.hasShownOnlineRoleBanner = true;

    const isOpp = this.onlineSide === "opp";
    this.scene
      .get("UIScene")
      .showCenterBanner(
        isOpp ? "あなたは黒(後手)" : "あなたは白(先手)",
        isOpp ? 0x9090b8 : 0xf0efea,
        isOpp ? "相手のターンから始まります" : "あなたのターンから始まります",
      );

    // 初回オンライン導入は「色/先後」→「手番案内」の順を必ず維持する。
    this.time.delayedCall(1300, () => {
      if (!this.scene.isActive("UIScene")) return;
      if (!this._isOnlineRoomMode()) return;
      if (this.hasShownOnlineInitialTurnBanner) return;

      this.hasShownOnlineInitialTurnBanner = true;
      this.scene
        .get("UIScene")
        .showCenterBanner(
          this.playerTurn ? "あなたの番です" : "相手の番です",
          this.playerTurn ? 0x8be0d4 : 0xf3b7b7,
          null,
        );
    });
  }

  _requestRoomSync() {
    if (!this._isOnlineRoomMode()) return;
    if (!this.onlineRoomCode) return;
    roomClient.send({
      type: "request_sync",
      roomCode: this.onlineRoomCode,
    });
  }

  revealPersonalFortunesSticky() {
    this.personalFortunesRevealedSticky = true;
    this.gameState.revealPersonalFortunes();
  }

  _sendOnlineUndoRequest(kind) {
    const variants =
      kind === "placing"
        ? [
            "request_undo_placement",
            "requestUndoPlacement",
            "request_undo",
            "requestUndo",
          ]
        : [
            "request_undo_sowing",
            "requestUndoSowing",
            "request_undo",
            "requestUndo",
          ];

    this.pendingOnlineUndoRequest = {
      kind,
      variants,
      index: 0,
    };
    return this._sendNextOnlineUndoRequestVariant();
  }

  _sendNextOnlineUndoRequestVariant() {
    const pending = this.pendingOnlineUndoRequest;
    if (!pending) return false;

    const type = pending.variants[pending.index];
    if (!type) {
      this.pendingOnlineUndoRequest = null;
      return false;
    }

    const sent = roomClient.send({
      type,
      roomCode: this.onlineRoomCode,
    });
    if (!sent) {
      this.pendingOnlineUndoRequest = null;
      return false;
    }

    this.onlineMovePending = true;
    return true;
  }

  _getViewPos(pitIndex) {
    if (this._isOnlineRoomMode() && this.onlineSide === "opp") {
      const viewIndex = pitIndex < 6 ? pitIndex + 6 : pitIndex - 6;
      return PIT_POSITIONS[viewIndex];
    }
    return PIT_POSITIONS[pitIndex];
  }

  _getShadowOffset() {
    return { x: 2, y: 3 };
  }

  getTurnDisplayInfo(isSelfTurn = this.playerTurn) {
    return {
      text: isSelfTurn ? "あなたのターン" : "相手のターン",
      color: this._isOnlineRoomMode()
        ? isSelfTurn
          ? "#9fd6ff"
          : "#f3b7b7"
        : isSelfTurn
          ? "#e0c97f"
          : "#ff9999",
    };
  }

  _drawBoard() {
    const g = this.add.graphics();
    const isOppView = this._isOnlineRoomMode() && this.onlineSide === "opp";

    // Top half / bottom half colors swap for opp view so each player
    // always sees their own colour at the bottom of the screen.
    if (isOppView) {
      g.fillStyle(0xe9e4d6, 1);
      g.fillRect(0, 0, W, H / 2);
      g.fillStyle(0x17171c, 1);
      g.fillRect(0, H / 2, W, H / 2);
      g.fillStyle(0xffffff, 0.1);
      g.fillRect(0, 0, W, 220);
      g.fillStyle(0x000000, 0.22);
      g.fillRect(0, H - 220, W, 220);
    } else {
      g.fillStyle(0x17171c, 1);
      g.fillRect(0, 0, W, H / 2);
      g.fillStyle(0xe9e4d6, 1);
      g.fillRect(0, H / 2, W, H / 2);
      g.fillStyle(0x000000, 0.22);
      g.fillRect(0, 0, W, 220);
      g.fillStyle(0xffffff, 0.1);
      g.fillRect(0, H - 220, W, 220);
    }

    // Add subtle stage panels so the board feels set into a crafted surface.
    g.fillStyle(0x2a2522, 0.12);
    g.fillRoundedRect(28, 28, W - 56, H - 56, 32);
    g.lineStyle(3, 0xc4b69b, 0.18);
    g.strokeRoundedRect(28, 28, W - 56, H - 56, 32);

    g.lineStyle(4, 0x8c8c8c, 0.35);
    g.lineBetween(0, H / 2, W, H / 2);

    for (let i = 0; i < 12; i++) {
      const pos = this._getViewPos(i);
      if (!pos) continue;

      const isStore = i === 5 || i === 11;
      const isSelfSide = i <= 5;
      const color = isStore
        ? isSelfSide
          ? 0xfdfaf1
          : 0x101015
        : isSelfSide
          ? 0xfdfaf1
          : 0x101015;
      const stroke = isStore
        ? isSelfSide
          ? 0xb48a45
          : 0xe9d7a5
        : isSelfSide
          ? 0x4b3e28
          : 0xe1e1e8;

      const width = isStore ? STORE_DIAMOND_SIZE : CELL_W;
      const height = isStore ? STORE_DIAMOND_SIZE : CELL_H;
      const points = this._getDiamondPoints(pos.x, pos.y, width, height);

      // Shadow to keep diamonds visible on both bright and dark halves
      const shadowOffset = this._getShadowOffset();
      const shadowPoints = this._getDiamondPoints(
        pos.x + shadowOffset.x * 3,
        pos.y + shadowOffset.y * 3,
        width,
        height,
      );
      g.fillStyle(0x000000, 0.22);
      g.fillPoints(shadowPoints, true);

      g.fillStyle(color, 0.95);
      g.fillPoints(points, true);
      g.lineStyle(isStore ? 6 : 5, stroke, 0.98);
      g.strokePoints(points, true);

      const innerPoints = this._getDiamondPoints(
        pos.x,
        pos.y,
        width - 26,
        height - 26,
      );
      g.lineStyle(2, isSelfSide ? 0xb2a891 : 0x555563, 0.7);
      g.strokePoints(innerPoints, true);

      if (isStore) {
        const storeCore = this._getDiamondPoints(
          pos.x,
          pos.y,
          width - 72,
          height - 72,
        );
        g.fillStyle(isSelfSide ? 0xd9c084 : 0x3b3140, 0.16);
        g.fillPoints(storeCore, true);
      }

      if (!isStore) {
        this._drawLanePatternImage(i, pos);
      }

      const zoneWidth = width;
      const zoneHeight = height;
      const hitPolygon = new Phaser.Geom.Polygon([
        zoneWidth * 0.5,
        0,
        zoneWidth,
        zoneHeight * 0.5,
        zoneWidth * 0.5,
        zoneHeight,
        0,
        zoneHeight * 0.5,
      ]);
      const zone = this.add
        .zone(pos.x, pos.y, zoneWidth, zoneHeight)
        .setInteractive(hitPolygon, Phaser.Geom.Polygon.Contains);
      zone.on("pointerdown", () => this._onPitClick(i));
      this.pitZones[i] = zone;
    }

    const fortuneY = H * 0.5;
    for (let i = 0; i < 3; i++) {
      const fx = W / 2 + (i - 1) * 120;
      g.fillStyle(0x2a2a4a, 0.9);
      g.fillCircle(fx, fortuneY, 45);
      g.lineStyle(2, 0xaaaacc);
      g.strokeCircle(fx, fortuneY, 45);
    }
  }

  _renderStones() {
    this.stoneSprites.forEach((s) => s.destroy());
    this.stoneSprites = [];
    this.highlightTweens.forEach((tween) => tween.remove());
    this.highlightTweens = [];

    const pits = this.gameState.getState().pits;
    for (let i = 0; i < 12; i++) {
      const pos = this._getViewPos(i);
      if (!pos) continue;
      this._drawStonesInPit(pits[i].stones, pos, i);
    }

    this._drawTrayUi();

    // 占い石・捨て場はUIScene側で描画（カメラ回転の影響を受けないため）
    this.scene.get("UIScene")?.refreshFortuneAndDiscard?.();
  }

  _getDiamondPoints(cx, cy, width, height) {
    return [
      new Phaser.Geom.Point(cx, cy - height / 2),
      new Phaser.Geom.Point(cx + width / 2, cy),
      new Phaser.Geom.Point(cx, cy + height / 2),
      new Phaser.Geom.Point(cx - width / 2, cy),
    ];
  }

  _drawLanePatternImage(pitIndex, pos) {
    const distance = this._getLaneDistanceLabel(pitIndex);
    if (distance == null) return;

    const isOppLane = pitIndex >= 6 && pitIndex <= 10;
    const sideKey = isOppLane ? "opp" : "self";
    const patternKey = PATTERN_TEXTURE_BY_DISTANCE[distance];
    const textureKey = `pattern-${sideKey}-${patternKey}`;
    if (!textureKey || !this.textures.exists(textureKey)) return;

    const whiteRotation = Phaser.Math.DegToRad(315); // 現在値から両方+180°
    const blackRotation = Phaser.Math.DegToRad(315); // 現在値から両方+180°
    const viewRotation =
      this._isOnlineRoomMode() && this.onlineSide === "opp" ? Math.PI : 0;
    const image = this.add.image(pos.x, pos.y, textureKey);
    image.setDisplaySize(CELL_W * 0.64, CELL_H * 0.64);
    image.setAlpha(1);
    image.setRotation(
      (isOppLane ? blackRotation : whiteRotation) + viewRotation,
    );
    image.setFlipX(false);
    image.setFlipY(false);
  }

  _getStoneLayout(pitIndex, stoneCount) {
    const isStore = pitIndex === 5 || pitIndex === 11;
    const cols = isStore ? 3 : stoneCount <= 4 ? 2 : stoneCount <= 10 ? 3 : 4;
    const rows = Math.max(1, Math.ceil(Math.max(stoneCount, 1) / cols));
    const availableWidth = isStore ? STORE_DIAMOND_SIZE - 132 : CELL_W - 64;
    const availableHeight = isStore ? STORE_DIAMOND_SIZE - 120 : CELL_H - 76;
    const gapX =
      cols <= 1 ? 0 : Math.min(STONE_R * 2 + 8, availableWidth / (cols - 1));
    const gapY =
      rows <= 1 ? 0 : Math.min(STONE_R * 2 + 8, availableHeight / (rows - 1));
    const startY = -((rows - 1) * gapY) / 2;
    return { cols, rows, gapX, gapY, startY };
  }

  _drawStonesInPit(stones, pos, pitIndex) {
    const { cols, rows, gapX, gapY, startY } = this._getStoneLayout(
      pitIndex,
      stones.length,
    );

    for (let j = 0; j < stones.length; j++) {
      const stone = stones[j];
      const row = Math.floor(j / cols);
      const col = j % cols;
      const stonesInThisRow =
        row === rows - 1 ? stones.length - row * cols : cols;
      const ox = (col - (stonesInThisRow - 1) / 2) * gapX;
      const oy = startY + row * gapY;

      const g = this.add.graphics();
      const hexColor = COLORS[stone.color]?.hex ?? 0xffffff;
      const isUpperSide = pitIndex >= 6 && pitIndex <= 11;

      const shadowOffset = this._getShadowOffset();
      g.fillStyle(0x000000, 0.16);
      g.fillCircle(
        pos.x + ox + shadowOffset.x,
        pos.y + oy + shadowOffset.y,
        STONE_R + 1,
      );
      g.fillStyle(hexColor, 1);
      g.fillCircle(pos.x + ox, pos.y + oy, STONE_R);
      g.lineStyle(3, isUpperSide ? 0xf5f5f8 : 0x3a332a, 0.9);
      g.strokeCircle(pos.x + ox, pos.y + oy, STONE_R);
      this.stoneSprites.push(g);

      if (this.mode === "poipoi-stone" && this.poipoiStoreIndex === pitIndex) {
        const zone = this.add
          .zone(pos.x + ox, pos.y + oy, STONE_R * 2 + 8, STONE_R * 2 + 8)
          .setInteractive();
        zone.on("pointerdown", () => this._handlePoipoiStoneClick(pitIndex, j));
        this.stoneSprites.push(zone);

        const ring = this.add.graphics();
        ring.lineStyle(4, 0x7cc8ff, 0.98);
        ring.strokeCircle(pos.x + ox, pos.y + oy, STONE_R + 6);
        const ringTween = this.tweens.add({
          targets: ring,
          alpha: 0.22,
          duration: 360,
          yoyo: true,
          repeat: -1,
        });
        this.highlightTweens.push(ringTween);
        this.stoneSprites.push(ring);
      }
    }
  }

  _drawFortune() {
    const fortune = this.gameState.getState().fortune;
    const fortuneY = H * 0.5;
    const selfFortuneY = fortuneY + 220;
    const oppFortuneY = fortuneY - 220;

    fortune.center.forEach((fc, i) => {
      const fx = W / 2 + (i - 1) * 120;
      const visibleToSelf = fc.seenBy.includes("self");
      const hex = visibleToSelf
        ? (COLORS[fc.color]?.hex ?? 0xffffff)
        : 0x2f3542;

      const g = this.add.graphics();
      g.fillStyle(hex, visibleToSelf ? 0.8 : 0.95);
      g.fillCircle(fx, fortuneY, 38);
      if (!visibleToSelf) {
        g.lineStyle(2, 0xd0d7e2, 0.7);
        g.strokeCircle(fx, fortuneY, 38);
      }
      this.stoneSprites.push(g);

      this._drawFortuneScoreText(fx, fortuneY, fc.bonus, fc.bonus, 0, 0);

      if (!visibleToSelf) {
        const hiddenText = this.add
          .text(fx, fortuneY, "?", {
            fontSize: "34px",
            color: "#f4f7ff",
            fontFamily: "sans-serif",
          })
          .setOrigin(0.5);
        this.stoneSprites.push(hiddenText);
      }
    });

    const selfHex = COLORS[fortune.self.color]?.hex ?? 0xffffff;
    const selfStone = this.add.graphics();
    selfStone.fillStyle(0x000000, 0.14);
    selfStone.fillCircle(W / 2 + 2, selfFortuneY + 3, 38);
    selfStone.fillStyle(selfHex, 0.96);
    selfStone.fillCircle(W / 2, selfFortuneY, 36);
    selfStone.lineStyle(4, 0x4b3e28, 0.95);
    selfStone.strokeCircle(W / 2, selfFortuneY, 36);
    this.stoneSprites.push(selfStone);

    this._drawFortuneScoreText(W / 2, selfFortuneY, 3, 5, 0, 0);

    const selfLabel = this.add
      .text(W / 2 + 132, selfFortuneY, "自分の占い石", {
        fontSize: "20px",
        color: "#1f1b17",
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5);
    this.stoneSprites.push(selfLabel);

    const oppRevealed = !!fortune.opp.revealed;
    const oppHex = oppRevealed
      ? (COLORS[fortune.opp.color]?.hex ?? 0xffffff)
      : 0x2f3542;
    const oppStone = this.add.graphics();
    oppStone.fillStyle(0x000000, 0.18);
    oppStone.fillCircle(W / 2 + 2, oppFortuneY + 3, 38);
    oppStone.fillStyle(oppHex, 0.96);
    oppStone.fillCircle(W / 2, oppFortuneY, 36);
    oppStone.lineStyle(4, oppRevealed ? 0xe8e8f0 : 0xd0d7e2, 0.9);
    oppStone.strokeCircle(W / 2, oppFortuneY, 36);
    this.stoneSprites.push(oppStone);

    this._drawFortuneScoreText(W / 2, oppFortuneY, 5, 3, 0, 0);

    if (!oppRevealed) {
      const oppHiddenText = this.add
        .text(W / 2, oppFortuneY, "?", {
          fontSize: "32px",
          color: "#f4f7ff",
          fontFamily: "sans-serif",
        })
        .setOrigin(0.5);
      this.stoneSprites.push(oppHiddenText);
    }

    const oppLabel = this.add
      .text(W / 2 - 132, oppFortuneY, "相手の占い石", {
        fontSize: "20px",
        color: "#f2f2f6",
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5);
    this.stoneSprites.push(oppLabel);

    this._drawDiscardArea();
  }

  _drawFortuneScoreText(
    x,
    y,
    selfScore,
    oppScore,
    lowerShiftX = null,
    upperShiftX = null,
  ) {
    const selfLabel = selfScore > 0 ? `+${selfScore}` : `${selfScore}`;
    const oppLabel = oppScore > 0 ? `+${oppScore}` : `${oppScore}`;

    const defaultOffset = x < W / 2 ? -28 : x > W / 2 ? 28 : 0;
    const lowerOffset = lowerShiftX ?? defaultOffset;
    const upperOffset = upperShiftX ?? -defaultOffset;
    const lowerIsFive = selfScore === 5;
    const upperIsFive = oppScore === 5;

    const lower = this.add
      .text(x + lowerOffset, y + 66, selfLabel, {
        fontSize: "24px",
        color: lowerIsFive ? "#f2f2f6" : "#1f1b17",
        fontFamily: "sans-serif",
        stroke: lowerIsFive ? undefined : "#fffaf0",
        strokeThickness: lowerIsFive ? 0 : 2,
      })
      .setOrigin(0.5);
    this.stoneSprites.push(lower);

    const upper = this.add
      .text(x + upperOffset, y - 66, oppLabel, {
        fontSize: "24px",
        color: upperIsFive ? "#1f1b17" : "#f2f2f6",
        fontFamily: "sans-serif",
        stroke: upperIsFive ? undefined : "#0d0d10",
        strokeThickness: upperIsFive ? 0 : 2,
      })
      .setOrigin(0.5);
    upper.setRotation(Math.PI);
    this.stoneSprites.push(upper);
  }

  _drawDiscardArea() {
    const discard = this.gameState.getState().discard ?? [];
    const discardCount = discard.length;
    const baseX = 120;
    const baseY = H - 170;

    const box = this.add.graphics();
    box.fillStyle(0x101018, 0.9);
    box.lineStyle(2, 0x6f7f99, 0.8);
    box.fillRoundedRect(baseX - 62, baseY - 86, 124, 176, 14);
    box.strokeRoundedRect(baseX - 62, baseY - 86, 124, 176, 14);
    this.stoneSprites.push(box);

    const label = this.add
      .text(baseX, baseY - 64, "捨て場", {
        fontSize: "18px",
        color: "#c9d5eb",
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5);
    this.stoneSprites.push(label);

    const preview = discard.slice(-6);
    preview.forEach((stone, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = baseX - 20 + col * 40;
      const y = baseY - 32 + row * 34;
      const chip = this.add.graphics();
      chip.fillStyle(COLORS[stone.color]?.hex ?? 0xffffff, 1);
      chip.fillCircle(x, y, 13);
      chip.lineStyle(2, 0xffffff, 0.55);
      chip.strokeCircle(x, y, 13);
      this.stoneSprites.push(chip);
    });
  }

  _getLaneDistanceLabel(pitIndex) {
    if (pitIndex >= 0 && pitIndex <= 4) {
      return 5 - pitIndex;
    }

    if (pitIndex >= 6 && pitIndex <= 10) {
      return 11 - pitIndex;
    }

    return null;
  }

  _drawTrayUi() {
    if (this.mode === "poipoi-store") {
      this._drawPlacementHighlight(5);
      this._drawPlacementHighlight(11);
      return;
    }

    if (this.mode === "poipoi-stone") {
      if (this.poipoiStoreIndex != null) {
        this._drawPlacementHighlight(this.poipoiStoreIndex);
      }
      return;
    }

    // AI のターン中（playerTurn=false）はトレイを表示しない
    if (!this.playerTurn) return;

    const pending = this._getTrayPendingStones();
    if (pending.length === 0) {
      return;
    }

    const panel = this.add.graphics();
    panel.fillStyle(0x081523, 0.92);
    panel.lineStyle(3, 0xbfd7ff, 0.5);
    panel.fillRoundedRect(60, H - 320, W - 120, 180, 22);
    panel.strokeRoundedRect(60, H - 320, W - 120, 180, 22);
    this.stoneSprites.push(panel);

    const phaseLabel = this.mode === "sowing" ? "撒き中" : "配置中";
    const guideText = this.add
      .text(
        W / 2,
        H - 286,
        `${phaseLabel}: ${this.mode === "sowing" ? "置く石を選択してください" : "置く石と路を選択してください"} (${pending.length}個残り)`,
        {
          fontSize: "28px",
          color: "#f3f4f8",
          fontFamily: "sans-serif",
        },
      )
      .setOrigin(0.5);
    this.stoneSprites.push(guideText);

    const undoButton = this.add
      .text(W - 120, H - 286, "戻す", {
        fontSize: "28px",
        color: "#dce8ff",
        backgroundColor: "#27425f",
        padding: { x: 16, y: 8 },
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5)
      .setInteractive();
    undoButton.on("pointerdown", () => {
      if (this._isOnlineRoomMode()) {
        if (!this.playerTurn || this.onlineMovePending) return;
        if (this.mode === "sowing") {
          const sent = this._sendOnlineUndoRequest("sowing");
          if (!sent) {
            this.scene
              .get("UIScene")
              .showCenterBanner("通信切断", 0xffa6c9, "再接続を待っています");
            return;
          }
          return;
        }

        if (this.mode === "placing") {
          const sent = this._sendOnlineUndoRequest("placing");
          if (!sent) {
            this.scene
              .get("UIScene")
              .showCenterBanner("通信切断", 0xffa6c9, "再接続を待っています");
            return;
          }
          return;
        }

        this.scene
          .get("UIScene")
          .showCenterBanner("戻す", 0xffd77a, "このフェーズでは戻せません");
        return;
      }
      if (this.mode === "sowing") {
        this._undoSowingStep();
      } else {
        this._undoPlacement();
      }
    });
    this.stoneSprites.push(undoButton);

    const cols = 7;
    const startX = 160;
    const startY = H - 220;
    const gapX = 110;
    const gapY = 72;

    pending.forEach((stone, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * gapX;
      const y = startY + row * gapY;
      const isSelected = index === this.selectedPlacementStoneIndex;

      const token = this.add.graphics();
      token.fillStyle(COLORS[stone.color]?.hex ?? 0xffffff, 1);
      token.fillCircle(x, y, 26);
      token.lineStyle(isSelected ? 5 : 2, isSelected ? 0xffffff : 0x0f2030, 1);
      token.strokeCircle(x, y, 26);
      this.stoneSprites.push(token);

      const zone = this.add.zone(x, y, 60, 60).setInteractive();
      zone.on("pointerdown", () => {
        this.selectedPlacementStoneIndex = index;
        if (this.mode === "sowing") {
          this._applySowingChoice(index);
          return;
        }
        this._renderStones();
        this.scene.get("UIScene").showPlacementPrompt(null, pending.length);
      });
      this.stoneSprites.push(zone);
    });

    if (this.mode === "sowing") {
      if (this.sowTargets.length > 0) {
        this._drawPlacementHighlight(this.sowTargets[0]);
      }
      if (this._sowingIsUnique(this.sowPending) && !this.autoSowingInProgress) {
        const autoBtn = this.add
          .text(W - 120, H - 168, "オート", {
            fontSize: "28px",
            color: "#d4f5e9",
            backgroundColor: "#1a4a36",
            padding: { x: 20, y: 8 },
            fontFamily: "sans-serif",
            stroke: "#0a2018",
            strokeThickness: 2,
          })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });
        autoBtn.on("pointerdown", () => {
          if (this.autoSowingInProgress || this.mode !== "sowing") return;
          this.autoSowingInProgress = true;
          this._autoResolveSowingAll();
        });
        this.stoneSprites.push(autoBtn);
      }
      return;
    }

    if (this.selectedPlacementStoneIndex != null) {
      if (this.mode === "placing") {
        [0, 1, 2, 3, 4].forEach((index) => this._drawPlacementHighlight(index));
      } else {
        ALL_PIT_INDEXES.forEach((index) => this._drawPlacementHighlight(index));
      }
    }
  }

  _drawPlacementHighlight(pitIndex) {
    const pos = this._getViewPos(pitIndex);
    if (!pos) return;

    const isStore = pitIndex === 5 || pitIndex === 11;
    const highlight = this.add.graphics();
    const isPoipoiMode =
      this.mode === "poipoi-store" || this.mode === "poipoi-stone";
    highlight.lineStyle(6, isPoipoiMode ? 0x6ec1ff : 0xffe082, 0.95);

    const width = isStore ? STORE_DIAMOND_SIZE + 14 : CELL_W + 12;
    const height = isStore ? STORE_DIAMOND_SIZE + 14 : CELL_H + 12;
    const points = this._getDiamondPoints(pos.x, pos.y, width, height);

    highlight.strokePoints(points, true);

    const tween = this.tweens.add({
      targets: highlight,
      alpha: 0.28,
      duration: 540,
      yoyo: true,
      repeat: -1,
    });

    this.highlightTweens.push(tween);
    this.stoneSprites.push(highlight);
  }

  _getLocalLaneIndexes() {
    if (this._isOnlineRoomMode()) {
      return this.onlineSide === "opp" ? [6, 7, 8, 9, 10] : [0, 1, 2, 3, 4];
    }
    return [0, 1, 2, 3, 4];
  }

  _getOppLaneIndexes() {
    if (this._isOnlineRoomMode()) {
      return this.onlineSide === "opp" ? [0, 1, 2, 3, 4] : [6, 7, 8, 9, 10];
    }
    return [6, 7, 8, 9, 10];
  }

  _clearTurnLaneGuidance() {
    this.turnGuideTweens.forEach((tween) => tween.remove());
    this.turnGuideTweens = [];
    this.turnGuideSprites.forEach((sprite) => sprite.destroy());
    this.turnGuideSprites = [];
  }

  _clearTurnStartSweep() {
    this.turnStartSweepTweens.forEach((tween) => tween.remove());
    this.turnStartSweepTweens = [];
    this.turnStartSweepSprites.forEach((sprite) => sprite.destroy());
    this.turnStartSweepSprites = [];
  }

  playTurnStartSweep(isPlayerTurn = this.playerTurn) {
    this._clearTurnStartSweep();
    if (this.mode !== "turn") return;

    const laneIndexes = isPlayerTurn
      ? this._getLocalLaneIndexes()
      : this._getOppLaneIndexes();
    const lanePositions = laneIndexes
      .map((pitIndex) => this._getViewPos(pitIndex))
      .filter((pos) => !!pos);
    if (lanePositions.length === 0) return;

    const laneY =
      lanePositions.reduce((sum, pos) => sum + pos.y, 0) / lanePositions.length;
    const sweepY = laneY - 120;
    const message = isPlayerTurn ? "あなたの番です" : "相手の番です";
    const color = isPlayerTurn ? "#dff3ff" : "#ffdfe4";

    const sweepContainer = this.add.container(-260, sweepY);

    const sweepGlow = this.add
      .rectangle(0, 0, 560, 88, isPlayerTurn ? 0x9fd6ff : 0xf3b7c2, 0.18)
      .setStrokeStyle(2, isPlayerTurn ? 0xe8f6ff : 0xffe6ea, 0.6);

    const sweepText = this.add
      .text(0, 0, message, {
        fontSize: "58px",
        color,
        fontFamily: DISPLAY_FONT,
        stroke: "#0b111b",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    sweepContainer.add([sweepGlow, sweepText]);
    sweepContainer.setAlpha(0);

    this.turnStartSweepSprites.push(sweepContainer);

    const inTween = this.tweens.add({
      targets: sweepContainer,
      x: W / 2,
      alpha: 1,
      duration: 360,
      ease: "Cubic.Out",
      onComplete: () => {
        const holdTween = this.tweens.add({
          targets: sweepContainer,
          x: W / 2,
          alpha: 1,
          duration: 180,
          ease: "Linear",
          onComplete: () => {
            const outTween = this.tweens.add({
              targets: sweepContainer,
              x: W + 260,
              alpha: 0,
              duration: 620,
              ease: "Sine.InOut",
              onComplete: () => this._clearTurnStartSweep(),
            });
            this.turnStartSweepTweens.push(outTween);
          },
        });
        this.turnStartSweepTweens.push(holdTween);
      },
    });

    this.turnStartSweepTweens.push(inTween);
  }

  refreshTurnLaneGuidance(isPlayerTurn = this.playerTurn) {
    this._clearTurnLaneGuidance();
    if (!isPlayerTurn) return;
    if (this.mode === "final-phase") return;

    const laneIndexes = this._getLocalLaneIndexes();
    const state = this.gameState.getState();

    laneIndexes.forEach((pitIndex) => {
      const pos = this._getViewPos(pitIndex);
      if (!pos) return;
      if (state.pits[pitIndex].stones.length === 0) return;

      // 撒き結果を予測して技の発動可否を判定
      const stoneCount = state.pits[pitIndex].stones.length;
      const lastPit = (pitIndex + stoneCount) % 12;
      const playerSide =
        this._isOnlineRoomMode() && this.onlineSide === "opp" ? "opp" : "self";
      const isOwnLane =
        playerSide === "opp"
          ? (i) => i >= 6 && i <= 10
          : (i) => i >= 0 && i <= 4;
      const storeIndex = playerSide === "opp" ? 11 : 5;
      const wouldZakuzaku =
        isOwnLane(lastPit) &&
        state.pits[lastPit].stones.length === 0 &&
        (state.pits[this.gameState.getCaptureTargetIndex(playerSide, lastPit)]
          ?.stones.length ?? 0) > 0;
      const wouldGuruguru = lastPit === storeIndex;

      // 色の決定
      let fillColor, lineColor;
      if (wouldZakuzaku) {
        fillColor = 0xffc857; // 金: ざくざく
        lineColor = 0xffc857;
      } else if (wouldGuruguru) {
        fillColor = 0xff6666; // 赤系: ぐるぐる
        lineColor = 0xff6666;
      } else {
        fillColor = 0x00e5ff; // 通常
        lineColor = 0x00e5ff;
      }

      const guide = this.add.graphics();
      const points = this._getDiamondPoints(
        pos.x,
        pos.y,
        CELL_W + 16,
        CELL_H + 16,
      );
      guide.fillStyle(fillColor, 0.22);
      guide.fillPoints(points, true);
      guide.lineStyle(6, lineColor, 1.0);
      guide.strokePoints(points, true);
      guide.alpha = 0;

      const flashTween = this.tweens.add({
        targets: guide,
        alpha: 0.95,
        duration: 130,
        yoyo: true,
        repeat: 2,
        hold: 30,
        onComplete: () => {
          const slowTween = this.tweens.add({
            targets: guide,
            alpha: 0.56,
            duration: 960,
            yoyo: true,
            repeat: -1,
            ease: "Sine.InOut",
          });
          this.turnGuideTweens.push(slowTween);
        },
      });

      this.turnGuideTweens.push(flashTween);
      this.turnGuideSprites.push(guide);
    });
  }

  _flashZakuzakuTarget(pitIndex) {
    const pos = this._getViewPos(pitIndex);
    if (!pos) return;

    const flash = this.add.graphics();
    flash.lineStyle(8, 0xffc857, 0.95);
    flash.fillStyle(0xffc857, 0.18);
    const points = this._getDiamondPoints(pos.x, pos.y, CELL_W + 6, CELL_H + 6);
    flash.fillPoints(points, true);
    flash.strokePoints(points, true);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 1.06,
      scaleY: 1.06,
      duration: 520,
      ease: "Sine.Out",
      onComplete: () => flash.destroy(),
    });
  }

  _playZakuzakuArrow(fromPitIndex, toPitIndex) {
    const fromPos = this._getViewPos(fromPitIndex);
    const toPos = this._getViewPos(toPitIndex);
    if (!fromPos || !toPos) return;

    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 1) return;

    const ux = dx / distance;
    const uy = dy / distance;
    const normalX = -uy;
    const normalY = ux;
    const shaftLength = Math.max(110, distance - 72);
    const tipX = fromPos.x + ux * shaftLength;
    const tipY = fromPos.y + uy * shaftLength;

    const arrow = this.add.graphics();
    const headLength = 28;
    const halfHeadWidth = 16;

    const redrawArrow = (progress) => {
      const clamped = Phaser.Math.Clamp(progress, 0, 1);
      const bodyEndX = fromPos.x + ux * shaftLength * clamped;
      const bodyEndY = fromPos.y + uy * shaftLength * clamped;

      arrow.clear();
      arrow.lineStyle(8, 0xffd77a, 0.95);
      arrow.lineBetween(fromPos.x, fromPos.y, bodyEndX, bodyEndY);

      if (clamped > 0.86) {
        const headBaseX = tipX - ux * headLength;
        const headBaseY = tipY - uy * headLength;
        arrow.fillStyle(0xffd77a, 0.95);
        arrow.fillTriangle(
          tipX,
          tipY,
          headBaseX + normalX * halfHeadWidth,
          headBaseY + normalY * halfHeadWidth,
          headBaseX - normalX * halfHeadWidth,
          headBaseY - normalY * halfHeadWidth,
        );
      }
    };

    redrawArrow(0);

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 360,
      ease: "Cubic.Out",
      onUpdate: (tween) => {
        redrawArrow(tween.getValue());
      },
      onComplete: () => {
        this.tweens.add({
          targets: arrow,
          alpha: 0,
          duration: 320,
          ease: "Sine.In",
          onComplete: () => arrow.destroy(),
        });
      },
    });
  }

  _playLaneDamageShake(pitIndex) {
    const pos = this._getViewPos(pitIndex);
    if (!pos) return;

    const fx = this.add.graphics();
    const baseWidth = CELL_W + 14;
    const baseHeight = CELL_H + 14;
    let step = 0;
    const maxSteps = 10;

    const redraw = (jx, jy, alpha) => {
      fx.clear();

      const points = this._getDiamondPoints(
        pos.x + jx,
        pos.y + jy,
        baseWidth,
        baseHeight,
      );
      const inner = this._getDiamondPoints(
        pos.x + jx,
        pos.y + jy,
        baseWidth - 22,
        baseHeight - 22,
      );

      fx.fillStyle(0xffb38a, 0.12 * alpha);
      fx.fillPoints(points, true);
      fx.lineStyle(6, 0xffd77a, 0.85 * alpha);
      fx.strokePoints(points, true);
      fx.lineStyle(3, 0xff7a7a, 0.9 * alpha);
      fx.strokePoints(inner, true);
    };

    redraw(0, 0, 1);

    const event = this.time.addEvent({
      delay: 42,
      repeat: maxSteps - 1,
      callback: () => {
        step += 1;
        const decay = 1 - step / (maxSteps + 1);
        const amp = Math.max(1.4, 8 * decay);
        const jx = Phaser.Math.FloatBetween(-amp, amp);
        const jy = Phaser.Math.FloatBetween(-amp * 0.75, amp * 0.75);
        redraw(jx, jy, decay);
      },
    });

    this.tweens.add({
      targets: fx,
      alpha: 0,
      duration: 520,
      ease: "Sine.In",
      onComplete: () => {
        if (event && !event.hasDispatched) {
          event.remove(false);
        }
        fx.destroy();
      },
    });
  }

  _announceTechnique(message, accent = 0xf0c36a, description = null) {
    this.scene.get("UIScene").showCenterBanner(message, accent, description);
  }

  _playTechniqueBurst(accent) {
    const cx = W / 2;
    const cy = H / 2;

    for (let i = 0; i < 3; i++) {
      const ring = this.add.graphics();
      ring.lineStyle(6 - i, accent, 0.85 - i * 0.16);
      ring.strokeCircle(cx, cy, 64 + i * 18);

      this.tweens.add({
        targets: ring,
        alpha: 0,
        scaleX: 2.2 + i * 0.18,
        scaleY: 2.2 + i * 0.18,
        duration: 860 + i * 110,
        ease: "Sine.Out",
        onComplete: () => ring.destroy(),
      });
    }

    const rays = this.add.graphics();
    rays.lineStyle(5, accent, 0.55);
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const inner = 86;
      const outer = 148;
      rays.lineBetween(
        cx + Math.cos(angle) * inner,
        cy + Math.sin(angle) * inner,
        cx + Math.cos(angle) * outer,
        cy + Math.sin(angle) * outer,
      );
    }

    this.tweens.add({
      targets: rays,
      alpha: 0,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 920,
      ease: "Sine.Out",
      onComplete: () => rays.destroy(),
    });
  }

  _setupInput() {
    this.input.on("pointerdown", () => {});
  }

  _onPitClick(pitIndex) {
    if (this._isOnlineRoomMode()) {
      this._handleOnlinePitClick(pitIndex);
      return;
    }

    if (
      this.mode === "sowing" ||
      this.mode === "special-choice" ||
      this.mode === "kutakuta-choice" ||
      this.mode === "final-phase"
    ) {
      return;
    }

    if (this.mode === "poipoi-store") {
      this._handlePoipoiStoreClick(pitIndex);
      return;
    }

    if (this.mode === "poipoi-stone") {
      if (pitIndex !== this.poipoiStoreIndex) {
        this.scene
          .get("UIScene")
          .showCenterBanner("ぽいぽい", 0xffa6c9, "選んだ賽壇の石をクリック！");
      }
      return;
    }

    if (this.mode === "placing") {
      if (!this.playerTurn) return;
      this._handlePlacementClick(pitIndex);
      return;
    }

    if (!this.playerTurn) return;
    if (pitIndex < 0 || pitIndex > 4) return;

    const state = this.gameState.getState();
    if (state.pits[pitIndex].stones.length === 0) return;

    this._startSowingSelection(pitIndex);
  }

  _startSowingSelection(pitIndex) {
    const state = this.gameState.getState();
    const stones = [...state.pits[pitIndex].stones];
    if (stones.length === 0) return;

    this._clearTurnLaneGuidance();
    state.pits[pitIndex].stones = [];
    this.mode = "sowing";
    this.sowPending = stones;
    this.sowTargets = this._buildSowTargets(pitIndex, stones.length);
    this.sowHistory = [];
    this.sowSourcePitIndex = pitIndex;
    this.selectedPlacementStoneIndex = 0;
    this._renderStones();
    this.scene.get("UIScene").showSowingPrompt(null, this.sowPending.length);
  }

  _sowingIsUnique(stones) {
    if (stones.length <= 1) return true;
    const firstColor = stones[0]?.color;
    return stones.every((stone) => stone.color === firstColor);
  }

  _autoResolveSowingStep() {
    if (!this.autoSowingInProgress || this.mode !== "sowing") return;
    if (this.sowPending.length === 0) {
      this.autoSowingInProgress = false;
      return;
    }

    if (this._isOnlineRoomMode()) {
      this._applySowingChoice(0);
      return;
    }

    this._applySowingChoice(0);
    if (this.mode === "sowing") {
      this.time.delayedCall(120, () => this._autoResolveSowingStep());
    } else {
      this.autoSowingInProgress = false;
    }
  }

  _autoResolveSowingAll() {
    if (!this.autoSowingInProgress || this.mode !== "sowing") return;

    if (this._isOnlineRoomMode()) {
      this._autoResolveSowingStep();
      return;
    }

    let safety = 0;
    while (this.mode === "sowing" && this.sowPending.length > 0) {
      if (this.sowTargets.length === 0) {
        this.autoSowingInProgress = false;
        this.scene
          .get("UIScene")
          .showCenterBanner("オート停止", 0xffd77a, "配置先が不足しています");
        return;
      }

      const beforePending = this.sowPending.length;
      this._applySowingChoice(0);
      const progressed =
        this.sowPending.length < beforePending || this.mode !== "sowing";
      if (!progressed) {
        this.autoSowingInProgress = false;
        this.scene
          .get("UIScene")
          .showCenterBanner(
            "オート停止",
            0xffd77a,
            "処理が進まなかったため停止",
          );
        return;
      }

      safety += 1;
      if (safety > 200) {
        this.autoSowingInProgress = false;
        this.scene
          .get("UIScene")
          .showCenterBanner("オート停止", 0xffd77a, "安全停止しました");
        return;
      }
    }
    this.autoSowingInProgress = false;
  }

  _buildSowTargets(startPit, stoneCount) {
    const targets = [];
    let cursor = startPit;
    for (let i = 0; i < stoneCount; i++) {
      cursor = (cursor + 1) % 12;
      targets.push(cursor);
    }
    return targets;
  }

  _getPreferredPoipoiStore(role = "self") {
    const state = this.gameState.getState();
    const oppStore = role === "self" ? 11 : 5;
    const ownStore = role === "self" ? 5 : 11;
    if (state.pits[oppStore].stones.length > 0) return oppStore;
    if (state.pits[ownStore].stones.length > 0) return ownStore;
    return null;
  }

  _applySowingChoice(pendingIndex) {
    if (this.mode !== "sowing") return;

    if (this._isOnlineRoomMode()) {
      if (!this.playerTurn) return;
      if (this.onlineMovePending) return;
      if (pendingIndex < 0 || pendingIndex >= this.sowPending.length) return;

      const sent = roomClient.send({
        type: "request_sowing_choice",
        roomCode: this.onlineRoomCode,
        pendingIndex,
      });
      if (!sent) {
        this.scene
          .get("UIScene")
          .showCenterBanner("通信切断", 0xffa6c9, "再接続を待っています");
        return;
      }
      this.onlineMovePending = true;
      return;
    }

    if (pendingIndex < 0 || pendingIndex >= this.sowPending.length) return;
    if (this.sowTargets.length === 0) return;

    const targetPit = this.sowTargets.shift();
    const [stone] = this.sowPending.splice(pendingIndex, 1);
    this.gameState.getState().pits[targetPit].stones.push(stone);
    this.sowHistory.push({ targetPit, stone, pendingIndex });

    if (this.sowPending.length === 0) {
      this._completeSowingTurn(targetPit);
      return;
    }

    this.selectedPlacementStoneIndex = Math.min(
      pendingIndex,
      this.sowPending.length - 1,
    );
    this._renderStones();
    this.scene.get("UIScene").showSowingPrompt(null, this.sowPending.length);
  }

  _undoSowingStep() {
    if (
      this.mode !== "sowing" ||
      this.autoSowingInProgress ||
      this._isOnlineRoomMode()
    )
      return;

    const last = this.sowHistory.pop();
    if (!last) {
      // まだ1個も置いていない最初の状態なら、元の路へ戻して再選択可能にする
      if (this.sowSourcePitIndex != null && this.sowPending.length > 0) {
        this.gameState.getState().pits[this.sowSourcePitIndex].stones = [
          ...this.sowPending,
        ];
        this.mode = "turn";
        this.selectedPlacementStoneIndex = null;
        this.sowPending = [];
        this.sowTargets = [];
        this.sowHistory = [];
        this.sowSourcePitIndex = null;
        this.autoSowingInProgress = false;
        this._renderStones();
        this.scene.get("UIScene").hidePlacementPrompt();
        this.refreshTurnLaneGuidance?.(this.playerTurn && this.mode === "turn");
      } else {
        this.scene
          .get("UIScene")
          .showCenterBanner("戻す", 0xffd77a, "これ以上戻せません");
      }
      return;
    }

    const pit = this.gameState.getState().pits[last.targetPit];
    const restoredStone = pit.stones.pop();
    if (!restoredStone) return;

    this.sowTargets.unshift(last.targetPit);
    this.sowPending.splice(last.pendingIndex, 0, restoredStone);
    this.selectedPlacementStoneIndex = last.pendingIndex;
    this._renderStones();
    this.scene.get("UIScene").showSowingPrompt(null, this.sowPending.length);
  }

  _completeSowingTurn(lastPit) {
    this.mode = "turn";
    this.selectedPlacementStoneIndex = null;
    this.sowPending = [];
    this.sowTargets = [];
    this.sowHistory = [];
    this.sowSourcePitIndex = null;
    this.autoSowingInProgress = false;
    this._renderStones();
    this.scene.get("UIScene").hidePlacementPrompt();

    const extraTurn = this.gameState.checkExtraTurn(lastPit);
    const captureTarget = this.gameState.getCaptureTargetIndex("self", lastPit);
    const captured = this.gameState.checkCaptureForPlayer("self", lastPit);

    if (captured.length > 0) {
      this.mode = "placing";
      this.gameState.startPlacement(captured);
      this.selectedPlacementStoneIndex = 0;
      this._renderStones();
      if (captureTarget != null) {
        this._flashZakuzakuTarget(captureTarget);
        this._playZakuzakuArrow(lastPit, captureTarget);
        this._playLaneDamageShake(captureTarget);
      }
      const zakuzakuDesc =
        captureTarget != null
          ? `「${PIT_NAMES[captureTarget]}」の石を横取り！`
          : "石を横取り！";
      this._announceTechnique("ざくざく！", 0x6ab4e8, zakuzakuDesc);
      this.scene
        .get("UIScene")
        .showPlacementPrompt(null, this.gameState.getPendingPlacement().length);
      return;
    }

    if (lastPit === 11) {
      this.mode = "special-choice";
      this.scene.get("UIScene").showSpecialChoice();
      return;
    }

    this._finishTurnAfterPlayerAction(extraTurn);
  }

  _finishTurnAfterPlayerAction(extraTurn) {
    if (this.gameState.isGameOver()) {
      this.scene.get("UIScene").showResult();
      return;
    }

    if (
      !extraTurn &&
      this.playerTurn &&
      this.gameState.canActivateKutakuta("self")
    ) {
      this.mode = "kutakuta-choice";
      this.pendingExtraTurnAfterChoice = extraTurn;
      this.scene.get("UIScene").showKutakutaChoice();
      return;
    }

    this._continueTurnFlow(extraTurn);
  }

  _continueTurnFlow(extraTurn) {
    if (this.gameState.isGameOver()) {
      this.scene.get("UIScene").showResult();
      return;
    }

    if (this._isOnlineRoomMode()) {
      return;
    }

    if (!extraTurn) {
      this.playerTurn = false;
      const ui = this.scene.get("UIScene");
      ui.clearCenterBanner();
      ui.updateTurnDisplay(this.playerTurn);
      this.time.delayedCall(1200, () => this._aiTurn());
      return;
    }

    // 自分の路に石があるときだけぐるぐる。なければAIへ手番を渡す
    const playerHasMoves = [0, 1, 2, 3, 4].some(
      (i) => this.gameState.getState().pits[i].stones.length > 0,
    );
    if (!playerHasMoves) {
      this.playerTurn = false;
      const ui = this.scene.get("UIScene");
      ui.clearCenterBanner();
      ui.updateTurnDisplay(this.playerTurn);
      this.time.delayedCall(1200, () => this._aiTurn());
      return;
    }
    this._announceTechnique("ぐるぐる！", 0x6ab4e8, "もう一度あなたのターン！");
    this.time.delayedCall(900, () => {
      if (this.mode !== "turn") return;
      this.scene.get("UIScene").updateTurnDisplay(this.playerTurn);
    });
  }

  chooseKutakutaAction(action) {
    if (this.mode !== "kutakuta-choice") return;

    if (this._isOnlineRoomMode()) {
      if (!this.playerTurn || this.onlineMovePending) return;
      const sent = roomClient.send({
        type: "request_kutakuta_choice",
        roomCode: this.onlineRoomCode,
        action,
      });
      if (!sent) {
        this.scene
          .get("UIScene")
          .showCenterBanner("通信切断", 0xffa6c9, "再接続を待っています");
        return;
      }
      this.onlineMovePending = true;
      this.scene.get("UIScene").hideKutakutaChoice();
      return;
    }

    const extraTurn = this.pendingExtraTurnAfterChoice ?? false;
    this.pendingExtraTurnAfterChoice = null;
    this.mode = "turn";
    this.scene.get("UIScene").hideKutakutaChoice();
    this.scene.get("UIScene").clearCenterBanner();

    if (action === "kutakuta") {
      this._announceTechnique("くたくた！", 0x6ab4e8, "ゲーム終了！");
      this.time.delayedCall(450, () => this.scene.get("UIScene").showResult());
      return;
    }

    this._continueTurnFlow(extraTurn);
  }

  chooseSpecialAction(action) {
    if (this.mode !== "special-choice") return;

    if (this._isOnlineRoomMode()) {
      if (!this.playerTurn || this.onlineMovePending) return;
      const sent = roomClient.send({
        type: "request_special_choice",
        roomCode: this.onlineRoomCode,
        action,
      });
      if (!sent) {
        this.scene
          .get("UIScene")
          .showCenterBanner("通信切断", 0xffa6c9, "再接続を待っています");
        return;
      }
      this.onlineMovePending = true;
      this.scene.get("UIScene").hideSpecialChoice();
      if (action === "poipoi") {
        this.scene
          .get("UIScene")
          .showCenterBanner("ぽいぽい！", 0x9fd6ff, "石を一つ排除！", true);
      }
      return;
    }

    if (action === "chirachira") {
      if (!this.gameState.canUseChirachira("self")) {
        this.scene.get("UIScene").showCenterBanner("ちらちらは使い切り");
        return;
      }

      const revealInfo = this.gameState.revealNextCenterForPlayer("self");
      this.scene.get("UIScene").hideSpecialChoice();
      const chirachiraDesc = revealInfo
        ? `${CENTER_VIEW_NAMES[revealInfo.index]}を確認`
        : "占い石を確認！";
      this._announceTechnique("ちらちら！", 0x6ab4e8, chirachiraDesc);
      this._renderStones();
      this.mode = "turn";
      this.time.delayedCall(500, () =>
        this._finishTurnAfterPlayerAction(false),
      );
      return;
    }

    if (action === "poipoi") {
      this.scene.get("UIScene").hideSpecialChoice();
      this._announceTechnique("ぽいぽい！", 0x6ab4e8, "石を一つ排除！");

      const selfStoreCount = this.gameState.getState().pits[5].stones.length;
      const oppStoreCount = this.gameState.getState().pits[11].stones.length;
      if (selfStoreCount === 0 && oppStoreCount === 0) {
        this.mode = "turn";
        this.time.delayedCall(350, () =>
          this._finishTurnAfterPlayerAction(false),
        );
        return;
      }

      this.mode = "poipoi-store";
      this.poipoiStoreIndex = null;
      this._renderStones();
      this.scene.get("UIScene").showPoipoiStorePrompt();
    }
  }

  _handlePoipoiStoreClick(pitIndex) {
    if (pitIndex !== 5 && pitIndex !== 11) {
      this.scene
        .get("UIScene")
        .showCenterBanner("ぽいぽい", 0xffa6c9, "賽壇をクリックして選択！");
      return;
    }
    const preferredStore = this._getPreferredPoipoiStore("self");
    if (preferredStore == null) {
      if (this.soloFinalPoipoiActive) {
        this.soloFinalPoipoiActive = false;
        this.mode = "final-phase";
        this.poipoiStoreIndex = null;
        this.scene.get("UIScene").hidePlacementPrompt();
        this._renderStones();
        const uiScene = this.scene.get("UIScene");
        uiScene.finalPhaseState.selfPoipoiRemaining = 0;
        uiScene._revealCenterAndProceedToCalc();
        return;
      }
      this.mode = "turn";
      this.poipoiStoreIndex = null;
      this.scene.get("UIScene").hidePlacementPrompt();
      this._renderStones();
      this._finishTurnAfterPlayerAction(false);
      return;
    }

    if (this.gameState.getState().pits[pitIndex].stones.length === 0) {
      this.scene
        .get("UIScene")
        .showCenterBanner("ぽいぽい", 0xffa6c9, "石がある賽壇を選択！");
      return;
    }

    this.mode = "poipoi-stone";
    this.poipoiStoreIndex = pitIndex;
    this._renderStones();
    this.scene.get("UIScene").showPoipoiStonePrompt();
  }

  _handlePoipoiStoneClick(pitIndex, stoneIndex) {
    if (this.mode !== "poipoi-stone") return;
    if (this.poipoiStoreIndex !== pitIndex) return;

    if (this._isOnlineRoomMode()) {
      if (!this.playerTurn || this.onlineMovePending) return;
      const finalStage = this.onlineFinalPhase?.stage;
      const isFinalPoipoi = finalStage === "poipoi-stone";
      const sent = roomClient.send({
        type: isFinalPoipoi
          ? "request_final_poipoi_stone"
          : "request_poipoi_stone",
        roomCode: this.onlineRoomCode,
        stoneIndex,
      });
      if (!sent) {
        this.scene
          .get("UIScene")
          .showCenterBanner("通信切断", 0xffa6c9, "再接続を待っています");
        return;
      }
      this.onlineMovePending = true;
      return;
    }

    if (this.soloFinalPoipoiActive) {
      const removed = this.gameState.removeStoneFromPit(pitIndex, stoneIndex);
      if (!removed) return;
      this.soloFinalPoipoiActive = false;
      this.mode = "final-phase";
      this.poipoiStoreIndex = null;
      this.scene.get("UIScene").hidePlacementPrompt();
      this._renderStones();
      this.scene.get("UIScene")._onSoloFinalPoipoiStone();
      return;
    }

    const removed = this.gameState.removeStoneFromPit(pitIndex, stoneIndex);
    if (!removed) return;

    this.mode = "turn";
    this.poipoiStoreIndex = null;
    this.scene.get("UIScene").hidePlacementPrompt();
    this._renderStones();
    this._finishTurnAfterPlayerAction(false);
  }

  submitOnlineFinalPrediction(color) {
    if (!this._isOnlineRoomMode()) return;
    if (!this.playerTurn || this.onlineMovePending) return;
    const sent = roomClient.send({
      type: "request_final_prediction",
      roomCode: this.onlineRoomCode,
      color,
    });
    if (!sent) {
      this.scene
        .get("UIScene")
        .showCenterBanner("通信切断", 0xffa6c9, "再接続を待っています");
      return;
    }
    this.onlineMovePending = true;
  }

  _getTrayPendingStones() {
    if (this.mode === "sowing") return this.sowPending;
    return this.gameState.getPendingPlacement();
  }

  _handlePlacementClick(pitIndex) {
    if (this.selectedPlacementStoneIndex == null) return;
    if (pitIndex < 0 || pitIndex > 4) return;

    const placed = this.gameState.placePendingStone(
      pitIndex,
      this.selectedPlacementStoneIndex,
    );
    if (!placed) return;

    const pending = this.gameState.getPendingPlacement();
    if (pending.length === 0) {
      this.mode = "turn";
      this.selectedPlacementStoneIndex = null;
      this._renderStones();
      this.scene.get("UIScene").hidePlacementPrompt();
      this._finishTurnAfterPlayerAction(false);
      return;
    }

    this.selectedPlacementStoneIndex = Math.min(
      this.selectedPlacementStoneIndex,
      pending.length - 1,
    );
    this._renderStones();
    this.scene.get("UIScene").showPlacementPrompt(null, pending.length);
  }

  _undoPlacement() {
    if (this.mode !== "placing" || this._isOnlineRoomMode()) return;

    const restored = this.gameState.undoPlacement();
    if (!restored) {
      this.scene
        .get("UIScene")
        .showCenterBanner("戻す", 0xffd77a, "これ以上戻せません");
      return;
    }

    const pending = this.gameState.getPendingPlacement();
    this.selectedPlacementStoneIndex = pending.findIndex(
      (stone) => stone.color === restored.color,
    );
    this._renderStones();
    this.scene.get("UIScene").showPlacementPrompt(null, pending.length);
  }

  _distributeCapturedToOwnLanes(player, captured) {
    if (captured.length === 0) return;
    const lane = player === "self" ? [0, 1, 2, 3, 4] : [6, 7, 8, 9, 10];
    let cursor = 0;
    for (const stone of captured) {
      this.gameState.getState().pits[lane[cursor]].stones.push(stone);
      cursor = (cursor + 1) % lane.length;
    }
  }

  _aiTurn() {
    if (this._isOnlineRoomMode()) return;
    if (this.mode === "final-phase") return;

    const state = this.gameState.getState();
    const validPits = [6, 7, 8, 9, 10].filter(
      (i) => state.pits[i].stones.length > 0,
    );
    if (validPits.length === 0) {
      // 相手の路が全て空 — 終了判定を優先する
      if (this.gameState.isGameOver()) {
        this.scene.get("UIScene").showResult();
        return;
      }
      this.playerTurn = true;
      this.scene.get("UIScene").updateTurnDisplay(this.playerTurn);
      return;
    }

    // 強い/鬼AI: ターン開始時に相手の意図を更新
    if (
      this.aiDifficulty === "hard" ||
      this.aiDifficulty === "oni" ||
      this.aiDifficulty === "oni-sente" ||
      this.aiDifficulty === "oni-gote"
    ) {
      this._aiUpdateMemo(state);
    }

    const chosen = this._aiPickPit(validPits, state);
    this._aiStartSowing(chosen);
  }

  /** 難易度に応じてAIがどの路から撒くか決定する */
  _aiPickPit(validPits, state) {
    if (this.aiDifficulty === "easy") {
      // 弱い: 完全ランダム
      return validPits[Math.floor(Math.random() * validPits.length)];
    }
    if (this.aiDifficulty === "hard") {
      // 強い: 鬼相当のAI（旧鬼ロジックを流用）
      return this._aiPickPitOni(validPits, state);
    }
    if (
      this.aiDifficulty === "oni" ||
      this.aiDifficulty === "oni-sente" ||
      this.aiDifficulty === "oni-gote"
    ) {
      // 鬼: さらに強化された2段階上位AI
      return this._aiPickPitOniV2(validPits, state);
    }
    // 普通: スコア評価（ぐるぐる/ざくざく優先）
    return this._aiPickPitNormal(validPits, state);
  }

  /** 普通AI: ぐるぐる→ざくざく→石数を評価 */
  _aiPickPitNormal(validPits, state) {
    let best = validPits[0];
    let bestScore = -Infinity;

    for (const p of validPits) {
      const count = state.pits[p].stones.length;
      const lastPit = (p + count) % 12;
      let score = 0;

      // ぐるぐる: 自分の賽壇(pit11)に落ちる → もう1ターン（連続連鎖も評価）
      if (lastPit === 11) {
        const { pits: pitsAfterGuru } = this._aiSimulateSow(state.pits, p);
        const chainCount = this._aiCountGuruguruChain(pitsAfterGuru);
        score += 12 + chainCount * 14;
      }

      // ざくざく: 自路の空きマスに落ちる → 相手の石を奪う
      if (
        lastPit >= 6 &&
        lastPit <= 10 &&
        state.pits[lastPit].stones.length === 0
      ) {
        const mirrorSelfPit = this.gameState.getCaptureTargetIndex(
          "opp",
          lastPit,
        );
        const mirrorStoneCount =
          mirrorSelfPit != null ? state.pits[mirrorSelfPit].stones.length : 0;
        score += 6 + mirrorStoneCount * 2;
      }

      // プレイヤーにざくざくを与えない
      const mirrorPlayerPit = this.gameState.getCaptureTargetIndex("opp", p);
      if (
        mirrorPlayerPit != null &&
        state.pits[mirrorPlayerPit].stones.length > 0
      ) {
        score -= 2;
      }

      score += count * 0.3 + Math.random() * 0.4;

      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }

    return best;
  }

  /**
   * 相手の賽壇(pit5)に溜まっている石の色を観察し、
   * 相手が狙っている色（占い色）を推測してメモに記録する。
   * 各ターン開始時に呼ばれる。
   */
  _aiUpdateMemo(state) {
    // pit5（プレイヤーの賽壇）の現在の石を集計
    const storeFreq = {};
    for (const s of state.pits[5].stones) {
      storeFreq[s.color] = (storeFreq[s.color] ?? 0) + 1;
    }

    // プレイヤーの路(pit 0-4)の石を集計（どの色を多く持っているか）
    const laneFreq = {};
    for (let i = 0; i < 5; i++) {
      for (const s of state.pits[i].stones) {
        laneFreq[s.color] = (laneFreq[s.color] ?? 0) + 1;
      }
    }

    // 累積: 賽壇に多く溜まった色ほど「狙っている色」の証拠が強い
    // 賽壇は強いシグナル(×3)、路は弱いシグナル(×1)
    for (const [color, count] of Object.entries(storeFreq)) {
      this._aiMemo.playerColorFreq[color] =
        (this._aiMemo.playerColorFreq[color] ?? 0) + count * 3;
    }
    for (const [color, count] of Object.entries(laneFreq)) {
      this._aiMemo.playerColorFreq[color] =
        (this._aiMemo.playerColorFreq[color] ?? 0) + count;
    }

    // 最も頻度の高い色を「プレイヤーが狙っている色」として推測
    const sorted = Object.entries(this._aiMemo.playerColorFreq).sort(
      (a, b) => b[1] - a[1],
    );
    this._aiMemo.inferredPlayerColor = sorted[0]?.[0] ?? null;
    // 最も頻度の低い色を「プレイヤーが避けている色」として推測（おそらくマイナス色）
    this._aiMemo.playerAvoidedColor =
      sorted.length >= 3 ? sorted[sorted.length - 1][0] : null;
  }

  /**
   * 強いAI: ぐるぐる→ざくざく連鎖読み・否定色回避・賽壇マッチング戦略。
   */
  _aiPickPitExpert(validPits, state) {
    const inferred = this._aiMemo.inferredPlayerColor;
    const ownFortune = this.gameState.getFortuneColorForPlayer("opp");
    const knownNeg = this._aiKnownNegativeColor();

    // プレイヤーの賽壇(pit5)の各色の数（打ち消し合い評価用）
    const playerStoreColorCount = {};
    for (const s of state.pits[5].stones) {
      playerStoreColorCount[s.color] =
        (playerStoreColorCount[s.color] ?? 0) + 1;
    }

    // プレイヤーの空き路（ざくざく脱出口）を事前検出
    const emptyPlayerPits = new Set();
    for (let px = 0; px <= 4; px++) {
      if (state.pits[px].stones.length === 0) emptyPlayerPits.add(px);
    }

    let best = validPits[0];
    let bestScore = -Infinity;

    for (const p of validPits) {
      const count = state.pits[p].stones.length;
      const lastPit = (p + count) % 12;
      let score = 0;

      // ─── ぐるぐる: AI賽壇(pit11)に落ちる → もう1ターン ───
      if (lastPit === 11) {
        // ぐるぐる後の盤面をシミュレートして連鎖手を評価
        const { pits: pitsAfter } = this._aiSimulateSow(state.pits, p);
        const chainCount = this._aiCountGuruguruChain(pitsAfter);
        score += 22 + chainCount * 14;
        score += this._aiEvalFollowupOpp(pitsAfter) * 1.2;
      }

      // ─── pit5に落ちる（ちらちら／ぽいぽい） ───
      if (lastPit === 5) {
        const peeksDone = this.gameState.centerPeekProgress?.opp ?? 0;
        if (peeksDone < 3) {
          score += 10; // ちらちら
        } else {
          const playerStoreHasFortune =
            inferred && state.pits[5].stones.some((s) => s.color === inferred);
          score += playerStoreHasFortune
            ? 20
            : state.pits[5].stones.length > 0
              ? 8
              : 3;
        }
      }

      // ─── ざくざく(奪取): AI自路の空きマスに落ちる → 相手の石を奪う ───
      if (
        lastPit >= 6 &&
        lastPit <= 10 &&
        state.pits[lastPit].stones.length === 0
      ) {
        const mirrorPit = lastPit - 6;
        const mirrorStones = state.pits[mirrorPit].stones;
        score += 10 + mirrorStones.length * 4;
        for (const s of mirrorStones) {
          if (ownFortune && s.color === ownFortune) score += 8;
          if (inferred && s.color === inferred) score += 6;
        }
        // ざくざく後の盤面でもぐるぐる/ざくざく連鎖があるかチェック
        const { pits: pitsAfterZaku } = this._aiSimulateSow(state.pits, p);
        score += this._aiEvalFollowupOpp(pitsAfterZaku) * 0.8;
      }

      // ─── ざくざく防御: pit p を空にするとプレイヤーに奪われるか評価 ───
      const playerMirrorOfP = p - 6;
      if (state.pits[playerMirrorOfP].stones.length > 0) {
        const mirrorStoneCount = state.pits[playerMirrorOfP].stones.length;
        score -= 10 + mirrorStoneCount * 3;
        if (inferred) {
          const inferredHere = state.pits[playerMirrorOfP].stones.filter(
            (s) => s.color === inferred,
          ).length;
          score -= inferredHere * 9;
        }
      }

      // ─── 石の着地先がプレイヤー空き路のミラーなら、ざくざく脅威を強化してしまう ───
      for (let i = 0; i < count; i++) {
        const landingPit = (p + 1 + i) % 12;
        if (landingPit >= 6 && landingPit <= 10) {
          const landedMirrorPlayer = landingPit - 6;
          if (emptyPlayerPits.has(landedMirrorPlayer)) {
            score -= 10;
          }
        }
      }

      // ─── 石の色から見た評価 ───
      for (let i = 0; i < count; i++) {
        const landingPit = (p + 1 + i) % 12;
        const stoneColor = state.pits[p].stones[i]?.color;
        if (!stoneColor) continue;

        // AI賽壇(pit11)に落ちる石の評価
        if (landingPit === 11) {
          // 相手の占い色が自賽壇に入ると+5点（最高点！）
          if (inferred && stoneColor === inferred) score += 30;
          // 自分の占い色 = +3点確実
          else if (ownFortune && stoneColor === ownFortune) score += 18;
          // 確定マイナス色 = 問答無用で回避（相手が持っていても自分の-3点は変わらない）
          if (knownNeg && stoneColor === knownNeg) score -= 38;
          // 相手賽壇に同色が多い = 相手占い色の候補（+5期待値）
          const cancelCountHard = playerStoreColorCount[stoneColor] ?? 0;
          if ((!inferred || stoneColor !== inferred) && cancelCountHard >= 2)
            score += cancelCountHard * 6;
          // 未確定色はリスク（中央-3点石の可能性）
          const isConfirmedHard =
            (ownFortune && stoneColor === ownFortune) ||
            (inferred && stoneColor === inferred) ||
            cancelCountHard >= 2;
          if (!isConfirmedHard) score -= 12;
        }

        // プレイヤー賽壇(pit5)に推測占い色が入らないようにする
        if (inferred && stoneColor === inferred && landingPit === 5)
          score -= 12;
        if (ownFortune && stoneColor === ownFortune && landingPit === 5)
          score -= 6;
      }

      // ─── ノイズは最小限 ───
      score += count * 0.1 + Math.random() * 0.08;

      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }

    return best;
  }

  /**
   * 指定ピットから撒いた後の仮ボード状態を返す（AI先読みシミュレーション用）
   */
  _aiSimulateSow(pits, pitIndex) {
    const nPits = pits.map((p) => ({ stones: [...p.stones] }));
    const stones = nPits[pitIndex].stones;
    const count = stones.length;
    if (count === 0) return { pits: nPits, lastPit: -1 };
    nPits[pitIndex].stones = [];
    let cur = pitIndex;
    for (let i = 0; i < count; i++) {
      cur = (cur + 1) % 12;
      nPits[cur].stones.push(stones[i]);
    }
    return { pits: nPits, lastPit: cur };
  }

  /**
   * 仮ボード上でAI(pit6-10)が打てる有望な手（ぐるぐる/ざくざく連鎖）の評価値を返す
   */
  _aiEvalFollowupOpp(pits) {
    let bonus = 0;
    for (let q = 6; q <= 10; q++) {
      if (pits[q].stones.length === 0) continue;
      const count = pits[q].stones.length;
      const last = (q + count) % 12;
      if (last === 11) {
        // ぐるぐる連鎖 + さらに連続ぐるぐるがあれば大きくボーナス
        const { pits: pitsAfterGuru } = this._aiSimulateSow(pits, q);
        const chainDepth = this._aiCountGuruguruChain(pitsAfterGuru, 11, 1);
        bonus += 10 + chainDepth * 12;
      }
      if (last >= 6 && last <= 10 && pits[last].stones.length === 0) {
        const mirrorCount = pits[last - 6].stones.length;
        bonus += 8 + mirrorCount * 3; // ざくざく連鎖
      }
    }
    return bonus;
  }

  /**
   * 仮ボード上でプレイヤー(pit0-4)が打てる有望な手（ぐるぐる/ざくざく連鎖）の評価値を返す
   * 鬼AI用: この値が大きいほど、その手を打った後にプレイヤーが有利になる
   */
  _aiEvalFollowupSelf(pits) {
    let bonus = 0;
    for (let q = 0; q <= 4; q++) {
      if (pits[q].stones.length === 0) continue;
      const count = pits[q].stones.length;
      const last = (q + count) % 12;
      if (last === 5) {
        // プレイヤーぐるぐる連鎖（連続も評価）
        const { pits: pitsAfterGuru } = this._aiSimulateSow(pits, q);
        const chainDepth = this._aiCountGuruguruChain(pitsAfterGuru, 5, 1);
        bonus += 10 + chainDepth * 12;
      }
      if (last >= 0 && last <= 4 && pits[last].stones.length === 0) {
        const mirrorCount = pits[last + 6]?.stones.length ?? 0;
        bonus += 8 + mirrorCount * 3; // プレイヤーざくざく連鎖
      }
    }
    return bonus;
  }

  /**
   * 仮ボード上で指定側（storeIndex=11:AI, 5:プレイヤー）が
   * 連続ぐるぐるで得られる最大連鎖数を返す（深さ最大4）
   * 1連鎖でも大きなアドバンテージ。連鎖数が多いほど指数的に有利
   */
  _aiCountGuruguruChain(pits, storeIndex = 11, depth = 0) {
    if (depth >= 4) return 0;
    const laneMin = storeIndex === 11 ? 6 : 0;
    const laneMax = storeIndex === 11 ? 10 : 4;
    let best = 0;
    for (let q = laneMin; q <= laneMax; q++) {
      if (pits[q].stones.length === 0) continue;
      const count = pits[q].stones.length;
      const last = (q + count) % 12;
      if (last === storeIndex) {
        const { pits: pitsAfter } = this._aiSimulateSow(pits, q);
        const chain =
          1 + this._aiCountGuruguruChain(pitsAfter, storeIndex, depth + 1);
        if (chain > best) best = chain;
      }
    }
    return best;
  }

  /**
   * 鬼AI: プレイヤーぐるぐる連鎖の積極的破壊、ちらちら優先度大幅強化、
   * 占い色収集強化、2手先読みプレイヤー応手ペナルティ
   */
  _aiPickPitOni(validPits, state) {
    const inferred = this._aiMemo.inferredPlayerColor;
    const ownFortune = this.gameState.getFortuneColorForPlayer("opp");
    const knownNeg = this._aiKnownNegativeColor();

    const playerStoreColorCount = {};
    for (const s of state.pits[5].stones) {
      playerStoreColorCount[s.color] =
        (playerStoreColorCount[s.color] ?? 0) + 1;
    }

    const emptyPlayerPits = new Set();
    for (let px = 0; px <= 4; px++) {
      if (state.pits[px].stones.length === 0) emptyPlayerPits.add(px);
    }

    // プレイヤーが今すぐぐるぐるできる手数を事前計算
    const playerGuruguruNow = [0, 1, 2, 3, 4].filter((q) => {
      const cnt = state.pits[q].stones.length;
      return cnt > 0 && (q + cnt) % 12 === 5;
    }).length;

    let best = validPits[0];
    let bestScore = -Infinity;

    for (const p of validPits) {
      const count = state.pits[p].stones.length;
      const lastPit = (p + count) % 12;
      let score = 0;

      // 全手で盤面シミュレーション（ぐるぐる破壊評価に使う）
      const { pits: pitsAfter } = this._aiSimulateSow(state.pits, p);

      // ─── プレイヤーのぐるぐる連鎖を積極的に破壊するボーナス ───
      if (playerGuruguruNow > 0) {
        let playerGuruguruAfter = 0;
        for (let q = 0; q <= 4; q++) {
          const cnt = pitsAfter[q].stones.length;
          if (cnt > 0 && (q + cnt) % 12 === 5) playerGuruguruAfter++;
        }
        const disrupted = playerGuruguruNow - playerGuruguruAfter;
        if (disrupted > 0) score += disrupted * 22;
      }

      // ─── ぐるぐる ───
      if (lastPit === 11) {
        score += 22;
        score += this._aiEvalFollowupOpp(pitsAfter) * 1.2;
        // プレイヤー応手ペナルティ（現在の脅威レベルに応じて重みを増やす）
        const playerThreatMult = 0.6 + playerGuruguruNow * 0.35;
        score -= this._aiEvalFollowupSelf(pitsAfter) * playerThreatMult;
        // くたくたセットアップチェック
        const colorsAfter = new Set();
        for (let lIdx = 6; lIdx <= 10; lIdx++) {
          for (const s of pitsAfter[lIdx].stones) colorsAfter.add(s.color);
        }
        if (colorsAfter.size <= 2 && colorsAfter.size > 0) score += 18;
      }

      // ─── pit5着地（ちらちら/ぽいぽい） ───
      // ちらちらは情報収集として最重要。残り回数があるうちはぐるぐるより高優先
      if (lastPit === 5) {
        const peeksDone = this.gameState.centerPeekProgress?.opp ?? 0;
        if (peeksDone === 0)
          score += 32; // 1回目: 最優先
        else if (peeksDone === 1)
          score += 26; // 2回目
        else if (peeksDone === 2)
          score += 20; // 3回目
        else {
          // 3回消費済み → ぽいぽい価値を数値化
          const playerStoreHasFortune =
            inferred && state.pits[5].stones.some((s) => s.color === inferred);
          score += playerStoreHasFortune
            ? 26
            : state.pits[5].stones.length > 0
              ? 10
              : 3;
        }
      }

      // ─── ざくざく ───
      if (
        lastPit >= 6 &&
        lastPit <= 10 &&
        state.pits[lastPit].stones.length === 0
      ) {
        const mirrorPit = lastPit - 6;
        const mirrorStones = state.pits[mirrorPit].stones;
        score += 10 + mirrorStones.length * 4;
        for (const s of mirrorStones) {
          if (ownFortune && s.color === ownFortune) score += 8;
          if (inferred && s.color === inferred) score += 6;
        }
        score += this._aiEvalFollowupOpp(pitsAfter) * 0.8;
        const playerThreatMult = 0.5 + playerGuruguruNow * 0.3;
        score -= this._aiEvalFollowupSelf(pitsAfter) * playerThreatMult;
      }

      // ─── ざくざく防御 ─── ちらちら着地（pit5）は情報収集の意図的手なので免除
      if (lastPit !== 5) {
        const playerMirrorOfP = p - 6;
        if (state.pits[playerMirrorOfP].stones.length > 0) {
          const mirrorStoneCount = state.pits[playerMirrorOfP].stones.length;
          score -= 10 + mirrorStoneCount * 3;
          if (inferred) {
            const inferredHere = state.pits[playerMirrorOfP].stones.filter(
              (s) => s.color === inferred,
            ).length;
            score -= inferredHere * 9;
          }
        }
      }

      // ─── 石の着地先がプレイヤー空き路のミラーなら脅威強化 ───
      for (let i = 0; i < count; i++) {
        const landingPit = (p + 1 + i) % 12;
        if (landingPit >= 6 && landingPit <= 10) {
          const landedMirrorPlayer = landingPit - 6;
          if (emptyPlayerPits.has(landedMirrorPlayer)) score -= 10;
        }
      }

      // ─── 石の色評価（占い色重視・推測色妨害強化） ───
      for (let i = 0; i < count; i++) {
        const landingPit = (p + 1 + i) % 12;
        const stoneColor = state.pits[p].stones[i]?.color;
        if (!stoneColor) continue;
        if (landingPit === 11) {
          if (ownFortune && stoneColor === ownFortune) score += 18; // 9 → 18
          if (inferred && stoneColor === inferred) score += 24; // 14 → 24
          if (knownNeg && stoneColor === knownNeg) {
            const matchInPlayerStore = playerStoreColorCount[knownNeg] ?? 0;
            if (matchInPlayerStore === 0) score -= 20;
          }
          if ((playerStoreColorCount[stoneColor] ?? 0) > 0) score += 5;
        }
        if (inferred && stoneColor === inferred && landingPit === 5)
          score -= 18; // 12 → 18
        if (ownFortune && stoneColor === ownFortune && landingPit === 5)
          score -= 6;
      }

      score += count * 0.1 + Math.random() * 0.06;

      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }

    return best;
  }

  /**
   * AIがちらちらで把握した -2 の中央色を返す（未判明なら null）
   */
  _aiKnownNegativeColor() {
    const center = this.gameState.getState().fortune.center;
    for (const fc of center) {
      if (fc.bonus === -2 && fc.seenBy.includes("opp")) return fc.color;
    }
    return null;
  }

  /**
   * AIがちらちらで把握した +bonus の中央色一覧を返す（見ていない色は含まない）
   */
  _aiKnownPositiveColors() {
    const center = this.gameState.getState().fortune.center;
    return center
      .filter((fc) => fc.bonus > 0 && fc.seenBy.includes("opp"))
      .map((fc) => fc.color);
  }

  /**
   * 鬼V2 AI: ちらちら情報・プレイヤー色パターン読み・プレイヤーぐるぐる連鎖破壊を統合した最強評価
   * - ちらちらで見たプラス色を積極的に自賽壇へ収集
   * - プレイヤーが蓄積している色を自賽壇にも入れてキャンセル（枚数比例ボーナス）
   * - プレイヤーが避けている色（おそらくマイナス）は自賽壇に入れない
   * - プレイヤーのぐるぐる連鎖を積極的に破壊
   */
  _aiPickPitOniV2(validPits, state) {
    const inferred = this._aiMemo.inferredPlayerColor;
    const playerAvoidedColor = this._aiMemo.playerAvoidedColor;
    const ownFortune = this.gameState.getFortuneColorForPlayer("opp");
    const knownNeg = this._aiKnownNegativeColor();
    const knownPos = this._aiKnownPositiveColors();
    const peeksDone = this.gameState.centerPeekProgress?.opp ?? 0;
    // 序盤フェーズ: ちらちら未実施かつ推測色不明 → 情報収集・相手色合わせに集中
    // 中盤以降（inferred確定 or peeksDone≥2）: ぐるぐる重視・カラー評価フル活用
    const isEarlyGame = peeksDone < 2 && !inferred && knownPos.length === 0;

    const playerStoreColorCount = {};
    for (const s of state.pits[5].stones) {
      playerStoreColorCount[s.color] =
        (playerStoreColorCount[s.color] ?? 0) + 1;
    }

    const emptyPlayerPits = new Set();
    for (let px = 0; px <= 4; px++) {
      if (state.pits[px].stones.length === 0) emptyPlayerPits.add(px);
    }

    // プレイヤーが今すぐぐるぐるできる手数
    const playerGuruguruNow = [0, 1, 2, 3, 4].filter((q) => {
      const cnt = state.pits[q].stones.length;
      return cnt > 0 && (q + cnt) % 12 === 5;
    }).length;

    let best = validPits[0];
    let bestScore = -Infinity;

    for (const p of validPits) {
      const count = state.pits[p].stones.length;
      const lastPit = (p + count) % 12;
      let score = 0;

      const { pits: pitsAfter } = this._aiSimulateSow(state.pits, p);

      // ─── プレイヤーのぐるぐる連鎖を積極的に破壊 ───
      if (playerGuruguruNow > 0) {
        let playerGuruguruAfter = 0;
        for (let q = 0; q <= 4; q++) {
          const cnt = pitsAfter[q].stones.length;
          if (cnt > 0 && (q + cnt) % 12 === 5) playerGuruguruAfter++;
        }
        const disrupted = playerGuruguruNow - playerGuruguruAfter;
        if (disrupted > 0) score += disrupted * 26;
      }

      // ─── ぐるぐる ───
      // 序盤は情報収集優先のため控えめ、中盤以降は積極的に狙う
      if (lastPit === 11) {
        const chainCount = this._aiCountGuruguruChain(pitsAfter);
        score += isEarlyGame ? 14 + chainCount * 10 : 28 + chainCount * 16;
        score += this._aiEvalFollowupOpp(pitsAfter) * (isEarlyGame ? 0.8 : 1.3);
        const playerThreatMult = 0.6 + playerGuruguruNow * 0.35;
        score -= this._aiEvalFollowupSelf(pitsAfter) * playerThreatMult;
        const colorsAfter = new Set();
        for (let lIdx = 6; lIdx <= 10; lIdx++) {
          for (const s of pitsAfter[lIdx].stones) colorsAfter.add(s.color);
        }
        if (colorsAfter.size <= 2 && colorsAfter.size > 0) score += 18;
      }

      // ─── pit5着地（ちらちら/ぽいぽい）─── 情報収集は最優先（序盤は特に重要）
      if (lastPit === 5) {
        if (peeksDone === 0) score += isEarlyGame ? 50 : 36;
        else if (peeksDone === 1) score += isEarlyGame ? 42 : 30;
        else if (peeksDone === 2) score += 24;
        else {
          const playerStoreHasFortune =
            inferred && state.pits[5].stones.some((s) => s.color === inferred);
          score += playerStoreHasFortune
            ? 30
            : state.pits[5].stones.length > 0
              ? 12
              : 3;
        }
      }

      // ─── ざくざく ───
      if (
        lastPit >= 6 &&
        lastPit <= 10 &&
        state.pits[lastPit].stones.length === 0
      ) {
        const mirrorPit = lastPit - 6;
        const mirrorStones = state.pits[mirrorPit].stones;
        score += 10 + mirrorStones.length * 4;
        for (const s of mirrorStones) {
          if (ownFortune && s.color === ownFortune) score += 8;
          if (inferred && s.color === inferred) score += 6;
          if (knownPos.includes(s.color)) score += 10; // ちらちら知識: プラス色を奪う
        }
        score += this._aiEvalFollowupOpp(pitsAfter) * 0.8;
        const playerThreatMult = 0.5 + playerGuruguruNow * 0.3;
        score -= this._aiEvalFollowupSelf(pitsAfter) * playerThreatMult;
      }

      // ─── ざくざく防御 ─── ちらちら着地（pit5）は情報収集の意図的手なので免除
      if (lastPit !== 5) {
        const playerMirrorOfP = p - 6;
        if (state.pits[playerMirrorOfP].stones.length > 0) {
          const mirrorStoneCount = state.pits[playerMirrorOfP].stones.length;
          score -= 10 + mirrorStoneCount * 3;
          if (inferred) {
            const inferredHere = state.pits[playerMirrorOfP].stones.filter(
              (s) => s.color === inferred,
            ).length;
            score -= inferredHere * 9;
          }
        }
      }

      // ─── 石の着地先がプレイヤー空き路のミラーなら脅威強化 ───
      for (let i = 0; i < count; i++) {
        const landingPit = (p + 1 + i) % 12;
        if (landingPit >= 6 && landingPit <= 10) {
          const landedMirrorPlayer = landingPit - 6;
          if (emptyPlayerPits.has(landedMirrorPlayer)) score -= 10;
        }
      }

      // ─── 石の色評価（カラー戦略の核心） ───
      for (let i = 0; i < count; i++) {
        const landingPit = (p + 1 + i) % 12;
        const stoneColor = state.pits[p].stones[i]?.color;
        if (!stoneColor) continue;

        if (landingPit === 11) {
          if (isEarlyGame) {
            // 序盤: 自分の占い色(+3確実)は積極的に。それ以外は危険
            if (ownFortune && stoneColor === ownFortune) {
              score += 22; // 常に+3点
            } else {
              // 相手賽壇に2枚以上ある色 = 相手占い色候補(自分に入れれば+5期待値)
              const cancelCount = playerStoreColorCount[stoneColor] ?? 0;
              if (cancelCount >= 2) score += cancelCount * 10;
              else score -= 18; // 完全未知 = 中央-3点石の可能性
            }
          } else {
            // 中盤以降: 情報に基づくフル評価
            // 相手の占い色が自賽壇に入ると+5点（最高点！キャンセルでなく最高導入）
            if (inferred && stoneColor === inferred) score += 38;
            // 自分の占い色 = +3点確実
            else if (ownFortune && stoneColor === ownFortune) score += 20;
            // ちらちら確認済みプラス中央石 = +1点
            if (knownPos.includes(stoneColor)) score += 8;
            // 相手賽壇に多い色 = 相手占い色候補(+5期待値)
            const cancelCount = playerStoreColorCount[stoneColor] ?? 0;
            if ((!inferred || stoneColor !== inferred) && cancelCount >= 2)
              score += cancelCount * 8;
            // 確定マイナス色 = 問答無用で回避（相手が持っていても自分の-3点は変わらない）
            if (knownNeg && stoneColor === knownNeg) score -= 42;
            // 相手が避けている色 = マイナス石の疑い
            if (playerAvoidedColor && stoneColor === playerAvoidedColor)
              score -= 22;
            // 確認済み安全属性なし = リスク
            const isConfirmedSafe =
              (ownFortune && stoneColor === ownFortune) ||
              knownPos.includes(stoneColor) ||
              (inferred && stoneColor === inferred) ||
              cancelCount >= 2;
            if (!isConfirmedSafe) score -= 16;
          }
        }

        // プレイヤー賽壇に推測占い色・ちらちらプラス色が流れ込まないようにする
        if (inferred && stoneColor === inferred && landingPit === 5)
          score -= 20;
        if (knownPos.includes(stoneColor) && landingPit === 5) score -= 14;
        if (ownFortune && stoneColor === ownFortune && landingPit === 5)
          score -= 6;
      }

      score += count * 0.1 + Math.random() * 0.06;

      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }

    return best;
  }

  // ─── AI フェーズ処理（撒き → 配置 → 技） ───────────────────────────

  _aiStartSowing(pitIndex) {
    const state = this.gameState.getState();
    const stones = [...state.pits[pitIndex].stones];
    state.pits[pitIndex].stones = [];

    this.mode = "sowing";
    this.sowPending = stones;
    this.sowTargets = this._buildSowTargets(pitIndex, stones.length);
    this.sowHistory = [];
    this.sowSourcePitIndex = pitIndex;
    this.selectedPlacementStoneIndex = 0;
    this._renderStones();
    this.scene
      .get("UIScene")
      ?.showCenterBanner("相手が撒いています", 0xf3b7b7, null, false, true);
    this.scene.get("UIScene")?.updateOppHandDisplay(this.sowPending);
    this._aiSowNextStone();
  }

  _aiSowNextStone() {
    if (this.mode !== "sowing" || this._isOnlineRoomMode()) return;
    if (this.sowPending.length === 0 || this.sowTargets.length === 0) return;

    this.time.delayedCall(700, () => {
      if (this.mode !== "sowing" || this._isOnlineRoomMode()) return;
      if (this.sowPending.length === 0 || this.sowTargets.length === 0) return;

      const targetPit = this.sowTargets.shift();
      const [stone] = this.sowPending.splice(0, 1);
      this.gameState.getState().pits[targetPit].stones.push(stone);
      this.sowHistory.push({ targetPit, stone, pendingIndex: 0 });
      this._renderStones();
      this.scene.get("UIScene")?.updateOppHandDisplay(this.sowPending);

      if (this.sowPending.length === 0) {
        this._aiCompleteSowing(targetPit);
      } else {
        this._aiSowNextStone();
      }
    });
  }

  _aiCompleteSowing(lastPit) {
    this.mode = "turn";
    this.sowPending = [];
    this.sowTargets = [];
    this.sowHistory = [];
    this.sowSourcePitIndex = null;
    this.autoSowingInProgress = false;

    const captureTarget = this.gameState.getCaptureTargetIndex("opp", lastPit);
    const captured = this.gameState.checkCaptureForPlayer("opp", lastPit);

    if (captured.length > 0) {
      this._renderStones();
      if (captureTarget != null) {
        this._flashZakuzakuTarget(captureTarget);
        this._playZakuzakuArrow(lastPit, captureTarget);
        this._playLaneDamageShake(captureTarget);
      }
      const zakuzakuDesc =
        captureTarget != null
          ? `相手が「${PIT_NAMES[captureTarget]}」の石を横取り！`
          : "相手が石を横取り！";
      this._announceTechnique("ざくざく！", 0xe87070, zakuzakuDesc);
      // ざくざくで奪った石をAIが自分の路に配置する
      this._aiStartPlacing(captured);
      return;
    }

    if (lastPit === 5) {
      this._aiHandleSpecialChoice();
      return;
    }

    // pit11 = AIの賟壇 → ぐるぐる（もう１ターン）
    this._aiFinishTurn(lastPit === 11);
  }

  _aiStartPlacing(stones) {
    if (stones.length === 0) {
      this._aiFinishTurn(false);
      return;
    }

    this.mode = "placing";
    this.gameState.startPlacement(stones);
    this.selectedPlacementStoneIndex = 0;
    this._renderStones();
    this.scene
      .get("UIScene")
      ?.showCenterBanner("相手が配置しています", 0xffa6c9, null, false, true);
    this.scene
      .get("UIScene")
      ?.updateOppHandDisplay(this.gameState.getPendingPlacement());
    this._aiPlaceNextStone();
  }

  _aiPlaceNextStone() {
    if (this.mode !== "placing" || this._isOnlineRoomMode()) return;
    const pending = this.gameState.getPendingPlacement();
    if (pending.length === 0) {
      this.mode = "turn";
      this.gameState.startPlacement([]);
      this.selectedPlacementStoneIndex = null;
      this.scene.get("UIScene")?.clearCenterBanner();
      this._renderStones();
      this._aiFinishTurn(false);
      return;
    }

    this.time.delayedCall(750, () => {
      if (this.mode !== "placing" || this._isOnlineRoomMode()) return;
      const oppLanes = [6, 7, 8, 9, 10];
      let pitIndex;

      if (
        this.aiDifficulty === "hard" ||
        this.aiDifficulty === "oni" ||
        this.aiDifficulty === "oni-sente" ||
        this.aiDifficulty === "oni-gote"
      ) {
        // 強い/鬼: 各置き先路をスコア評価して最強の路を選ぶ
        const st = this.gameState.getState();
        const pendingNow = this.gameState.getPendingPlacement();
        const stone = pendingNow[0];
        const inferred = this._aiMemo?.inferredPlayerColor;
        const playerAvoidedColor = this._aiMemo?.playerAvoidedColor;
        const ownFortune = this.gameState.getFortuneColorForPlayer("opp");
        const knownNeg = this._aiKnownNegativeColor();
        const isOni =
          this.aiDifficulty === "oni-sente" ||
          this.aiDifficulty === "oni-gote" ||
          this.aiDifficulty === "oni";
        const knownPos = isOni ? this._aiKnownPositiveColors() : [];

        // プレイヤーの賽壇(pit5)の各色の数（キャンセル評価用）
        const playerStoreColorCount = {};
        for (const s of st.pits[5].stones) {
          playerStoreColorCount[s.color] =
            (playerStoreColorCount[s.color] ?? 0) + 1;
        }

        let bestP = oppLanes[0];
        let bestS = -Infinity;
        for (const q of oppLanes) {
          let s = 0;
          const newCount = st.pits[q].stones.length + 1;
          const targetPit = (q + newCount) % 12;

          // ぐるぐるセットアップ: この路から撒くとpit11に落ちる
          if (targetPit === 11) {
            s += 18;
            if (ownFortune && stone?.color === ownFortune) s += 12;
            if (inferred && stone?.color === inferred) s += 16;
            // 鬼V2: ちらちらプラス色 → 積極的に自賽壇設定レーンへ
            if (isOni && knownPos.includes(stone?.color)) s += 22;
            // 鬼V2: プレイヤーの蓄積色を枚数比例でキャンセルボーナス
            if (isOni && stone?.color) {
              const cancelCount = playerStoreColorCount[stone.color] ?? 0;
              s += cancelCount * 9;
            }
            // 否定色対策
            if (knownNeg && stone?.color === knownNeg) {
              const matchInPlayerStore = playerStoreColorCount[knownNeg] ?? 0;
              if (matchInPlayerStore === 0) s -= 22;
            }
            // プレイヤーが避けている色: おそらくマイナス → 自賽壇設定レーンに避ける
            if (
              isOni &&
              playerAvoidedColor &&
              stone?.color === playerAvoidedColor
            )
              s -= 18;
            // 相手の賽壇と同じ色 → 打ち消し合い（hard向け）
            if (
              !isOni &&
              stone?.color &&
              (playerStoreColorCount[stone.color] ?? 0) > 0
            ) {
              s += 6;
            }
          }

          // 空きプレイヤー路のミラーに石を積むとざくざく脅威を強化するので減点
          const playerMirror = q - 6;
          if (st.pits[playerMirror].stones.length === 0) s -= 8;
          else s += 4;
          s += Math.random() * 0.1;
          if (s > bestS) {
            bestS = s;
            bestP = q;
          }
        }
        pitIndex = bestP;
      } else if (this.aiDifficulty === "normal") {
        // 普通: 既存の石がある路に重ねる（ザクザクリスクを減らす）
        const st = this.gameState.getState();
        const nonEmpty = oppLanes.filter((i) => st.pits[i].stones.length > 0);
        const pool = nonEmpty.length > 0 ? nonEmpty : oppLanes;
        pitIndex = pool[Math.floor(Math.random() * pool.length)];
      } else {
        // 弱い: ランダム
        pitIndex = oppLanes[Math.floor(Math.random() * oppLanes.length)];
      }

      this.gameState.placePendingStone(pitIndex, 0);
      this._renderStones();
      this.scene
        .get("UIScene")
        ?.updateOppHandDisplay(this.gameState.getPendingPlacement());
      this._aiPlaceNextStone();
    });
  }

  _aiHandleSpecialChoice() {
    const state = this.gameState.getState();
    this.time.delayedCall(900, () => {
      if (this.gameState.canUseChirachira("opp")) {
        // 強いAI / 鬼: ぽいぽいの方が価値が高い場合はぽいぽいを優先する
        if (
          this.aiDifficulty === "hard" ||
          this.aiDifficulty === "oni" ||
          this.aiDifficulty === "oni-sente" ||
          this.aiDifficulty === "oni-gote"
        ) {
          const peeksDone = this.gameState.centerPeekProgress?.opp ?? 0;
          // 鬼: 最初の2回は必ずちらちら（情報収集優先）
          const forceChirachira =
            (this.aiDifficulty === "oni" ||
              this.aiDifficulty === "oni-sente" ||
              this.aiDifficulty === "oni-gote") &&
            peeksDone < 2;

          if (!forceChirachira) {
            const inferred = this._aiMemo?.inferredPlayerColor;
            const playerStoreCount = state.pits[5].stones.length;
            const playerHasInferredInStore =
              inferred &&
              state.pits[5].stones.some((s) => s.color === inferred);
            const poipoiValue = playerHasInferredInStore
              ? 20
              : playerStoreCount >= 2
                ? 8
                : 0;
            const chirachiraRemaining =
              3 - (this.gameState.getState().centerPeekProgress?.opp ?? 0);
            // 鬼: ぽいぽいの閾値を低め（より積極的にぽいぽい）
            const chirachiraValue =
              this.aiDifficulty === "oni" ||
              this.aiDifficulty === "oni-sente" ||
              this.aiDifficulty === "oni-gote"
                ? chirachiraRemaining >= 2
                  ? 10
                  : 4
                : chirachiraRemaining >= 2
                  ? 12
                  : 6;

            if (poipoiValue > chirachiraValue) {
              const targetStore = state.pits[5].stones.length > 0 ? 5 : 11;
              if (state.pits[targetStore].stones.length > 0) {
                const targetStones = state.pits[targetStore].stones;
                let selectedIndex = 0;
                let highestValue = -Infinity;
                const ownFortune =
                  this.gameState.getFortuneColorForPlayer("opp");
                targetStones.forEach((stone, index) => {
                  let val = STONE_COLORS[stone.color]?.value ?? 0;
                  if (inferred && stone.color === inferred)
                    val = Math.max(val, 7);
                  if (ownFortune && stone.color === ownFortune)
                    val = Math.max(val, 10);
                  if (val > highestValue) {
                    highestValue = val;
                    selectedIndex = index;
                  }
                });
                this.gameState.removeStoneFromPit(targetStore, selectedIndex);
                this._announceTechnique(
                  "ぽいぽい！",
                  0xe87070,
                  "相手が石を一つ排除！",
                );
                this._renderStones();
              }
              this.time.delayedCall(800, () => this._aiFinishTurn(false));
              return;
            }
          }
        }
        const revealInfo = this.gameState.revealNextCenterForPlayer("opp");
        const VIEW_FROM_ME = ["左", "真ん中", "右"];
        const chirachiraDesc = revealInfo
          ? `相手が${VIEW_FROM_ME[revealInfo.index]}を確認`
          : "相手が占い石を確認！";
        this._announceTechnique("ちらちら！", 0xe87070, chirachiraDesc);
        this._renderStones();
        this.time.delayedCall(800, () => this._aiFinishTurn(false));
      } else {
        if (this.aiDifficulty === "easy") {
          // 弱い: ランダムな賟壇からランダムな石を排除
          const stores = [5, 11].filter((i) => state.pits[i].stones.length > 0);
          if (stores.length > 0) {
            const targetStore =
              stores[Math.floor(Math.random() * stores.length)];
            const randIdx = Math.floor(
              Math.random() * state.pits[targetStore].stones.length,
            );
            this.gameState.removeStoneFromPit(targetStore, randIdx);
            this._announceTechnique(
              "ぽいぽい！",
              0xe87070,
              "相手が石を一つ排除！",
            );
            this._renderStones();
          }
        } else if (this.aiDifficulty === "normal") {
          // 普通: プレイヤーの賟壇から最もストーン値の高い石を排除
          const targetStore = state.pits[5].stones.length > 0 ? 5 : 11;
          if (state.pits[targetStore].stones.length > 0) {
            const targetStones = state.pits[targetStore].stones;
            let selectedIndex = 0;
            let highestValue = -Infinity;
            targetStones.forEach((stone, index) => {
              const value = STONE_COLORS[stone.color]?.value ?? 0;
              if (value > highestValue) {
                highestValue = value;
                selectedIndex = index;
              }
            });
            this.gameState.removeStoneFromPit(targetStore, selectedIndex);
            this._announceTechnique(
              "ぽいぽい！",
              0xe87070,
              "相手が石を一つ排除！",
            );
            this._renderStones();
          }
        } else {
          // 強い / 鬼: 推測したプレイヤーの占い色・ちらちらプラス色を優先排除
          const targetStore = state.pits[5].stones.length > 0 ? 5 : 11;
          if (state.pits[targetStore].stones.length > 0) {
            const targetStones = state.pits[targetStore].stones;
            const inferred = this._aiMemo?.inferredPlayerColor;
            const ownFortune = this.gameState.getFortuneColorForPlayer("opp");
            const isOni =
              this.aiDifficulty === "oni-sente" ||
              this.aiDifficulty === "oni-gote" ||
              this.aiDifficulty === "oni";
            const knownPos = isOni ? this._aiKnownPositiveColors() : [];
            let selectedIndex = 0;
            let highestValue = -Infinity;
            targetStones.forEach((stone, index) => {
              let val = STONE_COLORS[stone.color]?.value ?? 0;
              if (inferred && stone.color === inferred) val = Math.max(val, 7);
              if (ownFortune && stone.color === ownFortune)
                val = Math.max(val, 10);
              // 鬼: ちらちらで確認したプラス色 → 相手の得点源なので最優先排除
              if (isOni && knownPos.includes(stone.color))
                val = Math.max(val, 14);
              if (val > highestValue) {
                highestValue = val;
                selectedIndex = index;
              }
            });
            this.gameState.removeStoneFromPit(targetStore, selectedIndex);
            this._announceTechnique(
              "ぽいぽい！",
              0xe87070,
              "相手が石を一つ排除！",
            );
            this._renderStones();
          }
        }
        this.time.delayedCall(800, () => this._aiFinishTurn(false));
      }
    });
  }

  _aiFinishTurn(extraTurn) {
    this._renderStones();
    this.scene.get("UIScene")?.clearOppHandDisplay();

    if (this.gameState.isGameOver()) {
      this.scene.get("UIScene").showResult();
      return;
    }

    if (!extraTurn && this.gameState.canActivateKutakuta("opp")) {
      const selfStoreCount = this.gameState.getState().pits[5].stones.length;
      const oppStoreCount = this.gameState.getState().pits[11].stones.length;
      // 鬼: 2石差まで許容して積極的にくたくた（わずかに劣勢でも発動）
      const kutakutaThreshold =
        this.aiDifficulty === "oni" ||
        this.aiDifficulty === "oni-sente" ||
        this.aiDifficulty === "oni-gote"
          ? selfStoreCount - 2
          : selfStoreCount;
      if (oppStoreCount >= kutakutaThreshold) {
        this._announceTechnique("くたくた！", 0xe87070, "相手がゲーム終了！");
        this.time.delayedCall(450, () =>
          this.scene.get("UIScene").showResult(),
        );
        return;
      }
    }

    if (extraTurn) {
      // 相手の路に石があるときだけぐるぐる。なければプレイヤーへ手番を渡す
      const aiHasMoves = [6, 7, 8, 9, 10].some(
        (i) => this.gameState.getState().pits[i].stones.length > 0,
      );
      if (!aiHasMoves) {
        this.playerTurn = true;
        const ui = this.scene.get("UIScene");
        ui?.clearCenterBanner();
        ui.updateTurnDisplay(this.playerTurn);
        return;
      }
      this._announceTechnique("ぐるぐる！", 0xe87070, "もう一度相手のターン！");
      this.time.delayedCall(1100, () => this._aiTurn());
      return;
    }

    this.playerTurn = true;
    const ui = this.scene.get("UIScene");
    ui?.clearCenterBanner();
    ui.updateTurnDisplay(this.playerTurn);
  }

  _handleOnlinePitClick(pitIndex) {
    if (this.mode === "placing") {
      if (!this.playerTurn || this.onlineMovePending) return;
      if (this.selectedPlacementStoneIndex == null) return;
      const [ls, le] = this.onlineSide === "self" ? [0, 4] : [6, 10];
      if (pitIndex < ls || pitIndex > le) {
        this.scene
          .get("UIScene")
          .showCenterBanner("配置", 0x9fd6ff, "自分の路に置いてください");
        return;
      }
      const placePending = this.gameState.getPendingPlacement();
      if (placePending.length === 0) return;
      const sentP = roomClient.send({
        type: "request_placement",
        roomCode: this.onlineRoomCode,
        pitIndex,
        pendingIndex: this.selectedPlacementStoneIndex,
      });
      if (!sentP) {
        this.scene
          .get("UIScene")
          .showCenterBanner("通信切断", 0xffa6c9, "再接続を待っています");
        return;
      }
      this.onlineMovePending = true;
      return;
    }

    if (this.mode === "poipoi-store") {
      if (!this.playerTurn || this.onlineMovePending) return;
      if (pitIndex !== 5 && pitIndex !== 11) {
        this.scene
          .get("UIScene")
          .showCenterBanner("ぽいぽい", 0xffa6c9, "賽壇をクリックして選択！");
        return;
      }
      if (this.gameState.getState().pits[pitIndex].stones.length === 0) {
        this.scene
          .get("UIScene")
          .showCenterBanner("ぽいぽい", 0xffa6c9, "石がある賽壇を選択！");
        return;
      }
      const finalStage = this.onlineFinalPhase?.stage;
      const isFinalPoipoi = finalStage === "poipoi-store";
      const sentS = roomClient.send({
        type: isFinalPoipoi
          ? "request_final_poipoi_store"
          : "request_poipoi_store",
        roomCode: this.onlineRoomCode,
        storeIndex: pitIndex,
      });
      if (!sentS) {
        this.scene
          .get("UIScene")
          .showCenterBanner("通信切断", 0xffa6c9, "再接続を待っています");
        return;
      }
      this.onlineMovePending = true;
      return;
    }

    if (this.mode !== "turn") return;
    if (this.time.now < this.onlineInputLockUntil) return;
    if (this.onlineMovePending) return;
    if (!this.playerTurn) {
      this.scene
        .get("UIScene")
        .showCenterBanner("待機中", 0x9fd6ff, "相手の手番です");
      return;
    }

    const isSelfSide = this.onlineSide === "self";
    const min = isSelfSide ? 0 : 6;
    const max = isSelfSide ? 4 : 10;
    if (pitIndex < min || pitIndex > max) return;

    const pits = this.gameState.getState().pits;
    if (!pits[pitIndex] || pits[pitIndex].stones.length === 0) return;

    const sent = roomClient.send({
      type: "request_move",
      roomCode: this.onlineRoomCode,
      pitIndex,
    });

    if (!sent) {
      this.scene
        .get("UIScene")
        .showCenterBanner("通信切断", 0xffa6c9, "再接続を待っています");
      return;
    }

    this.onlineMovePending = true;
    this._clearTurnLaneGuidance();
  }

  _handleRoomClientMessage(message) {
    if (!this._isOnlineRoomMode()) return;
    if (!message || typeof message.type !== "string") return;

    if (message.type === "client_connecting") {
      // 初回接続試み中はステータステキストで小さく示す
      if (!this._initialConnectionEstablished) {
        this.scene.get("UIScene")?.setStatusMessage("接続中…", "#d7e8ff");
      }
      return;
    }

    if (message.type === "client_close") {
      this.onlineMovePending = false;
      this.waitingForInitialSync = true;
      this.onlineInputLockUntil = this.time.now + 10000;
      const ui = this.scene.get("UIScene");
      if (this._initialConnectionEstablished) {
        // 対戦中に切断 — パーシステントな警告バーを表示
        this._connectionErrorCount = 0;
        ui?.clearCenterBanner?.();
        ui?.clearStatusMessage?.();
        ui?.showDisconnectBar?.(
          "通信が切断されました — 再接続しています…",
          "warning",
        );
      } else {
        // 初回接続失敗 — バーは出さずステータステキストのみ
        ui?.setStatusMessage("接続中…", "#d7e8ff");
      }
      return;
    }

    if (message.type === "client_error") {
      this._connectionErrorCount = (this._connectionErrorCount ?? 0) + 1;
      // 5回連続失敗したらエラーバーに昇格
      if (this._connectionErrorCount >= 5) {
        this.scene
          .get("UIScene")
          ?.showDisconnectBar?.(
            "サーバーに接続できません — ネットワークを確認してください",
            "error",
          );
      }
      return;
    }

    if (message.type === "client_open") {
      this._connectionErrorCount = 0;
      const isReconnect = this._initialConnectionEstablished;
      this._initialConnectionEstablished = true;
      this.waitingForInitialSync = true;
      this.onlineInputLockUntil = this.time.now + 2500;
      this._requestRoomSync();
      const ui = this.scene.get("UIScene");
      if (isReconnect) {
        // 再接続成功 — バーを「再接続完了」色に切り替え（同期完了で消える）
        ui?.showDisconnectBar?.("再接続しました — 同期中…", "reconnected");
      } else {
        // 初回接続成功 — バーは不要、ステータスのみ小さく表示
        ui?.clearDisconnectBar?.();
        ui?.setStatusMessage("同期中…", "#d7e8ff");
      }
      return;
    }

    if (message.type === "opponent_surrendered") {
      // 相手が降参した場合
      this.scene
        .get("UIScene")
        .showCenterBanner("相手が降参しました", 0x8be0d4, "あなたの勝利です！");
      this.time.delayedCall(3000, () => {
        this._returnToHome();
      });
      return;
    }

    if (message.type === "match_start") {
      if (
        message.roomCode &&
        this.onlineRoomCode &&
        message.roomCode !== this.onlineRoomCode
      ) {
        return;
      }
      const incomingRole = message.role === "opp" ? "opp" : "self";
      if (message.role) {
        this.onlineSide = incomingRole;
      }
      if (message.state && message.currentTurn) {
        const wasFinalLike =
          this.mode === "final-phase" ||
          this.hasShownOnlineResultPhase ||
          !!this.onlineFinalPhase;

        if (wasFinalLike) {
          this.hasShownOnlineRoleBanner = false;
          this.hasShownOnlineInitialTurnBanner = false;
          this.hasShownOnlineResultPhase = false;
          this.lastOnlineActionId = 0;
          this.rematchRequestedLocal = false;
          this.personalFortunesRevealedSticky = false;
          this.onlineFinalPhase = null;
          this.scene.get("UIScene")?.clearCenterBanner?.();
          this.scene.get("UIScene")?._clearResultOverlay?.();

          // Full restart guarantees rematch visuals/state are rebuilt for
          // swapped roles (background colors, lane orientation, overlays).
          this.scene.stop("UIScene");
          this.scene.restart({
            mode: "online-room",
            roomCode: this.onlineRoomCode,
            side: incomingRole,
          });
          return;
        }

        this._applyOnlineMatchState(
          message.state,
          message.currentTurn,
          null,
          message.phase || "turn",
          message.sowPending || [],
          message.sowTargets || [],
          message.placementPending || [],
          message.poipoiStoreIndex ?? null,
          false,
          null,
          message.finalPhase ?? null,
        );

        if (wasFinalLike) {
          this.time.delayedCall(300, () => this._showOnlineRoleBanner());
        }
      }
      return;
    }

    if (message.type === "rematch_status") {
      const votes = message.votes || {};
      const selfRole = this.onlineSide === "opp" ? "opp" : "self";
      const oppRole = selfRole === "self" ? "opp" : "self";
      const selfVoted = !!votes[selfRole];
      const oppVoted = !!votes[oppRole];

      if (selfVoted && oppVoted) {
        this.scene.get("UIScene")?._clearResultOverlay?.();
        this.scene
          .get("UIScene")
          .showCenterBanner(
            "再戦準備中",
            0x8be0d4,
            "盤面をリセットしています",
            false,
            true,
          );
        return;
      }

      if (selfVoted) {
        this.scene
          .get("UIScene")
          .showCenterBanner(
            "相手の同意を待っています",
            0x9fd6ff,
            "再戦リクエスト送信済み",
            false,
            true,
          );
      } else if (oppVoted) {
        this.scene
          .get("UIScene")
          .showCenterBanner(
            "相手が再戦を望んでいます",
            0xffd77a,
            "もう一度 を押すと再戦できます",
            false,
            true,
          );
      }
      return;
    }

    if (message.type === "match_state") {
      if (
        message.roomCode &&
        this.onlineRoomCode &&
        message.roomCode !== this.onlineRoomCode
      ) {
        return;
      }
      if (message.role) {
        this.onlineSide = message.role;
      }
      this._applyOnlineMatchState(
        message.state,
        message.currentTurn,
        message.action || null,
        message.phase || "turn",
        message.sowPending || [],
        message.sowTargets || [],
        message.placementPending || [],
        message.poipoiStoreIndex ?? null,
        !!message.ended,
        message.result ?? null,
        message.finalPhase ?? null,
      );
      return;
    }

    if (message.type === "error") {
      if (
        this.pendingOnlineUndoRequest &&
        typeof message.message === "string" &&
        message.message.includes("未対応のtype")
      ) {
        this.pendingOnlineUndoRequest.index += 1;
        if (this._sendNextOnlineUndoRequestVariant()) {
          return;
        }
      }

      this.pendingOnlineUndoRequest = null;
      this.onlineMovePending = false;
      const messageText =
        typeof message.message === "string" &&
        message.message.includes("未対応のtype")
          ? "サーバーが古い可能性があります。サーバーを再起動してください。"
          : message.message || "操作に失敗しました";
      this.scene
        .get("UIScene")
        .showCenterBanner("サーバーエラー", 0xffa6c9, messageText);
      if (
        typeof message.message === "string" &&
        message.message.includes("未対応のtype")
      ) {
        console.warn("Unsupported server message type received", message);
      }
    }
  }

  _applyOnlineMatchState(
    state,
    currentTurn,
    action,
    phase,
    sowPending,
    sowTargets,
    placementPending,
    poipoiStoreIndex,
    ended,
    result,
    finalPhase,
  ) {
    if (!state || !currentTurn) return;

    const continueAutoSowing = this.autoSowingInProgress;

    this.gameState.setState(state);
    if (this.personalFortunesRevealedSticky) {
      this.gameState.revealPersonalFortunes();
    }
    this.pendingOnlineUndoRequest = null;
    this.onlineMovePending = false;
    this.waitingForInitialSync = false;
    this.onlineInputLockUntil = this.time.now + 350;
    this.playerTurn = currentTurn === this.onlineSide;
    this.onlineFinalPhase = finalPhase || null;
    const isOnlineFinalPhase =
      this._isOnlineRoomMode() &&
      phase === "final-phase" &&
      !!this.onlineFinalPhase;
    const shouldHandleAsEnded = ended || isOnlineFinalPhase;
    this.scene.get("UIScene")?.clearDisconnectBar?.();
    this.scene.get("UIScene")?.clearStatusMessage?.();

    // 全フェーズ共通: stale な配置ペンディングをクリア
    this.gameState.startPlacement([]);

    this.sowPending = [];
    this.sowTargets = [];
    this.sowHistory = [];
    this.sowSourcePitIndex = null;
    this.autoSowingInProgress = false;
    this.selectedPlacementStoneIndex = null;
    this.poipoiStoreIndex = null;

    if (shouldHandleAsEnded && phase === "final-phase") {
      if (
        this.playerTurn &&
        (this.onlineFinalPhase?.stage === "poipoi-store" ||
          this.onlineFinalPhase?.stage === "poipoi-stone")
      ) {
        this.mode = this.onlineFinalPhase.stage;
        this.poipoiStoreIndex = this.onlineFinalPhase?.poipoiStoreIndex ?? null;
      } else {
        this.mode = "final-phase";
      }
    } else if (shouldHandleAsEnded) {
      this.mode = "final-phase";
    } else if (phase === "sowing" && this.playerTurn) {
      this.mode = "sowing";
      this.sowPending = Array.isArray(sowPending) ? [...sowPending] : [];
      this.sowTargets = Array.isArray(sowTargets) ? [...sowTargets] : [];
    } else if (phase === "placing" && this.playerTurn) {
      this.mode = "placing";
      this.gameState.startPlacement(
        Array.isArray(placementPending) ? [...placementPending] : [],
      );
      this.selectedPlacementStoneIndex = 0;
    } else if (phase === "special-choice" && this.playerTurn) {
      this.mode = "special-choice";
    } else if (phase === "poipoi-store" && this.playerTurn) {
      this.mode = "poipoi-store";
    } else if (phase === "poipoi-store" && !this.playerTurn) {
      this.mode = "turn";
      this.scene
        .get("UIScene")
        .showCenterBanner(
          "相手がぽいぽい中",
          0xffa6c9,
          "相手が石を排除しています",
          false,
          true,
        );
    } else if (phase === "poipoi-stone" && this.playerTurn) {
      this.mode = "poipoi-stone";
      this.poipoiStoreIndex = poipoiStoreIndex ?? null;
    } else if (phase === "poipoi-stone" && !this.playerTurn) {
      this.mode = "turn";
      this.scene
        .get("UIScene")
        .showCenterBanner(
          "相手がぽいぽい中",
          0xffa6c9,
          "相手が石を排除しています",
          false,
          true,
        );
    } else if (phase === "kutakuta-choice" && this.playerTurn) {
      this.mode = "kutakuta-choice";
      this.pendingExtraTurnAfterChoice = false;
    } else {
      this.mode = "turn";
    }

    this._renderStones();
    if (this.playerTurn || shouldHandleAsEnded) {
      this.scene.get("UIScene")?.clearCenterBanner();
    }
    this.scene.get("UIScene")?.updateTurnDisplay(this.playerTurn, true);
    const shouldPostponeKutakutaBanner =
      !!shouldHandleAsEnded && action?.technique === "kutakuta";
    if (!shouldPostponeKutakutaBanner) {
      this._playOnlineActionEffects(action, shouldHandleAsEnded);
    }

    // フェーズ対応 UI 表示
    const ui = this.scene.get("UIScene");
    if (!shouldHandleAsEnded) {
      if (phase === "placing" && this.playerTurn) {
        ui.showPlacementPrompt(
          null,
          this.gameState.getPendingPlacement().length,
        );
      } else if (phase === "placing" && !this.playerTurn) {
        // ざくざくアニメーションが見えるよう少し遅らせてから配置バナーを表示
        this.time.delayedCall(800, () => {
          if (this.mode === "turn" && !this.playerTurn) {
            ui?.showCenterBanner(
              "相手が配置中",
              0xffa6c9,
              "相手が石を配置しています",
              false,
              true,
            );
          }
        });
      } else if (phase === "special-choice" && this.playerTurn) {
        ui.showSpecialChoice();
      } else if (phase === "special-choice" && !this.playerTurn) {
        ui.showCenterBanner(
          "技を選択中",
          0x9fd6ff,
          "相手が技を選んでいます",
          false,
          true,
        );
      } else if (phase === "poipoi-store" && this.playerTurn) {
        ui.showPoipoiStorePrompt();
      } else if (phase === "poipoi-stone" && this.playerTurn) {
        ui.showPoipoiStonePrompt();
      } else if (phase === "kutakuta-choice" && this.playerTurn) {
        ui.showKutakutaChoice();
      } else if (phase === "kutakuta-choice" && !this.playerTurn) {
        ui.showCenterBanner(
          "技を選択中",
          0x9fd6ff,
          "相手が技を選んでいます",
          false,
          true,
        );
      } else {
        ui.hidePlacementPrompt();
      }

      if (
        phase === "sowing" &&
        this.playerTurn &&
        continueAutoSowing &&
        this._sowingIsUnique(this.sowPending)
      ) {
        this.autoSowingInProgress = true;
        this.time.delayedCall(80, () => this._autoResolveSowingStep());
      }

      // 相手の持ち手表示
      if (phase === "sowing" && !this.playerTurn) {
        ui?.updateOppHandDisplay(Array.isArray(sowPending) ? sowPending : []);
      } else if (phase === "placing" && !this.playerTurn) {
        ui?.updateOppHandDisplay(
          Array.isArray(placementPending) ? placementPending : [],
        );
      } else {
        ui?.clearOppHandDisplay();
      }
    }

    // Sowing automation is manual via the auto button.

    if (!shouldHandleAsEnded) return;

    if (this._isOnlineRoomMode()) {
      if (this.onlineFinalPhase) {
        ui.syncOnlineFinalPhase?.(
          this.onlineFinalPhase,
          this.playerTurn,
          result,
        );
        if (shouldPostponeKutakutaBanner) {
          this._playOnlineActionEffects(action, shouldHandleAsEnded);
        }
      } else if (!this.hasShownOnlineResultPhase) {
        this.hasShownOnlineResultPhase = true;
        ui.showCenterBanner(
          "最終フェーズ同期待ち",
          0xffd77a,
          "roomServer を再起動して再接続してください",
        );
      }
      return;
    }

    let desc = "引き分け";
    if (result?.winner === "self") {
      desc = this.onlineSide === "self" ? "あなたの勝利" : "あなたの敗北";
    } else if (result?.winner === "opp") {
      desc = this.onlineSide === "opp" ? "あなたの勝利" : "あなたの敗北";
    }

    this.scene
      .get("UIScene")
      .showCenterBanner(
        "対戦終了",
        0xb09766,
        `${desc} / ${result?.selfScore ?? 0}-${result?.oppScore ?? 0}`,
      );
  }

  _playOnlineActionEffects(action, ended) {
    if (!action) return;
    if (typeof action.id !== "number") return;
    if (action.id <= this.lastOnlineActionId) return;
    this.lastOnlineActionId = action.id;

    const isSelfActor = action.actor === this.onlineSide;

    if (
      action.capturedCount > 0 &&
      action.captureTarget != null &&
      action.lastPit != null
    ) {
      this._flashZakuzakuTarget(action.captureTarget);
      this._playZakuzakuArrow(action.lastPit, action.captureTarget);
      this._playLaneDamageShake(action.captureTarget);
      this._announceTechnique(
        "ざくざく！",
        isSelfActor ? 0x6ab4e8 : 0xe87070,
        isSelfActor
          ? `「${PIT_NAMES[action.captureTarget]}」の石を横取り！`
          : `相手が「${PIT_NAMES[action.captureTarget]}」の石を横取り！`,
      );
    }

    if (action.extraTurn) {
      this._announceTechnique(
        "ぐるぐる！",
        isSelfActor ? 0x6ab4e8 : 0xe87070,
        isSelfActor ? "もう一度あなたのターン！" : "もう一度相手のターン！",
      );
    }

    if (!ended && action.technique === "chirachira") {
      const revealIndex = Number.isInteger(action.revealIndex)
        ? action.revealIndex
        : null;
      const viewNamesByIndex =
        this._isOnlineRoomMode() && this.onlineSide === "opp"
          ? ["右", "真ん中", "左"]
          : CENTER_VIEW_NAMES;
      const where =
        revealIndex == null
          ? "占い石"
          : (viewNamesByIndex[revealIndex] ?? "占い石");
      this._announceTechnique(
        "ちらちら！",
        isSelfActor ? 0x6ab4e8 : 0xe87070,
        isSelfActor ? `${where}を確認` : `相手が${where}を確認`,
      );
    }

    if (!ended && action.technique === "poipoi") {
      this._announceTechnique(
        "ぽいぽい！",
        isSelfActor ? 0x6ab4e8 : 0xe87070,
        isSelfActor ? "石を一つ排除！" : "相手が石を一つ排除！",
      );
    }

    if (ended && action.technique === "kutakuta") {
      this._announceTechnique(
        "くたくた！",
        isSelfActor ? 0x6ab4e8 : 0xe87070,
        isSelfActor
          ? "あなたがくたくた発動！ゲーム終了"
          : "相手がくたくた発動！ゲーム終了",
      );
    }

    if (
      !ended &&
      (action.technique || action.capturedCount > 0 || action.extraTurn)
    ) {
      this.time.delayedCall(1900, () => {
        if (this.mode !== "turn") return;
        const ui = this.scene.get("UIScene");
        if (ui?.activeBanner) return;
        ui?.showCenterBanner(
          this.playerTurn ? "あなたのターン" : "相手のターン",
          this.playerTurn ? 0xe0c97f : 0xff9999,
          null,
          true,
        );
      });
    }
  }

  enterFinalPhase() {
    this.mode = "final-phase";
  }
}
