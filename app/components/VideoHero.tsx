"use client";

import { useRef, useState } from "react";
import Icon from "./Icon";

// Homepage video: autoplays muted (browsers only allow that), with a big
// "Tap to watch with sound" button that restarts it from the beginning with sound.
// Uses Vimeo's player messages, so no extra code library is needed.
export default function VideoHero({
  vimeoId,
  vimeoHash,
  poster,
  unmuteLabel,
}: {
  vimeoId: string;
  vimeoHash: string;
  poster: string;
  unmuteLabel: string;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [muted, setMuted] = useState(true);

  const params = new URLSearchParams({
    h: vimeoHash,
    autoplay: "1",
    muted: "1",
    loop: "0",
    playsinline: "1",
    title: "0",
    byline: "0",
    portrait: "0",
    dnt: "1",
  });
  const src = `https://player.vimeo.com/video/${vimeoId}?${params}`;

  function send(method: string, value?: unknown) {
    frame.current?.contentWindow?.postMessage(JSON.stringify(value === undefined ? { method } : { method, value }), "https://player.vimeo.com");
  }

  function unmute() {
    send("setCurrentTime", 0);
    send("setMuted", false);
    send("setVolume", 1);
    send("play");
    setMuted(false);
  }

  return (
    <div className="video" style={{ backgroundImage: `url(${poster})` }}>
      <iframe
        ref={frame}
        src={src}
        title="Watch: how Vital Fusion coaching works"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
      {muted && (
        <button type="button" className="unmute" onClick={unmute}>
          <span className="unmute-icon">
            <Icon name="sound" size={26} />
          </span>
          <span>{unmuteLabel}</span>
        </button>
      )}
    </div>
  );
}
