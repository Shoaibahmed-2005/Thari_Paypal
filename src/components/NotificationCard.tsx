"use client";

import { useRef, useState } from "react";
import { Play, Square } from "lucide-react";

export interface NotificationCardProps {
  notification: { id: string; textNative: string; textEn: string; audioUrl: string | null };
  playLabel: string;
  lang: string;
  nativeFont: string;
}

/**
 * The latest unheard notification on `/w` (BUILD_PLAN 9.3): a big coral card
 * she can play. Falls back to the browser's own speech synthesis when there is
 * no generated audio yet, and always shows the text (10.3).
 */
export function NotificationCard({ notification, playLabel, lang, nativeFont }: NotificationCardProps) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function stop() {
    audioRef.current?.pause();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setPlaying(false);
  }

  function play() {
    if (playing) return stop();
    setPlaying(true);

    if (notification.audioUrl) {
      const a = (audioRef.current ??= new Audio(notification.audioUrl));
      a.onended = () => setPlaying(false);
      a.onerror = () => speak();
      void a.play().catch(speak);
      return;
    }
    speak();
  }

  function speak() {
    if (typeof window === "undefined" || !window.speechSynthesis) return setPlaying(false);
    const u = new SpeechSynthesisUtterance(notification.textNative);
    u.lang = `${lang}-IN`;
    u.rate = 0.9;
    u.onend = () => setPlaying(false);
    u.onerror = () => setPlaying(false);
    window.speechSynthesis.speak(u);
  }

  return (
    <div
      className="mt-4 flex items-start gap-3 bg-coral p-4 text-on-coral"
      style={{ borderRadius: "var(--radius-lg)" }}
    >
      <button
        type="button"
        onClick={play}
        aria-label={playLabel}
        className="grid h-12 w-12 flex-none place-items-center bg-surface text-primary"
        style={{ borderRadius: "var(--radius-pill)", border: 0, cursor: "pointer" }}
      >
        {playing ? <Square size={20} strokeWidth={1.75} /> : <Play size={20} strokeWidth={1.75} />}
      </button>
      <div className="min-w-0">
        <p className="t-label m-0" style={{ fontFamily: nativeFont }} lang={lang}>
          {notification.textNative}
        </p>
        <p className="t-caption m-0 mt-1 opacity-80">{notification.textEn}</p>
      </div>
    </div>
  );
}
