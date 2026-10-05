export const MAGIC_FORMS = [
  {
    id: "SILMA",
    canonicalName: "SILMA",
  },
  {
    id: "MANESH",
    canonicalName: "MANESH",
  },
  {
    id: "VELAR",
    canonicalName: "VELAR",
  },
  {
    id: "NOOVETH",
    canonicalName: "NOOVETH",
  },
  {
    id: "MIRA",
    canonicalName: "MIRA",
  },
  {
    id: "VETH",
    canonicalName: "VETH",
  },
  {
    id: "VERTH",
    canonicalName: "VERTH",
  },
  {
    id: "TAL",
    canonicalName: "TAL",
  },
  {
    id: "KAJ",
    canonicalName: "KAJ",
  },
  {
    id: "HAJ",
    canonicalName: "HAJ",
  },
  {
    id: "KOMM",
    canonicalName: "KOMM",
  },
  {
    id: "THUVEL",
    canonicalName: "THUVEL",
  },
  {
    id: "KAV",
    canonicalName: "KAV",
  },
  {
    id: "ANIR",
    canonicalName: "ANIR",
  },
  {
    id: "THAREN",
    canonicalName: "THAREN",
  },
  {
    id: "LUUMEH",
    canonicalName: "LUUMEH",
  },
  {
    id: "THEI",
    canonicalName: "THEI",
  },
  {
    id: "SAA",
    canonicalName: "SAA",
  },
  {
    id: "NAM",
    canonicalName: "NAM",
  },
  {
    id: "MANUV",
    canonicalName: "MANUV",
  },
  {
    id: "LIMNAR",
    canonicalName: "LIMNAR",
  },
  {
    id: "NOEH",
    canonicalName: "NOEH",
  },
  {
    id: "OM",
    canonicalName: "OM",
  },
  {
    id: "SAAL",
    canonicalName: "SAAL",
  },
  {
    id: "HAETH",
    canonicalName: "HAETH",
  },
  {
    id: "LESH",
    canonicalName: "LESH",
  },
  {
    id: "NA",
    canonicalName: "NA",
  },
  {
    id: "VE",
    canonicalName: "VE",
  },
  {
    id: "KRIA",
    canonicalName: "KRIA",
  },
  {
    id: "VIA",
    canonicalName: "VIA",
  },
  {
    id: "SEN",
    canonicalName: "SEN",
  },
  {
    id: "NASH",
    canonicalName: "NASH",
  },
  {
    id: "MIRAJ",
    canonicalName: "MIRAJ",
  },
  {
    id: "KOMMETH",
    canonicalName: "KOMMETH",
  },
  {
    id: "NIVA",
    canonicalName: "NIVA",
  },
  {
    id: "REQ",
    canonicalName: "REQ",
  },
  {
    id: "ORUN",
    canonicalName: "ORUN",
  },
  {
    id: "ARI",
    canonicalName: "ARI",
  },
  {
    id: "MARE",
    canonicalName: "MARE",
  },
  {
    id: "THIR",
    canonicalName: "THIR",
  },
  {
    id: "ELUN",
    canonicalName: "ELUN",
  },
  {
    id: "THUR",
    canonicalName: "THUR",
  },
  {
    id: "THULUN",
    canonicalName: "THULUN",
  },
  {
    id: "ZAAR",
    canonicalName: "ZAAR",
  },
  {
    id: "AR",
    canonicalName: "AR",
  },
  {
    id: "IM",
    canonicalName: "IM",
  },
  {
    id: "ATH",
    canonicalName: "ATH",
  },
  {
    id: "RU",
    canonicalName: "RU",
  },
  {
    id: "AV",
    canonicalName: "AV",
  },
  {
    id: "SILMAIN",
    canonicalName: "SILMAIN",
  },
  {
    id: "LUZ",
    canonicalName: "LUZ",
  },
  {
    id: "SUUL",
    canonicalName: "SUUL",
  },
  {
    id: "MANIR",
    canonicalName: "MANIR",
  },
  {
    id: "MIRIN",
    canonicalName: "MIRIN",
  },
  {
    id: "VERUM",
    canonicalName: "VERUM",
  },
  {
    id: "LAR",
    canonicalName: "LAR",
  },
  {
    id: "RUM",
    canonicalName: "RUM",
  },
  {
    id: "RAA",
    canonicalName: "RAA",
  },
  {
    id: "NHEL",
    canonicalName: "NHEL",
  },
  {
    id: "YAH",
    canonicalName: "YAH",
  },
  {
    id: "ZHEL",
    canonicalName: "ZHEL",
  },
  {
    id: "NIHEL",
    canonicalName: "NIHEL",
  },
  {
    id: "KRAG",
    canonicalName: "KRAG",
  },
  {
    id: "KRAG'OR",
    canonicalName: "KRAG'OR",
  },
  {
    id: "NI'AR",
    canonicalName: "NI'AR",
  },
  {
    id: "RA'IN",
    canonicalName: "RA'IN",
  },
  {
    id: "NIMAR",
    canonicalName: "NIMAR",
  },
  {
    id: "RAAR",
    canonicalName: "RAAR",
  },
  {
    id: "R'AL",
    canonicalName: "R'AL",
  },
  {
    id: "BEQ",
    canonicalName: "BEQ",
  },
  {
    id: "NAAR",
    canonicalName: "NAAR",
  },
  {
    id: "HAJR",
    canonicalName: "HAJR",
  },
  {
    id: "KA'V",
    canonicalName: "KA'V",
  },
  {
    id: "NIM'THEI",
    canonicalName: "NIM'THEI",
  },
  {
    id: "NUERI",
    canonicalName: "NUERI",
  },
  {
    id: "MA'VEL",
    canonicalName: "MA'VEL",
  },
] as const;
export type MagicFormId = (typeof MAGIC_FORMS)[number]["id"];
export type MaxMagicGrade = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type KnownForm = { formId: MagicFormId; maxGrade: MaxMagicGrade };
export const MAGIC_FORM_IDS = new Set<string>(MAGIC_FORMS.map((form) => form.id));
export const TECELAO_KNOWN_FORM_TOTALS: Record<number, number> = {
  1: 4,
  2: 6,
  3: 8,
  4: 10,
  5: 12,
  6: 14,
  7: 16,
  8: 18,
  9: 20,
  10: 22,
  11: 22,
  12: 22,
  13: 22,
  14: 22,
  15: 22,
};
export function magicGradeCap(marco: number): MaxMagicGrade {
  return marco >= 15 ? 6 : marco >= 13 ? 5 : marco >= 11 ? 4 : marco >= 5 ? 3 : marco >= 3 ? 2 : 1;
}
