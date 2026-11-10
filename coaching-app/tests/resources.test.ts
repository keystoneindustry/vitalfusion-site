import assert from "node:assert/strict";
import { byCategory, checkUpload, formatSize, isVideoLink, resourcePath, unlocked } from "../lib/resources";

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

assert.equal(unlocked({ unlock_week: null, published: true }, 0), true);
assert.equal(unlocked({ unlock_week: 3, published: true }, 2), false);
assert.equal(unlocked({ unlock_week: 3, published: true }, 3), true);
assert.equal(unlocked({ unlock_week: 1, published: true }, 0), true); // not started counts as week 1
assert.equal(unlocked({ unlock_week: null, published: false }, 5), false);

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
