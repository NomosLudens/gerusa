import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createChatProviderFetch,
  isTransientProviderStatus,
  ProviderTimeoutError,
} from "./openrouter.server";
import { AI_MODELS } from "./ai-models.server";

const requestBody = (model = "primary/model") =>
  JSON.stringify({ model, messages: [{ role: "user", content: "private prompt" }] });

describe("OpenRouter retry and timeout policy", () => {
  afterEach(() => vi.restoreAllMocks());

  it("não repete status 400 do provider", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const baseFetch = vi.fn().mockResolvedValue(new Response("bad request", { status: 400 }));
    const providerFetch = createChatProviderFetch(baseFetch, {
      requestId: "req-400",
      primaryModel: "primary/model",
      fallbackModel: "fallback/model",
      maxRetries: 1,
    });

    const response = await providerFetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      body: requestBody(),
    });

    expect(response.status).toBe(400);
    expect(baseFetch).toHaveBeenCalledTimes(1);
    expect(log.mock.calls.flat().join(" ")).not.toContain("private prompt");
  });

  it("faz somente um fallback para falha transitória", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const models: string[] = [];
    const baseFetch = vi.fn(async (_input, init) => {
      models.push(JSON.parse(String(init?.body)).model);
      return models.length === 1
        ? new Response("unavailable", { status: 503 })
        : new Response("ok", { status: 200 });
    });
    const providerFetch = createChatProviderFetch(baseFetch, {
      requestId: "req-503",
      primaryModel: "primary/model",
      fallbackModel: "fallback/model",
      maxRetries: 1,
    });

    const response = await providerFetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      body: requestBody(),
    });

    expect(response.status).toBe(200);
    expect(models).toEqual(["primary/model", "fallback/model"]);
    expect(baseFetch).toHaveBeenCalledTimes(2);
  });

  it("usa fallback para um modelo de chat selecionado", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const models: string[] = [];
    const baseFetch = vi.fn(async (_input, init) => {
      models.push(JSON.parse(String(init?.body)).model);
      return new Response(models.length === 1 ? "unavailable" : "ok", {
        status: models.length === 1 ? 503 : 200,
      });
    });
    const providerFetch = createChatProviderFetch(baseFetch, {
      requestId: "req-selected",
      primaryModel: "primary/model",
      fallbackModel: "fallback/model",
      maxRetries: 1,
    });

    await providerFetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      body: requestBody("selected/model"),
    });

    expect(models).toEqual(["selected/model", "fallback/model"]);
  });

  it("mantém fallbacks compatíveis para visão e documentos", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    for (const [model, fallback] of [
      [AI_MODELS.vision, AI_MODELS.visionFallback],
      [AI_MODELS.documents, AI_MODELS.documentsFallback],
    ]) {
      const models: string[] = [];
      const baseFetch = vi.fn(async (_input, init) => {
        models.push(JSON.parse(String(init?.body)).model);
        return new Response(models.length === 1 ? "unavailable" : "ok", {
          status: models.length === 1 ? 503 : 200,
        });
      });
      const providerFetch = createChatProviderFetch(baseFetch, {
        requestId: `req-${model}`,
        maxRetries: 1,
      });
      await providerFetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        body: requestBody(model),
      });
      expect(models).toEqual([model, fallback]);
    }
  });

  it("aborta de verdade a chamada quando o timeout expira", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    let observedAbort = false;
    const baseFetch = vi.fn(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            observedAbort = true;
            reject(init.signal?.reason);
          });
        }),
    );
    const providerFetch = createChatProviderFetch(baseFetch, {
      requestId: "req-timeout",
      primaryModel: "primary/model",
      fallbackModel: "fallback/model",
      timeoutMs: 10,
      maxRetries: 0,
    });

    await expect(
      providerFetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        body: requestBody(),
      }),
    ).rejects.toBeInstanceOf(ProviderTimeoutError);
    expect(observedAbort).toBe(true);
  });

  it("classifica somente condições transitórias para retry", () => {
    expect([408, 429, 500, 503].every(isTransientProviderStatus)).toBe(true);
    expect([400, 401, 403, 404, 409, 422].some(isTransientProviderStatus)).toBe(false);
  });
});
