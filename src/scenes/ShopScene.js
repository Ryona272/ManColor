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
import { drawMenuBackground, uiImage } from "../ui/theme.js";
import { getDailyMissionState, redeemSkinWithPoints } from "../data/dailyMissions.mjs";
import {
  isRewardedAdAvailable,
  showRewardedAd,
} from "../net/ads.js";

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
    this.page = 0;
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
    this.add.image(313, 370, "mancolor-point-gem").setDisplaySize(48, 48);
    this.pointText = this.add.text(570, 370, "", {
      fontSize: "30px", color: "#f0d39a", fontFamily: UI_FONT,
    }).setOrigin(0.5);
    this.notice = this.add.text(540, 1850, "", {
      fontSize: "26px", color: "#ffd28a", fontFamily: UI_FONT,
      align: "center", wordWrap: { width: 940 },
    }).setOrigin(0.5);
    this._renderList(W);
    this.events.once("shutdown", () => this._collapseColorPreview(true));
  }

  _drawBackground(W, H) {
    drawMenuBackground(this, W, H);
  }

  _createBackButton(W) {
    const bx = 80,
      by = 80,
      br = 44;
    const icon = uiImage(this, "back", bx, by, br * 2, br * 2);
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
      const g = uiImage(this, "tab-idle", x, y, tabW, 78);
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
        this.page = 0;
        this.notice.setText("");
        this._renderList(W);
      });
      const entry = { key: tab.key, x, y, w: tabW, g, text };
      this._drawTab(entry);
      return entry;
    });
  }

  _drawTab(entry) {
    const active = entry.key === this.activeTab;
    entry.g.setFrame(active ? "tab-active" : "tab-idle").setDisplaySize(entry.w, 78);
    entry.text.setColor(active ? "#f4deb1" : "#8a92a5");
  }

  _renderList(W) {
    this._collapseColorPreview(true);
    this._tabButtons.forEach((t) => this._drawTab(t));
    this._listContainer.removeAll(true);
    this.pointText.setText(`所持ポイント: ${getDailyMissionState().points} pt`);

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

    const perPage = 5;
    const pageCount = Math.ceil(SKIN_SETS.length / perPage);
    this.page = Phaser.Math.Clamp(this.page, 0, pageCount - 1);
    SKIN_SETS.slice(this.page * perPage, (this.page + 1) * perPage).forEach((set, i) => {
      const y = startY + i * (cardH + gap);
      this._listContainer.add(this._createSkinSetCard(W, y, cardW, cardH, set));
    });
    this._listContainer.add(this.add.text(W / 2, 1750, `${this.page + 1} / ${pageCount}`, {
      fontSize: "30px", color: "#e6decf", fontFamily: UI_FONT,
    }).setOrigin(0.5));
    for (const step of [-1, 1]) {
      const enabled = this.page + step >= 0 && this.page + step < pageCount;
      const x = W / 2 + step * 270;
      this._listContainer.add(uiImage(this, enabled ? "equip" : "disabled", x, 1750, 220, 70));
      this._listContainer.add(this.add.text(x, 1750, step < 0 ? "前へ" : "次へ", {
        fontSize: "28px", color: enabled ? "#e6decf" : "#7f899b", fontFamily: UI_FONT,
      }).setOrigin(0.5));
      if (enabled) this._listContainer.add(this.add.zone(x, 1750, 220, 70)
        .setInteractive({ useHandCursor: true }).on("pointerdown", () => {
          this.page += step;
          this.notice.setText("");
          this._renderList(W);
        }));
    }
  }

  _createSkinSetCard(W, y, cardW, cardH, set) {
    const container = this.add.container(0, 0);
    const x = W / 2 - cardW / 2;
    const owned = isSkinSetOwned(set.id);
    const selected = getSelectedSkinSet() === set.id;
    const previewColor = "red";
    const radius = 55;

    const g = uiImage(this, selected ? "card-active" : owned ? "card" : "card-locked",
      W / 2, y + cardH / 2, cardW, cardH);
    container.add(g);
    if (selected) {
      g.setTint(0xffdf99);
    }

    // プレビュー（代表として赤石のみ表示。装備は5色セットで反映される）
    const previewY = y + cardH / 2;
    const previewX = x + 130;
    container.add(uiImage(this, selected ? "shop-pedestal-active" : owned ? "shop-pedestal" : "pedestal-locked",
      previewX, previewY, 160, 164));
    const preview = this._drawStonePreview(
      set.id,
      previewColor,
      previewX,
      previewY,
      radius,
      !owned,
    );
    container.add(preview);

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
          owned ? "入手済み" : set.pointCost
            ? `${set.pointCost} ptで交換` : (getSkinUnlockLabel(set.id) ?? "未実装"),
          {
            fontSize: "26px",
            color: owned ? "#88ccaa" : "#9aa4b8",
            fontFamily: UI_FONT,
          },
        )
        .setOrigin(0, 0.5),
    );

    const btnW = 220,
      btnH = 60;
    const btnX = x + cardW - btnW / 2 - 30;
    const btnY = y + cardH - btnH / 2 - 20;
    const isAdUnlock = set.unlockInfo?.type === "ad";
    const pointCost = set.pointCost;
    const affordable = Boolean(pointCost && getDailyMissionState().points >= pointCost);
    const canWatchAd = isRewardedAdAvailable();
    let adWatching = false;
    const frame = selected ? "shop-equipped" : owned ? "shop-equip"
      : affordable || (isAdUnlock && canWatchAd) ? "claim" : "disabled";
    const btnG = uiImage(this, frame, btnX, btnY, btnW, btnH);
    container.add(btnG);
    const btnLabel = () => {
      if (owned) return selected ? "装備中" : "装備する";
      if (pointCost) return affordable ? `${pointCost} ptで交換` : `あと ${pointCost - getDailyMissionState().points} pt`;
      if (isAdUnlock) return canWatchAd ? "動画で入手" : "Android版限定";
      return "未入手";
    };
    const btnText = this.add
      .text(btnX + (selected ? 16 : 0), btnY, btnLabel(), {
        fontSize: "25px",
        color:
          selected ? "#30200a" : owned || affordable || (isAdUnlock && canWatchAd) ? "#e6decf" : "#7f899b",
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
    } else if (!owned && pointCost && affordable) {
      const hit = this.add.zone(btnX, btnY, btnW, btnH)
        .setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => this._redeemSkin(set));
      container.add(hit);
    }

    if (!owned && isAdUnlock && canWatchAd) {
      const hit = this.add
        .zone(btnX, btnY, btnW, btnH)
        .setInteractive({ useHandCursor: true });
      hit.on("pointerdown", async () => {
        if (adWatching) return;
        soundManager.se_button?.();
        adWatching = true;
        btnText.setText("視聴中…");
        try {
          const rewarded = await showRewardedAd();
          if (rewarded) {
            unlockSkinSet(set.id);
          }
          if (this.scene.isActive()) {
            this.notice.setText(rewarded ? `${set.label}を入手しました。装備できます。`
              : "動画の視聴完了を確認できませんでした。もう一度お試しください。");
            this._renderList(1080);
          }
        } catch (error) {
          console.error("[shop] 動画報酬の入手に失敗しました", error);
          if (this.scene.isActive()) {
            this.notice.setText("動画報酬の入手に失敗しました。端末の空き容量・通信状態をご確認ください。");
            this._renderList(1080);
          }
        } finally {
          adWatching = false;
        }
      });
      container.add(hit);
    }

    return container;
  }

  _redeemSkin(set) {
    try {
      const result = redeemSkinWithPoints(set.id);
      this.notice.setText(result.redeemed ? `${set.label}を入手しました。装備できます。`
        : result.reason === "owned" ? "入手済みのデザインです。" : "ポイントが足りません。");
      this._renderList(1080);
    } catch (error) {
      console.error("[shop] ポイント交換を保存できませんでした", error);
      this.notice.setText("交換を保存できませんでした。端末の空き容量をご確認ください。");
    }
  }
  /** 石の色・デザインを描画（画像デザインならImage、それ以外はGraphics） */
  _drawStonePreview(setId, color, x, y, radius, dim = false) {
    const def = STONE_COLORS[color];
    const texKey = stoneSkinTextureKey(setId, color);
    if (texKey && this.textures.exists(texKey)) {
      const img = this.add.image(x, y, texKey);
      const scale = (radius * 2) / Math.max(img.width, img.height);
      img.setScale(scale);
      if (dim) img.setAlpha(0.35);
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
