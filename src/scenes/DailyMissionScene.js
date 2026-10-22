import { soundManager } from "../audio/SoundManager.js";
import { drawMenuBackground, uiImage } from "../ui/theme.js";
import {
  claimDailyMission,
  DAILY_MISSIONS,
  DAILY_MISSION_RESET_HOUR,
  getDailyMissionState,
} from "../data/dailyMissions.mjs";
import {
  isRewardedAdAvailable,
  showRewardedAd,
} from "../net/ads.js";

const UI_FONT = '"Yu Gothic UI", "Hiragino Sans", sans-serif';
const DISPLAY_FONT = '"Yu Mincho", "Hiragino Mincho ProN", serif';

export class DailyMissionScene extends Phaser.Scene {
  constructor() {
    super({ key: "DailyMissionScene" });
    this.content = null;
    this.notice = null;
    this.claimingMissionIds = new Set();
  }

  create() {
    const W = 1080;
    const H = 1920;
    drawMenuBackground(this, W, H);

    this.add
      .text(W / 2, 135, "今日のミッション", {
        fontSize: "72px",
        color: "#f4deb1",
        fontFamily: DISPLAY_FONT,
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, 220, "対局を達成してポイントを集めよう", {
        fontSize: "30px",
        color: "#ced9ea",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5);

    this._createBackButton();
    this.content = this.add.container(0, 0);
    this.notice = this.add
      .text(W / 2, 1570, "", {
        fontSize: "28px",
        color: "#ffd28a",
        fontFamily: UI_FONT,
        align: "center",
        wordWrap: { width: 900 },
      })
      .setOrigin(0.5);
    this._render();
  }

  _createBackButton() {
    const x = 80;
    const y = 80;
    uiImage(this, "back", x, y, 88, 88);
    this.add
      .zone(x, y, 88, 88)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        soundManager.se_button?.();
        this.scene.start("LobbyScene");
      });
  }

  _render() {
    this.content.removeAll(true);
    const state = getDailyMissionState();

    this.content.add(uiImage(this, "wallet", 540, 285, 510, 86));
    this.content.add(this.add.image(327, 285, "mancolor-point-gem").setDisplaySize(55, 55));
    this.content.add(
      this.add
        .text(540, 285, `所持ポイント: ${state.points} pt`, {
          fontSize: "34px",
          color: "#f0d39a",
          fontFamily: UI_FONT,
        })
        .setOrigin(0.5),
    );

    const visibleMissions = DAILY_MISSIONS.filter((mission) => !state.claimed[mission.id]);
    visibleMissions.forEach((mission, index) => {
      this._renderMissionCard(mission, index, state);
    });

    if (visibleMissions.length === 0) {
      this.content.add(
        this.add.text(540, 475, "今日の報酬はすべて受取済みです", {
          fontSize: "34px",
          color: "#ced9ea",
          fontFamily: UI_FONT,
        }).setOrigin(0.5),
      );
    }

    this.content.add(
      this.add
        .text(540, 1490, `ミッションは毎日${DAILY_MISSION_RESET_HOUR}:00に更新`, {
          fontSize: "26px",
          color: "#9aa4b8",
          fontFamily: UI_FONT,
        })
        .setOrigin(0.5),
    );
  }

  _renderMissionCard(mission, index, state) {
    const x = 70;
    const y = 340 + index * 300;
    const width = 940;
    const height = 270;
    const isComplete = state.progress[mission.id];
    const isClaimed = state.claimed[mission.id];
    const card = uiImage(this, "mission", x + width / 2, y + height / 2, width, height);
    this.content.add(card);

    this.content.add(
      this.add
        .text(x + 34, y + 45, mission.title, {
          fontSize: "34px",
          color: "#f4deb1",
          fontFamily: DISPLAY_FONT,
        })
        .setOrigin(0, 0.5),
    );
    this.content.add(
      this.add
        .text(x + 34, y + 92, mission.description, {
          fontSize: "23px",
          color: "#aeb8c9",
          fontFamily: UI_FONT,
        })
        .setOrigin(0, 0.5),
    );
    const baseLabel = isClaimed ? "受取済み" : `受取 +1 pt`;
    const adLabel = !isRewardedAdAvailable()
      ? "動画報酬はAndroid版"
      : "動画で +2 pt";
    this._createActionButton({
      x: x + 265,
      y: y + 205,
      label: baseLabel,
      enabled: isComplete && !isClaimed,
      onClick: () => this._claim(mission.id, false),
    });
    this._createActionButton({
      x: x + 675,
      y: y + 205,
      label: adLabel,
      enabled: isComplete && !isClaimed && isRewardedAdAvailable(),
      onClick: () => this._claim(mission.id, true),
    });
  }

  _createActionButton({ x, y, label, enabled, onClick }) {
    const width = 350;
    const height = 70;
    const graphics = uiImage(this, enabled ? "claim" : "disabled", x, y, width, height);
    this.content.add(graphics);
    this.content.add(
      this.add
        .text(x, y, label, {
          fontSize: "24px",
          color: enabled ? "#e6decf" : "#7f899b",
          fontFamily: UI_FONT,
        })
        .setOrigin(0.5),
    );
    if (!enabled) return;

    this.content.add(
      this.add
        .zone(x, y, width, height)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", onClick),
    );
  }

  async _claim(missionId, doubleReward) {
    if (this.claimingMissionIds.has(missionId)) return;
    this.claimingMissionIds.add(missionId);
    this.notice.setText("");
    try {
      if (doubleReward) {
        const rewarded = await showRewardedAd();
        if (!rewarded) {
          this.notice.setText(
            isRewardedAdAvailable()
              ? "広告を再生できませんでした。時間をおいて再度お試しください。"
              : "動画報酬はAndroidアプリ版で利用できます。",
          );
          return;
        }
      }
      const result = claimDailyMission(missionId, doubleReward);
      if (!result.claimed) {
        this.notice.setText("このミッションは達成前か、受取済みです。");
        return;
      }
      this._render();
    } catch (error) {
      console.error("[daily-missions] 報酬の受け取りに失敗しました", error);
      this.notice.setText("報酬を保存できませんでした。端末の空き容量をご確認ください。");
    } finally {
      this.claimingMissionIds.delete(missionId);
    }
  }

}
