const TEXTURE = "mancolor-ui-secondary";

const FRAMES = {
  back: [38, 38, 84, 84],
  "tab-active": [145, 45, 400, 78],
  "tab-idle": [564, 45, 400, 78],
  owned: [36, 181, 156, 42],
  locked: [217, 181, 156, 42],
  points: [400, 181, 155, 42],
  lock: [609, 177, 41, 51],
  coin: [703, 177, 66, 67],
  equip: [36, 300, 210, 60],
  equipped: [272, 300, 210, 60],
  claim: [509, 300, 210, 60],
  disabled: [746, 300, 210, 60],
  pedestal: [38, 409, 179, 184],
  "pedestal-active": [251, 406, 188, 190],
  "pedestal-locked": [474, 409, 179, 184],
  wallet: [36, 754, 510, 86],
  card: [55, 883, 872, 226],
  "card-active": [52, 1134, 878, 233],
  "card-locked": [55, 1393, 872, 226],
  mission: [55, 1646, 872, 301],
};

const EQUIPPED_FRAMES = {
  "shop-pedestal": [120, 1210, 355, 360],
  "shop-pedestal-active": [548, 1196, 389, 389],
  "shop-equip": [1035, 1218, 432, 126],
  "shop-equipped": [1035, 1402, 432, 131],
  "shop-ribbon": [1035, 1590, 432, 112],
};

const AI_FRAMES = {
  kooni: [40, 40, 800, 174],
  yasha: [40, 240, 800, 174],
  rasetsu: [40, 440, 800, 174],
  kisin: [40, 640, 392, 174],
  kyubi: [448, 640, 392, 174],
  ashura: [40, 840, 800, 174],
  kugutsu: [40, 1040, 800, 174],
};

export function registerUiFrames(scene) {
  for (const key of ["mancolor-ui-ai", "mancolor-ui-ai-locked"]) {
    const ai = scene.textures.get(key);
    for (const [name, [x, y, width, height]] of Object.entries(AI_FRAMES)) {
      ai.add(name, 0, x, y, width, height);
    }
  }
  const texture = scene.textures.get(TEXTURE);
  const source = texture.getSourceImage();
  for (const [name, [x, y, width, height]] of Object.entries(FRAMES)) {
    texture.add(
      name, 0,
      Math.round(x * source.width / 982),
      Math.round(y * source.height / 2000),
      Math.round(width * source.width / 982),
      Math.round(height * source.height / 2000),
    );
  }
  const equipped = scene.textures.get("mancolor-ui-equipped");
  const image = equipped.getSourceImage();
  for (const [name, [x, y, width, height]] of Object.entries(EQUIPPED_FRAMES)) {
    equipped.add(name, 0,
      Math.round(x * image.width / 2000), Math.round(y * image.height / 1852),
      Math.round(width * image.width / 2000), Math.round(height * image.height / 1852));
  }
}

export function uiImage(scene, frame, x, y, width, height) {
  const texture = Object.hasOwn(EQUIPPED_FRAMES, frame) ? "mancolor-ui-equipped" : TEXTURE;
  return scene.add.image(x, y, texture, frame).setDisplaySize(width, height);
}

export function drawMenuBackground(scene, width, height) {
  scene.add.image(width / 2, height / 2, "mancolor-home-bg")
    .setDisplaySize(width, height);
  scene.add.rectangle(width / 2, height / 2, width, height, 0x080b18, 0.88);
}
