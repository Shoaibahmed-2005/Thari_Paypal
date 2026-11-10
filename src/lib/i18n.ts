import { DEFAULT_LANGUAGE_CODE, getLanguage, type Language } from "./languages";

/**
 * The weaver UI's own strings (BUILD_PLAN 9.3 wrote these in Tamil inline).
 *
 * Only the weaver area is translated. Buyer and co-op screens stay English:
 * buyers are abroad and the co-op admin works in English.
 *
 * Tamil is the demo language and has been checked. Hindi, Telugu and Bengali
 * were written by the model and still want a native speaker's eye before the
 * final submission — noted in PROGRESS.md. Any key left out of a language
 * falls back to English rather than showing a blank.
 */

export interface WeaverStrings {
  greeting: string; // takes {name}
  sellNew: string;
  myPieces: string;
  noPieces: string;
  moneyComing: string;
  play: string;
  // /w/new steps
  stepSpeak: string;
  speakPrompt: string;
  speakHint: string;
  useSample: string;
  recordAgain: string;
  stepPhotos: string;
  photosPrompt: string;
  addPhotos: string;
  stepClip: string;
  clipPrompt: string;
  skip: string;
  stepWorking: string;
  workingListening: string;
  workingLooking: string;
  workingWriting: string;
  stepQuestions: string;
  stepReadback: string;
  publish: string;
  changeSomething: string;
  stepDone: string;
  doneTitle: string;
  doneSub: string;
  next: string;
  back: string;
  somethingWrong: string;
  tryAgain: string;
}

const en: WeaverStrings = {
  greeting: "Hello {name}",
  sellNew: "Sell a new piece",
  myPieces: "My pieces",
  noPieces: "Nothing listed yet. Record your first piece.",
  moneyComing: "Coming to you",
  play: "Play",
  stepSpeak: "Speak",
  speakPrompt: "Tell us about your saree",
  speakHint: "Colour, fabric, price, blouse piece, stitched or not, how many weeks",
  useSample: "Use sample voice note",
  recordAgain: "Record again",
  stepPhotos: "Photos",
  photosPrompt: "Add 1 to 6 photos of the piece",
  addPhotos: "Add photos",
  stepClip: "Loom clip",
  clipPrompt: "A short clip of the piece on your loom",
  skip: "Skip for now",
  stepWorking: "Working",
  workingListening: "Listening…",
  workingLooking: "Looking at your photos…",
  workingWriting: "Writing your listing…",
  stepQuestions: "One more thing",
  stepReadback: "Check and confirm",
  publish: "Yes, publish",
  changeSomething: "Change something",
  stepDone: "Done",
  doneTitle: "Your piece is listed",
  doneSub: "The co-op will confirm it soon.",
  next: "Next",
  back: "Back",
  somethingWrong: "Something went wrong.",
  tryAgain: "Try again",
};

const ta: WeaverStrings = {
  greeting: "வணக்கம் {name}",
  sellNew: "புதிய புடவை விற்க",
  myPieces: "என் புடவைகள்",
  noPieces: "இன்னும் எதுவும் இல்லை. முதல் புடவையைப் பதிவு செய்யுங்கள்.",
  moneyComing: "உங்களுக்கு வருகிறது",
  play: "கேட்க",
  stepSpeak: "சொல்லுங்கள்",
  speakPrompt: "உங்கள் புடவையைப் பற்றி சொல்லுங்கள்",
  speakHint: "நிறம், நூல், விலை, ரவிக்கைத் துண்டு, தைத்ததா இல்லையா, எத்தனை வாரம்",
  useSample: "மாதிரி குரலைப் பயன்படுத்து",
  recordAgain: "மீண்டும் பதிவு செய்",
  stepPhotos: "புகைப்படங்கள்",
  photosPrompt: "புடவையின் 1 முதல் 6 படங்கள் சேர்க்கவும்",
  addPhotos: "படங்கள் சேர்க்க",
  stepClip: "தறி காணொளி",
  clipPrompt: "தறியில் புடவை இருக்கும் சிறு காணொளி",
  skip: "இப்போது வேண்டாம்",
  stepWorking: "வேலை நடக்கிறது",
  workingListening: "கேட்கிறேன்…",
  workingLooking: "படங்களைப் பார்க்கிறேன்…",
  workingWriting: "பட்டியலை எழுதுகிறேன்…",
  stepQuestions: "இன்னொரு கேள்வி",
  stepReadback: "சரிபார்த்து உறுதி செய்யுங்கள்",
  publish: "ஆம், வெளியிடு",
  changeSomething: "மாற்ற வேண்டும்",
  stepDone: "முடிந்தது",
  doneTitle: "உங்கள் புடவை பட்டியலில் உள்ளது",
  doneSub: "கூட்டுறவு சங்கம் விரைவில் உறுதி செய்யும்.",
  next: "அடுத்து",
  back: "பின்",
  somethingWrong: "ஏதோ தவறு நடந்தது.",
  tryAgain: "மீண்டும் முயற்சி",
};

const hi: Partial<WeaverStrings> = {
  greeting: "नमस्ते {name}",
  sellNew: "नई साड़ी बेचें",
  myPieces: "मेरी साड़ियाँ",
  noPieces: "अभी कुछ नहीं है। अपनी पहली साड़ी रिकॉर्ड करें।",
  moneyComing: "आपको मिलने वाला है",
  play: "सुनें",
  stepSpeak: "बोलिए",
  speakPrompt: "अपनी साड़ी के बारे में बताइए",
  speakHint: "रंग, कपड़ा, दाम, ब्लाउज़ पीस, सिला है या नहीं, कितने हफ़्ते",
  useSample: "नमूना आवाज़ इस्तेमाल करें",
  recordAgain: "फिर से रिकॉर्ड करें",
  stepPhotos: "तस्वीरें",
  photosPrompt: "साड़ी की 1 से 6 तस्वीरें जोड़ें",
  addPhotos: "तस्वीरें जोड़ें",
  stepClip: "करघे का वीडियो",
  clipPrompt: "करघे पर साड़ी का छोटा वीडियो",
  skip: "अभी रहने दें",
  stepWorking: "काम हो रहा है",
  workingListening: "सुन रहे हैं…",
  workingLooking: "आपकी तस्वीरें देख रहे हैं…",
  workingWriting: "आपकी लिस्टिंग लिख रहे हैं…",
  stepQuestions: "एक और बात",
  stepReadback: "जाँचिए और पक्का कीजिए",
  publish: "हाँ, प्रकाशित करें",
  changeSomething: "कुछ बदलना है",
  stepDone: "हो गया",
  doneTitle: "आपकी साड़ी सूची में है",
  doneSub: "सहकारी समिति जल्द इसकी पुष्टि करेगी।",
  next: "आगे",
  back: "पीछे",
  somethingWrong: "कुछ गड़बड़ हो गई।",
  tryAgain: "फिर कोशिश करें",
};

const te: Partial<WeaverStrings> = {
  greeting: "నమస్కారం {name}",
  sellNew: "కొత్త చీర అమ్మండి",
  myPieces: "నా చీరలు",
  noPieces: "ఇంకా ఏమీ లేదు. మీ మొదటి చీరను రికార్డ్ చేయండి.",
  moneyComing: "మీకు రాబోతోంది",
  play: "వినండి",
  stepSpeak: "చెప్పండి",
  speakPrompt: "మీ చీర గురించి చెప్పండి",
  speakHint: "రంగు, నూలు, ధర, రవికె ముక్క, కుట్టిందా లేదా, ఎన్ని వారాలు",
  useSample: "నమూనా స్వరం వాడండి",
  recordAgain: "మళ్లీ రికార్డ్ చేయండి",
  stepPhotos: "ఫొటోలు",
  photosPrompt: "చీర యొక్క 1 నుండి 6 ఫొటోలు జోడించండి",
  addPhotos: "ఫొటోలు జోడించండి",
  stepClip: "మగ్గం వీడియో",
  clipPrompt: "మగ్గం మీద చీర చిన్న వీడియో",
  skip: "ఇప్పుడు వద్దు",
  stepWorking: "పని జరుగుతోంది",
  workingListening: "వింటున్నాం…",
  workingLooking: "మీ ఫొటోలు చూస్తున్నాం…",
  workingWriting: "మీ జాబితా రాస్తున్నాం…",
  stepQuestions: "ఇంకొక ప్రశ్న",
  stepReadback: "చూసి నిర్ధారించండి",
  publish: "అవును, ప్రచురించండి",
  changeSomething: "ఏదో మార్చాలి",
  stepDone: "అయిపోయింది",
  doneTitle: "మీ చీర జాబితాలో ఉంది",
  doneSub: "సహకార సంఘం త్వరలో నిర్ధారిస్తుంది.",
  next: "తరువాత",
  back: "వెనుకకు",
  somethingWrong: "ఏదో తప్పు జరిగింది.",
  tryAgain: "మళ్లీ ప్రయత్నించండి",
};

const bn: Partial<WeaverStrings> = {
  greeting: "নমস্কার {name}",
  sellNew: "নতুন শাড়ি বিক্রি করুন",
  myPieces: "আমার শাড়ি",
  noPieces: "এখনও কিছু নেই। আপনার প্রথম শাড়ি রেকর্ড করুন।",
  moneyComing: "আপনার কাছে আসছে",
  play: "শুনুন",
  stepSpeak: "বলুন",
  speakPrompt: "আপনার শাড়ির কথা বলুন",
  speakHint: "রং, সুতো, দাম, ব্লাউজ পিস, সেলাই করা কি না, কত সপ্তাহ",
  useSample: "নমুনা কণ্ঠ ব্যবহার করুন",
  recordAgain: "আবার রেকর্ড করুন",
  stepPhotos: "ছবি",
  photosPrompt: "শাড়ির ১ থেকে ৬টি ছবি যোগ করুন",
  addPhotos: "ছবি যোগ করুন",
  stepClip: "তাঁতের ভিডিও",
  clipPrompt: "তাঁতে শাড়ির ছোট ভিডিও",
  skip: "এখন থাক",
  stepWorking: "কাজ চলছে",
  workingListening: "শুনছি…",
  workingLooking: "আপনার ছবি দেখছি…",
  workingWriting: "আপনার তালিকা লিখছি…",
  stepQuestions: "আরও একটি কথা",
  stepReadback: "দেখে নিশ্চিত করুন",
  publish: "হ্যাঁ, প্রকাশ করুন",
  changeSomething: "কিছু বদলাতে চাই",
  stepDone: "হয়ে গেছে",
  doneTitle: "আপনার শাড়ি তালিকায় আছে",
  doneSub: "সমবায় শীঘ্রই নিশ্চিত করবে।",
  next: "পরবর্তী",
  back: "পিছনে",
  somethingWrong: "কিছু ভুল হয়েছে।",
  tryAgain: "আবার চেষ্টা করুন",
};

const TABLE: Record<string, Partial<WeaverStrings>> = { en, ta, hi, te, bn };

export interface Weaverd {
  t: WeaverStrings;
  language: Language;
}

/** Strings for a weaver's language, with English filling any gap. */
export function weaverStrings(langCode: string | null | undefined): Weaverd {
  const language = getLanguage(langCode ?? DEFAULT_LANGUAGE_CODE);
  return { t: { ...en, ...(TABLE[language.code] ?? {}) }, language };
}

export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`);
}
