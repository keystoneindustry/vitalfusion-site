"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Option = { value: string; label: string; icon?: string };

const MAX_SIDE = 1280;

/** Shrinks a phone photo to at most 1280 px on the long side as a JPEG (~200–400 KB). */
async function shrink(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("decode"));
      i.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) throw new Error("encode");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function guessMeal(d: Date): string {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 5 && h < 10.5) return "breakfast";
  if (h >= 11 && h < 14.5) return "lunch";
  if (h >= 17 && h < 21) return "dinner";
  return "snack";
}

export default function MealForm({ meals, places, hunger }: { meals: Option[]; places: string[]; hunger: Option[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [meal, setMeal] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [maxDate, setMaxDate] = useState("");
  const [place, setPlace] = useState("");
  const [level, setLevel] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"" | "photo" | "saving">("");
  const [error, setError] = useState("");

  // Defaults use the phone's clock, so they're set after the page loads.
  useEffect(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    setDate(today);
    setMaxDate(today);
    setTime(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
    setMeal(guessMeal(now));
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function onPick(e: { target: HTMLInputElement }) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setBusy("photo");
    let blob: Blob = file;
    try {
      blob = await shrink(file);
    } catch {
      if (file.size > 4 * 1024 * 1024 || !/^image\/(jpeg|png|webp)$/.test(file.type)) {
        setBusy("");
        setError("That photo couldn't be opened. Try taking it again, or pick a different one.");
        return;
      }
    }
    setPhoto(blob);
    setPreview(URL.createObjectURL(blob));
    setBusy("");
  }

  async function onSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setError("");
    if (!photo && !note.trim()) return setError("Add a photo, or write what you ate.");
    const when = new Date(`${date}T${time || "12:00"}`);
    if (Number.isNaN(when.getTime())) return setError("Pick when you ate it.");
    const form = new FormData();
    if (photo) form.append("photo", photo, "meal.jpg");
    form.append("meal", meal);
    form.append("eatenAt", when.toISOString());
    form.append("place", place);
    form.append("hunger", level);
    form.append("note", note);
    setBusy("saving");
    try {
      const res = await fetch("/api/meals", { method: "POST", body: form });
      if (res.status === 401) {
        window.location.href = `/auth/refresh?next=${encodeURIComponent("/food/new")}`;
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "That didn't save. Try again.");
      router.push("/food?logged=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't save. Try again.");
      setBusy("");
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <input ref={fileRef} type="file" accept="image/*" onChange={onPick} hidden />
      {preview ? (
        <div className="meal-preview">
          <img src={preview} alt="Your meal" />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
            Change photo
          </button>
        </div>
      ) : (
        <button type="button" className="photo-drop" onClick={() => fileRef.current?.click()} disabled={busy === "photo"}>
          <span aria-hidden="true">📷</span>
          {busy === "photo" ? "Getting your photo ready…" : "Take or choose a photo"}
          <small>Snap it before you start eating</small>
        </button>
      )}

      <div className="field">
        <label>Which meal?</label>
        <div className="chips">
          {meals.map((m) => (
            <button key={m.value} type="button" className="chip" aria-pressed={meal === m.value} onClick={() => setMeal(m.value)}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="meal-date">Day</label>
          <input id="meal-date" type="date" value={date} max={maxDate} onChange={(e: { target: HTMLInputElement }) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="meal-time">Time</label>
          <input id="meal-time" type="time" value={time} onChange={(e: { target: HTMLInputElement }) => setTime(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label>Where did you eat?</label>
        <div className="chips">
          {places.map((p) => (
            <button key={p} type="button" className="chip" aria-pressed={place === p} onClick={() => setPlace(place === p ? "" : p)}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>How hungry were you before?</label>
        <div className="chips">
          {hunger.map((h) => (
            <button
              key={h.value}
              type="button"
              className="chip"
              aria-pressed={level === h.value}
              onClick={() => setLevel(level === h.value ? "" : h.value)}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="meal-note">Anything to add?</label>
        <textarea
          id="meal-note"
          rows={3}
          value={note}
          maxLength={1000}
          onChange={(e: { target: HTMLTextAreaElement }) => setNote(e.target.value)}
          placeholder="e.g. 2 eggs, toast with butter, coffee with creamer. Felt full after."
        />
        <span className="hint">What's in it, sauces or drinks the photo might miss, how you felt after.</span>
      </div>

      {error && <p className="notice notice-error">{error}</p>}
      <button className="btn btn-wide" type="submit" disabled={busy !== ""}>
        {busy === "saving" ? "Saving…" : "Save meal"}
      </button>
    </form>
  );
}
