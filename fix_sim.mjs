import { readFileSync, writeFileSync } from "fs";

const path = "c:/Users/User/OneDrive/Desktop/ManColor/simulate.mjs";
let content = readFileSync(path, "utf8");

const marker = "function runOneGame(ai1, ai2, ai1Role, kkThresh) {";

if (!content.includes(marker)) {
  console.log("MARKER NOT FOUND");
  process.exit(1);
}

if (content.includes("function kkThreshForAI")) {
  console.log("kkThreshForAI ALREADY EXISTS");
  process.exit(0);
}

const helper = [
  "// くたくた発動閾値: AI種別ごとのルールに従う",
  "function kkThreshForAI(aiName) {",
  "  // kisin/ashura/ashuraki: 発動可能なら常に発動（閾値=0 → own>=0 常にtrue）",
  '  if (["kisin", "ashura", "ashuraki"].includes(aiName)) return 0;',
  "  // kugutsu/kooni/yasha/rasetsu/kyubi: 標準（AI賽壇 ≥ 相手賽壇）",
  "  return 1.0;",
  "}",
  "",
].join("\n");

content = content.replace(marker, helper + marker);
writeFileSync(path, content, "utf8");
console.log("OK: kkThreshForAI inserted");
