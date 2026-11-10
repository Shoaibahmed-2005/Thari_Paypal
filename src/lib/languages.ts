/**
 * The languages a weaver can speak to Thari in.
 *
 * Deviation from BUILD_PLAN, which assumed Tamil throughout: the language is a
 * property of the weaver, not of the app. She picks one at sign-up and can
 * change it in settings; `User.preferredLang` holds it and `Listing.lang`
 * records what she actually spoke for a given piece, so an old listing stays
 * correct if she later switches.
 *
 * Gemini handles all of these natively, so the AI side is a prompt parameter
 * rather than separate code paths. Adding one here is a one-line change plus
 * its UI strings.
 */

export interface Language {
  /** BCP-47 code, stored in the database and passed to Gemini. */
  code: string;
  /** Name in English, for the co-op dashboard and admin views. */
  englishName: string;
  /** Name in the language itself, for the picker she sees. */
  nativeName: string;
  /** Unicode script, so the UI can pick the right font stack. */
  script: "Tamil" | "Devanagari" | "Telugu" | "Bengali" | "Latin";
}

export const LANGUAGES: readonly Language[] = [
  { code: "ta", englishName: "Tamil", nativeName: "தமிழ்", script: "Tamil" },
  { code: "hi", englishName: "Hindi", nativeName: "हिन्दी", script: "Devanagari" },
  { code: "te", englishName: "Telugu", nativeName: "తెలుగు", script: "Telugu" },
  { code: "bn", englishName: "Bengali", nativeName: "বাংলা", script: "Bengali" },
  { code: "en", englishName: "English", nativeName: "English", script: "Latin" },
] as const;

/** What a weaver gets if she never picks one, and what the seeded demo uses. */
export const DEFAULT_LANGUAGE_CODE = "ta";

export function getLanguage(code: string | null | undefined): Language {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

export function isSupportedLanguage(code: string | null | undefined): boolean {
  return LANGUAGES.some((l) => l.code === code);
}

/**
 * CSS font-family stack for a script. `--font-tamil` is a brand token and is
 * left exactly as defined; the other scripts get their own stacks so no token
 * has to change.
 */
export function fontStackFor(script: Language["script"]): string {
  switch (script) {
    case "Tamil":
      return "var(--font-tamil)";
    case "Devanagari":
      return '"Noto Sans Devanagari", var(--font-sans)';
    case "Telugu":
      return '"Noto Sans Telugu", var(--font-sans)';
    case "Bengali":
      return '"Noto Sans Bengali", var(--font-sans)';
    case "Latin":
      return "var(--font-sans)";
  }
}
