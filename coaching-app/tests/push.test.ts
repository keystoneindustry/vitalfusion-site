import assert from "node:assert/strict";
import { createDecipheriv, createECDH, createPublicKey, createVerify, hkdfSync, randomBytes } from "node:crypto";
import { encryptPayload, vapidAuthorization } from "../lib/push";

// A pretend phone: its key pair and auth secret.
const ua = createECDH("prime256v1");
ua.generateKeys();
const auth = randomBytes(16);
const sub = { p256dh: ua.getPublicKey().toString("base64url"), auth: auth.toString("base64url") };

// Encrypt, then decrypt the way the phone would (RFC 8291).
const msg = Buffer.from(JSON.stringify({ title: "Today", body: "Full body A · Weigh-in" }));
const enc = encryptPayload(msg, sub);
const salt = enc.subarray(0, 16);
assert.equal(enc.readUInt32BE(16), 4096);
const idlen = enc[20];
assert.equal(idlen, 65);
const asPublic = enc.subarray(21, 21 + idlen);
const ct = enc.subarray(21 + idlen);
const shared = ua.computeSecret(asPublic);
const ikm = Buffer.from(hkdfSync("sha256", shared, auth, Buffer.concat([Buffer.from("WebPush: info\0"), ua.getPublicKey(), asPublic]), 32));
const cek = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));
const d = createDecipheriv("aes-128-gcm", cek, nonce);
d.setAuthTag(ct.subarray(ct.length - 16));
const plain = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]);
assert.equal(plain[plain.length - 1], 2); // last-record delimiter
assert.deepEqual(plain.subarray(0, plain.length - 1), msg);

// VAPID token: signed with our private key, checks out with the public key, right audience.
const server = createECDH("prime256v1");
server.generateKeys();
const keys = { publicKey: server.getPublicKey().toString("base64url"), privateKey: server.getPrivateKey().toString("base64url") };
const header = vapidAuthorization("https://web.push.apple.com/abc", keys, "mailto:t@example.com", Date.UTC(2026, 10, 11));
const m = header.match(/^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/);
assert.ok(m);
assert.equal(m![4], keys.publicKey);
const claims = JSON.parse(Buffer.from(m![2], "base64url").toString());
assert.equal(claims.aud, "https://web.push.apple.com");
const pub = server.getPublicKey();
const pubKey = createPublicKey({ key: { kty: "EC", crv: "P-256", x: pub.subarray(1, 33).toString("base64url"), y: pub.subarray(33).toString("base64url") }, format: "jwk" });
const v = createVerify("SHA256");
v.update(`${m![1]}.${m![2]}`);
assert.ok(v.verify({ key: pubKey, dsaEncoding: "ieee-p1363" }, Buffer.from(m![3], "base64url")));
console.log("push tests passed");
