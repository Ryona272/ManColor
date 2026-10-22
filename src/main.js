import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene.js";
import { LobbyScene } from "./scenes/LobbyScene.js";
import { FriendLobbyScene } from "./scenes/FriendLobbyScene.js";
import { RandomLobbyScene } from "./scenes/RandomLobbyScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { UIScene } from "./scenes/UIScene.js";
import { TutorialScene } from "./scenes/TutorialScene.js";
import { ShopScene } from "./scenes/ShopScene.js";
import { DailyMissionScene } from "./scenes/DailyMissionScene.js";

const config = {
  type: Phaser.AUTO,
  parent: "game-container",
  backgroundColor: "#1a1a2e",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1080,
    height: 1920,
  },
  scene: [
    BootScene,
    LobbyScene,
    FriendLobbyScene,
    RandomLobbyScene,
    GameScene,
    UIScene,
    TutorialScene,
    ShopScene,
    DailyMissionScene,
  ],
};

export default new Phaser.Game(config);
