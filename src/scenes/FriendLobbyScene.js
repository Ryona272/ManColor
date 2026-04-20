import { roomClient } from "../net/roomClient.js";
import { getPlayerName } from "../net/firebaseAuth.js";

const UI_FONT = '"Yu Gothic UI", "Hiragino Sans", sans-serif';
const DISPLAY_FONT = '"Yu Mincho", "Hiragino Mincho ProN", serif';
const JOIN_CODE_STORAGE_KEY = "mancolor-last-join-code";

export class FriendLobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: "FriendLobbyScene" });
    this.unsubscribe = null;
    this.clientId = null;
    this.currentRoomCode = null;
    this.isReady = false;
    this.noticeText = null;
    this.connectionText = null;
    this.connectionState = "connecting";
    this.spinGraphics = null;
    this._spinTrack = null;
    this.spinTween = null;
    this.spinAngle = 0;
    this.connectionStatusText = null;
    this._everConnected = false;
    this.roomPanel = null;
    this.roomStatusText = null;
    this.memberCountText = null;
    this.codeText = null;
    this.joinCode = "";
    this.joinCodeText = null;
    this.codeInputEl = null;
    this.codeInputHandler = null;
    this.readyButton = null;
    this.leaveButton = null;
    this.bg = null;
    this.inputActive = false;
    this.cursorTimer = null;
    this.cursorOn = false;
  }

  create() {
    const W = 1080;
    const H = 1920;

    this._drawBackground(W, H);

    this.add
      .text(W / 2, 180, "友達と遊ぶ", {
        fontSize: "96px",
        color: "#f4deb1",
        fontFamily: DISPLAY_FONT,
        stroke: "#1a130c",
        strokeThickness: 7,
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, 252, "ルームコードで友達とオンライン対戦", {
        fontSize: "30px",
        color: "#ced9ea",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5);

    this._drawRoomTools(W);

    this.add
      .text(W / 2, 1060, "ルーム作成 または コード参加で入室できます", {
        fontSize: "28px",
        color: "#c9d8ef",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5);

    this._drawConnectionSpinner(W);
    this._setConnectionState("connecting", "");

    this._restoreJoinCode();

    this._drawBottomActions(W, H);
    this._setupKeyboardInput();

    this.unsubscribe = roomClient.subscribe((message) => {
      this._handleRoomClientMessage(message);
    });
    roomClient.connect();

    this.events.once("shutdown", () => {
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
      this._deactivateInput();
      this._disposeCodeInputElement();
    });

    this.events.once("destroy", () => {
      this._disposeCodeInputElement();
    });
  }

  _drawBackground(W, H) {
    this.bg = this.add.graphics();
    this._renderBackground(W, H, false);
  }

  _renderBackground(W, H, anyReady) {
    const g = this.bg;
    if (!g) return;
    g.clear();
    if (anyReady) {
      g.fillGradientStyle(0x0d2a14, 0x0d2a14, 0x122a10, 0x122a10, 1);
    } else {
      g.fillGradientStyle(0x111f32, 0x111f32, 0x251820, 0x251820, 1);
    }
    g.fillRect(0, 0, W, H);
    g.fillStyle(0x8fd3ff, 0.07);
    g.fillCircle(W * 0.78, H * 0.2, 250);
    g.fillStyle(0xffcb8a, 0.07);
    g.fillCircle(W * 0.2, H * 0.82, 300);
    g.lineStyle(2, 0xe6d7b7, 0.2);
    g.strokeRoundedRect(30, 30, W - 60, H - 60, 24);
  }

  _drawRoomTools(W) {
    this.add
      .text(W / 2, 320, "オンライン友達対戦", {
        fontSize: "38px",
        color: "#f0dfbf",
        fontFamily: DISPLAY_FONT,
      })
      .setOrigin(0.5);

    this.roomPanel = this.add.graphics();
    this.roomPanel.fillStyle(0x112238, 0.88);
    this.roomPanel.lineStyle(3, 0xcde2ff, 0.45);
    this.roomPanel.fillRoundedRect(W / 2 - 380, 370, 760, 640, 22);
    this.roomPanel.strokeRoundedRect(W / 2 - 380, 370, 760, 640, 22);

    this._createSmallButton({
      x: W / 2 - 170,
      y: 460,
      label: "ルーム作成",
      onClick: () => this._createRoom(),
    });

    this._createSmallButton({
      x: W / 2 + 170,
      y: 460,
      label: "ルーム退出",
      onClick: () => this._leaveRoom(),
    });

    this.roomStatusText = this.add
      .text(W / 2 - 340, 387, "未参加", {
        fontSize: "32px",
        color: "#e2edff",
        fontFamily: UI_FONT,
      })
      .setOrigin(0);

    this.codeText = this.add
      .text(W / 2, 560, "Room: ----", {
        fontSize: "34px",
        color: "#e2edff",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5);

    const inputBox = this.add.graphics();
    inputBox.fillStyle(0x0a1829, 0.96);
    inputBox.lineStyle(3, 0x8fb4dc, 0.75);
    inputBox.fillRoundedRect(W / 2 - 300, 640, 390, 80, 16);
    inputBox.strokeRoundedRect(W / 2 - 300, 640, 390, 80, 16);

    this.joinCodeText = this.add
      .text(W / 2 - 105, 680, "参加コード入力: _", {
        fontSize: "34px",
        color: "#c8d7f1",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5);

    const inputHint = this.add
      .text(W / 2 - 105, 740, "入力欄タップで4桁を入力", {
        fontSize: "20px",
        color: "#8da7c7",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5);

    const inputTapZone = this.add
      .zone(W / 2 - 105, 680, 390, 80)
      .setInteractive({ useHandCursor: true });
    inputTapZone.on("pointerdown", () => {
      this._activateInput();
    });

    // 入力欄の外をタップしたら非アクティブに
    this.input.on("pointerdown", (_pointer, targets) => {
      if (this.inputActive && !targets.includes(inputTapZone)) {
        this._deactivateInput();
      }
    });

    this._createSmallButton({
      x: W / 2 + 225,
      y: 680,
      label: "コード参加",
      onClick: () => this._joinRoom(),
    });

    const readyText = this.add
      .text(W / 2, 880, "準備完了", {
        fontSize: "40px",
        color: "#f8fbff",
        backgroundColor: "#355178",
        padding: { x: 30, y: 16 },
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5)
      .setInteractive();

    this.readyButton = readyText;
    readyText.on("pointerdown", () => this._toggleReady());
    readyText.on("pointerover", () => {
      this.tweens.add({
        targets: readyText,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 110,
        ease: "Sine.Out",
      });
    });
    readyText.on("pointerout", () => {
      this.tweens.add({
        targets: readyText,
        scaleX: 1,
        scaleY: 1,
        duration: 110,
        ease: "Sine.Out",
      });
    });

    this.memberCountText = this.add
      .text(W / 2, 950, "", {
        fontSize: "24px",
        color: "#b9cde8",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5);

    this._refreshRoomUi();
  }

  _drawBottomActions(W, H) {
    this.noticeText = this.add
      .text(W / 2, H - 280, "2人の準備完了でマッチ成立します", {
        fontSize: "28px",
        color: "#bcd0ec",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5)
      .setAlpha(0.95);

    this._createSmallButton({
      x: W / 2 - 170,
      y: H - 170,
      label: "ロビーへ戻る",
      onClick: () => this._returnToLobby(),
    });

    this._createSmallButton({
      x: W / 2 + 170,
      y: H - 170,
      label: "ソロで確認",
      onClick: () => this.scene.start("GameScene", { mode: "solo" }),
    });
  }

  _createSmallButton({ x, y, label, onClick }) {
    const text = this.add
      .text(x, y, label, {
        fontSize: "33px",
        color: "#f8fbff",
        backgroundColor: "#355178",
        padding: { x: 20, y: 12 },
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5)
      .setInteractive();

    text.on("pointerdown", onClick);
    text.on("pointerover", () => {
      this.tweens.add({
        targets: text,
        scaleX: 1.03,
        scaleY: 1.03,
        duration: 110,
        ease: "Sine.Out",
      });
    });
    text.on("pointerout", () => {
      this.tweens.add({
        targets: text,
        scaleX: 1,
        scaleY: 1,
        duration: 110,
        ease: "Sine.Out",
      });
    });

    return text;
  }

  _setupKeyboardInput() {
    this.input.keyboard.on("keydown", (event) => {
      if (!event || !this.joinCodeText) return;
      if (!this.inputActive) return; // 入力欄がアクティブのときだけ受け付ける
      if (this.codeInputEl && document.activeElement === this.codeInputEl)
        return; // モバイルはinputイベントに任せる

      if (event.key === "Backspace") {
        this._setJoinCode(this.joinCode.slice(0, -1));
        return;
      }

      const key = String(event.key || "");
      if (!/^[0-9]$/.test(key)) return;
      if (this.joinCode.length >= 4) return;

      this._setJoinCode(this.joinCode + key);
    });
  }

  _isTouchDevice() {
    return this.sys.game.device.input.touch;
  }

  _activateInput() {
    this.inputActive = true;
    if (this._isTouchDevice()) {
      // モバイル: hidden inputを生成してフォーカス → キーボード起動
      this._ensureCodeInputElement();
      this._focusCodeInput();
    } else {
      // PC: カーソル点滅を開始
      this.cursorOn = true;
      this._updateCursorText();
      if (this.cursorTimer) this.cursorTimer.remove();
      this.cursorTimer = this.time.addEvent({
        delay: 530,
        loop: true,
        callback: () => {
          this.cursorOn = !this.cursorOn;
          this._updateCursorText();
        },
      });
    }
  }

  _deactivateInput() {
    if (!this.inputActive) return;
    this.inputActive = false;
    if (this.cursorTimer) {
      this.cursorTimer.remove();
      this.cursorTimer = null;
    }
    this.cursorOn = false;
    this._disposeCodeInputElement();
    if (this.joinCodeText) {
      this.joinCodeText.setText(`参加コード入力: ${this.joinCode || "_"}`);
    }
  }

  _updateCursorText() {
    if (!this.joinCodeText) return;
    const cursor = this.cursorOn ? "|" : " ";
    this.joinCodeText.setText(`参加コード入力: ${this.joinCode}${cursor}`);
  }

  _setJoinCode(nextCode) {
    const normalized = String(nextCode || "")
      .replace(/\D/g, "")
      .slice(0, 4);
    this.joinCode = normalized;
    this._persistJoinCode(normalized);
    if (this.joinCodeText) {
      if (this.inputActive && !this.codeInputEl) {
        // PC カーソルモード
        const cursor = this.cursorOn ? "|" : " ";
        this.joinCodeText.setText(`参加コード入力: ${this.joinCode}${cursor}`);
      } else {
        this.joinCodeText.setText(`参加コード入力: ${this.joinCode || "_"}`);
      }
    }
    if (this.codeInputEl && this.codeInputEl.value !== normalized) {
      this.codeInputEl.value = normalized;
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
    input.style.position = "fixed";
    input.style.left = "-9999px";
    input.style.top = "0";
    input.style.opacity = "0";
    input.style.width = "1px";
    input.style.height = "1px";
    input.style.zIndex = "-1";

    this.codeInputHandler = () => {
      this._setJoinCode(input.value);
    };

    input.addEventListener("input", this.codeInputHandler);
    document.body.appendChild(input);

    this.codeInputEl = input;
  }

  _focusCodeInput() {
    if (!this.codeInputEl) return;
    this.codeInputEl.value = this.joinCode || "";
    this.codeInputEl.focus();
    this.codeInputEl.select();
  }

  _disposeCodeInputElement() {
    if (!this.codeInputEl) return;
    if (this.codeInputHandler) {
      this.codeInputEl.removeEventListener("input", this.codeInputHandler);
    }
    if (this.codeInputEl.parentElement) {
      this.codeInputEl.parentElement.removeChild(this.codeInputEl);
    }
    this.codeInputEl = null;
    this.codeInputHandler = null;
  }

  _persistJoinCode(code) {
    try {
      window.localStorage.setItem(JOIN_CODE_STORAGE_KEY, code || "");
    } catch (_error) {
      // Ignore storage errors and keep runtime behavior.
    }
  }

  _restoreJoinCode() {
    try {
      const saved = window.localStorage.getItem(JOIN_CODE_STORAGE_KEY) || "";
      this._setJoinCode(saved);
    } catch (_error) {
      // Ignore storage errors and keep runtime behavior.
    }
  }

  _showNotice(message) {
    if (!this.noticeText) return;
    this.noticeText.setText(message);
    this.noticeText.setAlpha(1);

    this.tweens.killTweensOf(this.noticeText);
    this.tweens.add({
      targets: this.noticeText,
      alpha: 0.58,
      duration: 1400,
      ease: "Sine.Out",
    });
  }

  _handleRoomClientMessage(message) {
    if (!message || typeof message.type !== "string") return;

    if (message.type === "client_connecting") {
      this._setConnectionState("connecting", "");
      return;
    }

    if (message.type === "client_open") {
      this._setConnectionState("connected", "");
      return;
    }

    if (message.type === "client_close") {
      this._setConnectionState("reconnecting", "");
      this.clientId = null;
      this.isReady = false;
      this.currentRoomCode = null;
      this._refreshRoomUi();
      return;
    }

    if (message.type === "client_error") {
      this._setConnectionState("error", "");
      if (message.message) this._showNotice(message.message);
      return;
    }

    if (message.type === "welcome") {
      this.clientId = message.clientId;
      return;
    }

    if (message.type === "room_joined") {
      this.currentRoomCode = message.room?.code ?? null;
      this.isReady = false;
      this._refreshRoomUi(message.room);
      this._showNotice(`ルーム ${this.currentRoomCode} に参加しました`);
      return;
    }

    if (message.type === "room_state") {
      const room = message.room;
      this.currentRoomCode = room?.code ?? null;
      const self = room?.members?.find(
        (member) => member.clientId === this.clientId,
      );
      this.isReady = !!self?.ready;
      this._refreshRoomUi(room);
      return;
    }

    if (message.type === "room_left") {
      this.currentRoomCode = null;
      this.isReady = false;
      this._refreshRoomUi();
      return;
    }

    if (message.type === "match_start") {
      this._showMatchFoundOverlay(message);
      return;
    }

    if (message.type === "error") {
      this._showNotice(message.message || "サーバーエラー");
    }
  }

  _refreshRoomUi(room = null) {
    const activeRoom = room ?? null;

    if (!activeRoom) {
      if (this.roomStatusText) {
        this.roomStatusText.setText("未参加");
      }
      this.codeText?.setText("Room: ----");
      this._updatePanelColor(false);
      this._renderBackground(1080, 1920, false);
      this.readyButton?.setText("準備完了");
      this.readyButton?.setAlpha(0.55);
      if (this.memberCountText) {
        this.memberCountText.setText("");
      }
      return;
    }

    const members = activeRoom.members || [];
    const readyCount = members.filter((member) => member.ready).length;
    if (this.roomStatusText) {
      this.roomStatusText.setText("参加中");
    }
    this.codeText?.setText(`Room: ${activeRoom.code}`);
    this._updatePanelColor(true);
    this._renderBackground(1080, 1920, readyCount > 0);
    this.readyButton?.setText(this.isReady ? "準備解除" : "準備完了");
    this.readyButton?.setAlpha(1);
    if (this.memberCountText) {
      this.memberCountText.setText(
        `${members.length}/2人  準備 ${readyCount}/2`,
      );
    }
  }

  _updatePanelColor(inRoom) {
    if (!this.roomPanel) return;
    this.roomPanel.clear();
    let fillColor, lineColor;
    if (inRoom) {
      fillColor = 0x1a3a5a; // 青色
      lineColor = 0x5ba8ff;
    } else {
      fillColor = 0x3a1515; // 赤色（背景寄り）
      lineColor = 0xcc6666;
    }
    const W = 1080;
    this.roomPanel.fillStyle(fillColor, 0.88);
    this.roomPanel.lineStyle(3, lineColor, 0.45);
    this.roomPanel.fillRoundedRect(W / 2 - 380, 370, 760, 640, 22);
    this.roomPanel.strokeRoundedRect(W / 2 - 380, 370, 760, 640, 22);
  }

  _createRoom() {
    if (this.currentRoomCode) {
      this._showNotice("すでにルーム参加中です");
      return;
    }
    roomClient.send({ type: "create_room", playerName: getPlayerName() });
  }

  _joinRoom() {
    if (this.currentRoomCode) {
      this._showNotice("参加中のルームを先に退出してください");
      return;
    }

    if (this.joinCode.length !== 4) {
      this._showNotice("コードは4桁の数字を入力してください");
      return;
    }

    roomClient.send({
      type: "join_room",
      code: this.joinCode,
      playerName: getPlayerName(),
    });
  }

  _leaveRoom() {
    if (!this.currentRoomCode) {
      this._showNotice("参加中のルームがありません");
      return;
    }
    roomClient.send({ type: "leave_room" });
  }

  _returnToLobby() {
    // ホームへ戻るときは常に準備解除してルーム退出（再入場時の準備残り防止）
    if (this.currentRoomCode) {
      roomClient.sendGuaranteed({ type: "set_ready", ready: false });
      roomClient.sendGuaranteed({ type: "leave_room" });
      this.isReady = false;
      this.currentRoomCode = null;
      this._refreshRoomUi();
    }
    this.scene.start("LobbyScene");
  }

  _toggleReady() {
    if (!this.currentRoomCode) {
      this._showNotice("ルーム参加後に準備できます");
      return;
    }
    roomClient.send({ type: "set_ready", ready: !this.isReady });
  }

  _drawConnectionSpinner(W) {
    const cx = W / 2;
    const cy = 1245;
    const r = 50;

    const track = this.add.graphics();
    track.lineStyle(8, 0x1e3456, 1);
    track.strokeCircle(cx, cy, r);
    this._spinTrack = track;

    this.spinGraphics = this.add.graphics();
    this._drawSpinnerArc(0);

    this.spinTween = this.tweens.addCounter({
      from: 0,
      to: 360,
      duration: 1100,
      repeat: -1,
      ease: "Linear",
      onUpdate: (tween) => {
        this.spinAngle = tween.getValue();
        this._drawSpinnerArc(this.spinAngle);
      },
    });

    this.connectionStatusText = this.add
      .text(cx, cy + 76, "接続中...", {
        fontSize: "36px",
        color: "#8da7c7",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5);
  }

  _drawSpinnerArc(angleDeg) {
    const g = this.spinGraphics;
    if (!g) return;
    const cx = 1080 / 2;
    const cy = 1245;
    const r = 50;
    g.clear();
    g.lineStyle(8, 0x5ea8ff, 1);
    const startRad = Phaser.Math.DegToRad(angleDeg - 90);
    const endRad = Phaser.Math.DegToRad(angleDeg + 210);
    g.beginPath();
    g.arc(cx, cy, r, startRad, endRad, false);
    g.strokePath();
  }

  _setConnectionState(state, label) {
    this.connectionState = state;

    if (state === "connected") {
      this._everConnected = true;
    }

    // スピナーは初回接続中のみ表示。一度つながったあとは出さない
    const showSpinner = !this._everConnected && state === "connecting";

    this._spinTrack?.setVisible(showSpinner);
    this.spinGraphics?.setVisible(showSpinner);
    if (showSpinner) {
      this.spinTween?.resume();
    } else {
      this.spinTween?.pause();
    }

    if (this.connectionStatusText) {
      if (showSpinner) {
        this.connectionStatusText.setText("接続中...");
        this.connectionStatusText.setColor("#8da7c7");
        this.connectionStatusText.setVisible(true);
      } else {
        this.connectionStatusText.setVisible(false);
      }
    }

    // 再接続・エラーは通知テキストで控えめに知らせる
    if (state === "reconnecting") {
      this._showNotice("再接続中...");
    } else if (state === "error" && this._everConnected) {
      this._showNotice("接続が切れました");
    }
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
