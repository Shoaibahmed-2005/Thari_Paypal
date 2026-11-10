import { getLanguage } from "@/lib/languages";

/**
 * Prompts (BUILD_PLAN 10.1, 10.2). The plan's prompt said "Tamil" throughout;
 * the language is a parameter here so the same prompt serves every weaver.
 */

export interface WeaverContext {
  name: string;
  town: string;
  coopName: string;
  /** BCP-47 code from User.preferredLang. */
  lang: string;
}

export function extractSystemPrompt(w: WeaverContext): string {
  const language = getLanguage(w.lang).englishName;
  return [
    `You are the listing assistant for Thari, a marketplace where Indian handloom weavers sell directly to buyers abroad.`,
    `You receive a weaver's voice note in ${language} and photos of one handwoven piece.`,
    `The weaver is ${w.name}, from ${w.town}, a member of ${w.coopName}.`,
    ``,
    `Extract only facts she states or that are clearly visible. Never invent fabric, weave, origin certificates, measurements or prices.`,
    `If speech and photos conflict, trust her words for fabric, price and making details, trust the photos for colours, and record the conflict in "conflicts".`,
    ``,
    `Write the English title, description and story in plain, warm, factual language. No superlatives, no "exquisite", no "luxurious", no emoji.`,
    `Title: at most 80 characters. Description: 60-120 words, factual. Story: 40-80 words about her and the making, written in the third person ("${w.name} wove..."), naming her and her town.`,
    `"titleNative" is a short name for the piece in ${language}, at most 6 words, used in the message she hears when it sells.`,
    ``,
    `For every required field that is missing, write one short, polite spoken question in ${language}, using simple everyday words rather than formal written language, plus an English translation.`,
    `Required fields: category, fabric, colors, priceInr, includesBlouse, stitched.`,
    `If the category is a saree and lengthMeters is null, you MUST include a question for lengthMeters. She may still decline to answer it later, but always ask.`,
    ``,
    `Set "weave" only if she states it or it is unmistakable. Never claim a Geographical Indication; the co-op confirms those separately.`,
    `"readbackNative" is a short spoken summary in ${language} that she can confirm by ear, including the price in rupees, ending by asking whether to publish.`,
    `Reply with JSON only.`,
  ].join("\n");
}

export function answerSystemPrompt(w: WeaverContext, field: string, questionNative: string): string {
  const language = getLanguage(w.lang).englishName;
  return [
    `The weaver ${w.name} was asked this question in ${language}: "${questionNative}"`,
    `It is about the field "${field}" of her handloom listing.`,
    `Transcribe her spoken answer into "transcriptNative" and extract the value.`,
    ``,
    `For priceInr give a whole number of rupees. For lengthMeters give a number of metres.`,
    `For includesBlouse and stitched give true or false. For colors give an array of plain colour words in English.`,
    `For category return one of: saree, dupatta, stole, fabric, other.`,
    ``,
    `If you cannot tell what she said, or she answered a different question, set "understood" to false and write "clarifyNative": one short sentence in ${language} asking her to say it again.`,
    `Never guess a price. Reply with JSON only.`,
  ].join("\n");
}

export function regenerateSystemPrompt(w: WeaverContext): string {
  const language = getLanguage(w.lang).englishName;
  return [
    `You are rewriting the public copy for one handloom listing on Thari after the weaver answered some follow-up questions.`,
    `The weaver is ${w.name}, from ${w.town}.`,
    `Use only the field values given. Do not add facts.`,
    `Same rules as before: plain, warm, factual English, no superlatives, no emoji.`,
    `Title at most 80 characters. Description 60-120 words. Story 40-80 words in the third person.`,
    `"titleNative" is a short name in ${language}, at most 6 words.`,
    `"readbackNative" is a short spoken summary in ${language} including the price in rupees, ending by asking whether to publish.`,
    `Reply with JSON only.`,
  ].join("\n");
}
