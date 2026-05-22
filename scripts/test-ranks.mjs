import assert from "node:assert/strict";
import {
  applyEloChange,
  calculateEloChange,
  getRankForElo,
} from "../lib/ranks.ts";

const cases = [
  ["high A", "A", 99, 145],
  ["low A", "A", 90, 100],
  ["B", "B", 85, 32],
  ["C", "C", 75, 0],
  ["D", "D", 61, -46],
  ["F", "F", 12, -140],
];

cases.forEach(([label, grade, score, expected]) => {
  const actual = calculateEloChange(grade, score);
  assert.equal(actual, expected, `${label}: expected ${expected}, got ${actual}`);
});

assert.equal(calculateEloChange("Z", 100), 0, "invalid grade is safe");
assert.equal(calculateEloChange("A", 140), 150, "score clamps to 100");
assert.equal(calculateEloChange("F", -40), -150, "score clamps to 0");
assert.equal(applyEloChange(20, "F", 0).eloAfter, 0, "ELO cannot go below 0");
assert.equal(getRankForElo(7600).name, "Diamond", "Diamond threshold");
assert.equal(getRankForElo(24000).name, "Eternal", "Eternal threshold");

let event = applyEloChange(240, "A", 100);
assert.equal(event.rankBefore, "Noob");
assert.equal(event.rankAfter, "Beginner");

event = applyEloChange(7400, "A", 100);
assert.equal(event.rankBefore, "Gold");
assert.equal(event.rankAfter, "Diamond");

event = applyEloChange(15900, "A", 100);
assert.equal(event.rankBefore, "Ethereal");
assert.equal(event.rankAfter, "Master");

console.log("Rank tests passed");
