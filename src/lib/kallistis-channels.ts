export const KALLISTIS_CHANNELS = {
  C01: { code: "C01", label: "Web privado", weight: 1, sediment: true },
  C02: { code: "C02", label: "Telegram privado", weight: 0.8, sediment: true },
  C03: { code: "C03", label: "Câmara da Travessia", weight: 0.4, sediment: false },
} as const;

export type KallistisSourceChannel = keyof typeof KALLISTIS_CHANNELS;
