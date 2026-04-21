import { STONE_COLORS } from "../data/constants.js";

const UI_FONT = '"Yu Gothic UI", "Hiragino Sans", sans-serif';
const DISPLAY_FONT = '"Yu Mincho", "Hiragino Mincho ProN", serif';
const DEPTH_FORTUNE = 100;
const DEPTH_MESSAGE = 6000;
const DEPTH_REVEAL = 7000;
const DEPTH_BANNER_TOP = 8000;

/**
 * UIScene - HUDとオーバーレイ担当（GameSceneと並行動作）
 */
export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: "UIScene" });
    this.activeBanner = null;
    this.specialOverlay = null;
    this.resultOverlay = null;
    this.finalPhaseState = null;
    this.fortuneSprites = [];
    this.predictionPreset = null;
    this.lastTurnAnimationSignature = null;
    this.lastOnlineFinalStage = null;
    this.onlineScoreAnimationStarted = false;
    this.onlineFinalIntroPlayed = false;
    this.onlineRevealPlayed = false;
    this.disconnectBar = null;
  }

  init(data) {
    this.gameScene = data.gameScene;
    this.onlineFinalIntroPlayed = false;
    this.onlineRevealPlayed = false;
  }

  create() {
    const W = 1080;

    const turnInfo = this.gameScene.getTurnDisplayInfo?.(
      this.gameScene.playerTurn ?? true,
    ) ?? {
      text: "あなたのターン",
      color: "#e0c97f",
    };

    this.turnGlow = this.add.rectangle(W / 2, 122, 500, 88, 0x9fd6ff, 0.14);
    this.turnGlow.setVisible(false);
    this.turnGlow.setDepth(DEPTH_MESSAGE);

    this.turnText = this.add
      .text(W / 2, 118, turnInfo.text, {
        fontSize: "42px",
        color: turnInfo.color,
        fontFamily: DISPLAY_FONT,
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.turnText.setDepth(DEPTH_MESSAGE);

    this.turnNumText = this.add
      .text(W / 2, 42, "Turn 1", {
        fontSize: "32px",
        color: "#a7b0c5",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5);
    this.turnNumText.setDepth(DEPTH_MESSAGE);

    this.statusText = this.add
      .text(W / 2, 88, "", {
        fontSize: "22px",
        color: "#d7e8ff",
        fontFamily: UI_FONT,
        align: "center",
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.statusText.setDepth(DEPTH_MESSAGE);

    this.placementText = this.add
      .text(W / 2, 172, "", {
        fontSize: "24px",
        color: "#fff0c2",
        fontFamily: UI_FONT,
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.placementText.setDepth(DEPTH_MESSAGE);

    // 相手の持ち手表示（右上の固定枠）
    const HAND_BOX_LEFT = W - 215;
    const HAND_BOX_W = 190;
    this.oppHandLabel = this.add
      .text(HAND_BOX_LEFT + HAND_BOX_W / 2, 50, "相手の持ち手", {
        fontSize: "18px",
        color: "#9fd6ff",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5, 0);
    this.oppHandLabel.setDepth(DEPTH_MESSAGE);
    this.oppHandBg = this.add.graphics();
    this.oppHandBg.setDepth(DEPTH_MESSAGE - 1);
    this.oppHandStonesGfx = [];
    this._drawOppHandBox([]);

    // バージョン表示（右下）
    this.add
      .text(W - 16, 1920 - 16, "Ver 0.1.0", {
        fontSize: "18px",
        color: "#4a5368",
        fontFamily: UI_FONT,
      })
      .setOrigin(1, 1)
      .setDepth(DEPTH_MESSAGE);

    // 降参ボタン（左上・捨て場の上）
    this.surrenderButton = this.add
      .text(120, 96, "降参", {
        fontSize: "24px",
        color: "#ffffff",
        backgroundColor: "#cc4444",
        padding: { x: 16, y: 10 },
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5, 1)
      .setInteractive();
    this.surrenderButton.on("pointerdown", () => this._handleSurrender());
    this.surrenderButton.setDepth(DEPTH_MESSAGE);

    // ルールボタン（左下・長押しでポップアップ）
    this.rulesButton = this.add
      .text(120, 1920 - 16, "？ルール", {
        fontSize: "28px",
        color: "#c8d8f0",
        backgroundColor: "#1a2540",
        padding: { x: 18, y: 12 },
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5, 1)
      .setInteractive();
    this.rulesButton.setDepth(DEPTH_MESSAGE);
    this.rulesButton.on("pointerdown", () => this._showRulesPopup());
    this.rulesButton.on("pointerup", () => this._hideRulesPopup());
    this.rulesButton.on("pointerout", () => this._hideRulesPopup());
    this.rulesOverlay = null;

    // オンライン対戦時のプレイヤー名ラベル
    const isOnline = this.gameScene._isOnlineRoomMode?.() ?? false;
    const selfName = this.gameScene.selfPlayerName;
    const oppName = this.gameScene.oppPlayerName;

    this.oppNameLabel = this.add
      .text(W / 2, 198, oppName ? `相手: ${oppName}` : "", {
        fontSize: "26px",
        color: "#ff9f9f",
        fontFamily: UI_FONT,
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0)
      .setVisible(isOnline && !!oppName)
      .setDepth(DEPTH_MESSAGE);

    this.selfNameLabel = this.add
      .text(W / 2, 1838, selfName ? `あなた: ${selfName}` : "", {
        fontSize: "26px",
        color: "#9fd6ff",
        fontFamily: UI_FONT,
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setVisible(isOnline && !!selfName)
      .setDepth(DEPTH_MESSAGE);

    this.refreshFortuneAndDiscard();
    this.gameScene.refreshTurnLaneGuidance?.(
      (this.gameScene.playerTurn ?? true) && this.gameScene.mode === "turn",
    );
  }

  _showRulesPopup() {
    if (this.rulesOverlay) return;
    const W = 1080;
    const H = 1920;
    const PAD = 48;
    const BOX_X = PAD;
    const BOX_W = W - PAD * 2;
    const BOX_Y = 120;
    const BOX_H = H - BOX_Y - 120;

    const container = this.add.container(0, 0);
    container.setDepth(DEPTH_BANNER_TOP + 100);

    const dimBg = this.add.graphics();
    dimBg.fillStyle(0x000000, 0.82);
    dimBg.fillRect(0, 0, W, H);
    container.add(dimBg);

    const boxBg = this.add.graphics();
    boxBg.fillStyle(0x0e1829, 0.97);
    boxBg.lineStyle(2, 0x4a6fa8, 0.9);
    boxBg.fillRoundedRect(BOX_X, BOX_Y, BOX_W, BOX_H, 18);
    boxBg.strokeRoundedRect(BOX_X, BOX_Y, BOX_W, BOX_H, 18);
    container.add(boxBg);

    const title = this.add
      .text(W / 2, BOX_Y + 36, "ゲームのルール", {
        fontSize: "36px",
        color: "#e0c97f",
        fontFamily: DISPLAY_FONT,
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0);
    container.add(title);

    const RULES_TEXT = [
      "＜自分の手番でできること＞",
      "５つの路から１つ選んで石を反時計回りに置いていく。",
      "右側にある自分の賽壇に石を溜め、相手より多くの",
      "得点を得ると勝ち。",
      "",
      "最後に置いた石が特定の場所のとき、技が発動する。",
      "",
      "①「ぐるぐる」…自分の賽壇に置くと発動し、もう一度手番。",
      "②「ざくざく」…自分の空白の路に置くと発動し、同じ模様の",
      "　相手の路から石を奪い、自分の路に自由に配置できる。",
      "③「ちらちら」or「ぽいぽい」…相手の賽壇に置くと発動し、",
      "　どちらかを選んで実行する。",
      "　「ちらちら」は、真ん中に並ぶ３つの占い石を左から順に",
      "　みることができる（最大３回）。",
      "　「ぽいぽい」は自分か相手の賽壇を選び石を１つだけ排除。",
      "",
      "★手番後、自分の５路の石が２色以下の場合「くたくた」を",
      "　発動し強制終了できる。「まだまだ」を選ぶと続行。",
      "",
      "＜占い石について＞",
      "ゲーム開始時にお互いは手前の占い石を一つ確認する。",
      "この色の石を賽壇に入れると +3点。",
      "相手の見た色の石を賽壇に入れると +5点。",
      "真ん中に並ぶ３つの占い石は、端の色 +1点・中央 −2点。",
      "この３つはちらちらで確認できる。",
    ].join("\n");

    const body = this.add
      .text(BOX_X + 32, BOX_Y + 100, RULES_TEXT, {
        fontSize: "26px",
        color: "#dce8ff",
        fontFamily: UI_FONT,
        wordWrap: { width: BOX_W - 64 },
        lineSpacing: 6,
      })
      .setOrigin(0, 0);
    container.add(body);

    const hint = this.add
      .text(W / 2, BOX_Y + BOX_H - 24, "指を離すと閉じます", {
        fontSize: "22px",
        color: "#5a7090",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5, 1);
    container.add(hint);

    this.rulesOverlay = container;
  }

  _hideRulesPopup() {
    if (!this.rulesOverlay) return;
    this.rulesOverlay.destroy();
    this.rulesOverlay = null;
  }

  update() {}

  setStatusMessage(message, color = "#d7e8ff") {
    if (!this.statusText) return;
    this.statusText.setText(message || "");
    this.statusText.setColor(color);
    this.statusText.setVisible(!!message);
  }

  clearStatusMessage() {
    if (!this.statusText) return;
    this.statusText.setText("");
    this.statusText.setVisible(false);
  }

  /**
   * 接続状態バー（画面上部に固定表示）を表示する
   * severity: 'warning' | 'error' | 'reconnected'
   */
  showDisconnectBar(message, severity = "warning") {
    this.clearDisconnectBar();
    const W = 1080;
    const isError = severity === "error";
    const isReconnected = severity === "reconnected";
    const bgColor = isError ? 0x991111 : isReconnected ? 0x1a6a50 : 0x8a5500;
    const borderColor = isError
      ? 0xff5555
      : isReconnected
        ? 0x44cc99
        : 0xffcc44;

    const container = this.add.container(0, 0);
    container.setDepth(DEPTH_BANNER_TOP + 1);

    const bg = this.add.graphics();
    bg.fillStyle(bgColor, 0.96);
    bg.fillRect(0, 0, W, 52);
    bg.lineStyle(2, borderColor, 0.85);
    bg.strokeRect(0, 0, W, 52);
    container.add(bg);

    const txt = this.add
      .text(W / 2, 26, message, {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: UI_FONT,
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    container.add(txt);

    this.disconnectBar = container;

    // 警告色の場合はパルスで注意を引く
    if (!isReconnected) {
      this.tweens.add({
        targets: bg,
        alpha: 0.7,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });
    }
  }

  clearDisconnectBar() {
    if (!this.disconnectBar) return;
    this.disconnectBar.destroy();
    this.disconnectBar = null;
  }

  _handleSurrender() {
    // すでに結果画面や特殊状態の場合は無効
    if (this.resultOverlay || this.specialOverlay) return;

    const W = 1080;
    const H = 1920;
    const container = this.add.container(0, 0);
    container.setDepth(DEPTH_MESSAGE);

    // 半透明背景
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRect(0, 0, W, H);
    container.add(bg);

    // 確認ダイアログ
    const dialogBg = this.add.graphics();
    dialogBg.fillStyle(0x1a1a2a, 0.95);
    dialogBg.lineStyle(3, 0xff6666, 0.8);
    dialogBg.fillRoundedRect(W / 2 - 250, H / 2 - 120, 500, 240, 20);
    dialogBg.strokeRoundedRect(W / 2 - 250, H / 2 - 120, 500, 240, 20);
    container.add(dialogBg);

    const title = this.add
      .text(W / 2, H / 2 - 60, "降参しますか？", {
        fontSize: "36px",
        color: "#ffffff",
        fontFamily: DISPLAY_FONT,
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    container.add(title);

    const message = this.add
      .text(W / 2, H / 2 - 10, "ゲームを終了してホームに戻ります", {
        fontSize: "24px",
        color: "#cccccc",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5);
    container.add(message);

    // はいボタン
    const yesBtn = this.add
      .text(W / 2 - 100, H / 2 + 60, "はい", {
        fontSize: "28px",
        color: "#ffffff",
        backgroundColor: "#cc4444",
        padding: { x: 20, y: 12 },
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5)
      .setInteractive();
    yesBtn.on("pointerdown", () => {
      container.destroy();
      this.gameScene.surrender();
    });
    container.add(yesBtn);

    // いいえボタン
    const noBtn = this.add
      .text(W / 2 + 100, H / 2 + 60, "いいえ", {
        fontSize: "28px",
        color: "#ffffff",
        backgroundColor: "#666666",
        padding: { x: 20, y: 12 },
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5)
      .setInteractive();
    noBtn.on("pointerdown", () => {
      container.destroy();
    });
    container.add(noBtn);

    this.surrenderDialog = container;
  }

  // 占い石・捨て場を固定UIとして描画（カメラ回転の影響を受けない）
  refreshFortuneAndDiscard() {
    this.fortuneSprites.forEach((s) => s.destroy());
    this.fortuneSprites = [];

    const gs = this.gameScene;
    if (!gs || !gs.gameState) return;
    const state = gs.gameState.getState();
    const fortune = state?.fortune;
    if (!fortune) return;

    const W = 1080;
    const H = 1920;
    const isOppView = gs.matchMode === "online-room" && gs.onlineSide === "opp";
    const fortuneBlockShift = 26;

    const fortuneY = H * 0.5;
    const ownFortuneY = fortuneY + 220 + fortuneBlockShift; // 手前（下）= 自分
    const theirFortuneY = fortuneY - 220 - fortuneBlockShift; // 奥（上）= 相手

    // 視点に応じて自分/相手の石を入れ替える
    const ownFortune = isOppView ? fortune.opp : fortune.self;
    const theirFortune = isOppView ? fortune.self : fortune.opp;
    const theirRevealed = isOppView
      ? !!fortune.self.revealed
      : !!fortune.opp.revealed;

    // 中央占い石
    fortune.center.forEach((_fc, i) => {
      const actualIndex = isOppView ? 2 - i : i;
      const fc = fortune.center[actualIndex];
      const fx = W / 2 + (i - 1) * 120;
      const hintedFrameColor = isOppView ? 0xe9d7a5 : 0xb48a45;
      const viewerRole = isOppView ? "opp" : "self";
      const otherRole = viewerRole === "self" ? "opp" : "self";
      const visibleToMe = isOppView
        ? fc.seenBy.includes("opp")
        : fc.seenBy.includes("self");
      const hintedByOpponent = !visibleToMe && fc.seenBy.includes(otherRole);
      const hex = visibleToMe
        ? (STONE_COLORS[fc.color]?.hex ?? 0xffffff)
        : hintedByOpponent
          ? 0x434f63
          : 0x2f3542;

      const g = this.add.graphics();
      g.fillStyle(0x2a2a4a, 0.9);
      g.fillCircle(fx, fortuneY, 45);
      g.lineStyle(
        hintedByOpponent ? 4 : 2,
        hintedByOpponent ? hintedFrameColor : 0xaaaacc,
        hintedByOpponent ? 1 : 1,
      );
      g.strokeCircle(fx, fortuneY, 45);
      g.fillStyle(hex, visibleToMe ? 0.8 : 0.95);
      g.fillCircle(fx, fortuneY, 38);
      if (!visibleToMe) {
        g.lineStyle(
          hintedByOpponent ? 4 : 2,
          hintedByOpponent ? hintedFrameColor : 0xd0d7e2,
          hintedByOpponent ? 0.98 : 0.7,
        );
        g.strokeCircle(fx, fortuneY, 38);
      }
      g.setDepth(0);
      this.fortuneSprites.push(g);

      if (!visibleToMe) {
        const q = this.add
          .text(fx, fortuneY, "?", {
            fontSize: "34px",
            color: hintedByOpponent ? "#fff9d4" : "#f4f7ff",
            fontFamily: "sans-serif",
          })
          .setOrigin(0.5);
        this.fortuneSprites.push(q);
      }

      this._drawFortuneScoreText(
        fx,
        fortuneY,
        fc.bonus,
        fc.bonus,
        0,
        0,
        isOppView,
      );
    });

    const dir = this.add.graphics();
    const arrowY = fortuneY + 96;
    const arrowColor = isOppView ? 0xffffff : 0x000000;
    dir.lineStyle(5, arrowColor, 0.98);
    dir.lineBetween(W / 2 - 190, arrowY, W / 2 + 190, arrowY);
    dir.fillStyle(arrowColor, 1);
    dir.fillTriangle(
      W / 2 + 208,
      arrowY,
      W / 2 + 186,
      arrowY - 10,
      W / 2 + 186,
      arrowY + 10,
    );
    this.fortuneSprites.push(dir);

    const oppDir = this.add.graphics();
    const oppArrowY = fortuneY - 96;
    const oppArrowColor = isOppView ? 0x000000 : 0xffffff;
    oppDir.lineStyle(5, oppArrowColor, 0.98);
    oppDir.lineBetween(W / 2 - 190, oppArrowY, W / 2 + 190, oppArrowY);
    oppDir.fillStyle(oppArrowColor, 1);
    oppDir.fillTriangle(
      W / 2 - 208,
      oppArrowY,
      W / 2 - 186,
      oppArrowY - 10,
      W / 2 - 186,
      oppArrowY + 10,
    );
    this.fortuneSprites.push(oppDir);

    const dirLabel = this.add
      .text(W / 2, arrowY + 28, "ちらちら: 左 → 中央 → 右", {
        fontSize: "20px",
        color: isOppView ? "#f2f2f6" : "#1f1b17",
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5);
    this.fortuneSprites.push(dirLabel);

    const oppDirLabel = this.add
      .text(W / 2, oppArrowY - 28, "相手側: 右 ← 中央 ← 左", {
        fontSize: "20px",
        color: isOppView ? "#1f1b17" : "#f2f2f6",
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5);
    this.fortuneSprites.push(oppDirLabel);

    // 自分の占い石（手前・常に見える）
    const ownHex = STONE_COLORS[ownFortune.color]?.hex ?? 0xffffff;
    const ownStone = this.add.graphics();
    ownStone.fillStyle(0x000000, 0.14);
    ownStone.fillCircle(W / 2 + 2, ownFortuneY + 3, 38);
    ownStone.fillStyle(ownHex, 0.96);
    ownStone.fillCircle(W / 2, ownFortuneY, 36);
    ownStone.lineStyle(4, 0x4b3e28, 0.95);
    ownStone.strokeCircle(W / 2, ownFortuneY, 36);
    this.fortuneSprites.push(ownStone);

    const ownSelfScore = 3;
    const ownOppScore = 5;
    this._drawFortuneScoreText(
      W / 2,
      ownFortuneY,
      ownSelfScore,
      ownOppScore,
      null,
      null,
      isOppView,
    );

    const ownLabel = this.add
      .text(W / 2 + 132, ownFortuneY, "自分の占い石", {
        fontSize: "20px",
        color: isOppView ? "#f2f2f6" : "#1f1b17",
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5);
    this.fortuneSprites.push(ownLabel);

    // 相手の占い石（奥・隠れている）
    const theirHex = theirRevealed
      ? (STONE_COLORS[theirFortune.color]?.hex ?? 0xffffff)
      : 0x2f3542;
    const theirStone = this.add.graphics();
    theirStone.fillStyle(0x000000, 0.18);
    theirStone.fillCircle(W / 2 + 2, theirFortuneY + 3, 38);
    theirStone.fillStyle(theirHex, 0.96);
    theirStone.fillCircle(W / 2, theirFortuneY, 36);
    theirStone.lineStyle(4, theirRevealed ? 0xe8e8f0 : 0xd0d7e2, 0.9);
    theirStone.strokeCircle(W / 2, theirFortuneY, 36);
    this.fortuneSprites.push(theirStone);

    const theirSelfScore = 5;
    const theirOppScore = 3;
    this._drawFortuneScoreText(
      W / 2,
      theirFortuneY,
      theirSelfScore,
      theirOppScore,
      null,
      null,
      isOppView,
    );

    if (!theirRevealed) {
      const hiddenText = this.add
        .text(W / 2, theirFortuneY, "?", {
          fontSize: "32px",
          color: "#f4f7ff",
          fontFamily: "sans-serif",
        })
        .setOrigin(0.5);
      this.fortuneSprites.push(hiddenText);
    }

    const theirLabel = this.add
      .text(W / 2 - 132, theirFortuneY, "相手の占い石", {
        fontSize: "20px",
        color: isOppView ? "#1f1b17" : "#f2f2f6",
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5);
    this.fortuneSprites.push(theirLabel);

    // 捨て場
    const discard = state.discard ?? [];
    const baseX = 120;
    const baseY = 188;

    const box = this.add.graphics();
    box.fillStyle(0x101018, 0.9);
    box.lineStyle(2, 0x6f7f99, 0.8);
    box.fillRoundedRect(baseX - 62, baseY - 86, 124, 176, 14);
    box.strokeRoundedRect(baseX - 62, baseY - 86, 124, 176, 14);
    this.fortuneSprites.push(box);

    const discardLabel = this.add
      .text(baseX, baseY - 64, "捨て場", {
        fontSize: "18px",
        color: "#c9d5eb",
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5);
    this.fortuneSprites.push(discardLabel);

    discard.slice(-6).forEach((stone, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = baseX - 20 + col * 40;
      const y = baseY - 32 + row * 34;
      const chip = this.add.graphics();
      chip.fillStyle(STONE_COLORS[stone.color]?.hex ?? 0xffffff, 1);
      chip.fillCircle(x, y, 13);
      chip.lineStyle(2, 0xffffff, 0.55);
      chip.strokeCircle(x, y, 13);
      this.fortuneSprites.push(chip);
    });

    // Keep fortune HUD behind final reveal overlays.
    this.fortuneSprites.forEach((sprite) => {
      if (sprite && typeof sprite.setDepth === "function") {
        sprite.setDepth(DEPTH_FORTUNE);
      }
    });
  }

  _drawFortuneScoreText(
    x,
    y,
    selfScore,
    oppScore,
    lowerShiftX = null,
    upperShiftX = null,
    invertColors = false,
  ) {
    const selfLabel = selfScore > 0 ? `+${selfScore}` : `${selfScore}`;
    const oppLabel = oppScore > 0 ? `+${oppScore}` : `${oppScore}`;

    const defaultOffset = x < 1080 / 2 ? -28 : x > 1080 / 2 ? 28 : 0;
    const lowerOffset = lowerShiftX ?? defaultOffset;
    const upperOffset = upperShiftX ?? -defaultOffset;
    const darkText = "#1f1b17";
    const lightText = "#f2f2f6";
    const baseLowerColor = invertColors ? lightText : darkText;
    const baseUpperColor = invertColors ? darkText : lightText;
    const lowerColor =
      selfScore === 5
        ? baseLowerColor === lightText
          ? darkText
          : lightText
        : baseLowerColor;
    const upperColor =
      oppScore === 5
        ? baseUpperColor === lightText
          ? darkText
          : lightText
        : baseUpperColor;

    const lower = this.add
      .text(x + lowerOffset, y + 66, selfLabel, {
        fontSize: "24px",
        color: lowerColor,
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5);
    this.fortuneSprites.push(lower);

    const upper = this.add
      .text(x + upperOffset, y - 66, oppLabel, {
        fontSize: "24px",
        color: upperColor,
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5)
      .setRotation(Math.PI);
    this.fortuneSprites.push(upper);
  }

  updateTurnDisplay(isPlayerTurn, keepTurnCount = false) {
    // 非持続バナーはターン切替時にクリア
    if (this.activeBanner && !this.activeBanner._persistKey) {
      this.clearCenterBanner();
    }

    const turnInfo = this.gameScene.getTurnDisplayInfo?.(isPlayerTurn) ?? {
      text: isPlayerTurn ? "あなたのターン" : "相手のターン",
      color: isPlayerTurn ? "#e0c97f" : "#ff9999",
    };
    this.turnText.setText(turnInfo.text);
    this.turnText.setColor(turnInfo.color);
    this.hidePlacementPrompt();

    this.tweens.killTweensOf(this.turnText);
    this.tweens.killTweensOf(this.turnGlow);
    this.turnText.setAlpha(0.45);
    this.turnText.setScale(0.92);
    this.turnText.setY(92);
    this.turnGlow.setVisible(true);
    this.turnGlow.setFillStyle(
      Phaser.Display.Color.HexStringToColor(turnInfo.color).color,
      0.2,
    );
    this.turnGlow.setAlpha(0.32);
    this.turnGlow.setScale(0.82, 0.7);

    this.tweens.add({
      targets: this.turnText,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      y: 118,
      duration: 260,
      ease: "Cubic.Out",
    });

    this.tweens.add({
      targets: this.turnGlow,
      alpha: 0,
      scaleX: 1.24,
      scaleY: 1,
      duration: 520,
      ease: "Sine.Out",
      onComplete: () => {
        this.turnGlow.setVisible(false);
      },
    });

    const state = this.gameScene.gameState.getState();
    if (!this.gameScene.gameState.isGameOver()) {
      this.onlineFinalIntroPlayed = false;
    }
    const animationSignature = `${state.turn}-${isPlayerTurn}`;
    const shouldAnimateTurnStart =
      this.lastTurnAnimationSignature !== animationSignature;
    this.lastTurnAnimationSignature = animationSignature;

    const isOnlineMode = this.gameScene._isOnlineRoomMode?.() ?? false;
    const canShowInitialTurnBanner =
      !isOnlineMode ||
      (this.gameScene.hasShownOnlineRoleBanner &&
        this.gameScene.hasShownOnlineInitialTurnBanner);

    this.gameScene.refreshTurnLaneGuidance?.(
      isPlayerTurn && this.gameScene.mode === "turn",
    );
    if (shouldAnimateTurnStart && canShowInitialTurnBanner) {
      this.gameScene._clearTurnStartSweep?.();
      if (this.gameScene.mode === "turn") {
        this.showCenterBanner(
          isPlayerTurn ? "あなたの番です" : "相手の番です",
          isPlayerTurn ? 0x8be0d4 : 0xf3b7b7,
          null,
        );
      }
    }

    this.turnNumText.setText(`Turn ${state.turn}`);
    if (!keepTurnCount) {
      state.turn++;
    }
  }

  showPlacementPrompt(_stone, count) {
    this.turnText.setText("配置フェーズ");
    this.turnText.setColor("#fff0c2");
    this.placementText.setText(`置く石と路を選択してください / 残り ${count}`);
    this.placementText.setVisible(true);
  }

  showSowingPrompt(_stone, count) {
    this.turnText.setText("撒きフェーズ");
    this.turnText.setColor("#fff0c2");
    this.placementText.setText(`置く石を選択してください / 残り ${count}`);
    this.placementText.setVisible(true);
  }

  showPoipoiStorePrompt() {
    this.turnText.setText("ぽいぽい");
    this.turnText.setColor("#ff9d4f");
    this.placementText.setText("賽壇を選択してください");
    this.placementText.setVisible(true);
  }

  showPoipoiStonePrompt() {
    this.turnText.setText("ぽいぽい");
    this.turnText.setColor("#ff9d4f");
    this.placementText.setText("選んだ賽壇の石を1つ選んで排除してください");
    this.placementText.setVisible(true);
  }

  syncOnlineFinalPhase(finalPhase, isPlayerTurn, _result) {
    if (!finalPhase) return;

    const stage = finalPhase.stage;
    const stageChanged = this.lastOnlineFinalStage !== stage;
    if (stageChanged) {
      this.lastOnlineFinalStage = stage;
      if (stage !== "score-ready") {
        this.onlineScoreAnimationStarted = false;
      }
      if (stage !== "reveal") {
        this.onlineRevealPlayed = false;
      }
    }

    if (stage === "predict-self" || stage === "predict-opp") {
      if (isPlayerTurn) {
        this._showOnlinePredictionInput();
      } else {
        this._showOnlineWaitingPanel("相手が予測中");
      }
      return;
    }

    if (stage === "ending-intro") {
      if (!this.onlineFinalIntroPlayed) {
        this.onlineFinalIntroPlayed = true;
        this._clearResultOverlay();
        this.showCenterBanner(
          "予測フェーズ",
          0xb09766,
          "互いの予測を公開します",
        );
      }
      this._showOnlineWaitingPanel("終局演出中...");
      return;
    }

    if (stage === "reveal") {
      if (!this.onlineRevealPlayed || !this.resultOverlay) {
        this.onlineRevealPlayed = true;
        this._showOnlinePredictionReveal(finalPhase);
      }
      return;
    }

    if (stage === "poipoi-store") {
      if (isPlayerTurn) {
        this.clearCenterBanner();
        this._clearResultOverlay();
        this.showPoipoiStorePrompt();
      } else {
        this.showCenterBanner(
          "相手がぽいぽい中",
          0x9fd6ff,
          "相手の完了までお待ちください",
          false,
          true,
        );
        this._showOnlineWaitingPanel("相手がぽいぽい中");
      }
      return;
    }

    if (stage === "poipoi-stone") {
      if (isPlayerTurn) {
        this.clearCenterBanner();
        this._clearResultOverlay();
        this.showPoipoiStonePrompt();
      } else {
        this.showCenterBanner(
          "相手がぽいぽい中",
          0x9fd6ff,
          "相手の完了までお待ちください",
          false,
          true,
        );
        this._showOnlineWaitingPanel("相手がぽいぽい中");
      }
      return;
    }

    if (stage === "score-intro") {
      this.clearCenterBanner();
      this._showOnlineWaitingPanel("予測フェーズ終了\n得点計算へ");
      return;
    }

    if (stage === "score-ready") {
      if (this.onlineScoreAnimationStarted) return;
      this.onlineScoreAnimationStarted = true;
      this._clearResultOverlay();
      this._revealCenterStoneSequentially(() => this._animateStoreScoring());
    }
  }

  _showOnlinePredictionInput() {
    this._clearResultOverlay();

    const W = 1080;
    const H = 1920;
    const container = this.add.container(0, 0);
    container.setDepth(DEPTH_MESSAGE);

    const panel = this.add.graphics();
    panel.fillStyle(0x06101c, 0.95);
    panel.lineStyle(2, 0x8899bb, 0.8);
    panel.fillRoundedRect(16, H - 400, W - 32, 388, 20);
    panel.strokeRoundedRect(16, H - 400, W - 32, 388, 20);
    container.add(panel);

    const title = this.add
      .text(W / 2, H - 350, "相手の占い石の色を予測", {
        fontSize: "40px",
        color: "#ffe0a8",
        fontFamily: "sans-serif",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    container.add(title);

    const colorOptions = [
      { key: "red", label: "赤", hex: 0xb94141 },
      { key: "blue", label: "青", hex: 0x3967ba },
      { key: "green", label: "緑", hex: 0x3a9c55 },
      { key: "yellow", label: "黄", hex: 0xb99b2b },
      { key: "purple", label: "紫", hex: 0x7a49a0 },
    ];

    const btnY = H - 230;
    const startX = W / 2 - 260;
    const gap = 130;

    colorOptions.forEach((option, index) => {
      const x = startX + index * gap;

      const circle = this.add.graphics();
      circle.fillStyle(option.hex, 1);
      circle.fillCircle(x, btnY, 46);
      circle.lineStyle(3, 0xffffff, 0.6);
      circle.strokeCircle(x, btnY, 46);
      container.add(circle);

      const lbl = this.add
        .text(x, btnY, option.label, {
          fontSize: "32px",
          color: "#ffffff",
          fontFamily: "sans-serif",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5);
      container.add(lbl);

      const zone = this.add.zone(x, btnY, 100, 100).setInteractive();
      zone.on("pointerdown", () => {
        this.gameScene.submitOnlineFinalPrediction?.(option.key);
      });
      container.add(zone);
    });

    this.resultOverlay = container;
  }

  _showOnlineWaitingPanel(message) {
    this._clearResultOverlay();

    const W = 1080;
    const H = 1920;
    const container = this.add.container(0, 0);
    container.setDepth(DEPTH_MESSAGE);
    const panel = this.add.graphics();
    panel.fillStyle(0x06101c, 0.9);
    panel.lineStyle(2, 0x8899bb, 0.8);
    panel.fillRoundedRect(140, H - 280, W - 280, 170, 20);
    panel.strokeRoundedRect(140, H - 280, W - 280, 170, 20);
    container.add(panel);

    const text = this.add
      .text(W / 2, H - 198, message, {
        fontSize: "42px",
        color: "#d9e6ff",
        fontFamily: "sans-serif",
        align: "center",
      })
      .setOrigin(0.5);
    container.add(text);

    this.resultOverlay = container;
  }

  _showOnlinePredictionReveal(finalPhase) {
    this._clearResultOverlay();

    const W = 1080;
    const H = 1920;
    const container = this.add.container(0, 0);
    container.setDepth(DEPTH_REVEAL);
    this.children.bringToTop(container);
    const panel = this.add.graphics();
    panel.fillStyle(0x06101c, 0.94);
    panel.lineStyle(2, 0x8899bb, 0.7);
    panel.fillRoundedRect(16, H - 390, W - 32, 372, 20);
    panel.strokeRoundedRect(16, H - 390, W - 32, 372, 20);
    container.add(panel);

    const title = this.add
      .text(W / 2, H - 360, "予測公開", {
        fontSize: "44px",
        color: "#ffe0a8",
        fontFamily: "sans-serif",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    container.add(title);

    const subtitle = this.add
      .text(W / 2, H - 316, "ボード上の占い石を公開", {
        fontSize: "24px",
        color: "#b8c7dd",
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5);
    container.add(subtitle);

    const selfActual =
      this.gameScene.gameState.getFortuneColorForPlayer("self");
    const oppActual = this.gameScene.gameState.getFortuneColorForPlayer("opp");
    const selfPred = finalPhase?.predictions?.self;
    const oppPred = finalPhase?.predictions?.opp;
    const selfHit = selfPred === oppActual;
    const oppHit = oppPred === selfActual;
    const isOppView = this.gameScene?.onlineSide === "opp";
    const whiteOffsetY = isOppView ? -56 : -8;
    const blackOffsetY = isOppView ? 56 : 8;
    let completedArrows = 0;
    let outcomeScheduled = false;

    const queueOutcomeBanner = () => {
      completedArrows += 1;
      if (completedArrows < 2 || outcomeScheduled) return;
      outcomeScheduled = true;

      this.time.delayedCall(1000, () => {
        const isOwnOpp = this.gameScene?.onlineSide === "opp";
        const ownHit = isOwnOpp ? oppHit : selfHit;
        this.showCenterBanner(
          ownHit ? "的中！" : "外れ…",
          ownHit ? 0xd7c9aa : 0x9aa8c2,
          ownHit ? "ぽいぽい×2" : null,
          true,
        );
      });
    };
    this.tweens.add({
      targets: [title, subtitle],
      alpha: { from: 0, to: 1 },
      y: "+=0",
      duration: 180,
      ease: "Sine.Out",
    });

    const whiteArrowConfig = {
      fromPit: 5,
      toPit: 11,
      isHit: selfHit,
      outerColor: 0xb48a45,
      innerColor: 0xf0efea,
      offsetX: -90,
      offsetY: whiteOffsetY,
      verticalDirection: isOppView ? 1 : -1,
    };

    const blackArrowConfig = {
      fromPit: 11,
      toPit: 5,
      isHit: oppHit,
      outerColor: 0xe9d7a5,
      innerColor: 0x232833,
      offsetX: 90,
      offsetY: blackOffsetY,
      verticalDirection: isOppView ? -1 : 1,
    };

    const firstArrow = isOppView ? blackArrowConfig : whiteArrowConfig;
    const secondArrow = isOppView ? whiteArrowConfig : blackArrowConfig;

    this.time.delayedCall(240, () => {
      this.gameScene.revealPersonalFortunesSticky?.();
      this.refreshFortuneAndDiscard();
      this.children.bringToTop(container);
      this._playPredictionArrowEffect(container, {
        ...firstArrow,
        onComplete: () => {
          queueOutcomeBanner();
          this.children.bringToTop(container);
        },
      });
    });

    this.time.delayedCall(960, () => {
      this.children.bringToTop(container);
      this._playPredictionArrowEffect(container, {
        ...secondArrow,
        onComplete: () => {
          queueOutcomeBanner();
          this.children.bringToTop(container);
        },
      });
    });

    this.resultOverlay = container;
  }

  _showPoipoiOutcomeText(container, config = {}) {
    const x = Number(config?.x ?? 540);
    const y = Number(config?.y ?? 960);
    const isHit = !!config?.isHit;
    const tint = Number(config?.tint ?? 0xffffff);

    const text = this.add
      .text(x, y, isHit ? "ぽいぽい×2！" : "ぽいぽい無し…", {
        fontSize: "40px",
        color: isHit ? "#ffe388" : "#c9d2e8",
        fontFamily: "sans-serif",
        stroke: "#000000",
        strokeThickness: 7,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0.82);
    container.add(text);
    container.bringToTop(text);

    this.tweens.add({
      targets: text,
      alpha: 1,
      scale: 1,
      duration: 220,
      ease: "Back.Out",
    });

    const glow = this.add.graphics();
    glow.fillStyle(tint, 0.2);
    glow.fillRoundedRect(x - 138, y - 34, 276, 68, 20);
    glow.setAlpha(0);
    container.add(glow);
    container.sendToBack(glow);

    this.tweens.add({
      targets: glow,
      alpha: { from: 0.05, to: 0.35 },
      duration: 180,
      yoyo: true,
      repeat: 1,
      ease: "Sine.InOut",
    });
  }

  _getFirstPeekCenterStone(role) {
    const center = this.gameScene.gameState.getState()?.fortune?.center || [];
    const orderKey = role === "self" ? "selfPeekOrder" : "oppPeekOrder";
    const ordered = center.find((stone) => Number(stone?.[orderKey]) === 1);
    if (ordered) return ordered;

    // Fallback for synchronized states where peek order is missing.
    const scanOrder = role === "self" ? [0, 1, 2] : [2, 1, 0];
    const fallbackIndex = scanOrder.find((idx) =>
      center[idx]?.seenBy?.includes?.(role),
    );
    if (fallbackIndex == null) return null;
    return center[fallbackIndex] || null;
  }

  _drawFirstPeekBadge(
    container,
    x,
    y,
    label,
    centerStone,
    frameColor,
    options = {},
  ) {
    const isHidden = !!options.hidden;
    const hiddenChipColor = 0x2f3542;
    const revealedChipColor = centerStone
      ? (STONE_COLORS[centerStone.color]?.hex ?? 0xffffff)
      : hiddenChipColor;

    const frame = this.add.graphics();
    frame.fillStyle(0x0f1726, 0.9);
    frame.lineStyle(4, frameColor, 0.95);
    frame.fillCircle(x, y, 58);
    frame.strokeCircle(x, y, 58);
    container.add(frame);

    const chip = this.add.graphics();
    chip.fillStyle(isHidden ? hiddenChipColor : revealedChipColor, 0.96);
    chip.fillCircle(x, y, 44);
    container.add(chip);

    const mark = this.add
      .text(
        x,
        y,
        !isHidden && centerStone ? this._colorLabel(centerStone.color) : "?",
        {
          fontSize: "26px",
          color: "#ffffff",
          fontFamily: "sans-serif",
          stroke: "#000000",
          strokeThickness: 4,
        },
      )
      .setOrigin(0.5);
    container.add(mark);

    const labelText = this.add
      .text(x, y + 78, label, {
        fontSize: "22px",
        color: "#d6e2f5",
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5);
    container.add(labelText);

    frame.setAlpha(0);
    chip.setAlpha(0);
    mark.setAlpha(0);
    labelText.setAlpha(0);

    this.tweens.add({
      targets: [frame, chip, mark, labelText],
      alpha: 1,
      duration: 260,
      ease: "Sine.Out",
    });

    const reveal = () => {
      if (!centerStone) return;
      chip.clear();
      chip.fillStyle(revealedChipColor, 0.96);
      chip.fillCircle(x, y, 44);
      mark.setText(this._colorLabel(centerStone.color));
      this.tweens.add({
        targets: [chip, mark],
        scale: { from: 0.85, to: 1 },
        duration: 180,
        ease: "Back.Out",
      });
    };

    return {
      reveal,
    };
  }

  _playPredictionArrowEffect(container, config) {
    const fromPit = Number(config?.fromPit);
    const toPit = Number(config?.toPit);
    const isHit = !!config?.isHit;
    const outerColor = config?.outerColor ?? 0xb48a45;
    const innerColor = config?.innerColor ?? 0xf0efea;
    const extraOffsetX = Number(config?.offsetX || 0);
    const extraOffsetY = Number(config?.offsetY || 0);
    const verticalDirection = Number(config?.verticalDirection) < 0 ? -1 : 1;
    const onComplete =
      typeof config?.onComplete === "function" ? config.onComplete : null;

    const from = this.gameScene._getViewPos?.(fromPit) || { x: 930, y: 960 };
    const to = this.gameScene._getViewPos?.(toPit) || { x: 150, y: 960 };

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (length < 1) return;

    const ux = dx / length;
    const uy = dy / length;
    const nx = -uy;
    const ny = ux;
    const offset = 32;
    const startX = from.x + nx * offset;
    const startY = from.y + ny * offset;
    const endX = to.x + nx * offset;
    const endY = to.y + ny * offset;

    const verdictX = startX + (endX - startX) * 0.5 + nx * 24 + extraOffsetX;
    const verdictY = startY + (endY - startY) * 0.5 + ny * 24 + extraOffsetY;

    const verdict = this.add
      .text(verdictX, verdictY, isHit ? "的中" : "失敗", {
        fontSize: "52px",
        color: isHit ? "#ffe066" : "#ff8f8f",
        fontFamily: "sans-serif",
        stroke: "#000000",
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0.7);
    verdict.setDepth(120);
    container.add(verdict);

    this.tweens.add({
      targets: verdict,
      alpha: 1,
      scale: 1,
      duration: 320,
      delay: 140,
      ease: "Back.Out",
    });

    const gfx = this.add.graphics();
    gfx.setDepth(100);
    container.add(gfx);
    container.bringToTop(verdict);

    const drawArrow = (progress) => {
      const t = Phaser.Math.Clamp(progress, 0, 1);
      const arrowLen = Phaser.Math.Clamp(length * 0.4, 190, 320);
      const arrowX = verdictX;
      const ownSideBias = Phaser.Math.Clamp(arrowLen * 0.35, 56, 120);
      const tailY = verdictY - verticalDirection * (arrowLen / 2 + ownSideBias);
      const headY = tailY + verticalDirection * arrowLen;
      const cy = tailY + (headY - tailY) * t;
      const hx = 42;
      const hw = 28;
      const by = headY - verticalDirection * hx;
      const bodyEndY =
        verticalDirection > 0 ? Math.min(cy, by) : Math.max(cy, by);

      gfx.clear();
      gfx.lineStyle(28, outerColor, 0.95);
      gfx.lineBetween(arrowX, tailY, arrowX, bodyEndY);
      gfx.lineStyle(16, innerColor, 0.98);
      gfx.lineBetween(arrowX, tailY, arrowX, bodyEndY);

      if (t > 0.88) {
        gfx.fillStyle(outerColor, 0.95);
        gfx.fillTriangle(arrowX, headY, arrowX + hw, by, arrowX - hw, by);

        gfx.fillStyle(innerColor, 0.98);
        gfx.fillTriangle(
          arrowX,
          headY - verticalDirection * 2,
          arrowX + (hw - 6),
          by + verticalDirection * 4,
          arrowX - (hw - 6),
          by + verticalDirection * 4,
        );
      }
    };

    drawArrow(0);
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: isHit ? 480 : 360,
      ease: "Cubic.Out",
      onUpdate: (tw) => drawArrow(tw.getValue()),
      onComplete: () => {
        if (onComplete) onComplete();
      },
    });

    if (!isHit) {
      this.tweens.add({
        targets: gfx,
        alpha: 0.45,
        duration: 220,
        yoyo: true,
        repeat: 1,
        ease: "Sine.InOut",
      });
    }
  }

  showSpecialChoice() {
    this.hideSpecialChoice();

    const W = 1080;
    const H = 1920;
    const container = this.add.container(0, 0);
    container.setDepth(DEPTH_MESSAGE);
    this.children.bringToTop(container);

    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.5);
    container.add(dim);

    const panel = this.add.graphics();
    panel.fillStyle(0x112034, 0.95);
    panel.lineStyle(3, 0xf5d8a6, 0.8);
    panel.fillRoundedRect(W / 2 - 340, H / 2 - 180, 680, 360, 24);
    panel.strokeRoundedRect(W / 2 - 340, H / 2 - 180, 680, 360, 24);
    container.add(panel);

    const title = this.add
      .text(W / 2, H / 2 - 120, "技を選択", {
        fontSize: "52px",
        color: "#ffe4b9",
        fontFamily: "sans-serif",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    container.add(title);

    const chirachiraButton = this.add
      .text(W / 2 - 160, H / 2 + 20, "ちらちら", {
        fontSize: "42px",
        color: "#f9fbff",
        backgroundColor: "#355178",
        padding: { x: 20, y: 12 },
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5)
      .setInteractive();
    chirachiraButton.on("pointerdown", () => {
      this.gameScene.chooseSpecialAction("chirachira");
    });
    container.add(chirachiraButton);

    const poipoiButton = this.add
      .text(W / 2 + 160, H / 2 + 20, "ぽいぽい", {
        fontSize: "42px",
        color: "#f9fbff",
        backgroundColor: "#6b3f55",
        padding: { x: 20, y: 12 },
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5)
      .setInteractive();
    poipoiButton.on("pointerdown", () => {
      this.gameScene.chooseSpecialAction("poipoi");
    });
    container.add(poipoiButton);

    this.specialOverlay = container;
  }

  hideSpecialChoice() {
    if (!this.specialOverlay) return;
    this.specialOverlay.destroy(true);
    this.specialOverlay = null;
  }

  showKutakutaChoice() {
    this.hideKutakutaChoice();

    const W = 1080;
    const H = 1920;
    const container = this.add.container(0, 0);
    container.setDepth(DEPTH_MESSAGE);
    this.children.bringToTop(container);

    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.5);
    container.add(dim);

    const panel = this.add.graphics();
    panel.fillStyle(0x1f2b2f, 0.95);
    panel.lineStyle(3, 0xd6d8c8, 0.9);
    panel.fillRoundedRect(W / 2 - 360, H / 2 - 180, 720, 360, 24);
    panel.strokeRoundedRect(W / 2 - 360, H / 2 - 180, 720, 360, 24);
    container.add(panel);

    const title = this.add
      .text(W / 2, H / 2 - 112, "くたくたを使いますか？", {
        fontSize: "52px",
        color: "#f0f2df",
        fontFamily: "sans-serif",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    container.add(title);

    const kutakutaBtn = this.add
      .text(W / 2 - 170, H / 2 + 26, "くたくた", {
        fontSize: "42px",
        color: "#ffffff",
        backgroundColor: "#7a4f2a",
        padding: { x: 20, y: 12 },
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5)
      .setInteractive();
    kutakutaBtn.on("pointerdown", () => {
      this.gameScene.chooseKutakutaAction("kutakuta");
    });
    container.add(kutakutaBtn);

    const continueBtn = this.add
      .text(W / 2 + 170, H / 2 + 26, "まだまだ", {
        fontSize: "42px",
        color: "#ffffff",
        backgroundColor: "#2f5e9b",
        padding: { x: 20, y: 12 },
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5)
      .setInteractive();
    continueBtn.on("pointerdown", () => {
      this.gameScene.chooseKutakutaAction("madamada");
    });
    container.add(continueBtn);

    this.specialOverlay = container;
  }

  hideKutakutaChoice() {
    this.hideSpecialChoice();
  }

  clearCenterBanner() {
    if (!this.activeBanner) return;
    this.activeBanner.destroy();
    this.activeBanner = null;
  }

  showCenterBanner(
    message,
    accent = 0xf0c36a,
    description = null,
    fastMode = false,
    persist = false,
  ) {
    const persistKey = `${message}|${description || ""}|${accent}`;
    if (
      persist &&
      this.activeBanner &&
      this.activeBanner.active &&
      this.activeBanner._persistKey === persistKey
    ) {
      return;
    }

    if (this.activeBanner) {
      this.activeBanner.destroy();
      this.activeBanner = null;
    }

    const W = 1080;
    const H = 1920;
    const container = this.add.container(0, 0);

    const plaqueHeight = description ? 208 : 168;
    const plaque = this.add.graphics();
    plaque.fillStyle(0x140f11, 0.88);
    plaque.lineStyle(4, accent, 0.92);
    plaque.fillRoundedRect(
      W / 2 - 320,
      H / 2 - plaqueHeight / 2,
      640,
      plaqueHeight,
      26,
    );
    plaque.strokeRoundedRect(
      W / 2 - 320,
      H / 2 - plaqueHeight / 2,
      640,
      plaqueHeight,
      26,
    );
    container.add(plaque);

    const banner = this.add
      .text(W / 2, H / 2 - (description ? 24 : 0), message, {
        fontSize: "84px",
        color: "#fff6da",
        fontFamily: DISPLAY_FONT,
        stroke: "#2a1a00",
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setScale(0.84)
      .setAlpha(0);
    container.add(banner);

    if (description) {
      const desc = this.add
        .text(W / 2, H / 2 + 44, description, {
          fontSize: "28px",
          color: "#d4c5a0",
          fontFamily: UI_FONT,
          stroke: "#2a1a00",
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setAlpha(0);
      container.add(desc);
      this.tweens.add({
        targets: desc,
        alpha: 1,
        duration: fastMode ? 120 : 180,
        ease: "Sine.Out",
      });

      if (persist) {
        desc.setAlpha(1);
      }
    }

    this.activeBanner = container;
    container._persistKey = persist ? persistKey : null;
    container.setDepth(DEPTH_BANNER_TOP);
    this.children.bringToTop(container);

    if (persist) {
      banner.setAlpha(1);
      banner.setScale(1);
      plaque.setAlpha(1);
      return;
    }

    this.tweens.add({
      targets: [banner, plaque],
      alpha: 1,
      duration: fastMode ? 120 : 180,
      ease: "Sine.Out",
    });

    this.tweens.add({
      targets: banner,
      scale: 1.03,
      duration: fastMode ? 160 : 260,
      yoyo: true,
      ease: "Back.Out",
    });

    const holdDuration = (fastMode ? 180 : 320) + 500;
    const fadeDuration = fastMode ? 500 : 920;

    this.tweens.add({
      targets: container,
      y: -16,
      duration: holdDuration,
      yoyo: true,
      ease: "Sine.Out",
      onComplete: () => {
        this.tweens.add({
          targets: container,
          alpha: 0,
          duration: fadeDuration,
          ease: "Sine.In",
          onComplete: () => {
            if (this.activeBanner === container) {
              this.activeBanner = null;
            }
            container.destroy();
          },
        });
      },
    });
  }

  hidePlacementPrompt() {
    this.hideSpecialChoice();
    this.placementText.setVisible(false);
  }

  showResult(options = {}) {
    this.clearCenterBanner();
    this.gameScene.enterFinalPhase();
    this._startFinalPredictionPhase(options);
  }

  _startFinalPredictionPhase(options = {}) {
    this._clearResultOverlay();
    this.predictionPreset = null;

    const starterRole =
      options?.predictionStarterRole === "opp" ? "opp" : "self";
    const localRole = this.gameScene._isOnlineRoomMode?.()
      ? this.gameScene.onlineSide
      : "self";

    if (starterRole !== localRole) {
      const starterPrediction = this._randomColorKey();
      this.predictionPreset =
        starterRole === "self"
          ? { selfPrediction: starterPrediction }
          : { oppPrediction: starterPrediction };
    }

    const W = 1080;
    const H = 1920;
    const container = this.add.container(0, 0);

    // Bottom panel — board stays fully visible above
    const panelH = 400;
    const panel = this.add.graphics();
    panel.fillStyle(0x06101c, 0.95);
    panel.lineStyle(2, 0x8899bb, 0.8);
    panel.fillRoundedRect(16, H - panelH, W - 32, panelH - 12, 20);
    panel.strokeRoundedRect(16, H - panelH, W - 32, panelH - 12, 20);
    container.add(panel);

    const title = this.add
      .text(
        W / 2,
        H - panelH + 36,
        starterRole === "self" && localRole === "opp"
          ? "白の予測を先に処理。次はあなたの予測です"
          : "相手が最初に見た色を予測してください",
        {
          fontSize: "36px",
          color: "#ffe0a8",
          fontFamily: "sans-serif",
          stroke: "#000000",
          strokeThickness: 5,
        },
      )
      .setOrigin(0.5);
    container.add(title);

    const colorOptions = [
      { key: "red", label: "赤", hex: 0xb94141 },
      { key: "blue", label: "青", hex: 0x3967ba },
      { key: "green", label: "緑", hex: 0x3a9c55 },
      { key: "yellow", label: "黄", hex: 0xb99b2b },
      { key: "purple", label: "紫", hex: 0x7a49a0 },
    ];

    const btnY = H - panelH + 170;
    const startX = W / 2 - 260;
    const gap = 130;

    colorOptions.forEach((option, index) => {
      const x = startX + index * gap;

      const circle = this.add.graphics();
      circle.fillStyle(option.hex, 1);
      circle.fillCircle(x, btnY, 46);
      circle.lineStyle(3, 0xffffff, 0.6);
      circle.strokeCircle(x, btnY, 46);
      container.add(circle);

      const lbl = this.add
        .text(x, btnY, option.label, {
          fontSize: "32px",
          color: "#ffffff",
          fontFamily: "sans-serif",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5);
      container.add(lbl);

      // Sub-label below circle
      const sub = this.add
        .text(x, btnY + 62, option.label, {
          fontSize: "22px",
          color: "#ccddee",
          fontFamily: "sans-serif",
        })
        .setOrigin(0.5);
      container.add(sub);

      const zone = this.add.zone(x, btnY, 100, 100).setInteractive();
      zone.on("pointerdown", () => this._resolvePredictionPhase(option.key));
      container.add(zone);
    });

    const hint = this.add
      .text(W / 2, H - 50, "ボードを見て、相手の占い石の色を予測！", {
        fontSize: "24px",
        color: "#7799bb",
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5);
    container.add(hint);

    this.resultOverlay = container;
  }

  _resolvePredictionPhase(localPrediction) {
    const allColors = ["red", "blue", "green", "yellow", "purple"];
    const localRole = this.gameScene._isOnlineRoomMode?.()
      ? this.gameScene.onlineSide
      : "self";

    let selfPrediction = this.predictionPreset?.selfPrediction ?? null;
    let oppPrediction = this.predictionPreset?.oppPrediction ?? null;

    if (localRole === "self") {
      selfPrediction = localPrediction;
    } else {
      oppPrediction = localPrediction;
    }

    if (!selfPrediction) {
      selfPrediction = allColors[Math.floor(Math.random() * allColors.length)];
    }
    if (!oppPrediction) {
      // 強いAI: ゲーム中に機累した推測色を使う
      const gs = this.gameScene;
      if (
        gs.matchMode === "solo" &&
        gs.aiDifficulty === "hard" &&
        gs._aiMemo?.inferredPlayerColor
      ) {
        oppPrediction = gs._aiMemo.inferredPlayerColor;
      } else {
        oppPrediction = allColors[Math.floor(Math.random() * allColors.length)];
      }
    }

    const selfActual =
      this.gameScene.gameState.getFortuneColorForPlayer("self");
    const oppActual = this.gameScene.gameState.getFortuneColorForPlayer("opp");

    this.finalPhaseState = {
      selfPrediction,
      oppPrediction,
      selfActual,
      oppActual,
      selfPoipoiRemaining: selfPrediction === oppActual ? 2 : 0,
      oppPoipoiRemaining: oppPrediction === selfActual ? 2 : 0,
    };

    this._showPredictionRevealStep();
  }

  _showPredictionRevealStep() {
    this._clearResultOverlay();

    // 個人占い石をボード上で公開
    this.gameScene.gameState.revealPersonalFortunes();
    this.gameScene._renderStones();

    const st = this.finalPhaseState;
    const selfHit = st.selfPrediction === st.oppActual;
    const oppHit = st.oppPrediction === st.selfActual;

    const container = this.add.container(0, 0);
    container.setDepth(DEPTH_REVEAL);
    this.children.bringToTop(container);
    this.resultOverlay = container;

    let completedArrows = 0;
    const onBothArrowsDone = () => {
      completedArrows++;
      if (completedArrows < 2) return;
      this.time.delayedCall(500, () => {
        this.showCenterBanner(
          selfHit ? "的中！" : "外れ…",
          selfHit ? 0xd7c9aa : 0x9aa8c2,
          selfHit ? "ぽいぽい×2" : null,
          true,
        );
        this.time.delayedCall(1800, () => {
          this.clearCenterBanner();
          this._clearResultOverlay();
          this._runOppPoipoiThenSelf();
        });
      });
    };

    this.time.delayedCall(240, () => {
      this._playPredictionArrowEffect(container, {
        fromPit: 5,
        toPit: 11,
        isHit: selfHit,
        outerColor: 0xb48a45,
        innerColor: 0xf0efea,
        offsetX: -90,
        offsetY: -8,
        verticalDirection: -1,
        onComplete: onBothArrowsDone,
      });
    });
    this.time.delayedCall(960, () => {
      this._playPredictionArrowEffect(container, {
        fromPit: 11,
        toPit: 5,
        isHit: oppHit,
        outerColor: 0xe9d7a5,
        innerColor: 0x232833,
        offsetX: 90,
        offsetY: 8,
        verticalDirection: 1,
        onComplete: onBothArrowsDone,
      });
    });
  }

  _runOppPoipoiThenSelf() {
    const st = this.finalPhaseState;
    const gs = this.gameScene;
    const isHardAI = gs.matchMode === "solo" && gs.aiDifficulty === "hard";

    while (st.oppPoipoiRemaining > 0) {
      if (isHardAI) {
        this._oppPoipoiSmartRemove(st);
      } else {
        const targetStore = this._chooseStoreForOppPoipoi();
        if (targetStore == null) break;
        gs.gameState.removeRandomStoneFromStore(targetStore);
      }
      st.oppPoipoiRemaining--;
    }

    this.gameScene._renderStones();

    if (st.selfPoipoiRemaining > 0) {
      this._startSelfFinalPoipoiOnBoard();
      return;
    }

    this._revealCenterAndProceedToCalc();
  }

  _startSelfFinalPoipoiOnBoard() {
    this._clearResultOverlay();
    this.showPoipoiStorePrompt();
    this.gameScene.soloFinalPoipoiActive = true;
    this.gameScene.poipoiStoreIndex = null;
    this.gameScene.mode = "poipoi-store";
    this.gameScene._renderStones();
  }

  _onSoloFinalPoipoiStone() {
    const st = this.finalPhaseState;
    st.selfPoipoiRemaining--;
    this.gameScene._renderStones();

    if (st.selfPoipoiRemaining > 0) {
      this._startSelfFinalPoipoiOnBoard();
      return;
    }

    this._revealCenterAndProceedToCalc();
  }

  _revealCenterAndProceedToCalc() {
    this._clearResultOverlay();
    this.clearCenterBanner();
    this._revealCenterStoneSequentially(() => this._animateStoreScoring());
  }

  _revealCenterStoneSequentially(callback) {
    const center = this.gameScene.gameState.getState().fortune.center;
    const isOppView =
      this.gameScene._isOnlineRoomMode?.() &&
      this.gameScene.onlineSide === "opp";
    // まず全部隐す
    center.forEach((stone) => {
      stone.seenBy = [];
    });
    this.refreshFortuneAndDiscard();
    // 左から順に 1 秒おきに公開
    const viewOrder = isOppView ? [2, 1, 0] : [0, 1, 2];
    viewOrder.forEach((dataIndex, step) => {
      this.time.delayedCall(step * 1000 + 600, () => {
        center[dataIndex].seenBy = ["self", "opp"];
        this.refreshFortuneAndDiscard();
      });
    });
    if (callback) {
      this.time.delayedCall(viewOrder.length * 1000 + 800, callback);
    }
  }

  /**
   * 強いAIのファイナルぽいぽい:
   * 推測したプレイヤーの占い色 → AI自身の占い色 → 価値の高い石の順にプレイヤー賟壇から削除
   */
  _oppPoipoiSmartRemove(st) {
    const gs = this.gameScene;
    const pits = gs.gameState.getState().pits;
    const inferred = gs._aiMemo?.inferredPlayerColor;
    const ownFortune = gs.gameState.getFortuneColorForPlayer("opp");

    // プレイヤーの賟壇(pit5)を優先、なければAI賟壇(pit11)
    const stores = [5, 11].filter((i) => pits[i].stones.length > 0);
    if (stores.length === 0) return;

    // 各賟壇の石にスコアを付けて最大を削除
    let bestPit = null;
    let bestStoneIdx = -1;
    let bestScore = -Infinity;

    for (const pitIdx of stores) {
      pits[pitIdx].stones.forEach((stone, idx) => {
        let score = 0;
        // プレイヤー賟壇の石を削除する方が強い
        if (pitIdx === 5) score += 10;
        // 推測たプレイヤーの占い色(プレイヤーに3ptの源泉)
        if (inferred && stone.color === inferred) score += 15;
        // AI自身の占い色が相手賟壇にあれば相手に5pt、最優先
        if (ownFortune && stone.color === ownFortune && pitIdx === 5)
          score += 20;
        if (score > bestScore) {
          bestScore = score;
          bestPit = pitIdx;
          bestStoneIdx = idx;
        }
      });
    }

    if (bestPit !== null) {
      gs.gameState.removeStoneFromPit(bestPit, bestStoneIdx);
    }
  }

  _chooseStoreForOppPoipoi() {
    const selfCount = this.gameScene.gameState.getState().pits[5].stones.length;
    const oppCount = this.gameScene.gameState.getState().pits[11].stones.length;
    const candidates = [];
    if (selfCount > 0) candidates.push(5);
    if (oppCount > 0) candidates.push(11);
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];
    return Math.random() < 0.5 ? candidates[0] : candidates[1];
  }

  updateOppHandDisplay(stones) {
    this._drawOppHandBox(stones || []);
  }

  clearOppHandDisplay() {
    this._drawOppHandBox([]);
  }

  _drawOppHandBox(stones) {
    if (!this.oppHandBg) return;
    this.oppHandStonesGfx.forEach((g) => g.destroy());
    this.oppHandStonesGfx = [];
    this.oppHandBg.clear();

    const W = 1080;
    const BOX_LEFT = W - 215;
    const BOX_W = 190;
    const LABEL_H = 26;
    const BOX_TOP = 50 + LABEL_H + 4;
    const STONE_R = 16;
    const SPACING = 44;
    const COLS = 4;
    const PAD_X = (BOX_W - COLS * SPACING) / 2;
    const PAD_Y = 10;
    const MIN_ROWS = 1;
    const rows = Math.max(MIN_ROWS, Math.ceil(stones.length / COLS));
    const BOX_H = PAD_Y + rows * SPACING + PAD_Y / 2;

    this.oppHandBg.fillStyle(0x101018, 0.8);
    this.oppHandBg.lineStyle(1, 0x6f7f99, 0.7);
    this.oppHandBg.fillRoundedRect(BOX_LEFT, BOX_TOP, BOX_W, BOX_H, 8);
    this.oppHandBg.strokeRoundedRect(BOX_LEFT, BOX_TOP, BOX_W, BOX_H, 8);

    stones.forEach((stone, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cx = BOX_LEFT + PAD_X + STONE_R + col * SPACING;
      const cy = BOX_TOP + PAD_Y + STONE_R + row * SPACING;

      const hex = STONE_COLORS[stone.color]?.hex ?? 0xffffff;
      const g = this.add.graphics();
      g.setDepth(DEPTH_MESSAGE);
      g.fillStyle(hex, 0.92);
      g.fillCircle(cx, cy, STONE_R);
      g.lineStyle(2, 0xffffff, 0.45);
      g.strokeCircle(cx, cy, STONE_R);
      this.oppHandStonesGfx.push(g);
    });
  }

  _colorLabel(color) {
    const map = {
      red: "赤",
      blue: "青",
      green: "緑",
      yellow: "黄",
      purple: "紫",
    };
    if (!color) return "?";
    return map[color] ?? color;
  }

  _showFinalScoreResult(selfScore, oppScore) {
    this._cachedSelfScore = selfScore;
    this._cachedOppScore = oppScore;
    this._showStaticFinalResult(selfScore, oppScore);
  }

  _showStaticFinalResult(selfScore, oppScore) {
    this._clearResultOverlay();
    this.clearCenterBanner();

    const W = 1080;
    const H = 1920;
    const isOppView =
      this.gameScene?._isOnlineRoomMode?.() &&
      this.gameScene?.onlineSide === "opp";
    const ownScore = isOppView ? oppScore : selfScore;
    const rivalScore = isOppView ? selfScore : oppScore;
    const winner =
      ownScore > rivalScore
        ? "あなたの勝ち！"
        : ownScore < rivalScore
          ? "あなたの負け…"
          : "引き分け";

    const container = this.add.container(0, 0);
    container.setDepth(DEPTH_MESSAGE);
    this.children.bringToTop(container);

    const panel = this.add.graphics();
    panel.fillStyle(0x080d18, 0.92);
    panel.lineStyle(3, 0xf5d8a6, 0.8);
    panel.fillRoundedRect(W / 2 - 400, H / 2 - 280, 800, 660, 28);
    panel.strokeRoundedRect(W / 2 - 400, H / 2 - 280, 800, 660, 28);
    container.add(panel);

    const title = this.add
      .text(W / 2, H / 2 - 232, "最終結果", {
        fontSize: "54px",
        color: "#ffe0a8",
        fontFamily: "sans-serif",
        stroke: "#000000",
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    container.add(title);

    // Score appears with a "ドン" scale-in animation
    const scoreLine = this.add
      .text(W / 2, H / 2 - 88, `${ownScore}  vs  ${rivalScore}`, {
        fontSize: "90px",
        color: "#ffffff",
        fontFamily: "monospace",
        stroke: "#000000",
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setScale(0.1)
      .setAlpha(0);
    container.add(scoreLine);

    this.tweens.add({
      targets: scoreLine,
      scale: 1,
      alpha: 1,
      duration: 420,
      ease: "Back.Out",
    });

    const winnerText = this.add
      .text(W / 2, H / 2 + 30, winner, {
        fontSize: "54px",
        color: "#e0c97f",
        fontFamily: "sans-serif",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    container.add(winnerText);

    this.tweens.add({
      targets: winnerText,
      alpha: 1,
      delay: 350,
      duration: 380,
      ease: "Sine.Out",
    });

    const replayBtn = this.add
      .text(W / 2 - 170, H / 2 + 180, "もう一度", {
        fontSize: "44px",
        color: "#ffffff",
        backgroundColor: "#334499",
        padding: { x: 22, y: 14 },
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5)
      .setInteractive();
    replayBtn.on("pointerdown", () => {
      if (this.gameScene?._isOnlineRoomMode?.()) {
        this.gameScene.requestOnlineRematch?.();
        return;
      }

      if (this.scoreLabelObjects) {
        this.scoreLabelObjects.forEach((l) => {
          if (l?.active) l.destroy();
        });
        this.scoreLabelObjects = [];
      }
      this._clearResultOverlay();
      this.scene.stop("UIScene");
      this.scene.stop("GameScene");
      this.scene.start("GameScene");
    });
    container.add(replayBtn);

    const viewBoardBtn = this.add
      .text(W / 2 + 170, H / 2 + 180, "ボードを見る", {
        fontSize: "38px",
        color: "#ffffff",
        backgroundColor: "#4a6040",
        padding: { x: 18, y: 14 },
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5)
      .setInteractive();
    viewBoardBtn.on("pointerdown", () =>
      this._showBoardView(selfScore, oppScore),
    );
    container.add(viewBoardBtn);

    const homeBtn = this.add
      .text(W / 2, H / 2 + 310, "ホームに戻る", {
        fontSize: "36px",
        color: "#ffffff",
        backgroundColor: "#443322",
        padding: { x: 22, y: 12 },
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5)
      .setInteractive();
    homeBtn.on("pointerdown", () => {
      this._clearResultOverlay();
      this.scene.stop("UIScene");
      this.scene.stop("GameScene");
      this.scene.start("LobbyScene");
    });
    container.add(homeBtn);

    this.resultOverlay = container;
  }

  _showBoardView(selfScore, oppScore) {
    this._clearResultOverlay();
    this.clearCenterBanner();

    const W = 1080;
    const H = 1920;
    const container = this.add.container(0, 0);
    container.setDepth(DEPTH_MESSAGE);
    this.children.bringToTop(container);

    const backBtn = this.add
      .text(W / 2, H - 80, "結果に戻る", {
        fontSize: "42px",
        color: "#ffffff",
        backgroundColor: "#334499",
        padding: { x: 26, y: 14 },
        fontFamily: "sans-serif",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setInteractive();
    backBtn.on("pointerdown", () =>
      this._showStaticFinalResult(selfScore, oppScore),
    );
    container.add(backBtn);

    this.resultOverlay = container;
  }

  _animateStoreScoring() {
    this.scoreLabelObjects = [];

    const gs = this.gameScene.gameState;
    const selfStones = gs.calcStoneScores("self");
    const oppStones = gs.calcStoneScores("opp");
    const selfTotal = selfStones.reduce((acc, s) => acc + s.pts, 0);
    const oppTotal = oppStones.reduce((acc, s) => acc + s.pts, 0);

    const W = 1080;
    const H = 1920;

    const fallbackPit5 = { x: 930, y: 960 };
    const fallbackPit11 = { x: 150, y: 960 };
    const pit5Zone = this.gameScene?.pitZones?.[5];
    const pit11Zone = this.gameScene?.pitZones?.[11];
    const PIT5 = pit5Zone ? { x: pit5Zone.x, y: pit5Zone.y } : fallbackPit5;
    const PIT11 = pit11Zone
      ? { x: pit11Zone.x, y: pit11Zone.y }
      : fallbackPit11;
    const selfLayout = this.gameScene._getStoneLayout(5, selfStones.length);
    const oppLayout = this.gameScene._getStoneLayout(11, oppStones.length);
    let delay = 0;

    // 合計スコアカウンター表示パネル
    const panel = this.add.graphics();
    panel.fillStyle(0x080d18, 0.88);
    panel.lineStyle(2, 0x8899bb, 0.7);
    panel.fillRoundedRect(W / 2 - 260, H / 2 - 56, 520, 112, 18);
    panel.strokeRoundedRect(W / 2 - 260, H / 2 - 56, 520, 112, 18);
    panel.setDepth(DEPTH_MESSAGE);
    this.scoreLabelObjects.push(panel);

    const selfCounterText = this.add
      .text(W / 2 - 100, H / 2, "あなた: 0点", {
        fontSize: "34px",
        color: "#f0e68c",
        fontFamily: "sans-serif",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH_MESSAGE);
    this.scoreLabelObjects.push(selfCounterText);

    const oppCounterText = this.add
      .text(W / 2 + 100, H / 2, "相手: 0点", {
        fontSize: "34px",
        color: "#ffaaaa",
        fontFamily: "sans-serif",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH_MESSAGE);
    this.scoreLabelObjects.push(oppCounterText);

    const divider = this.add
      .text(W / 2, H / 2, "vs", {
        fontSize: "26px",
        color: "#aaaacc",
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5)
      .setDepth(DEPTH_MESSAGE);
    this.scoreLabelObjects.push(divider);

    let selfRunning = 0;
    let oppRunning = 0;

    const scheduleLabel = (idx, pitPos, layout, pts, isOpp) => {
      const col = idx % layout.cols;
      const row = Math.floor(idx / layout.cols);
      const ox = (col - (layout.cols - 1) / 2) * layout.gapX;
      const oy = layout.startY + row * layout.gapY;
      const x = pitPos.x + ox;
      const y = pitPos.y + oy;

      const textColor =
        pts > 3
          ? "#ffe066"
          : pts > 0
            ? "#aaffaa"
            : pts < 0
              ? "#ff6666"
              : "#aaaaaa";

      this.time.delayedCall(delay, () => {
        const label = this.add
          .text(x, y, pts >= 0 ? `+${pts}` : `${pts}`, {
            fontSize: "30px",
            color: textColor,
            fontFamily: "monospace",
            stroke: "#000000",
            strokeThickness: 5,
          })
          .setOrigin(0.5)
          .setAlpha(0)
          .setScale(0.4);
        label.setDepth(DEPTH_MESSAGE);
        this.scoreLabelObjects.push(label);
        this.tweens.add({
          targets: label,
          alpha: 1,
          scale: 1.1,
          y: y - 20,
          duration: 220,
          ease: "Back.Out",
          onComplete: () => {
            this.tweens.add({
              targets: label,
              scale: 1,
              duration: 120,
              ease: "Sine.InOut",
            });
          },
        });

        // カウンター更新
        if (isOpp) {
          oppRunning += pts;
          oppCounterText.setText(`相手: ${oppRunning}点`);
        } else {
          selfRunning += pts;
          selfCounterText.setText(`あなた: ${selfRunning}点`);
        }
      });
      delay += 180;
    };

    // 自分の賽壇スコア、次に相手
    selfStones.forEach((s, i) =>
      scheduleLabel(i, PIT5, selfLayout, s.pts, false),
    );
    delay += 350;
    oppStones.forEach((s, i) =>
      scheduleLabel(i, PIT11, oppLayout, s.pts, true),
    );

    // 最終結果へ
    this.time.delayedCall(delay + 700, () =>
      this._showFinalScoreResult(selfTotal, oppTotal),
    );
  }

  _clearResultOverlay() {
    if (!this.resultOverlay) return;
    this.resultOverlay.destroy(true);
    this.resultOverlay = null;
  }
}
