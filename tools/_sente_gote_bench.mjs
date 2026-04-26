import { runGameOniVsOni } from "../src/sim/SimRunnerRobo.js";

const N = 2000;
const DEPTH = 3;
let senteWins = 0,
  goteWins = 0,
  draws = 0;

for (let i = 0; i < N; i++) {
  const r = runGameOniVsOni(DEPTH, DEPTH);
  if (r.winner === "sente") senteWins++;
  else if (r.winner === "gote") goteWins++;
  else draws++;
}

console.log("N=" + N + ", depth=" + DEPTH);
console.log(
  "先手勝: " + senteWins + " (" + ((senteWins / N) * 100).toFixed(1) + "%)",
);
console.log(
  "後手勝: " + goteWins + " (" + ((goteWins / N) * 100).toFixed(1) + "%)",
);
console.log("引分:   " + draws + " (" + ((draws / N) * 100).toFixed(1) + "%)");
