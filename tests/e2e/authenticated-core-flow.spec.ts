import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __e2eAsyncDiagnostics?: Array<Record<string, string>>;
  }
}

function describePageError(value: unknown): string {
  if (value instanceof Error) {
    const stackLines = value.stack
      ?.split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const stackLine = stackLines?.find((line) => line.startsWith("at ")) ?? stackLines?.[0];

    return [
      `type=${value.constructor?.name || "Error"}`,
      `name=${value.name || "Error"}`,
      `message=${value.message || "<sem mensagem>"}`,
      stackLine ? `stack=${stackLine}` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  const type = typeof value;
  if (value !== null && (type === "object" || type === "function")) {
    const ownProperties = Object.keys(value).sort().join(",");
    return `type=${type} value=${String(value)} own_properties=${ownProperties || "<nenhuma>"}`;
  }

  return `type=${type} value=${String(value)}`;
}

test("login, conversa real e persistência após reload", async ({ page }) => {
  const flowErrors: string[] = [];
  const browserDiagnostics: string[] = [];
  let phase = "bootstrap";

  const setPhase = (next: string) => {
    phase = next;
  };

  await page.addInitScript(() => {
    const diagnostics: Array<Record<string, string>> = [];
    const describe = (type: string, reason: unknown) => {
      const isError = reason instanceof Error;
      const stack = isError
        ? reason.stack
            ?.split("\n")
            .map((line) => line.trim())
            .find(Boolean)
        : undefined;
      diagnostics.push({
        type,
        reason_type: typeof reason,
        constructor: isError ? reason.constructor?.name || "Error" : "<não-Error>",
        name: isError ? reason.name || "Error" : "<não-Error>",
        message: isError ? reason.message || "<sem mensagem>" : "<sem mensagem>",
        stack: stack ?? "<sem stack>",
        pathname: window.location.pathname,
      });
    };

    window.addEventListener("unhandledrejection", (event) =>
      describe("unhandledrejection", event.reason),
    );
    window.addEventListener("error", (event) => {
      diagnostics.push({
        type: "error",
        message: event.message || "<sem mensagem>",
        filename: event.filename ? new URL(event.filename).pathname : "<sem arquivo>",
        lineno: String(event.lineno || 0),
        colno: String(event.colno || 0),
        error_type: typeof event.error,
        pathname: window.location.pathname,
      });
    });
    Object.defineProperty(window, "__e2eAsyncDiagnostics", {
      configurable: true,
      get: () => diagnostics,
    });
  });

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Runtime.enable");
  await cdp.send("Debugger.enable");
  await cdp.send("Debugger.setPauseOnExceptions", { state: "uncaught" });
  cdp.on("Runtime.exceptionThrown", ({ exceptionDetails }) => {
    const exception = exceptionDetails.exception;
    const frames = (exceptionDetails.stackTrace?.callFrames ?? []).slice(0, 8).map((frame) => {
      const url = frame.url ? new URL(frame.url).pathname : "<sem URL>";
      return `${frame.functionName || "<anônimo>"}@${url}:${frame.lineNumber}:${frame.columnNumber}`;
    });
    browserDiagnostics.push(
      `cdp_exception type=${exception?.type ?? "<sem tipo>"} subtype=${exception?.subtype ?? "<sem subtipo>"} description=${exception?.description ?? "<sem descrição>"} text=${exceptionDetails.text || "<sem texto>"} frames=${frames.join(";") || "<sem frames>"}`,
    );
  });
  cdp.on("Debugger.paused", async ({ callFrames }) => {
    const frames = callFrames.slice(0, 8).map((frame) => {
      const url = frame.url ? new URL(frame.url).pathname : "<sem URL>";
      return `${frame.functionName || "<anônimo>"}@${url}:${frame.location.lineNumber}:${frame.location.columnNumber}`;
    });
    browserDiagnostics.push(`debugger_paused frames=${frames.join(";") || "<sem frames>"}`);
    await cdp.send("Debugger.resume");
  });

  page.on("pageerror", (error) => {
    flowErrors.push(
      `pageerror phase=${phase} pathname=${new URL(page.url()).pathname}: ${describePageError(error)}`,
    );
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      flowErrors.push(
        `console.error phase=${phase} pathname=${new URL(page.url()).pathname}: ${message.text()}`,
      );
    } else if (message.type() === "info" && message.text().startsWith("kallistis_e2e:")) {
      browserDiagnostics.push(message.text());
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 500) {
      const requestId = response.headers()["x-request-id"];
      flowErrors.push(
        `HTTP ${response.status()}: ${new URL(response.url()).origin}${new URL(response.url()).pathname}` +
          (requestId ? ` request_id=${requestId}` : ""),
      );
    }
  });
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    flowErrors.push(
      `Falha de rede em ${url.origin}${url.pathname}: ${request.failure()?.errorText ?? "desconhecida"}`,
    );
  });

  let primaryError: unknown;
  let hasPrimaryError = false;
  try {
    setPhase("auth");
    await page.goto("/auth");
    setPhase("login");
    await page.getByLabel("Email").fill(process.env.E2E_ADMIN_EMAIL!);
    await page.getByLabel("Senha").fill(process.env.E2E_ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();

    await expect(page).toHaveURL(/\/chat(?:\/[^/?#]+)?(?:[?#].*)?$/);
    await expect(page.getByRole("button", { name: "Abrir menu" })).toBeVisible();
    setPhase("chat_loaded");
    await expect(page.locator("body")).not.toContainText("FAKE_USER");
    await expect(page.locator("body")).not.toContainText("FAKE_REPLY");

    const conversationPath = new URL(page.url()).pathname;
    const messageInput = page.getByRole("textbox", { name: "Mensagem" });
    await expect(messageInput).toBeEnabled();

    const chatMarker = `E2E-${Date.now()}-${crypto.randomUUID()}`;
    const prompt = `Teste técnico de persistência: ${chatMarker}`;
    const chatResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === "/api/chat" && response.request().method() === "POST";
    });

    setPhase("sending");
    await messageInput.fill(prompt);
    await page.getByRole("button", { name: "Enviar mensagem" }).click();

    const chatResponse = await chatResponsePromise;
    expect(chatResponse.status(), "A API real de chat deve responder com sucesso").toBeLessThan(
      400,
    );

    const userMessage = page
      .getByTestId("chat-message-user")
      .filter({ hasText: chatMarker })
      .last();
    const assistantMessage = page.getByTestId("chat-message-assistant").last();
    await expect(userMessage).toBeVisible();
    await expect(assistantMessage).toHaveText(/\S/);
    await expect(page.getByRole("button", { name: "Processando" })).toBeHidden();
    await expect(messageInput).toBeEnabled();

    const responseError = await chatResponse.finished();
    expect(responseError, "O streaming de /api/chat deve terminar antes do reload").toBeNull();

    setPhase("assistant_received");
    const persistedChatReply = (await assistantMessage.textContent())?.trim();
    expect(persistedChatReply).toBeTruthy();
    setPhase("assistant_idle");

    setPhase("before_reload");
    await page.reload();
    setPhase("after_reload");
    await expect(page).toHaveURL(new RegExp(`${conversationPath.replaceAll("/", "\\/")}$`));
    await expect(page.getByRole("button", { name: "Abrir menu" })).toBeVisible();
    await expect(
      page.getByTestId("chat-message-user").filter({ hasText: chatMarker }).last(),
    ).toBeVisible();
    await expect(page.getByTestId("chat-message-assistant").last()).toHaveText(persistedChatReply!);

    setPhase("local_session");
    const protectedProfile = await page.request.get("/api/profile", { failOnStatusCode: false });
    expect(protectedProfile.status(), "A sessão local deve autorizar uma API protegida").toBe(200);

    setPhase("logout");
    await page.getByRole("button", { name: "Sair", exact: true }).click();
    await expect(page).toHaveURL(/\/auth(?:[?#].*)?$/);
    const invalidSessionProfile = await page.request.get("/api/profile", {
      failOnStatusCode: false,
    });
    expect(
      invalidSessionProfile.status(),
      "Após sair, a API protegida deve bloquear a sessão",
    ).toBe(401);
    setPhase("finished");
  } catch (error) {
    primaryError = error;
    hasPrimaryError = true;
  } finally {
    try {
      const initDiagnostics = await page.evaluate(() => window.__e2eAsyncDiagnostics ?? []);
      browserDiagnostics.push(
        ...initDiagnostics.map((diagnostic) => `browser_async ${JSON.stringify(diagnostic)}`),
      );
    } catch (error) {
      browserDiagnostics.push(
        `browser_async_diagnostics_failed type=${error instanceof Error ? error.name : typeof error}`,
      );
    }
    if (flowErrors.length > 0) {
      console.error(flowErrors.join("\n"));
    }
    if (browserDiagnostics.length > 0) {
      console.error(browserDiagnostics.join("\n"));
    }
  }

  if (hasPrimaryError) throw primaryError;

  expect(
    flowErrors,
    "O fluxo não deve produzir erros de página, console, rede ou HTTP 5xx",
  ).toEqual([]);
});
