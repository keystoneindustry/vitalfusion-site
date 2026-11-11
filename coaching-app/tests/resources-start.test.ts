import assert from "node:assert/strict";
import { findGuide, startHere } from "../lib/resources";

const base = { category: "Getting started", sort: 0, created_at: "2026-11-11T00:00:00Z", published: true, unlock_week: null as number | null };
const list = [
  { ...base, title: "How to Track Calories", sort: 10 },
  { ...base, title: "(READ FIRST) How Your Coaching Works", sort: 20 },
  { ...base, title: "Squats", category: "Training" },
];
assert.equal(startHere(list)?.title, "(READ FIRST) How Your Coaching Works");
assert.equal(startHere([list[0], list[2]])?.title, "How to Track Calories");
assert.equal(startHere([{ ...list[1], published: false }]), null);
assert.equal(findGuide(list, /track(ing)?\s+(your\s+)?calories/i)?.title, "How to Track Calories");
console.log("resources start tests passed");
