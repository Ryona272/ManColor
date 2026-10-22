import { roomClient } from "../net/roomClient.js";
import { getPlayerName } from "../net/firebaseAuth.js";
import { drawMenuBackground, uiImage } from "../ui/theme.js";

const UI_FONT = '"Yu Gothic UI", "Hiragino Sans", sans-serif';
const DISPLAY_FONT = '"Yu Mincho", "Hiragino Mincho ProN", serif';
const JOIN_CODE_STORAGE_KEY = "mancolor-last-join-code";
const W = 1080;
const H = 1920;
const DIGIT_W = 116;
const DIGIT_GAP = 26;
const DIGIT_Y = 770;

export class FriendLobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: "FriendLobbyScene" });
  }

  init() {
    this.unsubscribe = null;
    this.clientId = roomClient.clientId ?? null;
    this.currentRoomCode = null;
    this.isReady = false;
    this.pending = null;
    this.noticeText = null;
    this.statusText = null;
    this.statusDots = 0;
    this.statusTimer = null;
    this.joinCode = "";
    this.digitTexts = [];
    this.digitBoxes = null;
    this.codeInputEl = null;
    this.codeInputHandler = null;
    this.inputActive = false;
    this.cursorTimer = null;
    this.cursorOn = false;
    this.entryView = null;
    this.roomView = null;
    this.roomCodeText = null;
    this.memberText = null;
  }

  create() {
    drawMenuBackground(this, W, H);

    this.add
      .text(W / 2, 200, "友達と遊ぶ", {
        fontSize: "96px",
        color: "#f4deb1",
        fontFamily: DISPLAY_FONT,
        stroke: "#1a130c",
        strokeThickness: 7,
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(W / 2, 300, "", {
        fontSize: "28px",
        color: "#ffcf88",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5);

    uiImage(this, "mission", W / 2, 715, 820, 580);
    this._buildEntryView();
    this._buildRoomView();

    this.noticeText = this.add
      .text(W / 2, 1080, "", {
        fontSize: "30px",
        color: "#ffcc88",
        fontFamily: UI_FONT,
        align: "center",
      })
      .setOrigin(0.5);

    this._createButton({
      x: W / 2,
      y: H - 200,
      width: 360,
      label: "ロビーへ戻る",
      onClick: () => this._returnToLobby(),
    });

    this._restoreJoinCode();
    this._setupKeyboardInput();
    this._refreshRoomUi();

    this.unsubscribe = roomClient.subscribe((message) => {
      this._handleRoomClientMessage(message);
    });
    roomClient.connect();
    this._setConnectionState(roomClient.connected ? "connected" : "connecting");

    this.events.once("shutdown", () => {
      this.unsubscribe?.();
      this.unsubscribe = null;
      this.statusTimer?.remove();
      this._deactivateInput();
      this._disposeCodeInputElement();
    });
    this.events.once("destroy", () => this._disposeCodeInputElement());
  }

  _buildEntryView() {
    const view = this.add.container(0, 0);
    this.entryView = view;

    view.add(this._createButton({
      x: W / 2,
      y: 530,
      width: 520,
      height: 104,
      frame: "claim",
      fontSize: "44px",
      label: "ルームを作る",
      onClick: () => this._createRoom(),
    }));

    const line = this.add.graphics();
    line.lineStyle(2, 0xe6c98a, 0.25);
    line.lineBetween(W / 2 - 300, 650, W / 2 - 150, 650);
    line.lineBetween(W / 2 + 150, 650, W / 2 + 300, 650);
    view.add(line);
    view.add(this.add
      .text(W / 2, 650, "コードで参加", {
        fontSize: "30px",
        color: "#c9d8ef",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5));

    const totalW = DIGIT_W * 4 + DIGIT_GAP * 3;
    const startX = W / 2 - totalW / 2 + DIGIT_W / 2;
    this.digitBoxes = this.add.graphics();
    view.add(this.digitBoxes);
    this.digitTexts = [0, 1, 2, 3].map((i) => {
      const t = this.add
        .text(startX + i * (DIGIT_W + DIGIT_GAP), DIGIT_Y, "", {
          fontSize: "64px",
          color: "#f4f7ff",
          fontFamily: UI_FONT,
        })
        .setOrigin(0.5);
      view.add(t);
      return t;
    });
    const tapZone = this.add
      .zone(W / 2, DIGIT_Y, totalW + 20, 150)
      .setInteractive({ useHandCursor: true });
    tapZone.on("pointerdown", () => this._activateInput());
    view.add(tapZone);

    this.input.on("pointerdown", (_pointer, targets) => {
      if (this.inputActive && !targets.includes(tapZone)) this._deactivateInput();
    });

    view.add(this.add
      .text(W / 2, 880, "4桁を入れると自動で参加します", {
        fontSize: "24px",
        color: "#8da7c7",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5));

    this._renderDigits();
  }

  _buildRoomView() {
    const view = this.add.container(0, 0);
    this.roomView = view;

    view.add(this.add
      .text(W / 2, 480, "ルームコード", {
        fontSize: "30px",
        color: "#c9d8ef",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5));

    this.roomCodeText = this.add
      .text(W / 2, 585, "", {
        fontSize: "128px",
        color: "#f4deb1",
        fontFamily: DISPLAY_FONT,
        stroke: "#1a130c",
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    view.add(this.roomCodeText);

    view.add(this.add
      .text(W / 2, 690, "このコードを友達に伝えてください", {
        fontSize: "26px",
        color: "#8da7c7",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5));

    this.memberText = this.add
      .text(W / 2, 790, "", {
        fontSize: "36px",
        color: "#e2edff",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5);
    view.add(this.memberText);

    view.add(this._createButton({
      x: W / 2,
      y: 900,
      width: 300,
      label: "退出",
      onClick: () => this._leaveRoom(),
    }));
  }

  _createButton({ x, y, label, onClick, width = 310, height = 80, frame = "equip", fontSize = "34px" }) {
    const container = this.add.container(x, y);
    const bg = uiImage(this, frame, 0, 0, width, height);
    const text = this.add
      .text(0, 0, label, { fontSize, color: "#f8fbff", fontFamily: UI_FONT })
      .setOrigin(0.5);
    container.add([bg, text]);
    container.setSize(width, height).setInteractive({ useHandCursor: true });
    container.on("pointerdown", onClick);
    container.on("pointerover", () => container.setScale(1.03));
    container.on("pointerout", () => container.setScale(1));
    return container;
  }

  _renderDigits() {
    const g = this.digitBoxes;
    if (!g) return;
    const totalW = DIGIT_W * 4 + DIGIT_GAP * 3;
    const left = W / 2 - totalW / 2;
    const active = Math.min(this.joinCode.length, 3);
    g.clear();
    for (let i = 0; i < 4; i++) {
      const x = left + i * (DIGIT_W + DIGIT_GAP);
      const focused = this.inputActive && i === active;
      g.fillStyle(0x0a1829, 0.96);
      g.fillRoundedRect(x, DIGIT_Y - 70, DIGIT_W, 140, 18);
      g.lineStyle(focused ? 4 : 2, focused ? 0xf0d39a : 0x8fb4dc, focused ? 1 : 0.6);
      g.strokeRoundedRect(x, DIGIT_Y - 70, DIGIT_W, 140, 18);
      const ch = this.joinCode[i] ?? (focused && this.cursorOn && !this.codeInputEl ? "|" : "");
      this.digitTexts[i]?.setText(ch);
    }
  }

  _setupKeyboardInput() {
    this.input.keyboard.on("keydown", (event) => {
      if (!event || !this.inputActive || this.currentRoomCode) return;
      if (this.codeInputEl && document.activeElement === this.codeInputEl) return;
      if (event.key === "Backspace") {
        this._setJoinCode(this.joinCode.slice(0, -1));
        return;
      }
      if (/^[0-9]$/.test(String(event.key || "")) && this.joinCode.length < 4) {
        this._setJoinCode(this.joinCode + event.key);
      }
    });
  }

  _activateInput() {
    if (this.currentRoomCode) return;
    if (this.joinCode.length === 4) this._setJoinCode("");
    this.inputActive = true;
    if (this.sys.game.device.input.touch) {
      this._ensureCodeInputElement();
      this.codeInputEl.value = this.joinCode;
      this.codeInputEl.focus();
    } else {
      this.cursorOn = true;
      this.cursorTimer?.remove();
      this.cursorTimer = this.time.addEvent({
        delay: 530,
        loop: true,
        callback: () => {
          this.cursorOn = !this.cursorOn;
          this._renderDigits();
        },
      });
    }
    this._renderDigits();
  }

  _deactivateInput() {
    if (!this.inputActive) return;
    this.inputActive = false;
    this.cursorTimer?.remove();
    this.cursorTimer = null;
    this.cursorOn = false;
    this._disposeCodeInputElement();
    this._renderDigits();
  }

  _setJoinCode(nextCode) {
    const normalized = String(nextCode || "").replace(/\D/g, "").slice(0, 4);
    const completed = normalized.length === 4 && this.joinCode !== normalized;
    this.joinCode = normalized;
    this._persistJoinCode(normalized);
    if (this.codeInputEl && this.codeInputEl.value !== normalized) {
      this.codeInputEl.value = normalized;
    }
    this._renderDigits();
    if (completed && this.inputActive) {
      this._deactivateInput();
      this._joinRoom();
    }
  }

  _ensureCodeInputElement() {
    if (this.codeInputEl) return;
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "numeric";
    input.pattern = "[0-9]*";
    input.maxLength = 4;
    input.autocomplete = "one-time-code";
    Object.assign(input.style, {
      position: "fixed",
      left: "-9999px",
      top: "0",
      opacity: "0",
      width: "1px",
      height: "1px",
      zIndex: "-1",
    });
    this.codeInputHandler = () => this._setJoinCode(input.value);
    input.addEventListener("input", this.codeInputHandler);
    document.body.appendChild(input);
    this.codeInputEl = input;
  }

  _disposeCodeInputElement() {
    if (!this.codeInputEl) return;
    this.codeInputEl.removeEventListener("input", this.codeInputHandler);
    this.codeInputEl.remove();
    this.codeInputEl = null;
    this.codeInputHandler = null;
  }

  _persistJoinCode(code) {
    try {
      window.localStorage.setItem(JOIN_CODE_STORAGE_KEY, code || "");
    } catch (_error) {
      // 保存できなくても入力自体は続けられる
    }
  }

  _restoreJoinCode() {
    try {
      this.joinCode = (window.localStorage.getItem(JOIN_CODE_STORAGE_KEY) || "")
        .replace(/\D/g, "")
        .slice(0, 4);
    } catch (_error) {
      this.joinCode = "";
    }
    this._renderDigits();
  }

  _showNotice(message, color = "#ffcc88") {
    if (!this.noticeText) return;
    this.noticeText.setText(message).setColor(color).setAlpha(1);
    this.tweens.killTweensOf(this.noticeText);
    this.tweens.add({
      targets: this.noticeText,
      alpha: 0,
      delay: 2600,
      duration: 600,
      ease: "Sine.In",
    });
  }

  _handleRoomClientMessage(message) {
    if (!message || typeof message.type !== "string") return;

    switch (message.type) {
      case "client_connecting":
        if (!roomClient.connected) this._setConnectionState("connecting");
        return;
      case "client_open":
        this._setConnectionState("connected");
        return;
      case "client_close":
        this._setConnectionState("connecting");
        this.currentRoomCode = null;
        this.isReady = false;
        this.pending = null;
        this._refreshRoomUi();
        return;
      case "client_error":
        if (!roomClient.connected) this._setConnectionState("connecting");
        return;
      case "welcome":
        this.clientId = message.clientId;
        return;
      case "room_joined":
        this.pending = null;
        this.currentRoomCode = message.room?.code ?? null;
        this.isReady = false;
        this.joinCode = "";
        this._persistJoinCode("");
        this._refreshRoomUi(message.room);
        this._ensureReady(message.room);
        return;
      case "room_state": {
        const room = message.room;
        this.currentRoomCode = room?.code ?? null;
        const self = room?.members?.find((m) => m.clientId === this.clientId);
        this.isReady = !!self?.ready;
        this._refreshRoomUi(room);
        this._ensureReady(room);
        return;
      }
      case "room_left":
        this.pending = null;
        this.currentRoomCode = null;
        this.isReady = false;
        this._refreshRoomUi();
        return;
      case "match_start":
        this._showMatchFoundOverlay(message);
        return;
      case "error":
        this.pending = null;
        this._showNotice(message.message || "サーバーエラー", "#ff9a9a");
        if (!this.currentRoomCode) {
          this._setJoinCode("");
          this._activateInput();
        }
        return;
      default:
    }
  }

  // 準備ボタンは廃止。入室したら自動で準備完了にし、2人そろった時点で対戦開始する。
  _ensureReady(room) {
    if (!room || this.isReady || room.match) return;
    roomClient.send({ type: "set_ready", ready: true });
    this.isReady = true;
  }

  _refreshRoomUi(room = null) {
    const inRoom = !!room?.code;
    this.entryView?.setVisible(!inRoom);
    this.roomView?.setVisible(inRoom);
    if (!inRoom) return;
    this._deactivateInput();
    this.roomCodeText?.setText(room.code.split("").join(" "));
    const members = room.members || [];
    this.memberText?.setText(
      members.length >= 2 ? "相手が入室しました。まもなく開始…" : "相手の入室を待っています…",
    );
  }

  _createRoom() {
    if (this.currentRoomCode || this.pending) return;
    this.pending = "create";
    roomClient.sendGuaranteed({ type: "create_room", playerName: getPlayerName() });
    if (!roomClient.connected) this._showNotice("接続でき次第ルームを作ります");
  }

  _joinRoom() {
    if (this.currentRoomCode || this.pending) return;
    if (this.joinCode.length !== 4) {
      this._showNotice("4桁のコードを入力してください");
      return;
    }
    this.pending = "join";
    roomClient.sendGuaranteed({
      type: "join_room",
      code: this.joinCode,
      playerName: getPlayerName(),
    });
    this._showNotice(roomClient.connected ? "参加しています…" : "接続でき次第参加します");
  }

  _leaveRoom() {
    if (!this.currentRoomCode) return;
    roomClient.send({ type: "leave_room" });
  }

  _returnToLobby() {
    // ホームへ戻るときは常に準備解除してルーム退出（再入場時の準備残り防止）
    if (this.currentRoomCode) {
      roomClient.sendGuaranteed({ type: "set_ready", ready: false });
      roomClient.sendGuaranteed({ type: "leave_room" });
    }
    this.scene.start("LobbyScene");
  }

  _setConnectionState(state) {
    if (!this.statusText) return;
    this.statusTimer?.remove();
    this.statusTimer = null;
    if (state === "connected") {
      this.statusText.setText("● オンライン").setColor("#8fe0a8");
      return;
    }
    const render = () => {
      this.statusDots = (this.statusDots + 1) % 4;
      this.statusText
        .setText(`サーバーに接続中${".".repeat(this.statusDots)}（初回は30秒ほどかかります）`)
        .setColor("#ffcf88");
    };
    render();
    this.statusTimer = this.time.addEvent({ delay: 450, loop: true, callback: render });
  }

  _showMatchFoundOverlay(data) {
    const W = 1080;
    const H = 1920;
    const selfName = data.playerName || "あなた";
    const oppName = data.oppPlayerName || "相手";

    const container = this.add.container(0, 0).setDepth(9999);

    // 暗転背景
    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.87);
    dim.fillRect(0, 0, W, H);
    container.add(dim);

    // カード
    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x0e1829, 0.97);
    cardBg.lineStyle(4, 0xf0c36a, 0.92);
    cardBg.fillRoundedRect(W / 2 - 450, H / 2 - 300, 900, 560, 28);
    cardBg.strokeRoundedRect(W / 2 - 450, H / 2 - 300, 900, 560, 28);
    container.add(cardBg);

    // タイトル
    const title = this.add
      .text(W / 2, H / 2 - 210, "マッチ成立！", {
        fontSize: "88px",
        color: "#f0c36a",
        fontFamily: DISPLAY_FONT,
        stroke: "#2a1a00",
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0.6);
    container.add(title);

    // 区切り線
    const divider = this.add.graphics();
    divider.lineStyle(2, 0xf0c36a, 0.4);
    divider.lineBetween(W / 2 - 380, H / 2 - 100, W / 2 + 380, H / 2 - 100);
    divider.setAlpha(0);
    container.add(divider);

    // 自分ラベル
    const selfLabel = this.add
      .text(W / 2 - 220, H / 2 - 50, "あなた", {
        fontSize: "24px",
        color: "#9fd6ff",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5, 1)
      .setAlpha(0);
    container.add(selfLabel);

    // 自分の名前
    const selfText = this.add
      .text(W / 2 - 220, H / 2 - 46, selfName, {
        fontSize: "46px",
        color: "#c8e8ff",
        fontFamily: UI_FONT,
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5, 0)
      .setAlpha(0);
    selfText.setX(W / 2 - 380);
    container.add(selfText);

    // VS
    const vsText = this.add
      .text(W / 2, H / 2 + 40, "VS", {
        fontSize: "80px",
        color: "#ffffff",
        fontFamily: DISPLAY_FONT,
        stroke: "#333333",
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0.5);
    container.add(vsText);

    // 相手ラベル
    const oppLabel = this.add
      .text(W / 2 + 220, H / 2 - 50, "相手", {
        fontSize: "24px",
        color: "#ffa0a0",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5, 1)
      .setAlpha(0);
    container.add(oppLabel);

    // 相手の名前
    const oppText = this.add
      .text(W / 2 + 220, H / 2 - 46, oppName, {
        fontSize: "46px",
        color: "#ffc8c8",
        fontFamily: UI_FONT,
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5, 0)
      .setAlpha(0);
    oppText.setX(W / 2 + 380);
    container.add(oppText);

    // ヒント
    const hint = this.add
      .text(W / 2, H / 2 + 190, "ゲームを開始します...", {
        fontSize: "30px",
        color: "#8aabbf",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    container.add(hint);

    // アニメーション: タイトル pop in
    this.tweens.add({
      targets: title,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 380,
      ease: "Back.Out",
    });

    // 区切り線フェードイン
    this.tweens.add({
      targets: divider,
      alpha: 1,
      duration: 300,
      delay: 250,
      ease: "Sine.Out",
    });

    // VS pop in
    this.tweens.add({
      targets: vsText,
      alpha: 1,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 380,
      delay: 300,
      ease: "Back.Out",
      onComplete: () => {
        this.tweens.add({
          targets: vsText,
          scaleX: 1,
          scaleY: 1,
          duration: 200,
          ease: "Sine.Out",
        });
      },
    });

    // 自分名: 左からスライドイン
    this.tweens.add({
      targets: [selfLabel, selfText],
      alpha: 1,
      duration: 360,
      delay: 380,
      ease: "Sine.Out",
    });
    this.tweens.add({
      targets: selfText,
      x: W / 2 - 220,
      duration: 380,
      delay: 380,
      ease: "Sine.Out",
    });

    // 相手名: 右からスライドイン
    this.tweens.add({
      targets: [oppLabel, oppText],
      alpha: 1,
      duration: 360,
      delay: 380,
      ease: "Sine.Out",
    });
    this.tweens.add({
      targets: oppText,
      x: W / 2 + 220,
      duration: 380,
      delay: 380,
      ease: "Sine.Out",
    });

    // ヒント: 遅延フェードイン
    this.tweens.add({
      targets: hint,
      alpha: 0.85,
      duration: 400,
      delay: 1500,
      ease: "Sine.Out",
    });

    // 一定時間後: フェードアウト → GameScene
    this.time.delayedCall(2600, () => {
      this.tweens.add({
        targets: container,
        alpha: 0,
        duration: 300,
        ease: "Sine.In",
        onComplete: () => {
          this.scene.start("GameScene", {
            mode: "online-room",
            roomCode: data.roomCode,
            side: data.role,
            playerName: data.playerName,
            oppPlayerName: data.oppPlayerName,
          });
        },
      });
    });
  }
}
