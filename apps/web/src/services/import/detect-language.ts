import { franc } from "franc";

const ISO_639_3_TO_1: Record<string, string> = {
  eng: "en",
  deu: "de",
  fra: "fr",
  spa: "es",
  ita: "it",
  por: "pt",
  nld: "nl",
  pol: "pl",
  rus: "ru",
  jpn: "ja",
  zho: "zh",
  kor: "ko",
  ara: "ar",
  tur: "tr",
  swe: "sv",
  nor: "no",
  dan: "da",
  fin: "fi",
  ces: "cs",
  ron: "ro",
  hun: "hu",
  ell: "el",
  bul: "bg",
  hrv: "hr",
  slk: "sk",
  slv: "sl",
  ukr: "uk",
  hin: "hi",
  tha: "th",
  vie: "vi",
  ind: "id",
  msa: "ms",
  cat: "ca",
  heb: "he",
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  de: "German",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  pl: "Polish",
  ru: "Russian",
  ja: "Japanese",
  zh: "Chinese",
  ko: "Korean",
  ar: "Arabic",
  tr: "Turkish",
  sv: "Swedish",
  no: "Norwegian",
  da: "Danish",
  fi: "Finnish",
  cs: "Czech",
  ro: "Romanian",
  hu: "Hungarian",
  el: "Greek",
  bg: "Bulgarian",
  hr: "Croatian",
  sk: "Slovak",
  sl: "Slovenian",
  uk: "Ukrainian",
  hi: "Hindi",
  th: "Thai",
  vi: "Vietnamese",
  id: "Indonesian",
  ms: "Malay",
  ca: "Catalan",
  he: "Hebrew",
};

export function detectLanguage(text: string): { code: string; name: string; confidence: number } {
  const sample = text.slice(0, 1000);
  const iso3 = franc(sample);

  if (iso3 === "und") {
    return { code: "en", name: "English", confidence: 0.1 };
  }

  const code = ISO_639_3_TO_1[iso3] || "en";
  const name = LANGUAGE_NAMES[code] || "Unknown";

  // franc doesn't expose confidence, so estimate based on text length
  const confidence = Math.min(0.95, 0.5 + sample.length / 2000);

  return { code, name, confidence };
}
