export function assertValidDateRange(
  inicio: string,
  fim: string | null | undefined,
  label = "evento",
) {
  const start = Date.parse(inicio);
  if (!Number.isFinite(start)) throw new Error("Data inicial inválida.");
  if (!fim) return;
  const end = Date.parse(fim);
  if (!Number.isFinite(end)) throw new Error("Data final inválida.");
  if (end <= start) throw new Error(`O fim do ${label} deve ser posterior ao início.`);
}
