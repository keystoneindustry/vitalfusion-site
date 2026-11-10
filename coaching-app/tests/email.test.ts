import assert from "node:assert/strict";
import { inviteEmail, signInEmail } from "../lib/email";
import { cleanCode } from "../lib/signin";

const link = "https://app.example.com/auth/confirm?th=abc&type=magiclink";

const withCode = signInEmail("Jordan", link, "123456");
assert.match(withCode.subject, /123456/);
assert.ok(withCode.html.includes("123456"));
assert.ok(withCode.html.includes("th=abc&amp;type=magiclink")); // link is HTML-escaped
assert.ok(withCode.text.includes("123456"));

const invite = inviteEmail("Jordan", link, "654321");
assert.ok(invite.html.includes("654321"));
assert.ok(invite.html.includes("Welcome, Jordan!"));

const noCode = signInEmail("Jordan", link);
assert.ok(!noCode.html.includes("Type this code"));

const escaped = inviteEmail("<b>", link);
assert.ok(!escaped.html.includes("<b>!"));

assert.equal(cleanCode(" 123 456 "), "123456");
assert.equal(cleanCode("12-34-56"), "123456");

console.log("email tests passed");
