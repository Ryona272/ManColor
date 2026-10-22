import {
  getPlayerName,
  setPlayerName,
} from "../net/firebaseAuth.js";
import { fetchBattleStats, getKugutsuSelfStats } from "../net/battleLogger.js";
import { soundManager } from "../audio/SoundManager.js";
import {
  getStoneDesignMode,
  setStoneDesignMode,
  STONE_DISPLAY_MODES,
  STONE_DISPLAY_MODE_LABELS,
  SKIN_SETS,
  isSkinSetOwned,
  getPlayerIcon,
  setPlayerIcon,
  stoneSkinTextureKey,
  drawStoneGraphic,
} from "../data/stoneSkins.js";
import { STONE_COLORS } from "../data/constants.js";
import { playAiFusion } from "../ui/aiFusion.js";

const UI_FONT = '"Yu Gothic UI", "Hiragino Sans", sans-serif';
const DISPLAY_FONT = '"Yu Mincho", "Hiragino Mincho ProN", serif';

export class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: "LobbyScene" });
    this.noticeText = null;
    this._playerNameText = null;
  }

  create() {
    const W = 1080;
    const H = 1920;

    // 阿修羅解放済みならロビーBGMを差し替え
    const _lobbyBgmKey =
      localStorage.getItem("ashuraShown") === "1" ? "魔王魂_阿修羅" : "lobby";
    soundManager.playBgm(_lobbyBgmKey);
    this._drawBackground(W, H);

    this.add
      .text(W / 2, 210, "ManColor", {
        fontSize: "104px",
        color: "#f4deb1",
        fontFamily: DISPLAY_FONT,
        stroke: "#1a130c",
        strokeThickness: 7,
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, 300, "対戦モードを選んでください", {
        fontSize: "34px",
        color: "#e6decf",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5);

    // タイトル装飾ライン
    {
      const dg = this.add.graphics();
      dg.lineStyle(1.5, 0xf0d39a, 0.5);
      dg.beginPath();
      dg.moveTo(W / 2 - 220, 348);
      dg.lineTo(W / 2 + 220, 348);
      dg.strokePath();
      dg.lineStyle(1, 0xf0d39a, 0.18);
      dg.beginPath();
      dg.moveTo(W / 2 - 380, 348);
      dg.lineTo(W / 2 - 220, 348);
      dg.strokePath();
      dg.beginPath();
      dg.moveTo(W / 2 + 220, 348);
      dg.lineTo(W / 2 + 380, 348);
      dg.strokePath();
      dg.fillStyle(0xf0d39a, 0.7);
      dg.fillCircle(W / 2 - 220, 348, 3.5);
      dg.fillCircle(W / 2 + 220, 348, 3.5);
      dg.fillStyle(0xf0d39a, 0.45);
      dg.fillCircle(W / 2, 348, 4.5);
      dg.fillCircle(W / 2 - 110, 348, 2.5);
      dg.fillCircle(W / 2 + 110, 348, 2.5);
    }

    this._createModeButton({
      x: W / 2,
      y: 640,
      title: "ソロで遊ぶ",
      sub: "AIと対戦",
      texture: "mancolor-button-green",
      onClick: () => {
        this._showDifficultyPanel();
      },
    });

    this._createModeButton({
      x: W / 2,
      y: 900,
      title: "友達と遊ぶ",
      sub: "ルームコードで合流",
      texture: "mancolor-button-blue",
      onClick: () => this.scene.start("FriendLobbyScene"),
    });

    this._createModeButton({
      x: W / 2,
      y: 1160,
      title: "ランダム対戦",
      sub: "オンラインで自動マッチ",
      texture: "mancolor-button-red",
      onClick: () => this.scene.start("RandomLobbyScene"),
    });

    this._createPlayerPanel(W, H);
    this._createSoundButton(W);
    this._createShopButton(W);
    const pointIcon = this.add.image(W - 100, 332, "mancolor-point-icon")
      .setDisplaySize(88, 88);
    this.add.zone(W - 100, 332, 88, 88).setInteractive({ useHandCursor: true })
      .on("pointerover", () => pointIcon.setAlpha(0.7))
      .on("pointerout", () => pointIcon.setAlpha(1))
      .on("pointerdown", () => {
        soundManager.se_button?.();
        this.scene.start("DailyMissionScene");
      });

    // 阿修羅解放チェック: 条件が揃っていてまだ演出未表示なら自動でパネルを開く
    this.time.delayedCall(300, () => {
      try {
        const ashuraShownNow = localStorage.getItem("ashuraShown") === "1";
        if (!ashuraShownNow) {
          const bd = JSON.parse(localStorage.getItem("soloBeaten") ?? "{}");
          const kisinDone = !!(bd["kisin"]?.first && bd["kisin"]?.second);
          const kyubiDone = !!(bd["kyubi"]?.first && bd["kyubi"]?.second);
          if (kisinDone && kyubiDone) {
            this._showDifficultyPanel();
          }
        }
      } catch (_) {}
    });

    // 初回起動: メニューを自動で開く（音量調整 + チュートリアル案内）
    try {
      const tutorialSeen = localStorage.getItem("tutorialSeen") === "1";
      if (!tutorialSeen) {
        localStorage.setItem("tutorialSeen", "1");
        this.time.delayedCall(500, () => this._showVolumePanel(true));
      }
    } catch (_) {}
  }

  _createShopButton(W) {
    const bx = W - 100,
      by = 216,
      br = 44;
    const icon = this.add.image(bx, by, "mancolor-shop-icon");
    icon.setScale((br * 2) / Math.max(icon.width, icon.height));

    const hit = this.add.zone(bx, by, br * 2, br * 2).setInteractive();
    hit.on("pointerover", () => icon.setAlpha(0.7));
    hit.on("pointerout", () => icon.setAlpha(1.0));
    hit.on("pointerdown", () => {
      soundManager.se_button();
      this.scene.start("ShopScene");
    });
  }

  _createSoundButton(W) {
    // ⚙ ボタン（右上コーナー）
    const bx = W - 100,
      by = 100,
      br = 44;
    const icon = this.add.image(bx, by, "mancolor-settings-icon");
    icon.setScale((br * 2) / icon.width);

    const hit = this.add.zone(bx, by, br * 2, br * 2).setInteractive();
    hit.on("pointerover", () => icon.setAlpha(0.7));
    hit.on("pointerout", () => icon.setAlpha(1.0));
    hit.on("pointerdown", () => {
      soundManager.se_button();
      this._showVolumePanel();
    });
  }

  _showVolumePanel(firstLaunch = false) {
    const W = 1080;
    const objs = [];
    let contentObjs = [];

    const overlay = this.add.rectangle(W / 2, 960, W, 1920, 0x000000, 0.72);
    overlay.setInteractive();
    objs.push(overlay);

    let currentHintObjs = [];
    const close = () => {
      currentHintObjs.forEach((o) => o.destroy());
      currentHintObjs = [];
      contentObjs.forEach((o) => o.destroy());
      objs.forEach((o) => o.destroy());
    };

    // パネル本体
    const pw = 700,
      ph = 560,
      px = W / 2 - pw / 2,
      py = 640;
    const panelG = this.add.graphics();
    panelG.fillStyle(0x080d18, 1);
    panelG.fillRoundedRect(px, py, pw, ph, 24);
    panelG.lineStyle(1.5, 0xe5d5b1, 0.4);
    panelG.strokeRoundedRect(px, py, pw, ph, 24);
    objs.push(panelG);

    const title = this.add
      .text(W / 2, py + 48, "メニュー", {
        fontSize: "42px",
        color: "#f4deb1",
        fontFamily: DISPLAY_FONT,
        stroke: "#000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    objs.push(title);

    // 閉じるボタン
    const closeBtn = this.add
      .text(px + pw - 28, py + 28, "✕", {
        fontSize: "38px",
        color: "#c0a888",
      })
      .setOrigin(0.5)
      .setInteractive();
    closeBtn.on("pointerdown", close);
    objs.push(closeBtn);

    // ─── タブバー（音量 / ゲーム / その他） ───
    const tabs = [
      { key: "volume", label: "音量" },
      { key: "game", label: "ゲーム" },
      { key: "other", label: "その他" },
    ];
    const tabW = pw / tabs.length;
    const tabY = py + 96;
    let activeTab = "volume";
    const tabEntries = [];

    const drawTab = (entry) => {
      const active = entry.key === activeTab;
      entry.g.clear();
      entry.g.fillStyle(active ? 0x2a4060 : 0x141824, active ? 0.9 : 0.6);
      entry.g.fillRoundedRect(
        entry.x - tabW / 2 + 6,
        tabY - 28,
        tabW - 12,
        56,
        12,
      );
      entry.g.lineStyle(1.5, active ? 0xf0d39a : 0xe5d5b1, active ? 0.7 : 0.2);
      entry.g.strokeRoundedRect(
        entry.x - tabW / 2 + 6,
        tabY - 28,
        tabW - 12,
        56,
        12,
      );
      entry.text.setColor(active ? "#f4deb1" : "#8a92a5");
    };

    const switchTab = (key) => {
      activeTab = key;
      tabEntries.forEach((e) => drawTab(e));
      renderTabContent();
    };

    tabs.forEach((tab, i) => {
      const x = px + tabW * i + tabW / 2;
      const g = this.add.graphics();
      const text = this.add
        .text(x, tabY, tab.label, {
          fontSize: "28px",
          color: "#e6decf",
          fontFamily: UI_FONT,
        })
        .setOrigin(0.5);
      const zone = this.add
        .zone(x, tabY, tabW, 56)
        .setInteractive({ useHandCursor: true });
      zone.on("pointerdown", () => {
        soundManager.se_button();
        switchTab(tab.key);
      });
      const entry = { key: tab.key, x, g, text };
      tabEntries.push(entry);
      drawTab(entry);
      objs.push(g, text, zone);
    });

    const contentTop = py + 154;

    // アクティブなヒントを消すためのコールバック
    let dismissCurrentHint = null;

    const renderVolumeTab = () => {
      const trackW = 520,
        trackH = 12,
        thumbR = 26;
      const sliderX = W / 2 - trackW / 2;

      const makeSlider = (labelText, rowY, getValue, onChangeValue) => {
        let ratio = getValue();

        const label = this.add
          .text(sliderX, rowY - 46, labelText, {
            fontSize: "30px",
            color: "#d7e2f1",
            fontFamily: UI_FONT,
          })
          .setOrigin(0, 0.5);
        contentObjs.push(label);

        const valText = this.add
          .text(sliderX + trackW, rowY - 46, `${Math.round(ratio * 100)}%`, {
            fontSize: "28px",
            color: "#f4deb1",
            fontFamily: UI_FONT,
          })
          .setOrigin(1, 0.5);
        contentObjs.push(valText);

        const trackG = this.add.graphics();
        const redrawTrack = (r) => {
          trackG.clear();
          trackG.fillStyle(0x2a2e40, 1);
          trackG.fillRoundedRect(
            sliderX,
            rowY - trackH / 2,
            trackW,
            trackH,
            trackH / 2,
          );
          trackG.fillStyle(0xf0d39a, 1);
          trackG.fillRoundedRect(
            sliderX,
            rowY - trackH / 2,
            trackW * r,
            trackH,
            trackH / 2,
          );
          trackG.fillStyle(0xfff8e6, 1);
          trackG.fillCircle(sliderX + trackW * r, rowY, thumbR);
          trackG.lineStyle(2, 0xc8a860, 1);
          trackG.strokeCircle(sliderX + trackW * r, rowY, thumbR);
        };
        redrawTrack(ratio);
        contentObjs.push(trackG);

        const zone = this.add
          .zone(W / 2, rowY, trackW + thumbR * 2, thumbR * 2 + 10)
          .setInteractive();

        const updateFromPointer = (ptr) => {
          const rx = Phaser.Math.Clamp(ptr.x - sliderX, 0, trackW);
          ratio = rx / trackW;
          redrawTrack(ratio);
          valText.setText(`${Math.round(ratio * 100)}%`);
          onChangeValue(ratio);
        };

        zone.on("pointerdown", updateFromPointer);
        zone.on("pointermove", (ptr) => {
          if (ptr.isDown) updateFromPointer(ptr);
        });
        contentObjs.push(zone);
      };

      makeSlider(
        "BGM",
        contentTop + 64,
        () => soundManager._bgmVolume,
        (v) => soundManager.setBgmVolume(v),
      );

      makeSlider(
        "効果音",
        contentTop + 196,
        () => soundManager._seVolume,
        (v) => soundManager.setSeVolume(v),
      );

      const credit = this.add
        .text(W / 2, py + ph - 28, "BGM：魔王魂", {
          fontSize: "22px",
          color: "#7a8899",
          fontFamily: UI_FONT,
        })
        .setOrigin(0.5);
      contentObjs.push(credit);
    };

    const renderGameTab = () => {
      const rowY = contentTop + 56;
      const label = this.add
        .text(px + 40, rowY, "石の見た目", {
          fontSize: "30px",
          color: "#d7e2f1",
          fontFamily: UI_FONT,
        })
        .setOrigin(0, 0.5);
      contentObjs.push(label);

      const btnW = 220,
        btnH = 60;
      const btnX = px + pw - 40 - btnW / 2;
      const btnG = this.add.graphics();
      const btnText = this.add
        .text(btnX, rowY, "", {
          fontSize: "26px",
          color: "#f4deb1",
          fontFamily: UI_FONT,
        })
        .setOrigin(0.5);

      const drawBtn = () => {
        btnG.clear();
        btnG.fillStyle(0x2a4060, 0.95);
        btnG.fillRoundedRect(btnX - btnW / 2, rowY - btnH / 2, btnW, btnH, 12);
        btnG.lineStyle(1.5, 0xf0d39a, 0.6);
        btnG.strokeRoundedRect(
          btnX - btnW / 2,
          rowY - btnH / 2,
          btnW,
          btnH,
          12,
        );
        btnText.setText(STONE_DISPLAY_MODE_LABELS[getStoneDesignMode()]);
      };
      drawBtn();

      const zone = this.add
        .zone(btnX, rowY, btnW, btnH)
        .setInteractive({ useHandCursor: true });
      zone.on("pointerdown", () => {
        soundManager.se_button();
        const idx = STONE_DISPLAY_MODES.indexOf(getStoneDesignMode());
        const next =
          STONE_DISPLAY_MODES[(idx + 1) % STONE_DISPLAY_MODES.length];
        setStoneDesignMode(next);
        drawBtn();
      });

      const hint = this.add
        .text(
          px + 40,
          rowY + 60,
          "混合: 石ごとの持ち主基準 / 自分のみ・相手のみ: 全て統一表示",
          {
            fontSize: "20px",
            color: "#8a92a5",
            fontFamily: UI_FONT,
            wordWrap: { width: pw - 80 },
          },
        )
        .setOrigin(0, 0);

      contentObjs.push(btnG, btnText, zone, hint);
    };

    const renderOtherTab = () => {
      const tutBtn = this.add
        .text(W / 2, contentTop + 70, "チュートリアルを見る", {
          fontSize: "34px",
          color: "#ffe0a8",
          backgroundColor: "#1a2a1a",
          padding: { x: 30, y: 18 },
          fontFamily: UI_FONT,
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setInteractive();

      tutBtn.on("pointerdown", () => {
        soundManager.se_button();
        close();
        this.scene.start("GameScene", {
          aiDifficulty: "kooni",
          playerFirst: true,
          tutorialMode: true,
        });
      });
      tutBtn.on("pointerover", () => tutBtn.setAlpha(0.8));
      tutBtn.on("pointerout", () => tutBtn.setAlpha(1));
      contentObjs.push(tutBtn);
    };

    const renderTabContent = () => {
      contentObjs.forEach((o) => o.destroy());
      contentObjs = [];
      if (activeTab === "volume") renderVolumeTab();
      else if (activeTab === "game") renderGameTab();
      else renderOtherTab();
    };

    if (firstLaunch) {
      // 音量を極小(1%)にしておき、気づいて調整してもらう
      soundManager.setBgmVolume(0.01);
      soundManager.setSeVolume(0.01);
    }

    renderTabContent();

    // ─── 初回限定: 2段階ヒント ───
    if (firstLaunch) {
      const hintW = pw - 40;
      const hintX = W / 2 - hintW / 2;

      // ─── ヒント共通描画ヘルパー ───
      const makeHint = (
        message,
        arrowDir,
        anchorY,
        color,
        onDismiss,
        persistent = false,
        showOkButton = false,
      ) => {
        const hintObjs = [];
        const hintH = 110;

        const bg = this.add.graphics();
        bg.fillStyle(0x0a0f1a, 0.97);
        bg.lineStyle(2, color, 0.9);
        bg.fillRoundedRect(hintX, anchorY, hintW, hintH, 14);
        bg.strokeRoundedRect(hintX, anchorY, hintW, hintH, 14);

        // 矢印
        bg.fillStyle(color, 0.9);
        if (arrowDir === "up") {
          bg.fillTriangle(
            W / 2 - 18,
            anchorY,
            W / 2 + 18,
            anchorY,
            W / 2,
            anchorY - 22,
          );
        } else {
          bg.fillTriangle(
            W / 2 - 18,
            anchorY + hintH,
            W / 2 + 18,
            anchorY + hintH,
            W / 2,
            anchorY + hintH + 22,
          );
        }
        hintObjs.push(bg);

        // テキスト中央寄せ（OKボタン表示時は左寄りに詰める）
        const txt = this.add
          .text(
            showOkButton ? W / 2 - 50 : W / 2,
            anchorY + hintH / 2,
            message,
            {
              fontSize: "28px",
              color: "#ffffff",
              fontFamily: UI_FONT,
              stroke: "#000000",
              strokeThickness: 3,
              align: "center",
              wordWrap: { width: showOkButton ? hintW - 160 : hintW - 40 },
            },
          )
          .setOrigin(0.5, 0.5);
        hintObjs.push(txt);

        // 現在表示中のヒントとして登録（close()で必ず破棄されるよう）
        currentHintObjs = hintObjs;

        if (!persistent) {
          // OKボタン・スライダー操作いずれでも消せるよう登録
          dismissCurrentHint = () => {
            currentHintObjs.forEach((o) => o.destroy());
            currentHintObjs = [];
            dismissCurrentHint = null;
            onDismiss?.();
          };

          if (showOkButton) {
            const okX = hintX + hintW - 68;
            const okY = anchorY + hintH / 2;
            const okG = this.add.graphics();
            okG.fillStyle(0x2a4060, 0.95);
            okG.fillRoundedRect(okX - 48, okY - 32, 96, 64, 12);
            okG.lineStyle(1.5, 0xf0d39a, 0.7);
            okG.strokeRoundedRect(okX - 48, okY - 32, 96, 64, 12);
            hintObjs.push(okG);

            const okText = this.add
              .text(okX, okY, "OK", {
                fontSize: "30px",
                color: "#f4deb1",
                fontFamily: UI_FONT,
              })
              .setOrigin(0.5);
            hintObjs.push(okText);

            const okZone = this.add
              .zone(okX, okY, 96, 64)
              .setInteractive({ useHandCursor: true });
            okZone.on("pointerdown", () => {
              soundManager.se_button();
              if (dismissCurrentHint) dismissCurrentHint();
            });
            hintObjs.push(okZone);
          } else {
            // パネル全体をタップで消える透明ゾーン
            const zone = this.add
              .zone(W / 2, anchorY + hintH / 2, hintW, hintH)
              .setInteractive();
            zone.on("pointerdown", () => {
              if (dismissCurrentHint) dismissCurrentHint();
            });
            hintObjs.push(zone);
          }
        }

        return hintObjs;
      };

      // ① まずは音量調整！（音量タブ・スライダーの下・上向き矢印）
      const hint1Y = contentTop + 260;

      makeHint(
        "まずは音量を調整してみよう",
        "up",
        hint1Y,
        0x4a9fe8,
        () => {
          // ② その他タブに切り替えてチュートリアルボタンを案内
          switchTab("other");
          const hint2Y = contentTop + 130;
          makeHint(
            "チュートリアルをやってみよう！",
            "up",
            hint2Y,
            0x44cc66,
            null,
            true,
          );
        },
        false,
        true,
      );
    }
  }

  _drawBackground(W, H) {
    this.add
      .image(W / 2, H / 2, "mancolor-home-bg")
      .setDisplaySize(W, H);
  }

  _createModeButton({ x, y, title, sub, texture, onClick }) {
    const container = this.add.container(x, y);
    const bw = 720;
    const bh = 150;
    container.add(
      this.add.image(0, 0, texture).setDisplaySize(bw, bh),
    );

    const titleText = this.add
      .text(0, -16, title, {
        fontSize: "58px",
        color: "#fff8e6",
        fontFamily: DISPLAY_FONT,
      })
      .setOrigin(0.5);
    container.add(titleText);

    const subText = this.add
      .text(0, 34, sub, {
        fontSize: "28px",
        color: "#d7e2f1",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5);
    container.add(subText);

    const hitArea = this.add.zone(x, y, bw, 180).setInteractive();
    hitArea.on("pointerover", () => {
      this.tweens.add({
        targets: container,
        scaleX: 1.02,
        scaleY: 1.02,
        duration: 120,
        ease: "Sine.Out",
      });
    });
    hitArea.on("pointerout", () => {
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 120,
        ease: "Sine.Out",
      });
    });
    hitArea.on("pointerdown", () => {
      soundManager.se_button();
      onClick();
    });
  }

  _showDifficultyPanel() {
    const W = 1080;
    const H = 1920;
    const objs = [];

    // 傀儡を先後手とも倒したら、阿修羅の上に鬼神・九尾の行を戻して再戦可能にする
    let rematchOpen = false;
    try {
      const bd = JSON.parse(localStorage.getItem("soloBeaten") ?? "{}");
      const full = (d) => !!(bd[d]?.first && bd[d]?.second);
      rematchOpen = localStorage.getItem("ashuraShown") === "1" &&
        ["kisin", "kyubi", "kugutsu"].every(full);
    } catch (_e) {}
    const shiftY = rematchOpen ? -90 : 0;

    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.72);
    overlay.setInteractive();
    objs.push(overlay);

    const panelG = this.add.graphics();
    const ppx = W / 2 - 360,
      ppy = 330 + shiftY,
      ppw = 720,
      pph = rematchOpen ? 1450 : 1260;
    panelG.fillStyle(0x080d18, 1);
    panelG.fillRoundedRect(ppx, ppy, ppw, pph, 30);
    // 斜めテクスチャライン
    panelG.lineStyle(1, 0xffffff, 0.02);
    for (let i = -1; i < 9; i++) {
      panelG.beginPath();
      panelG.moveTo(ppx + i * 130, ppy);
      panelG.lineTo(ppx + i * 130 + pph * 0.55, ppy + pph);
      panelG.strokePath();
    }
    // グロー球
    panelG.fillStyle(0xf0d39a, 0.06);
    panelG.fillCircle(ppx + ppw * 0.82, ppy + pph * 0.1, 200);
    panelG.fillStyle(0xf0d39a, 0.025);
    panelG.fillCircle(ppx + ppw * 0.82, ppy + pph * 0.1, 330);
    panelG.fillStyle(0x55aadd, 0.06);
    panelG.fillCircle(ppx + ppw * 0.18, ppy + pph * 0.9, 200);
    panelG.fillStyle(0x55aadd, 0.025);
    panelG.fillCircle(ppx + ppw * 0.18, ppy + pph * 0.9, 330);
    panelG.fillStyle(0x7733aa, 0.035);
    panelG.fillCircle(ppx + ppw / 2, ppy + pph / 2, 300);
    // 外枠（二重）
    panelG.lineStyle(1.5, 0xe5d5b1, 0.38);
    panelG.strokeRoundedRect(ppx, ppy, ppw, pph, 30);
    panelG.lineStyle(1, 0xe5d5b1, 0.1);
    panelG.strokeRoundedRect(ppx + 12, ppy + 12, ppw - 24, pph - 24, 22);
    // コーナーLブラケット
    const pcLen = 48;
    panelG.lineStyle(2.5, 0xf0d39a, 0.5);
    panelG.beginPath();
    panelG.moveTo(ppx, ppy + pcLen);
    panelG.lineTo(ppx, ppy);
    panelG.lineTo(ppx + pcLen, ppy);
    panelG.strokePath();
    panelG.beginPath();
    panelG.moveTo(ppx + ppw - pcLen, ppy);
    panelG.lineTo(ppx + ppw, ppy);
    panelG.lineTo(ppx + ppw, ppy + pcLen);
    panelG.strokePath();
    panelG.beginPath();
    panelG.moveTo(ppx, ppy + pph - pcLen);
    panelG.lineTo(ppx, ppy + pph);
    panelG.lineTo(ppx + pcLen, ppy + pph);
    panelG.strokePath();
    panelG.beginPath();
    panelG.moveTo(ppx + ppw - pcLen, ppy + pph);
    panelG.lineTo(ppx + ppw, ppy + pph);
    panelG.lineTo(ppx + ppw, ppy + pph - pcLen);
    panelG.strokePath();
    objs.push(panelG);

    const titleT = this.add
      .text(W / 2, 420 + shiftY, "AIの強さを選んでください", {
        fontSize: "36px",
        color: "#e6decf",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5);
    objs.push(titleT);

    const debugBtns = [];

    // ─── 進行管理 ───────────────────────────────────────────
    // soloProgressMode: "progression" | "free"  (初期値: "progression")
    // soloUnlocked: 倒した難易度の配列
    const PROGRESSION_REQS = {
      kooni: [],
      yasha: ["kooni"],
      rasetsu: ["yasha"],
      kisin: ["rasetsu"],
      kyubi: ["rasetsu"],
      ashura: ["kisin", "kyubi"],
      kugutsu: ["ashura"],
    };
    const DIFF_LABEL_MAP = {
      kooni: "小鬼",
      yasha: "夜叉",
      rasetsu: "羅刹",
      kisin: "鬼神",
      kyubi: "九尾",
      ashura: "阿修羅",
      kugutsu: "傀儡",
    };
    let beatenData;
    try {
      beatenData = JSON.parse(localStorage.getItem("soloBeaten") ?? "{}");
    } catch (_e) {
      beatenData = {};
    }
    const isProgressionMode = true; // 常に段位モード（前のAIを倒さないと解放されない）

    // diff を「完全クリア済み（先手・後手両方）」かどうか判定
    function isFullyBeaten(diff) {
      return !!(beatenData[diff]?.first && beatenData[diff]?.second);
    }

    function isUnlocked(diff) {
      if (!isProgressionMode) return true;
      const reqs = PROGRESSION_REQS[diff] ?? [];
      return reqs.every((r) => isFullyBeaten(r));
    }
    // 阿修羅解放判定: モードに関わらず鬼神+九尾の先後手全クリアで解放
    const ashuraUnlocked = PROGRESSION_REQS.ashura.every((r) =>
      isFullyBeaten(r),
    );
    let ashuraShown = true;
    try {
      ashuraShown = localStorage.getItem("ashuraShown") === "1";
    } catch (_e) {}
    // ─────────────────────────────────────────────────────────

    const items = [
      {
        y: 570,
        label: "小鬼",
        ruby: "こおに",
        sub: "初戦にぴったりな相手",
        labelColor: "#c8ffe0",
        subColor: "#88ccaa",
        diff: "kooni",
      },
      {
        y: 760,
        label: "夜叉",
        ruby: "やしゃ",
        sub: "実力を見せつけよう",
        labelColor: "#c8e8ff",
        subColor: "#88aabb",
        diff: "yasha",
      },
      {
        y: 950,
        label: "羅刹",
        ruby: "らせつ",
        sub: "手加減無用！全力で！",
        labelColor: "#ffe0e0",
        labelStroke: "#3a0008",
        subColor: "#c07080",
        diff: "rasetsu",
      },
      {
        y: 1140,
        label: "鬼神",
        ruby: "きしん",
        sub: "武の権化… 倒せる？",
        labelColor: "#f0d8f8",
        labelStroke: "#1a0030",
        subColor: "#d6b5ed",
        diff: "kisin",
        cx: W / 2 - 157,
        bw: 305,
      },
      {
        y: 1140,
        label: "九尾",
        ruby: "きゅうび",
        sub: "知の権化… 倒せる？",
        labelColor: "#fff4d6",
        labelStroke: "#4a2600",
        subColor: "#ffeec2",
        diff: "kyubi",
        cx: W / 2 + 157,
        bw: 305,
      },
      ...(ashuraUnlocked
        ? [
            {
              y: 1140,
              label: "阿修羅",
              ruby: "あしゅら",
              sub: "鬼神と九尾が融合した圧倒的な存在",
              labelColor: "#fff0ee",
              labelStroke: "#550000",
              subColor: "#ffaa88",
              diff: "ashura",
            },
          ]
        : []),
      {
        y: 1330,
        label: "傀儡",
        ruby: "くぐつ",
        sub: "成長する操り人形",
        labelColor: "#c8e8ff",
        labelStroke: "#003366",
        subColor: "#6699cc",
        diff: "kugutsu",
      },
    ];
    for (const item of items) {
      if (rematchOpen && item.diff === "ashura") item.y = 1330;
      if (rematchOpen && item.diff === "kugutsu") item.y = 1520;
      item.y += shiftY;
    }

    let stopFusion = null;
    let closed = false;
    const cleanup = () => {
      if (closed) return;
      closed = true;
      stopFusion?.();
      this.events.off("shutdown", cleanup);
      objs.forEach((o) => o.destroy());
      this._diffPanelCleanup = null;
    };
    this.events.once("shutdown", cleanup);
    this._diffPanelCleanup = cleanup;

    // アニメーション用: アイテムごとのobjs範囲追跡
    const itemObjRanges = {};

    for (const item of items) {
      const objStartIdx = objs.length;
      const cx = item.cx ?? W / 2;
      const bw = item.bw ?? 620;
      const rx = cx - bw / 2;
      const titleX = rx + bw * (
        item.diff === "kisin" ? 0.25 : item.diff === "kyubi" ? 0.73 :
          ["ashura", "kugutsu"].includes(item.diff) ? 0.23 : 0.5
      );

      const iy = item.y - 80;
      const progressLocked = !isUnlocked(item.diff);
      // ロック中はキャラのイラストを抜いた版を使い、色と和柄だけ見せる
      const card = this.add
        .image(cx, iy + 82.5, progressLocked ? "mancolor-ui-ai-locked" : "mancolor-ui-ai", item.diff)
        .setDisplaySize(bw, 165);
      objs.push(card);
      if (progressLocked) {
        const lockG = this.add.graphics();
        lockG.fillStyle(0x000000, 0.55);
        lockG.fillRoundedRect(rx, iy, bw, 165, 22);
        objs.push(lockG);
      }

      // 調整中バッジ
      if (item.locked) {
        const badge = this.add
          .text(cx, item.y - 16, "🔧 調整中", {
            fontSize: "28px",
            color: "#ffcc44",
            fontFamily: UI_FONT,
          })
          .setOrigin(0.5);
        objs.push(badge);
      }

      const labelFontSize = bw < 400 ? "48px" : "60px";
      const displayLabel = progressLocked ? "" : item.label;
      const labelStyle = {
        fontSize: labelFontSize,
        color: progressLocked ? "#556677" : (item.labelColor ?? "#fff8e6"),
        fontFamily: DISPLAY_FONT,
      };
      if (!progressLocked && item.labelStroke) {
        labelStyle.stroke = item.labelStroke;
        labelStyle.strokeThickness = bw < 400 ? 6 : 4;
      }
      // 半幅カードはイラストが文字に重なるので、説明文の下に薄い帯を敷く
      if (!progressLocked && bw < 400) {
        const band = this.add.graphics();
        band.fillStyle(0x000000, 0.42);
        band.fillRoundedRect(rx, iy + 120, bw, 45, { tl: 0, tr: 0, bl: 22, br: 22 });
        objs.push(band);
      }
      const labelY = item.locked ? item.y - 52 :
        bw < 400 ? iy + 90 : iy + 74;
      const t1 = this.add
        .text(progressLocked ? cx : titleX, labelY, displayLabel, labelStyle)
        .setOrigin(0.5);
      objs.push(t1);

      if (item.ruby && !item.locked && !progressLocked) {
        const rubyColor = item.labelStroke
          ? item.labelColor
          : (item.labelColor ?? "#fff8e6");
        const rubyT = this.add
          .text(titleX, iy + (bw < 400 ? 47 : 18), item.ruby, {
            fontSize: bw < 400 ? "16px" : "20px",
            color: rubyColor,
            fontFamily: UI_FONT,
            alpha: 0.78,
            letterSpacing: 4,
          })
          .setOrigin(0.5);
        objs.push(rubyT);
      }

      if (!item.locked) {
        const reqs = PROGRESSION_REQS[item.diff] ?? [];
        const lockedSubText =
          reqs.length === 0
            ? "まだ姿を現していない…"
            : reqs
                .map((r) => (isUnlocked(r) ? DIFF_LABEL_MAP[r] : "？？？"))
                .join("と") + "を倒すと解放";
        const t2 = this.add
          .text(cx, iy + (bw < 400 ? 140 : 129), progressLocked ? lockedSubText : item.sub, {
            fontSize: bw < 400 ? "22px" : "28px",
            color: progressLocked ? "#c3ccd8" : (item.subColor ?? "#d7e2f1"),
            fontFamily: UI_FONT,
            stroke: progressLocked || ["kisin", "kyubi", "ashura"].includes(item.diff) ? "#100918" : undefined,
            strokeThickness: progressLocked || ["kisin", "kyubi", "ashura"].includes(item.diff) ? 3 : 0,
          })
          .setOrigin(0.5);
        t2.setScale(Math.min(1, (bw - 28) / t2.width));
        objs.push(t2);
      }

      if (progressLocked) {
        const lockIcon = this.add.image(cx, item.y - 16, "mancolor-icon-lock")
          .setDisplaySize(38, 48)
          .setName(`ai-lock-${item.diff}`);
        objs.push(lockIcon);
      }

      // 撃破バッジ (右上: 先手・後手それぞれの勝利状況)
      {
        const mrkFirst = !!beatenData[item.diff]?.first;
        const mrkSecond = !!beatenData[item.diff]?.second;
        // 2つのピル型インジケーター
        const pillW = 52,
          pillH = 28,
          pillR = 14;
        const pillY = iy + 22;
        const pill2X = rx + bw - 10 - pillW / 2;
        const pill1X = pill2X - pillW - 6;
        for (const [px, beaten, label] of [
          [pill1X, mrkFirst, "先"],
          [pill2X, mrkSecond, "後"],
        ]) {
          const pg = this.add.graphics();
          if (beaten) {
            pg.fillStyle(0x120d00, 1);
            pg.fillRoundedRect(
              px - pillW / 2 - 1,
              pillY - pillH / 2 - 1,
              pillW + 2,
              pillH + 2,
              pillR + 1,
            );
            pg.fillStyle(0xb07d08, 1);
            pg.fillRoundedRect(
              px - pillW / 2,
              pillY - pillH / 2,
              pillW,
              pillH,
              pillR,
            );
            pg.fillStyle(0xf5c518, 1);
            pg.fillRoundedRect(
              px - pillW / 2 + 2,
              pillY - pillH / 2 + 2,
              pillW - 4,
              pillH - 4,
              pillR - 1,
            );
            pg.fillStyle(0xfff0a0, 0.35);
            pg.fillRoundedRect(
              px - pillW / 2 + 3,
              pillY - pillH / 2 + 3,
              pillW - 6,
              (pillH - 6) * 0.5,
              pillR - 2,
            );
          } else {
            pg.fillStyle(0x0a0e16, 0.85);
            pg.fillRoundedRect(
              px - pillW / 2,
              pillY - pillH / 2,
              pillW,
              pillH,
              pillR,
            );
            pg.lineStyle(1, 0x334455, 0.9);
            pg.strokeRoundedRect(
              px - pillW / 2,
              pillY - pillH / 2,
              pillW,
              pillH,
              pillR,
            );
          }
          objs.push(pg);
          const pt = this.add
            .text(px, pillY, beaten ? `${label}✓` : label, {
              fontSize: "20px",
              color: beaten ? "#3a2800" : "#334455",
              fontFamily: UI_FONT,
              fontStyle: beaten ? "bold" : "normal",
            })
            .setOrigin(0.5);
          objs.push(pt);
        }
      }

      // 傀儡: 勝率バッジ（右下コーナー。上段=自分／下段=全プレイヤー）
      if (item.diff === "kugutsu" && !progressLocked) {
        const rateStyle = {
          fontSize: "20px",
          color: "#a9cdf5",
          fontFamily: UI_FONT,
          stroke: "#050816",
          strokeThickness: 4,
        };
        const rateText = (label, s) =>
          s && s.total > 0
            ? `${label} ${Math.round((s.wins / s.total) * 100)}% (${s.total}戦)`
            : `${label} -`;
        const selfTag = this.add
          .text(rx + bw - 14, iy + 165 - 36, rateText("自分", getKugutsuSelfStats()), rateStyle)
          .setOrigin(1, 1)
          .setDepth(0);
        objs.push(selfTag);
        const wrTag = this.add
          .text(rx + bw - 14, iy + 165 - 10, "全体 …", rateStyle)
          .setOrigin(1, 1)
          .setDepth(0);
        objs.push(wrTag);
        fetchBattleStats(true) // サーバーのみ（全プレイヤー共通統計）
          .then((stats) => {
            if (!wrTag.active) return;
            wrTag.setText(rateText("全体", stats?.byDifficulty?.kugutsu));
          })
          .catch(() => {
            if (wrTag.active) wrTag.setText("全体 -");
          });
      }

      // アニメーション用 objsRange記録
      itemObjRanges[item.diff] = [objStartIdx, objs.length];

      // アニメーション中（ashura初回解放時）はkirsん/kyubi/ashuraをzoneなし
      const isAnimPhase = ashuraUnlocked && !ashuraShown;
      const skipZone =
        isAnimPhase &&
        (item.diff === "kisin" ||
          item.diff === "kyubi" ||
          item.diff === "ashura");

      const zone = this.add.zone(cx, item.y + 2, bw, 165).setInteractive();
      if (!skipZone)
        zone.on("pointerdown", () => {
          // 進行ロック中は選択不可
          if (progressLocked) {
            return;
          }
          // 調整中は選択不可
          if (item.locked) {
            return;
          }
          // 先後手選択サブパネルを表示
          const subObjs = [];

          const subBg = this.add.graphics();
          const spx = W / 2 - 360,
            spy = 330,
            spw = 720,
            sph = 1260;
          subBg.fillStyle(0x070c16, 1);
          subBg.fillRoundedRect(spx, spy, spw, sph, 30);
          // 斜めテクスチャライン
          subBg.lineStyle(1, 0xffffff, 0.02);
          for (let si = -1; si < 9; si++) {
            subBg.beginPath();
            subBg.moveTo(spx + si * 130, spy);
            subBg.lineTo(spx + si * 130 + sph * 0.55, spy + sph);
            subBg.strokePath();
          }
          // グロー球
          subBg.fillStyle(0xf0d39a, 0.06);
          subBg.fillCircle(spx + spw * 0.82, spy + sph * 0.1, 200);
          subBg.fillStyle(0xf0d39a, 0.025);
          subBg.fillCircle(spx + spw * 0.82, spy + sph * 0.1, 330);
          subBg.fillStyle(0x55aadd, 0.06);
          subBg.fillCircle(spx + spw * 0.18, spy + sph * 0.9, 200);
          subBg.fillStyle(0x55aadd, 0.025);
          subBg.fillCircle(spx + spw * 0.18, spy + sph * 0.9, 330);
          subBg.fillStyle(0x7733aa, 0.035);
          subBg.fillCircle(spx + spw / 2, spy + sph / 2, 300);
          // 外枠（二重）
          subBg.lineStyle(1.5, 0xe5d5b1, 0.38);
          subBg.strokeRoundedRect(spx, spy, spw, sph, 30);
          subBg.lineStyle(1, 0xe5d5b1, 0.1);
          subBg.strokeRoundedRect(spx + 12, spy + 12, spw - 24, sph - 24, 22);
          // コーナーLブラケット
          const scLen = 48;
          subBg.lineStyle(2.5, 0xf0d39a, 0.5);
          subBg.beginPath();
          subBg.moveTo(spx, spy + scLen);
          subBg.lineTo(spx, spy);
          subBg.lineTo(spx + scLen, spy);
          subBg.strokePath();
          subBg.beginPath();
          subBg.moveTo(spx + spw - scLen, spy);
          subBg.lineTo(spx + spw, spy);
          subBg.lineTo(spx + spw, spy + scLen);
          subBg.strokePath();
          subBg.beginPath();
          subBg.moveTo(spx, spy + sph - scLen);
          subBg.lineTo(spx, spy + sph);
          subBg.lineTo(spx + scLen, spy + sph);
          subBg.strokePath();
          subBg.beginPath();
          subBg.moveTo(spx + spw - scLen, spy + sph);
          subBg.lineTo(spx + spw, spy + sph);
          subBg.lineTo(spx + spw, spy + sph - scLen);
          subBg.strokePath();
          subObjs.push(subBg);

          // クリックをメインパネルへ透過させないブロッカー
          const subBlocker = this.add
            .rectangle(W / 2, 960, 720, 1260, 0x000000, 0)
            .setInteractive();
          subObjs.push(subBlocker);

          const subTitle = this.add
            .text(W / 2, 480, `「${item.label}」で対戦`, {
              fontSize: "48px",
              color: "#fff8e6",
              fontFamily: DISPLAY_FONT,
            })
            .setOrigin(0.5);
          subObjs.push(subTitle);

          const subGuide = this.add
            .text(W / 2, 560, "先手・後手を選んでください", {
              fontSize: "30px",
              color: "#d7e2f1",
              fontFamily: UI_FONT,
            })
            .setOrigin(0.5);
          subObjs.push(subGuide);

          // 先手ボタン
          const senteG = this.add.graphics();
          const sfill = 0x2e4f7a;
          const srx = W / 2 - 300,
            sry = 650,
            sbw = 600,
            sbh = 170,
            sbrr = 18;
          senteG.fillStyle(0x07080f, 1);
          senteG.fillRoundedRect(srx, sry, sbw, sbh, sbrr);
          senteG.fillStyle(sfill, 0.3);
          senteG.fillRoundedRect(srx, sry, sbw, sbh, sbrr);
          senteG.fillStyle(0xffffff, 0.055);
          senteG.fillRoundedRect(srx + 4, sry + 4, sbw - 8, 70, 13);
          senteG.fillStyle(sfill, 1);
          senteG.fillRoundedRect(srx, sry, 12, sbh, {
            tl: sbrr,
            tr: 0,
            bl: sbrr,
            br: 0,
          });
          senteG.fillStyle(sfill, 0.3);
          senteG.fillTriangle(
            srx + sbw,
            sry + sbh - 44,
            srx + sbw,
            sry + sbh,
            srx + sbw - 44,
            sry + sbh,
          );
          senteG.lineStyle(8, sfill, 0.16);
          senteG.strokeRoundedRect(
            srx - 4,
            sry - 4,
            sbw + 8,
            sbh + 8,
            sbrr + 3,
          );
          senteG.lineStyle(1.5, 0xe5d5b1, 0.45);
          senteG.strokeRoundedRect(srx, sry, sbw, sbh, sbrr);
          senteG.lineStyle(1, sfill, 0.28);
          senteG.strokeRoundedRect(srx + 5, sry + 5, sbw - 10, sbh - 10, 13);
          subObjs.push(senteG);

          const senteT1 = this.add
            .text(W / 2, 720, "先手で戦う", {
              fontSize: "52px",
              color: "#fff8e6",
              fontFamily: DISPLAY_FONT,
            })
            .setOrigin(0.5);
          subObjs.push(senteT1);

          const senteT2 = this.add
            .text(W / 2, 783, "あなたが先に撒きます", {
              fontSize: "26px",
              color: "#d7e2f1",
              fontFamily: UI_FONT,
            })
            .setOrigin(0.5);
          subObjs.push(senteT2);

          // 先手クリアバッジ
          if (beatenData[item.diff]?.first) {
            const bx = srx + sbw - 30,
              by = sry + 30,
              br = 28;
            const sbdg = this.add.graphics();
            sbdg.fillStyle(0xf0d060, 0.22);
            sbdg.fillCircle(bx, by, br + 8);
            sbdg.fillStyle(0x120d00, 1);
            sbdg.fillCircle(bx, by, br + 3);
            sbdg.fillStyle(0xb07d08, 1);
            sbdg.fillCircle(bx, by, br);
            sbdg.fillStyle(0xf5c518, 1);
            sbdg.fillCircle(bx, by, br - 3);
            sbdg.fillStyle(0xfff0a0, 0.45);
            sbdg.fillCircle(bx - 7, by - 7, br * 0.45);
            subObjs.push(sbdg);
            const senteClear = this.add
              .text(bx, by + 1, "✓", {
                fontSize: "30px",
                color: "#3a2800",
                fontFamily: UI_FONT,
                fontStyle: "bold",
              })
              .setOrigin(0.5);
            subObjs.push(senteClear);
          }

          // 後手ボタン
          const goteG = this.add.graphics();
          const gfill = 0x7a3f45;
          const grx = W / 2 - 300,
            gry = 880,
            gbw = 600,
            gbh = 170,
            gbrr = 18;
          goteG.fillStyle(0x07080f, 1);
          goteG.fillRoundedRect(grx, gry, gbw, gbh, gbrr);
          goteG.fillStyle(gfill, 0.3);
          goteG.fillRoundedRect(grx, gry, gbw, gbh, gbrr);
          goteG.fillStyle(0xffffff, 0.055);
          goteG.fillRoundedRect(grx + 4, gry + 4, gbw - 8, 70, 13);
          goteG.fillStyle(gfill, 1);
          goteG.fillRoundedRect(grx, gry, 12, gbh, {
            tl: gbrr,
            tr: 0,
            bl: gbrr,
            br: 0,
          });
          goteG.fillStyle(gfill, 0.3);
          goteG.fillTriangle(
            grx + gbw,
            gry + gbh - 44,
            grx + gbw,
            gry + gbh,
            grx + gbw - 44,
            gry + gbh,
          );
          goteG.lineStyle(8, gfill, 0.16);
          goteG.strokeRoundedRect(grx - 4, gry - 4, gbw + 8, gbh + 8, gbrr + 3);
          goteG.lineStyle(1.5, 0xe5d5b1, 0.45);
          goteG.strokeRoundedRect(grx, gry, gbw, gbh, gbrr);
          goteG.lineStyle(1, gfill, 0.28);
          goteG.strokeRoundedRect(grx + 5, gry + 5, gbw - 10, gbh - 10, 13);
          subObjs.push(goteG);

          const goteT1 = this.add
            .text(W / 2, 950, "後手で戦う", {
              fontSize: "52px",
              color: "#fff8e6",
              fontFamily: DISPLAY_FONT,
            })
            .setOrigin(0.5);
          subObjs.push(goteT1);

          const goteT2 = this.add
            .text(W / 2, 1013, "AIが先に撒きます", {
              fontSize: "26px",
              color: "#d7e2f1",
              fontFamily: UI_FONT,
            })
            .setOrigin(0.5);
          subObjs.push(goteT2);

          // 後手クリアバッジ
          if (beatenData[item.diff]?.second) {
            const bx = grx + gbw - 30,
              by = gry + 30,
              br = 28;
            const gbdg = this.add.graphics();
            gbdg.fillStyle(0xf0d060, 0.22);
            gbdg.fillCircle(bx, by, br + 8);
            gbdg.fillStyle(0x120d00, 1);
            gbdg.fillCircle(bx, by, br + 3);
            gbdg.fillStyle(0xb07d08, 1);
            gbdg.fillCircle(bx, by, br);
            gbdg.fillStyle(0xf5c518, 1);
            gbdg.fillCircle(bx, by, br - 3);
            gbdg.fillStyle(0xfff0a0, 0.45);
            gbdg.fillCircle(bx - 7, by - 7, br * 0.45);
            subObjs.push(gbdg);
            const goteClear = this.add
              .text(bx, by + 1, "✓", {
                fontSize: "30px",
                color: "#3a2800",
                fontFamily: UI_FONT,
                fontStyle: "bold",
              })
              .setOrigin(0.5);
            subObjs.push(goteClear);
          }

          const subCleanup = () => subObjs.forEach((o) => o.destroy());

          const senteZone = this.add
            .zone(W / 2, 735, 600, 170)
            .setInteractive();
          senteZone.on("pointerdown", () => {
            subCleanup();
            cleanup();
            this.scene.start("GameScene", {
              mode: "solo",
              aiDifficulty: item.diff,
              playerFirst: true,
            });
          });
          subObjs.push(senteZone);

          const goteZone = this.add.zone(W / 2, 965, 600, 170).setInteractive();
          goteZone.on("pointerdown", () => {
            subCleanup();
            cleanup();
            this.scene.start("GameScene", {
              mode: "solo",
              aiDifficulty: item.diff,
              playerFirst: false,
            });
          });
          subObjs.push(goteZone);

          const backT = this.add
            .text(W / 2, 1160, "← 戻る", {
              fontSize: "30px",
              color: "#8899bb",
              fontFamily: UI_FONT,
            })
            .setOrigin(0.5)
            .setInteractive();
          backT.on("pointerdown", subCleanup);
          subObjs.push(backT);
        });
      objs.push(zone);
    }

    // ─── 阿修羅解放アニメーション（初回のみ） ─────────────────────────────────────
    if (ashuraUnlocked && !ashuraShown) {
      const kisinRange = itemObjRanges["kisin"];
      const kyubiRange = itemObjRanges["kyubi"];
      const ashuraRange = itemObjRanges["ashura"];
      const kisinList = kisinRange ? objs.slice(...kisinRange) : [];
      const kyubiList = kyubiRange ? objs.slice(...kyubiRange) : [];
      const ashuraList = ashuraRange ? objs.slice(...ashuraRange) : [];
      [...kisinList, ...kyubiList, ...ashuraList].forEach((o) => o.setAlpha(0));
      soundManager.playBgm("魔王魂_阿修羅出現");
      stopFusion = playAiFusion(this, () => {
        try {
          localStorage.setItem("ashuraShown", "1");
        } catch (error) {
          console.error("[ai-fusion] 演出完了を保存できませんでした", error);
          cleanup();
          this._showNotice("演出完了を保存できませんでした。もう一度お試しください。");
          return;
        }
        cleanup();
        this._showDifficultyPanel();
      });
    }

    const cancelT = this.add
      .text(W / 2, (rematchOpen ? 1700 : 1510) + shiftY, "キャンセル", {
        fontSize: "30px",
        color: "#8899bb",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5)
      .setInteractive();
    cancelT.on("pointerdown", cleanup);
    objs.push(cancelT);
  }

  _showNotice(message) {
    const W = 1080;
    if (this._noticeTween) {
      this._noticeTween.stop();
      this._noticeObj?.destroy();
    }
    const tx = this.add
      .text(W / 2, 1420, message, {
        fontSize: "30px",
        color: "#ffcc88",
        fontFamily: UI_FONT,
        stroke: "#000000",
        strokeThickness: 4,
        backgroundColor: "#1a1e2e",
        padding: { x: 24, y: 14 },
      })
      .setOrigin(0.5)
      .setDepth(999)
      .setAlpha(1);
    this._noticeObj = tx;
    this._noticeTween = this.tweens.add({
      targets: tx,
      alpha: 0,
      delay: 2200,
      duration: 700,
      ease: "Sine.In",
      onComplete: () => {
        if (tx.active) tx.destroy();
      },
    });
  }

  _createPlayerPanel(W, H) {
    const pw = 920;
    const panel = this.add.image(W / 2, 1760, "mancolor-profile-panel");
    panel.setScale(pw / panel.width);

    // プレイヤー名（中央左）と「名前を変更」（右寄せ）を同じ行に並べる
    this._playerNameText = this.add
      .text(W / 2 - 280, panel.y, getPlayerName(), {
        fontSize: "64px",
        color: "#f4deb1",
        fontFamily: DISPLAY_FONT,
      })
      .setOrigin(0, 0.5);
    this._refreshPlayerPanel();

    const editBtn = this.add
      .text(W / 2 + 400, panel.y, "✎ 名前を変更", {
        fontSize: "34px",
        color: "#88aacc",
        fontFamily: UI_FONT,
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });
    editBtn.on("pointerover", () => editBtn.setColor("#aaccee"));
    editBtn.on("pointerout", () => editBtn.setColor("#88aacc"));
    editBtn.on("pointerdown", () => this._showNameEditDialog());

    const iconX = W / 2 - 370;
    // 元画像に焼き込まれた人物と丸枠を、同じ背景色で覆う。
    this.add.rectangle(iconX, 1760, 124, 124, 0x090d1b);
    this._playerIcon = this.add.container(iconX, 1760);
    this._refreshPlayerIcon();
    this.add.zone(iconX, 1760, 110, 110)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this._showPlayerIconDialog());
  }

  _addIconStone(setId, color, x, y, radius) {
    const key = stoneSkinTextureKey(setId, color);
    if (key) {
      if (!this.textures.exists(key)) throw new Error(`石の画像が見つかりません: ${key}`);
      const image = this.add.image(x, y, key);
      return image.setScale(radius * 2 / Math.max(image.width, image.height));
    }
    const graphic = this.add.graphics().setPosition(x, y);
    drawStoneGraphic(graphic, setId, STONE_COLORS[color].hex, 0, 0, radius);
    return graphic;
  }

  _refreshPlayerIcon() {
    try {
      const { setId, color } = getPlayerIcon();
      this._playerIcon.removeAll(true);
      this._playerIcon.add(this._addIconStone(setId, color, 0, 0, 46));
    } catch (error) {
      console.error("[profile] アイコンを表示できませんでした", error);
      this._showNotice("アイコンを読み込めませんでした。アイコンを選び直してください。");
    }
  }

  _showPlayerIconDialog() {
    const owned = SKIN_SETS.filter(set => isSkinSetOwned(set.id));
    const colors = Object.keys(STONE_COLORS);
    const dialog = this.add.container(0, 0).setDepth(1000);
    const content = this.add.container(0, 0);
    const overlay = this.add.rectangle(540, 960, 1080, 1920, 0x000000, 0.76)
      .setInteractive();
    dialog.add(overlay);
    dialog.add(this.add.rectangle(540, 960, 940, 1320, 0x101629)
      .setStrokeStyle(2, 0xe5d5b1, 0.7));
    dialog.add(this.add.text(540, 375, "プレイヤーアイコン", {
      fontSize: "48px", color: "#f4deb1", fontFamily: DISPLAY_FONT,
    }).setOrigin(0.5));
    dialog.add(this.add.text(540, 445, "所持している石と色をタップして選択", {
      fontSize: "28px", color: "#ced9ea", fontFamily: UI_FONT,
    }).setOrigin(0.5));
    dialog.add(content);
    const close = () => dialog.destroy();
    const shutdown = () => close();
    this.events.once("shutdown", shutdown);
    dialog.once("destroy", () => this.events.off("shutdown", shutdown));
    dialog.add(this.add.text(540, 1545, "閉じる", {
      fontSize: "36px", color: "#ced9ea", fontFamily: UI_FONT,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on("pointerdown", close));
    let page = 0;
    const pageCount = Math.ceil(owned.length / 5);
    const render = () => {
      content.removeAll(true);
      owned.slice(page * 5, page * 5 + 5).forEach((set, row) => {
        const y = 570 + row * 160;
        content.add(this.add.text(130, y - 52, set.label, {
          fontSize: "30px", color: "#f4deb1", fontFamily: DISPLAY_FONT,
        }));
        colors.forEach((color, column) => {
          const x = 180 + column * 180;
          content.add(this._addIconStone(set.id, color, x, y + 22, 43));
          content.add(this.add.zone(x, y + 22, 110, 110)
            .setInteractive({ useHandCursor: true }).on("pointerdown", () => {
              try {
                setPlayerIcon(set.id, color);
                this._refreshPlayerIcon();
                close();
              } catch (error) {
                console.error("[profile] アイコンを保存できませんでした", error);
                close();
                this._showNotice("アイコンを保存できませんでした。端末の空き容量をご確認ください。");
              }
            }));
        });
      });
      content.add(this.add.text(540, 1435, `${page + 1} / ${pageCount}`, {
        fontSize: "30px", color: "#ced9ea", fontFamily: UI_FONT,
      }).setOrigin(0.5));
      for (const step of [-1, 1]) {
        const enabled = page + step >= 0 && page + step < pageCount;
        const button = this.add.text(540 + step * 290, 1435, step < 0 ? "前へ" : "次へ", {
          fontSize: "34px", color: enabled ? "#f4deb1" : "#596174", fontFamily: UI_FONT,
        }).setOrigin(0.5);
        content.add(button);
        if (enabled) button.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
          page += step;
          render();
        });
      }
    };
    render();
  }

  _refreshPlayerPanel() {
    if (this._playerNameText) {
      this._playerNameText.setText(getPlayerName());
      this._playerNameText.setScale(Math.min(1, 420 / this._playerNameText.width));
    }
  }

  _showNameEditDialog() {
    const W = 1080;
    const H = 1920;
    const objs = [];

    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.72);
    overlay.setInteractive();
    objs.push(overlay);

    const panelG = this.add.graphics();
    panelG.fillStyle(0x1a2535, 0.98);
    panelG.lineStyle(2, 0xe5d5b1, 0.5);
    panelG.fillRoundedRect(W / 2 - 380, 740, 760, 440, 24);
    panelG.strokeRoundedRect(W / 2 - 380, 740, 760, 440, 24);
    objs.push(panelG);

    objs.push(
      this.add
        .text(W / 2, 820, "プレイヤー名を変更", {
          fontSize: "38px",
          color: "#e6decf",
          fontFamily: UI_FONT,
        })
        .setOrigin(0.5),
    );

    // 入力欄（DOM input）
    const inputEl = document.createElement("input");
    inputEl.type = "text";
    inputEl.maxLength = 20;
    inputEl.value = getPlayerName();
    inputEl.style.cssText = [
      "position:fixed",
      "left:50%",
      "top:54%",
      "transform:translate(-50%,-50%)",
      "width:460px",
      "padding:14px 18px",
      "font-size:28px",
      "font-family:Yu Gothic UI,sans-serif",
      "background:#0e1520",
      "color:#f4deb1",
      "border:2px solid #e5d5b1",
      "border-radius:10px",
      "outline:none",
      "z-index:9999",
      "text-align:center",
    ].join(";");
    document.body.appendChild(inputEl);
    inputEl.focus();
    inputEl.select();

    const cleanup = () => {
      document.body.removeChild(inputEl);
      objs.forEach((o) => o.destroy());
    };

    // 確定ボタン
    const confirmG = this.add.graphics();
    confirmG.fillStyle(0x2e6652, 0.9);
    confirmG.lineStyle(2, 0xf2dfbe, 0.7);
    confirmG.fillRoundedRect(W / 2 - 200, 1020, 400, 90, 16);
    confirmG.strokeRoundedRect(W / 2 - 200, 1020, 400, 90, 16);
    objs.push(confirmG);

    const confirmT = this.add
      .text(W / 2, 1065, "決定", {
        fontSize: "40px",
        color: "#fff8e6",
        fontFamily: DISPLAY_FONT,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    objs.push(confirmT);

    const confirm = () => {
      const newName = inputEl.value.trim().slice(0, 20);
      if (newName) {
        setPlayerName(newName);
        this._refreshPlayerPanel();
        this._showNotice(`名前を「${newName}」に変更しました`);
      }
      cleanup();
    };

    confirmT.on("pointerdown", confirm);
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") confirm();
      if (e.key === "Escape") cleanup();
    });

    objs.push(
      this.add
        .text(W / 2, 1150, "キャンセル", {
          fontSize: "28px",
          color: "#8899bb",
          fontFamily: UI_FONT,
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", cleanup),
    );
  }
}
