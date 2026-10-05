export function KallistisLoadingShell() {
  console.info("kallistis_e2e:loading_shell_rendered");
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "#08080E",
        color: "#F7EFE4",
        padding: "24px",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <section style={{ maxWidth: 360, textAlign: "center" }}>
        <div
          aria-hidden="true"
          style={{
            width: 44,
            height: 2,
            margin: "0 auto 24px",
            borderRadius: 999,
            background: "var(--gold)",
            boxShadow: "0 0 28px color-mix(in oklab, var(--gold) 45%, transparent)",
          }}
        />
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 600, letterSpacing: "0.04em" }}>
          Kallistis
        </h1>
        <p style={{ margin: "10px 0 0", color: "rgba(247, 239, 228, 0.72)", fontSize: 16 }}>
          Presença que acolhe
        </p>
        <p style={{ margin: "28px 0 0", color: "rgba(247, 239, 228, 0.56)", fontSize: 14 }}>
          Abrindo seu espaço...
        </p>
      </section>
    </main>
  );
}
