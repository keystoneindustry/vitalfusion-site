"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { preparePhoto } from "@/app/components/shrinkImage";

type Pose = { value: string; label: string; tip: string };

/** Front, side and back: each one uploads as soon as it's picked. */
export default function PhotoUploader({ date, poses, existing }: { date: string; poses: Pose[]; existing: Record<string, string> }) {
  const router = useRouter();
  const [previews, setPreviews] = useState<Record<string, string>>(existing);
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState("");
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function onPick(pose: string, file: File | undefined) {
    if (!file) return;
    setError("");
    setBusy(pose);
    const blob = await preparePhoto(file);
    if (!blob) {
      setBusy("");
      return setError("That photo couldn't be opened. Try again.");
    }
    const form = new FormData();
    form.append("photo", blob, `${pose}.jpg`);
    form.append("pose", pose);
    form.append("date", date);
    try {
      const res = await fetch("/api/progress-photos", { method: "POST", body: form });
      if (res.status === 401) {
        window.location.href = `/auth/refresh?next=${encodeURIComponent("/progress/photos")}`;
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "That didn't upload. Try again.");
      setPreviews((p) => ({ ...p, [pose]: URL.createObjectURL(blob) }));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't upload. Try again.");
    } finally {
      setBusy("");
    }
  }

  const done = poses.filter((p) => previews[p.value]).length;
  return (
    <>
      <div className="pose-grid">
        {poses.map((p) => (
          <div key={p.value} className="pose-card">
            <input
              ref={(el: HTMLInputElement | null) => {
                inputs.current![p.value] = el;
              }}
              type="file"
              accept="image/*"
              hidden
              onChange={(e: { target: HTMLInputElement }) => onPick(p.value, e.target.files?.[0])}
            />
            <button type="button" className="pose-btn" onClick={() => inputs.current![p.value]?.click()} disabled={busy !== ""}>
              {previews[p.value] ? <img src={previews[p.value]} alt={`${p.label} photo`} /> : <span className="pose-empty">📷</span>}
              <b>
                {p.label} {previews[p.value] ? "✓" : ""}
              </b>
              <span>{busy === p.value ? "Uploading…" : previews[p.value] ? "Tap to retake" : "Tap to add"}</span>
            </button>
            <p className="pose-tip">{p.tip}</p>
          </div>
        ))}
      </div>
      {error && <p className="notice notice-error">{error}</p>}
      {done === poses.length && <p className="notice notice-good">All 3 photos saved ✓ Only you and Tyler can see them.</p>}
    </>
  );
}
