import assert from "node:assert/strict";
import { byCategory, checkUpload, coachingDay, findGuide, formatSize, isVideoLink, resourcePath, unlockLabel, unlocked } from "../lib/resources";

const pdf = checkUpload("application/pdf", 2_000_000);
assert.ok(pdf.ok && pdf.kind === "pdf" && pdf.ext === "pdf");
const mov = checkUpload("video/quicktime", 30_000_000);
assert.ok(mov.ok && mov.kind === "video_file" && mov.ext === "mov");
const big = checkUpload("video/mp4", 80 * 1024 * 1024);
assert.ok(!big.ok && big.error.includes("YouTube"));
assert.equal(checkUpload("image/png", 1000).ok, false);
assert.equal(checkUpload("application/pdf", 0).ok, false);

assert.equal(resourcePath("How To Track Calories (v2).pdf", "pdf", 123), "123-how-to-track-calories-v2.pdf");
assert.equal(resourcePath("🎥.mov", "mov", 5), "5-file.mov");
assert.match(resourcePath("x".repeat(200) + ".pdf", "pdf", 1), /^1-x{50}\.pdf$/);

assert.equal(unlocked({ unlock_days: null, published: true }, 0), true);
assert.equal(unlocked({ unlock_days: 7, published: true }, 6), false);
assert.equal(unlocked({ unlock_days: 7, published: true }, 7), true);
assert.equal(unlocked({ unlock_days: 3, published: true }, -2), false); // before the start date counts as day 0
assert.equal(unlocked({ unlock_days: null, published: false }, 5), false);
assert.equal(coachingDay("2026-11-23", null, "2026-11-20"), 0);
assert.equal(coachingDay("2026-11-23", null, "2026-11-30"), 7);
assert.equal(coachingDay("2026-11-23", "2026-12-01", "2026-12-05"), 100000); // ended: everything open
assert.equal(unlockLabel({ unlock_days: 7 }, 6), "Unlocks tomorrow");
assert.equal(unlockLabel({ unlock_days: 7 }, 2), "Unlocks in 5 days");
const g = { title: "How to Track Calories", published: true, unlock_days: 7 };
assert.equal(findGuide([g], /track/i, 3), null);
assert.equal(findGuide([g], /track/i, 7), g);

assert.equal(isVideoLink("https://youtu.be/abc123"), true);
assert.equal(isVideoLink("https://www.loom.com/share/abc123"), true);
assert.equal(isVideoLink("https://example.com/video.mp4"), false);
assert.equal(formatSize(2_500_000), "2.4 MB");
assert.equal(formatSize(800), "1 KB");

const groups = byCategory([
  { category: "Mindset", sort: 0, created_at: "1" },
  { category: "Zebra stuff", sort: 0, created_at: "1" },
  { category: "Nutrition", sort: 20, created_at: "2" },
  { category: "Nutrition", sort: 10, created_at: "3" },
]);
assert.deepEqual(
  groups.map((g) => g.category),
  ["Nutrition", "Mindset", "Zebra stuff"],
);
assert.deepEqual(groups[0].items.map((i) => i.sort), [10, 20]);

console.log("resources tests passed");
