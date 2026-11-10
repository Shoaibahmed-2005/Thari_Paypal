/**
 * Generates the Tamil sample voice note and its follow-up answer
 * (BUILD_PLAN 14.3, MANUAL item M8) with Gemini TTS, into /public/samples.
 *
 * These are a stand-in so the judge demo path and live-mode testing work
 * before a real weaver recording exists. Replace them with the real thing
 * when it is recorded — the filenames are what the UI loads.
 *
 * Run: npx tsx scripts/make-sample-voice.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { mkdir, writeFile } from "node:fs/promises";


const CLIPS = [
  {
    file: "sample-voice-ta.wav",
    // The script from BUILD_PLAN 14.3: deliberately omits the length, so the
    // AI has to ask the metres question during the demo.
    text:
      "நான் ஒரு காஞ்சிபுரம் பட்டுப் புடவை நெய்திருக்கிறேன். ஆரஞ்சும் மஞ்சளும் கலந்த நிறம், மயில் பார்டர். " +
      "ரவிக்கைத் துண்டு உண்டு, தைக்கப்படவில்லை. விலை பதினெட்டாயிரம் ரூபாய். நெய்ய ஆறு வாரம் ஆனது.",
  },
  {
    file: "sample-answer-ta.wav",
    text: "ஆறரை மீட்டர்.",
  },
];

/** Gemini TTS returns 24 kHz mono 16-bit; unary responses already carry a RIFF header. */
function wrapPcmAsWav(pcm: Buffer, sampleRate = 24_000, channels = 1, bitsPerSample = 16): Buffer {
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * blockAlign, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_TTS_MODEL;
  const voiceName = process.env.GEMINI_TTS_VOICE;
  if (!apiKey || !model || !voiceName) {
    throw new Error("GEMINI_API_KEY, GEMINI_TTS_MODEL and GEMINI_TTS_VOICE must be set in .env.local");
  }

  await mkdir("public/samples", { recursive: true });

  for (const clip of CLIPS) {
    // Called over REST rather than through @google/genai: the installed SDK
    // serialises speechConfig in a way this model rejects ("Unknown name
    // speechConfig at generation_config"), while the same shape over REST
    // returns 200. Verified against the API on 2026-11-11.
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `Say warmly and slowly, in Tamil: ${clip.text}` }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
          },
        }),
      },
    );

    const body = (await res.json()) as {
      candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[];
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(body.error?.message ?? `TTS returned ${res.status}`);

    const inline = body.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
    if (!inline?.data) throw new Error(`No audio came back for ${clip.file}`);

    const raw = Buffer.from(inline.data, "base64");
    const mime = inline.mimeType ?? "";
    const isWav = mime.includes("wav") || raw.subarray(0, 4).toString() === "RIFF";
    const out = isWav ? raw : wrapPcmAsWav(raw);

    await writeFile(`public/samples/${clip.file}`, out);
    console.log(`${clip.file}: ${(out.length / 1024).toFixed(0)} KB, mime ${mime || "unknown"}, wrapped: ${!isWav}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
