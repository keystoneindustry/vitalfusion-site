import assert from "node:assert/strict";
import { matchExercise } from "../lib/exercise-match";

const lib = [{ name: "Step-up" }, { name: "Chest-supported row" }, { name: "Plank" }, { name: "Side plank" }, { name: "Dumbbell curl" }, { name: "Incline dumbbell curl" }, { name: "Assisted pull-up" }, { name: "Cable fly" }];
const m = (n: string) => matchExercise(n, lib)?.name ?? null;
assert.equal(m("Dumbbell box step-up (low box)"), "Step-up");
assert.equal(m("Chest-supported machine row"), "Chest-supported row");
assert.equal(m("Side plank"), "Side plank");
assert.equal(m("Plank hold"), "Plank");
assert.equal(m("Incline dumbbell curls"), "Incline dumbbell curl");
assert.equal(m("Assisted pull-up or band-assisted pull-up"), "Assisted pull-up");
assert.equal(m("Low cable fly"), "Cable fly");
assert.equal(m("Goblet squat"), null);
console.log("exercise match tests passed");
