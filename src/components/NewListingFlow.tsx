"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, Video, X } from "lucide-react";
import type { WeaverStrings } from "@/lib/i18n";
import { VoiceRecorder, type Recording } from "./VoiceRecorder";

interface Question {
  field: string;
  questionNative: string;
  questionEn: string;
}

interface Draft {
  id: string;
  status: string;
  questions: Question[];
  readbackNative: string;
  title: string;
  titleNative: string;
  priceUsdCents: number | null;
  conflicts: string[];
}

type Step = "speak" | "photos" | "clip" | "working" | "questions" | "readback" | "done";

const ORDER: Step[] = ["speak", "photos", "clip", "working", "questions", "readback", "done"];

/** Quick-answer chips for the fields where tapping beats speaking (9.3 step 5). */
const CHIPS: Record<string, { label: string; value: string }[]> = {
  fabric: [
    { label: "பட்டு / Silk", value: "silk" },
    { label: "பருத்தி / Cotton", value: "cotton" },
  ],
  includesBlouse: [
    { label: "உண்டு / Yes", value: "true" },
    { label: "இல்லை / No", value: "false" },
  ],
  stitched: [
    { label: "தைத்தது / Stitched", value: "true" },
    { label: "தைக்கவில்லை / Unstitched", value: "false" },
  ],
};

export function NewListingFlow({
  t,
  lang,
  nativeFont,
}: {
  t: WeaverStrings;
  lang: string;
  nativeFont: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("speak");
  const [audio, setAudio] = useState<Recording | null>(null);
  const [usedSample, setUsedSample] = useState(false);
  const [photos, setPhotos] = useState<{ url: string; mimeType: string; data: string }[]>([]);
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answerAudio, setAnswerAudio] = useState<Recording | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const native = { fontFamily: nativeFont } as const;
  const stepIndex = ORDER.indexOf(step);

  async function createDraft() {
    setStep("working");
    setError(null);
    try {
      const res = await fetch("/api/listings/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          audio: audio ? { mimeType: audio.mimeType, data: audio.data } : undefined,
          photos: photos.map((p) => ({ mimeType: p.mimeType, data: p.data })),
          photoUrls: photos.map((p) => p.url),
          loomClipUrl: clipUrl ?? undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? t.somethingWrong);
      setDraft(body as Draft);
      setQuestions(body.questions ?? []);
      setStep((body.questions ?? []).length > 0 ? "questions" : "readback");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.somethingWrong);
      setStep("speak");
    }
  }

  async function sendAnswer(field: string, typedAnswer?: string) {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/listings/${draft.id}/answer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          field,
          typedAnswer,
          audio: !typedAnswer && answerAudio ? { mimeType: answerAudio.mimeType, data: answerAudio.data } : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? t.somethingWrong);

      if (!body.understood) {
        setError(body.clarifyNative);
        return;
      }
      setAnswerAudio(null);
      setQuestions(body.questions ?? []);
      if ((body.questions ?? []).length === 0) {
        setDraft({ ...draft, readbackNative: body.readbackNative ?? draft.readbackNative, status: body.status });
        setStep("readback");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.somethingWrong);
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/listings/${draft.id}/publish`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? t.somethingWrong);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.somethingWrong);
    } finally {
      setBusy(false);
    }
  }

  function speakNative(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = `${lang}-IN`;
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* progress dots */}
      <div className="th-row justify-center gap-2" aria-hidden>
        {ORDER.map((s, i) => (
          <span
            key={s}
            style={{
              width: i === stepIndex ? 20 : 8,
              height: 8,
              borderRadius: 4,
              background: i <= stepIndex ? "var(--primary)" : "var(--line)",
              transition: "width .2s",
            }}
          />
        ))}
      </div>

      {error && (
        <div className="th-card p-3" style={{ background: "var(--surface-tint)" }}>
          <p className="t-body m-0" style={native} lang={lang}>
            {error}
          </p>
        </div>
      )}

      {step === "speak" && (
        <>
          <VoiceRecorder
            prompt={t.speakPrompt}
            hint={t.speakHint}
            lang={lang}
            nativeFont={nativeFont}
            recordAgainLabel={t.recordAgain}
            onRecorded={setAudio}
          />
          <button
            type="button"
            className="th-btn th-btn--secondary th-btn--block"
            onClick={() => {
              setUsedSample(true);
              setStep("photos");
            }}
          >
            {t.useSample}
          </button>
          <button
            type="button"
            className="th-btn th-btn--primary th-btn--block"
            disabled={!audio}
            onClick={() => setStep("photos")}
          >
            {t.next}
          </button>
        </>
      )}

      {step === "photos" && (
        <>
          <h2 className="t-title m-0" style={native} lang={lang}>
            {t.photosPrompt}
          </h2>
          <label className="th-btn th-btn--secondary th-btn--block" style={{ cursor: "pointer" }}>
            <ImagePlus size={20} strokeWidth={1.75} aria-hidden />
            {t.addPhotos}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              hidden
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []).slice(0, 6 - photos.length);
                const out = await Promise.all(files.map(resizeToJpeg));
                setPhotos((p) => [...p, ...out].slice(0, 6));
              }}
            />
          </label>
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p, i) => (
                <div key={i} className="relative overflow-hidden" style={{ borderRadius: "var(--radius-md)", aspectRatio: "1" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => setPhotos((cur) => cur.filter((_, j) => j !== i))}
                    className="th-listing__fav"
                    style={{ cursor: "pointer" }}
                  >
                    <X size={16} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button type="button" className="th-btn th-btn--primary th-btn--block" onClick={() => setStep("clip")}>
            {t.next}
          </button>
          <button type="button" className="th-btn th-btn--ghost" onClick={() => setStep("speak")}>
            {t.back}
          </button>
        </>
      )}

      {step === "clip" && (
        <>
          <h2 className="t-title m-0" style={native} lang={lang}>
            {t.clipPrompt}
          </h2>
          <label className="th-btn th-btn--secondary th-btn--block" style={{ cursor: "pointer" }}>
            <Video size={20} strokeWidth={1.75} aria-hidden />
            {t.stepClip}
            <input
              type="file"
              accept="video/*"
              capture
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 30 * 1024 * 1024) {
                  setError("That clip is larger than 30 MB. A shorter one works better.");
                  return;
                }
                setClipUrl(URL.createObjectURL(f));
              }}
            />
          </label>
          {clipUrl && (
             
            <video src={clipUrl} controls playsInline className="w-full" style={{ borderRadius: "var(--radius-md)" }} />
          )}
          <button type="button" className="th-btn th-btn--primary th-btn--block" onClick={createDraft}>
            {t.next}
          </button>
          <button type="button" className="th-btn th-btn--ghost" onClick={createDraft}>
            {t.skip}
          </button>
        </>
      )}

      {step === "working" && (
        <div className="th-voice">
          <p className="th-voice__prompt m-0" style={native} lang={lang}>
            {usedSample || audio ? t.workingListening : t.workingLooking}
          </p>
          <p className="t-body m-0 text-ink-muted" style={native} lang={lang}>
            {t.workingWriting}
          </p>
        </div>
      )}

      {step === "questions" && questions[0] && (
        <>
          <h2 className="t-caption m-0 text-ink-muted" style={native} lang={lang}>
            {t.stepQuestions}
          </h2>
          <button
            type="button"
            className="th-voice__prompt text-left"
            style={{ ...native, border: 0, background: "transparent", cursor: "pointer" }}
            lang={lang}
            onClick={() => speakNative(questions[0].questionNative)}
          >
            {questions[0].questionNative}
          </button>
          <p className="t-caption m-0 text-ink-muted">{questions[0].questionEn}</p>

          {CHIPS[questions[0].field] ? (
            <div className="th-row">
              {CHIPS[questions[0].field].map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className="th-chip th-chip--select"
                  disabled={busy}
                  onClick={() => sendAnswer(questions[0].field, c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          ) : (
            <VoiceRecorder
              prompt=""
              lang={lang}
              nativeFont={nativeFont}
              recordAgainLabel={t.recordAgain}
              onRecorded={setAnswerAudio}
            />
          )}

          <button
            type="button"
            className="th-btn th-btn--primary th-btn--block"
            disabled={busy}
            onClick={() => sendAnswer(questions[0].field)}
          >
            {t.next}
          </button>
        </>
      )}

      {step === "readback" && draft && (
        <>
          <h2 className="t-caption m-0 text-ink-muted" style={native} lang={lang}>
            {t.stepReadback}
          </h2>
          <button
            type="button"
            className="th-voice__prompt text-left"
            style={{ ...native, border: 0, background: "transparent", cursor: "pointer" }}
            lang={lang}
            onClick={() => speakNative(draft.readbackNative)}
          >
            {draft.readbackNative}
          </button>

          <div className="th-card p-4">
            <div className="t-label">{draft.title}</div>
            {draft.priceUsdCents != null && (
              <div className="th-price mt-1">${(draft.priceUsdCents / 100).toFixed(0)}</div>
            )}
          </div>

          {draft.conflicts.length > 0 && (
            <ul className="t-caption m-0 list-disc pl-5 text-ink-muted">
              {draft.conflicts.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}

          <button type="button" className="th-btn th-btn--primary th-btn--block" disabled={busy} onClick={publish}>
            <Check size={20} strokeWidth={2} aria-hidden />
            <span style={native} lang={lang}>
              {t.publish}
            </span>
          </button>
          <button type="button" className="th-btn th-btn--secondary th-btn--block" onClick={() => setStep("speak")}>
            <span style={native} lang={lang}>
              {t.changeSomething}
            </span>
          </button>
        </>
      )}

      {step === "done" && (
        <div className="th-voice">
          <span className="grid h-16 w-16 place-items-center bg-coral text-on-coral" style={{ borderRadius: "var(--radius-pill)" }}>
            <Check size={32} strokeWidth={2} aria-hidden />
          </span>
          <p className="th-voice__prompt m-0" style={native} lang={lang}>
            {t.doneTitle}
          </p>
          <p className="t-body m-0 text-ink-muted" style={native} lang={lang}>
            {t.doneSub}
          </p>
          <button type="button" className="th-btn th-btn--primary th-btn--block" onClick={() => router.push("/w")}>
            {t.myPieces}
          </button>
        </div>
      )}
    </div>
  );
}

/** Client-side resize to max 1600px JPEG before upload (9.3 step 2). */
async function resizeToJpeg(file: File): Promise<{ url: string; mimeType: string; data: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL("image/jpeg", 0.82);
  return { url, mimeType: "image/jpeg", data: url.split(",")[1] ?? "" };
}
