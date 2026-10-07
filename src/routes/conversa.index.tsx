import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authenticatedBeforeLoad } from "@/lib/authenticated-before-load";

export const Route = createFileRoute("/conversa/")({
  ssr: false,
  beforeLoad: authenticatedBeforeLoad,
  component: StartConversation,
});

function StartConversation() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function startConversation() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/gerusa/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const result = (await response.json().catch(() => ({}))) as {
        threadId?: string;
        error?: string;
      };
      if (!response.ok || !result.threadId) throw new Error(result.error || "thread_unavailable");
      await navigate({ to: "/conversa/$threadId", params: { threadId: result.threadId } });
    } catch {
      setError("Não foi possível abrir sua conversa agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-full items-center justify-center bg-[#10070b] px-4 py-10 text-[#f5e9df]">
      <section className="w-full max-w-xl rounded-2xl border border-[#742233]/50 bg-[#180b11] p-6 text-center">
        <img className="mx-auto h-16 w-16 rounded-full" src="/gerusa-logo.png" alt="" />
        <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[#d5a56c]">Gerusa Poulain</p>
        <h1 className="serif mt-2 text-3xl">Vamos continuar sua história?</h1>
        <p className="mt-3 text-sm text-[#e7c9b7]/75">
          Sua conversa fica vinculada ao seu perfil e à sua mesa.
        </p>
        {error ? (
          <p role="alert" className="mt-4 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => void startConversation()}
          disabled={loading}
          className="mt-6 min-h-11 rounded-lg border border-[#a13c4c] bg-[#641a30] px-5 font-medium text-[#fff2e9] transition hover:bg-[#7d2038] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#dc6170] disabled:opacity-60"
        >
          {loading ? "Abrindo conversa…" : "Falar com Gerusa"}
        </button>
      </section>
    </main>
  );
}
