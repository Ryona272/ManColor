import { readFileSync, writeFileSync } from "fs";

const path = "c:/Users/User/OneDrive/Desktop/ManColor/simulate.mjs";
let content = readFileSync(path, "utf8");

// Bug 2a: Replace ashuraIsOpp definition with proper ashura role detection
const oldAshura = `  const ashuraIsOpp = ai1Role === "opp";\r\n  const ashuraParams = { opponentSentColors: [] };`;

const newAshura = `  // ashura用: 実際のashuraのロールを特定
  const ashuraAiName = [ai1, ai2].find((a) => a === "ashura" || a === "ashuraki") ?? null;
  const ashuraRole = ashuraAiName ? (ashuraAiName === ai1 ? ai1Role : ai2Role) : null;
  const ashuraParams = { opponentSentColors: [] };`;

if (!content.includes(oldAshura)) {
  console.log("ERROR: ashuraIsOpp marker not found");
  process.exit(1);
}
content = content.replace(oldAshura, newAshura);
console.log("OK: ashura role detection fixed");

// Bug 2b: Fix pickParams logic (ashuraIsOpp ? ai1 : ai2) → ashuraAiName
const oldPickParams = `      kugutsuParams && aiName === "kugutsu"\r\n        ? kugutsuParams\r\n        : aiName === (ashuraIsOpp ? ai1 : ai2)\r\n          ? ashuraParams\r\n          : null;`;

const newPickParams = `      kugutsuParams && aiName === "kugutsu"
        ? kugutsuParams
        : ashuraAiName && aiName === ashuraAiName
          ? ashuraParams
          : null;`;

if (!content.includes(oldPickParams)) {
  console.log("ERROR: pickParams marker not found");
  process.exit(1);
}
content = content.replace(oldPickParams, newPickParams);
console.log("OK: pickParams fixed");

// Bug 2c: Fix stone tracking (use ashuraRole instead of ashuraIsOpp)
const oldTracking = `    if (ashuraIsOpp && currentRole === "self") {\r\n      for (let i = 0; i < targets.length; i++) {\r\n        if (targets[i] === 11) {\r\n          ashuraParams.opponentSentColors.push(orderedStones[i].color);\r\n        }\r\n      }\r\n    }`;

const newTracking = `    // ashura用: 相手がashuraストアに石を送った色を記録
    if (ashuraRole !== null && currentRole !== ashuraRole) {
      const ashuraStore = ashuraRole === "opp" ? 11 : 5;
      for (let i = 0; i < targets.length; i++) {
        if (targets[i] === ashuraStore) {
          ashuraParams.opponentSentColors.push(orderedStones[i].color);
        }
      }
    }`;

if (!content.includes(oldTracking)) {
  console.log("ERROR: stone tracking marker not found");
  process.exit(1);
}
content = content.replace(oldTracking, newTracking);
console.log("OK: stone tracking fixed");

writeFileSync(path, content, "utf8");
console.log("All 3 changes written successfully");
