import { STONE_COLORS } from "../data/constants.js";
import {
  SKIN_SETS,
  stoneSkinTextureKey,
  isSkinSetOwned,
  getSelectedSkinSet,
  selectSkinSet,
  getSkinUnlockLabel,
  unlockSkinSet,
} from "../data/stoneSkins.js";
import { soundManager } from "../audio/SoundManager.js";
import { showRewardedAd } from "../net/ads.js";

const UI_FONT = '"Yu Gothic UI", "Hiragino Sans", sans-serif';
const DISPLAY_FONT = '"Yu Mincho", "Hiragino Mincho ProN", serif';

/**
 * ShopScene - 石デザイン・背景などを入手/装備するショップ画面
 * タブ: 石デザイン / 背景（近日公開）
 */
export class ShopScene extends Phaser.Scene {
  constructor() {
    super({ key: "ShopScene" });
    this.activeTab = "stones";
    this._tabButtons = [];
    this._listContainer = null;
    this._expandedSetId = null;
    this._expandedObjs = [];
  }

  create() {
    const W = 1080;
    const H = 1920;
    this._drawBackground(W, H);

    this.add
      .text(W / 2, 140, "ショップ", {
        fontSize: "88px",
        color: "#f4deb1",
        fontFamily: DISPLAY_FONT,
        stroke: "#1a130c",
        strokeThickness: 7,
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, 220, "石デザインや背景を入手・装備できます", {
        fontSize: "30px",
        color: "#ced9ea",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5);

    this._createBackButton(W);
    this._createTabs(W);
    this._listContainer = this.add.container(0, 0);
    this._renderList(W);
  }

  _drawBackground(W, H) {
    const g = this.add.graphics();
    g.fillGradientStyle(0x080d18, 0x0c1022, 0x160b1a, 0x10060f, 1);
    g.fillRect(0, 0, W, H);
    g.lineStyle(1.5, 0xe5d5b1, 0.35);
    g.strokeRoundedRect(30, 30, W - 60, H - 60, 28);
  }

  _createBackButton(W) {
    const bx = 80,
      by = 80,
      br = 44;
    const g = this.add.graphics();
    g.fillStyle(0x1a1e2e, 0.85);
    g.fillCircle(bx, by, br);
    g.lineStyle(1.5, 0xe5d5b1, 0.4);
    g.strokeCircle(bx, by, br);
    const icon = this.add
      .text(bx, by, "←", { fontSize: "44px", color: "#d4c89a" })
      .setOrigin(0.5);
    const hit = this.add.zone(bx, by, br * 2, br * 2).setInteractive();
    hit.on("pointerover", () => icon.setAlpha(0.7));
    hit.on("pointerout", () => icon.setAlpha(1.0));
    hit.on("pointerdown", () => {
      soundManager.se_button?.();
      this.scene.start("LobbyScene");
    });
  }

  _createTabs(W) {
    const tabs = [
      { key: "stones", label: "石デザイン" },
      { key: "background", label: "背景（近日公開）" },
    ];
    const tabW = 420;
    const totalW = tabW * tabs.length + 20;
    const startX = W / 2 - totalW / 2;
    const y = 300;

    this._tabButtons = tabs.map((tab, i) => {
      const x = startX + i * (tabW + 20) + tabW / 2;
      const g = this.add.graphics();
      const text = this.add
        .text(x, y, tab.label, {
          fontSize: "32px",
          color: "#e6decf",
          fontFamily: UI_FONT,
        })
        .setOrigin(0.5);
      const hit = this.add
        .zone(x, y, tabW, 70)
        .setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => {
        soundManager.se_button?.();
        this.activeTab = tab.key;
        this._renderList(W);
      });
      const entry = { key: tab.key, x, y, w: tabW, g, text };
      this._drawTab(entry);
      return entry;
    });
  }

  _drawTab(entry) {
    const active = entry.key === this.activeTab;
    entry.g.clear();
    entry.g.fillStyle(active ? 0x2a4060 : 0x141824, active ? 0.9 : 0.6);
    entry.g.fillRoundedRect(
      entry.x - entry.w / 2,
      entry.y - 35,
      entry.w,
      70,
      14,
    );
    entry.g.lineStyle(1.5, active ? 0xf0d39a : 0xe5d5b1, active ? 0.7 : 0.2);
    entry.g.strokeRoundedRect(
      entry.x - entry.w / 2,
      entry.y - 35,
      entry.w,
      70,
      14,
    );
    entry.text.setColor(active ? "#f4deb1" : "#8a92a5");
  }

  _renderList(W) {
    this._collapseColorPreview(true);
    this._tabButtons.forEach((t) => this._drawTab(t));
    this._listContainer.removeAll(true);

    if (this.activeTab === "background") {
      const t = this.add
        .text(W / 2, 700, "背景デザインは近日公開予定です", {
          fontSize: "34px",
          color: "#9aa4b8",
          fontFamily: UI_FONT,
        })
        .setOrigin(0.5);
      this._listContainer.add(t);
      return;
    }

    const cardW = 940;
    const cardH = 220;
    const gap = 30;
    const startY = 420;

    SKIN_SETS.forEach((set, i) => {
      const y = startY + i * (cardH + gap);
      this._listContainer.add(this._createSkinSetCard(W, y, cardW, cardH, set));
    });
  }

  _createSkinSetCard(W, y, cardW, cardH, set) {
    const container = this.add.container(0, 0);
    const x = W / 2 - cardW / 2;
    const owned = isSkinSetOwned(set.id);
    const selected = getSelectedSkinSet() === set.id;
    const previewColor = "red";
    const radius = 55;

    const g = this.add.graphics();
    g.fillStyle(0x0e131f, 0.92);
    g.fillRoundedRect(x, y, cardW, cardH, 18);
    g.lineStyle(1.5, 0xe5d5b1, 0.25);
    g.strokeRoundedRect(x, y, cardW, cardH, 18);
    container.add(g);

    // プレビュー（代表として赤石のみ表示。装備は5色セットで反映される）
    const previewY = y + cardH / 2;
    const previewX = x + 130;
    const preview = this._drawStonePreview(
      set.id,
      previewColor,
      previewX,
      previewY,
      radius,
      !owned,
    );
    container.add(preview);
    if (selected) {
      const sel = this.add.graphics();
      sel.lineStyle(4, 0xf0d39a, 0.9);
      sel.strokeCircle(previewX, previewY, radius + 7);
      container.add(sel);
    }
    if (!owned) {
      const lock = this.add
        .text(previewX, previewY, "🔒", { fontSize: "34px" })
        .setOrigin(0.5);
      container.add(lock);
    }

    // タップで他4色が奥からスライドして出てくる演出
    const previewHit = this.add
      .zone(previewX, previewY, radius * 2 + 20, radius * 2 + 20)
      .setInteractive({ useHandCursor: true });
    previewHit.on("pointerdown", () => {
      soundManager.se_button?.();
      this._toggleColorPreview(set, previewX, previewY, radius);
    });
    container.add(previewHit);

    // ラベル・説明文はプレビュー画像に被らない位置（画像のすぐ右）
    const textX = previewX + radius + 40;
    container.add(
      this.add
        .text(textX, y + 46, set.label, {
          fontSize: "36px",
          color: "#f4deb1",
          fontFamily: DISPLAY_FONT,
        })
        .setOrigin(0, 0.5),
    );

    container.add(
      this.add
        .text(
          textX,
          y + 96,
          owned ? "入手済み" : (getSkinUnlockLabel(set.id) ?? "未実装"),
          {
            fontSize: "26px",
            color: owned ? "#88ccaa" : "#9aa4b8",
            fontFamily: UI_FONT,
          },
        )
        .setOrigin(0, 0.5),
    );

    // 装備ボタン（カード右下）。動画視聴で入手できるデザインは未入手時に「動画を見る」ボタンにする
    const btnW = 220,
      btnH = 60;
    const btnX = x + cardW - btnW / 2 - 30;
    const btnY = y + cardH - btnH / 2 - 20;
    const isAdUnlock = set.unlockInfo?.type === "ad";
    let adWatching = false;
    const btnG = this.add.graphics();
    const drawBtn = (isSelected) => {
      btnG.clear();
      const activeLook = isSelected || (!owned && isAdUnlock);
      btnG.fillStyle(
        activeLook ? 0x2a4060 : 0x1c2230,
        owned || isAdUnlock ? 0.95 : 0.4,
      );
      btnG.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 12);
      btnG.lineStyle(
        1.5,
        activeLook ? 0xf0d39a : 0xe5d5b1,
        owned || isAdUnlock ? 0.6 : 0.15,
      );
      btnG.strokeRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 12);
    };
    drawBtn(selected);
    container.add(btnG);
    const btnLabel = () => {
      if (owned) return selected ? "装備中" : "装備する";
      if (isAdUnlock) return adWatching ? "視聴中…" : "▶ 動画を見る";
      return "未入手";
    };
    const btnText = this.add
      .text(btnX, btnY, btnLabel(), {
        fontSize: "28px",
        color: owned || isAdUnlock ? "#e6decf" : "#5a6272",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5);
    container.add(btnText);

    if (owned && !selected) {
      const hit = this.add
        .zone(btnX, btnY, btnW, btnH)
        .setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => {
        soundManager.se_button?.();
        selectSkinSet(set.id);
        this._renderList(1080);
      });
      container.add(hit);
    } else if (!owned && isAdUnlock) {
      const hit = this.add
        .zone(btnX, btnY, btnW, btnH)
        .setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => {
        if (adWatching) return;
        soundManager.se_button?.();
        adWatching = true;
        btnText.setText(btnLabel());
        showRewardedAd().then((rewarded) => {
          if (rewarded) {
            unlockSkinSet(set.id);
            this._renderList(1080);
          } else {
            adWatching = false;
            btnText.setText(btnLabel());
          }
        });
      });
      container.add(hit);
    }

    return container;
  }

  /** 石の色・デザインを描画（画像デザインならImage、それ以外はGraphics） */
  _drawStonePreview(setId, color, x, y, radius, dim = false) {
    const def = STONE_COLORS[color];
    const texKey = stoneSkinTextureKey(setId, color);
    if (texKey && this.textures.exists(texKey)) {
      const img = this.add.image(x, y, texKey);
      const scale = (radius * 2) / Math.max(img.width, img.height);
      img.setScale(scale);
      if (dim) img.setAlpha(0.35).setTint(0x333333);
      return img;
    }
    const g = this.add.graphics();
    g.setPosition(x, y);
    const alpha = dim ? 0.35 : 1;
    switch (setId) {
      case "ring":
        g.fillStyle(def.hex, alpha * 0.25);
        g.fillCircle(0, 0, radius);
        g.lineStyle(6, def.hex, alpha);
        g.strokeCircle(0, 0, radius - 4);
        break;
      case "glow":
        // 半透明のぷにぷにボディ
        g.fillStyle(def.hex, alpha * 0.82);
        g.fillCircle(0, 0, radius);
        // 底の影でぷるっとした厚みを表現
        g.fillStyle(0x000000, alpha * 0.16);
        g.fillCircle(0, radius * 0.22, radius * 0.78);
        g.fillStyle(def.hex, alpha * 0.82);
        g.fillCircle(0, -radius * 0.06, radius * 0.9);
        // ぷるぷるの縁取り
        g.lineStyle(2, 0xffffff, alpha * 0.4);
        g.strokeCircle(0, 0, radius - 1);
        // 大きなハイライト＋小さな光の粒
        g.fillStyle(0xffffff, alpha * 0.7);
        g.fillEllipse(
          -radius * 0.32,
          -radius * 0.35,
          radius * 0.85,
          radius * 0.55,
        );
        g.fillStyle(0xffffff, alpha * 0.9);
        g.fillCircle(radius * 0.3, -radius * 0.12, radius * 0.13);
        break;
      default:
        g.fillStyle(def.hex, alpha);
        g.fillCircle(0, 0, radius);
    }
    return g;
  }

  /** タップした石の後ろから、残り4色が横スライドで出てくる/引っ込む演出 */
  _toggleColorPreview(set, previewX, previewY, radius) {
    if (this._expandedSetId === set.id) {
      this._collapseColorPreview();
      return;
    }
    this._collapseColorPreview(true);
    this._expandedSetId = set.id;

    const otherColors = ["blue", "green", "yellow", "purple"];
    const spacing = radius * 2 + 16;
    otherColors.forEach((color, i) => {
      const obj = this._drawStonePreview(
        set.id,
        color,
        previewX,
        previewY,
        radius,
      );
      obj.setDepth(500);
      obj.setAlpha(0);
      obj._originX = previewX;
      this._expandedObjs.push(obj);
      this.tweens.add({
        targets: obj,
        x: previewX + spacing * (i + 1),
        alpha: 1,
        duration: 320,
        delay: i * 60,
        ease: "Back.Out",
      });
    });
  }

  _collapseColorPreview(immediate = false) {
    const objs = this._expandedObjs;
    this._expandedObjs = [];
    this._expandedSetId = null;
    if (!objs.length) return;
    if (immediate) {
      objs.forEach((o) => o.destroy());
      return;
    }
    objs.forEach((obj, i) => {
      this.tweens.add({
        targets: obj,
        x: obj._originX,
        alpha: 0,
        duration: 200,
        delay: i * 25,
        ease: "Sine.easeIn",
        onComplete: () => obj.destroy(),
      });
    });
  }
}
