"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

export interface Recording {
  mimeType: string;
  /** base64, no data: prefix */
  data: string;
  /** object URL for playback before she continues */
  previewUrl: string;
  seconds: number;
}

/**
 * BUILD_PLAN 9.3: big record button, live timer, playback before continuing.
 *
 * Records in whatever container MediaRecorder gives (usually webm/opus).
 * Gemini wants wav/mp3/aac/ogg/flac, so live mode needs a WAV encoder
 * (BUILD_PLAN lists extendable-media-recorder for exactly this) — noted in
 * PROGRESS.md. Mock mode ignores the audio, so the flow is testable today.
 */
export function VoiceRecorder({
  prompt,
  hint,
  lang,
  nativeFont,
  recordAgainLabel,
  onRecorded,
}: {
  prompt: string;
  hint?: string;
  lang: string;
  nativeFont: string;
  recordAgainLabel: string;
  onRecorded: (r: Recording | null) => void;
}) {
  const [state, setState] = useState<"idle" | "recording" | "done" | "denied">("idle");
  const [seconds, setSeconds] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType });
        const previewUrl = URL.createObjectURL(blob);
        setPreview(previewUrl);
        setState("done");
        const data = await blobToBase64(blob);
        onRecorded({ mimeType: rec.mimeType, data, previewUrl, seconds });
      };
      recorderRef.current = rec;
      rec.start();
      setSeconds(0);
      setState("recording");
      tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setState("denied");
    }
  }

  function stop() {
    if (tickRef.current) clearInterval(tickRef.current);
    recorderRef.current?.stop();
  }

  function reset() {
    setPreview(null);
    setSeconds(0);
    setState("idle");
    onRecorded(null);
  }

  return (
    <div className={`th-voice ${state === "recording" ? "th-voice--listening" : ""}`}>
      <p className="th-voice__prompt m-0" style={{ fontFamily: nativeFont }} lang={lang}>
        {prompt}
      </p>
      {hint && (
        <p className="th-voice__sub" style={{ fontFamily: nativeFont }} lang={lang}>
          {hint}
        </p>
      )}

      {state === "done" && preview ? (
        <>
          { }
          <audio src={preview} controls className="w-full" />
          <button type="button" className="th-btn th-btn--secondary" onClick={reset}>
            {recordAgainLabel}
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            className="th-voice__btn"
            onClick={state === "recording" ? stop : start}
            aria-label={state === "recording" ? "Stop recording" : "Start recording"}
          >
            {state === "recording" ? <Square strokeWidth={1.75} /> : <Mic strokeWidth={1.75} />}
          </button>
          {state === "recording" && (
            <span className="th-voice__time">
              {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
            </span>
          )}
          {state === "denied" && (
            <p className="t-caption m-0 text-ink-muted">
              We can&apos;t reach the microphone. Check the browser&apos;s permission, or use the sample voice note.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(",")[1] ?? "");
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}
