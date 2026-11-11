/**
 * Web Push (the standard behind phone notifications), with no extra packages:
 * - VAPID: a signed token (ES256 JWT) that tells the push service the message is from us.
 * - aes128gcm (RFC 8291): the message is encrypted so only the client's phone can read it.
 * Keys: VAPID_PUBLIC_KEY (base64url, 65-byte uncompressed point) and VAPID_PRIVATE_KEY (base64url, 32 bytes).
 */

import { createCipheriv, createECDH, createPrivateKey, createSign, hkdfSync, randomBytes, type KeyObject } from "node:crypto";

export type PushSubscriptionKeys = { endpoint: string; p256dh: string; auth: string };
export type PushMessage = { title: string; body: string; url?: string; tag?: string };

const b64u = (buf: Buffer | Uint8Array) => Buffer.from(buf).toString("base64url");
const fromB64u = (s: string) => Buffer.from(s, "base64url");

export function vapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export function pushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

/** Private signing key from the raw base64url values. */
export function vapidKey(publicKey: string, privateKey: string): KeyObject {
  const pub = fromB64u(publicKey);
  if (pub.length !== 65 || pub[0] !== 4) throw new Error("VAPID_PUBLIC_KEY must be a 65-byte uncompressed P-256 key");
  return createPrivateKey({
    key: { kty: "EC", crv: "P-256", d: privateKey, x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) },
    format: "jwk",
  });
}

/** "vapid t=…, k=…" for the Authorization header. Valid for 12 hours. */
export function vapidAuthorization(endpoint: string, keys: { publicKey: string; privateKey: string }, subject: string, now = Date.now()): string {
  const aud = new URL(endpoint).origin;
  const header = b64u(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u(Buffer.from(JSON.stringify({ aud, exp: Math.floor(now / 1000) + 12 * 3600, sub: subject })));
  const signer = createSign("SHA256");
  signer.update(`${header}.${claims}`);
  const sig = signer.sign({ key: vapidKey(keys.publicKey, keys.privateKey), dsaEncoding: "ieee-p1363" });
  return `vapid t=${header}.${claims}.${b64u(sig)}, k=${keys.publicKey}`;
}

/** Encrypts a payload for one subscription (RFC 8291, single record). */
export function encryptPayload(payload: Buffer, sub: Pick<PushSubscriptionKeys, "p256dh" | "auth">, opts: { salt?: Buffer; ecdh?: ReturnType<typeof createECDH> } = {}): Buffer {
  const uaPublic = fromB64u(sub.p256dh);
  const authSecret = fromB64u(sub.auth);
  const ecdh = opts.ecdh ?? createECDH("prime256v1");
  if (!opts.ecdh) ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const shared = ecdh.computeSecret(uaPublic);
  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic]);
  const ikm = Buffer.from(hkdfSync("sha256", shared, authSecret, keyInfo, 32));
  const salt = opts.salt ?? randomBytes(16);
  const cek = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));
  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const body = Buffer.concat([cipher.update(Buffer.concat([payload, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, body]);
}

/** Sends one notification. "gone" means the subscription should be deleted. */
export async function sendPush(sub: PushSubscriptionKeys, msg: PushMessage): Promise<"ok" | "gone" | "error"> {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return "error";
  try {
    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        Authorization: vapidAuthorization(sub.endpoint, { publicKey, privateKey }, process.env.VAPID_SUBJECT || "mailto:tyler@vitalfusioncoaching.com"),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "43200",
        Urgency: "normal",
      },
      body: new Uint8Array(encryptPayload(Buffer.from(JSON.stringify(msg)), sub)),
    });
    if (res.status === 404 || res.status === 410) return "gone";
    if (!res.ok) {
      console.error("Push failed", res.status, (await res.text().catch(() => "")).slice(0, 200));
      return "error";
    }
    return "ok";
  } catch (err) {
    console.error("Push failed", err);
    return "error";
  }
}
