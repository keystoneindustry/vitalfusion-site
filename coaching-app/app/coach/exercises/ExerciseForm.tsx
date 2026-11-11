"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { discardExerciseUploadAction, saveExerciseAction, startExerciseUploadAction } from "./actions";

type Initial = { id?: string; name?: string; category?: string; cue?: string | null; videoUrl?: string | null; hasFile?: boolean };

/** Add or edit one exercise: name, group, demo video (link or upload) and a short cue. */
export default function ExerciseForm({ categories, initial = {}, onDone }: { categories: string[]; initial?: Initial; onDone?: () => void }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const editing = !!initial.id;
  const [name, setName] = useState(initial.name ?? "");
  const [category, setCategory] = useState(initial.category ?? categories[0]);
  const [cue, setCue] = useState(initial.cue ?? "");
  const [mode, setMode] = useState<"link" | "file">(initial.hasFile ? "file" : "link");
  const [url, setUrl] = useState(initial.videoUrl ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  function upload(uploadUrl: string, apikey: string, f: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("apikey", apikey);
      xhr.setRequestHeader("x-upsert", "false");
      xhr.upload.onprogress = (ev) => ev.lengthComputable && setProgress(Math.round((ev.loaded / ev.total) * 100));
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status}).`)));
      xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
      const body = new FormData();
      body.append("cacheControl", "3600");
      body.append("", f);
      xhr.send(body);
    });
  }

  async function onSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setError("");
    setDone("");
    if (!name.trim()) return setError("Give the exercise a name.");
    let videoPath = "";
    setProgress(0);
    if (mode === "file" && file) {
      const start = await startExerciseUploadAction(file.name, file.type || "video/mp4", file.size);
      if (!start.ok) {
        setProgress(null);
        return setError(start.error);
      }
      try {
        await upload(start.uploadUrl, start.apikey, file);
      } catch (err) {
        setProgress(null);
        return setError(err instanceof Error ? err.message : "Upload failed.");
      }
      videoPath = start.path;
    }
    const res = await saveExerciseAction(
      JSON.stringify({ id: initial.id, name, category, cue, videoUrl: mode === "link" ? url : "", videoPath, clearVideo: mode === "link" && !url.trim() }),
    );
    setProgress(null);
    if (!res.ok) {
      if (videoPath) await discardExerciseUploadAction(videoPath);
      return setError(res.error);
    }
    if (editing) {
      onDone?.();
    } else {
      setDone(`Added “${name.trim()}” ✓`);
      setName("");
      setCue("");
      setUrl("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    }
    router.refresh();
  }

  const busy = progress !== null;
  return (
    <form onSubmit={onSubmit} noValidate className="ex-form">
      <div className="grid-2">
        <div className="field">
          <label>Name</label>
          <input value={name} maxLength={80} onChange={(e: { target: HTMLInputElement }) => setName(e.target.value)} placeholder="e.g. Goblet squat" />
        </div>
        <div className="field">
          <label>Group</label>
          <select value={category} onChange={(e: { target: HTMLSelectElement }) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="seg seg-sm" role="group" aria-label="Demo video">
        <button type="button" aria-pressed={mode === "link"} onClick={() => setMode("link")}>
          🔗 Video link
        </button>
        <button type="button" aria-pressed={mode === "file"} onClick={() => setMode("file")}>
          ⬆ Upload video
        </button>
      </div>
      {mode === "link" ? (
        <div className="field">
          <input value={url} onChange={(e: { target: HTMLInputElement }) => setUrl(e.target.value)} placeholder="YouTube, Vimeo or Loom link (optional)" inputMode="url" />
        </div>
      ) : (
        <div className="field">
          <input ref={fileRef} type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4v" onChange={(e: { target: HTMLInputElement }) => setFile(e.target.files?.[0] ?? null)} />
          <span className="hint">{initial.hasFile && !file ? "Has an uploaded video. Pick a new file to replace it. " : ""}Up to 50 MB. Short clips work best.</span>
        </div>
      )}
      <div className="field">
        <textarea rows={2} value={cue} maxLength={400} onChange={(e: { target: HTMLTextAreaElement }) => setCue(e.target.value)} placeholder="Key cue clients see under the video (optional)" />
      </div>
      {busy && progress! > 0 && (
        <div className="progress" aria-label="Upload progress">
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <p className="err">{error}</p>}
      {done && <p className="small" style={{ color: "var(--good)" }}>{done}</p>}
      <button className="btn btn-sm" type="submit" disabled={busy}>
        {busy ? (progress ? `Uploading ${progress}%…` : "Saving…") : editing ? "Save" : "Add to library"}
      </button>
    </form>
  );
}
