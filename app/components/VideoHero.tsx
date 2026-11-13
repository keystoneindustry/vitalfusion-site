"use client";

import { useRef, useState } from "react";
import Icon from "./Icon";

// Homepage video, served from this site (public/video) with the phone's own player.
// It autoplays muted on a loop (browsers only allow muted autoplay). Tapping
// "Tap to watch with sound" restarts it from the beginning with sound and shows
// the normal controls, including one-tap full screen.
export default function VideoHero({
  src,
  poster,
  unmuteLabel,
}: {
  src: string;
  poster: string;
  unmuteLabel: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  function unmute() {
    const v = video.current;
    if (!v) return;
    v.loop = false;
    v.currentTime = 0;
    v.muted = false;
    v.volume = 1;
    v.controls = true;
    setMuted(false);
    void v.play().catch(() => {
      // If the browser still blocks it, the controls are showing so they can press play.
    });
  }

  return (
    <div className="video">
      <video
        ref={video}
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-label="Watch: how Vital Fusion coaching works"
      />
      {muted && (
        <button type="button" className="unmute-layer" onClick={unmute} aria-label={unmuteLabel}>
          <span className="unmute">
            <span className="unmute-icon">
              <Icon name="sound" size={26} />
            </span>
            <span>{unmuteLabel}</span>
          </span>
        </button>
      )}
    </div>
  );
}
