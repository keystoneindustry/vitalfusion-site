"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { discardUploadAction, saveResourceAction, startUploadAction } from "./actions";

/** Add a PDF, a video file, or a video link. Files go straight from the browser to storage, with a progress bar. */
export default function AddResource({ categories, maxMb }: { categories: string[]; maxMb: number }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"file" | "link">("file");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "General");
  const [newCategory, setNewCategory] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [unlockWeek, setUnlockWeek] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  function reset() {
    setFile(null);
    setTitle("");
    setDescription("");
    setUrl("");
    setUnlockWeek("");
    setNewCategory("");
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function onPick(e: { target: HTMLInputElement }) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError("");
    if (f && !title) setTitle(f.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " "));
  }

  function upload(uploadUrl: string, apikey: string, f: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("apikey", apikey);
      xhr.setRequestHeader("x-upsert", "false");
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
      };
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
    const cat = (category === "__new" ? newCategory : category).trim();
    if (!title.trim()) return setError("Give it a title.");
    if (!cat) return setError("Name the new category.");
    const base = { title, category: cat, description, unlockWeek };
    if (mode === "link") {
      if (!url.trim()) return setError("Paste the video link.");
      setProgress(0);
      const res = await saveResourceAction(JSON.stringify({ ...base, kind: "video_link", url }));
      setProgress(null);
      if (!res.ok) return setError(res.error);
    } else {
      if (!file) return setError("Pick a PDF or video file.");
      setProgress(0);
      const start = await startUploadAction(file.name, file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : ""), file.size);
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
      const res = await saveResourceAction(JSON.stringify({ ...base, kind: start.kind, path: start.path, fileName: file.name }));
      if (!res.ok) {
        await discardUploadAction(start.path);
        setProgress(null);
        return setError(res.error);
      }
    }
    setDone(`Added “${title.trim()}” ✓`);
    reset();
    router.refresh();
  }

  const busy = progress !== null;
  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="seg" style={{ marginBottom: 14 }}>
        <button type="button" aria-current={mode === "file" ? "page" : undefined} onClick={() => setMode("file")}>
          📄 Upload PDF or video
        </button>
        <button type="button" aria-current={mode === "link" ? "page" : undefined} onClick={() => setMode("link")}>
          🔗 Video link
        </button>
      </div>

      {mode === "file" ? (
        <div className="field">
          <input ref={fileRef} type="file" accept="application/pdf,video/mp4,video/quicktime,video/webm,.pdf,.mp4,.mov,.m4v" onChange={onPick} />
          <span className="hint">
            PDFs and videos up to {maxMb} MB. Longer videos: upload them to YouTube as <b>Unlisted</b> and use “Video link”.
          </span>
        </div>
      ) : (
        <div className="field">
          <label htmlFor="r-url">YouTube, Vimeo or Loom link</label>
          <input id="r-url" type="url" inputMode="url" value={url} placeholder="https://youtu.be/…" onChange={(e: { target: HTMLInputElement }) => setUrl(e.target.value)} />
        </div>
      )}

      <div className="field">
        <label htmlFor="r-title">Title</label>
        <input id="r-title" value={title} maxLength={120} onChange={(e: { target: HTMLInputElement }) => setTitle(e.target.value)} placeholder="e.g. How to track calories" />
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="r-cat">Category</label>
          <select id="r-cat" value={category} onChange={(e: { target: HTMLSelectElement }) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="__new">+ New category…</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="r-week">Unlocks in week</label>
          <input id="r-week" type="number" inputMode="numeric" min={1} max={104} value={unlockWeek} placeholder="Right away" onChange={(e: { target: HTMLInputElement }) => setUnlockWeek(e.target.value)} />
        </div>
      </div>
      {category === "__new" && (
        <div className="field">
          <label htmlFor="r-newcat">New category name</label>
          <input id="r-newcat" value={newCategory} maxLength={60} onChange={(e: { target: HTMLInputElement }) => setNewCategory(e.target.value)} />
        </div>
      )}
      <div className="field">
        <label htmlFor="r-desc">Short description (optional)</label>
        <textarea id="r-desc" rows={2} value={description} maxLength={600} onChange={(e: { target: HTMLTextAreaElement }) => setDescription(e.target.value)} />
      </div>

      {busy && (
        <div className="progress" style={{ marginBottom: 10 }} aria-label="Upload progress">
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <p className="notice notice-error">{error}</p>}
      {done && <p className="notice notice-good">{done}</p>}
      <button className="btn btn-wide" type="submit" disabled={busy}>
        {busy ? (mode === "file" ? `Uploading… ${progress}%` : "Saving…") : "Add to Resources"}
      </button>
    </form>
  );
}
