import { randomUUID } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createChatProviderFetch, getOpenRouterApiKey } from "@/lib/openrouter.server";
import { requireUser } from "@/lib/require-user.server";
import { readSessionCookie } from "@/server/local-core/cookies";
import { gerusaCoreRequest, isSameOrigin } from "@/server/gerusa/store";

const headers = { "Cache-Control": "no-store" };
const list = z.array(z.string().trim().min(1).max(500)).max(20);
const textOrList = z
  .union([z.string(), list])
  .transform((value) => (Array.isArray(value) ? value.join(", ") : value));
const outline = z
  .array(z.object({ title: z.string(), activity: z.string(), prompt: z.string() }).strict())
  .max(12);
const adventureSchema = z
  .object({
    title: z.string().min(1).max(160),
    premise: z.string().max(2000),
    pedagogicalObjective: z.string().max(1200),
    grammarTarget: z.string().max(500),
    vocabulary: list,
    estimatedMinutes: z.number().int().min(5).max(240),
    tone: z.string().max(200),
    difficulty: z.string().max(100),
    scenes: z
      .array(
        z
          .object({
            title: z.string(),
            description: z.string(),
            goal: z.string(),
            englishQuestions: list,
            supports: list,
          })
          .strict(),
      )
      .max(10),
    npcs: z
      .array(z.object({ name: z.string(), description: z.string(), dialogue: z.string() }).strict())
      .max(12),
    choices: list,
    challenges: list,
    englishQuestions: list,
    supports: list,
    conclusion: z.string(),
    hook: z.string(),
    suggestedTask: z.string(),
  })
  .strict();
const schemas: Record<string, z.ZodType> = {
  plan_lesson: z
    .object({
      objective: z.string(),
      grammar: z.string(),
      vocabulary: textOrList,
      durationMinutes: z.number().int().min(5).max(240),
      outline,
      adventureSuggestion: z.string(),
      taskSuggestion: z.string(),
    })
    .strict(),
  next_lesson: z
    .object({
      objective: z.string(),
      grammar: z.string(),
      vocabulary: textOrList,
      durationMinutes: z.number().int().min(5).max(240),
      outline,
      adventureSuggestion: z.string(),
      taskSuggestion: z.string(),
      evidence: list,
    })
    .strict(),
  adventure: adventureSchema,
  scene: z
    .object({
      title: z.string(),
      description: z.string(),
      goal: z.string(),
      grammarFocus: z.string(),
      vocabulary: list,
      npcs: list,
      challenge: z.string(),
      englishQuestions: list,
      supports: list,
      conclusion: z.string(),
      nextHook: z.string(),
    })
    .strict(),
  npc: z
    .object({
      name: z.string(),
      appearance: z.string(),
      personality: z.string(),
      goal: z.string(),
      dialogue: z.string(),
      questions: list,
    })
    .strict(),
  dialogue: z
    .object({
      context: z.string(),
      grammarFocus: z.string(),
      vocabulary: list,
      lines: z
        .array(z.object({ speaker: z.string(), text: z.string() }).strict())
        .min(2)
        .max(24),
    })
    .strict(),
  challenge: z
    .object({
      title: z.string(),
      instructions: z.string(),
      grammarFocus: z.string(),
      vocabulary: list,
      englishQuestions: list,
      supportHints: list,
      successEvidence: z.string(),
    })
    .strict(),
  quiz: z
    .object({
      title: z.string(),
      instructions: z.string(),
      questions: z
        .array(
          z.object({ prompt: z.string(), answer: z.string(), explanation: z.string() }).strict(),
        )
        .min(3)
        .max(12),
      grammarFocus: z.string(),
      vocabulary: list,
    })
    .strict(),
  grammar_explanation: z
    .object({
      topic: z.string(),
      explanation: z.string(),
      examples: z
        .array(z.object({ english: z.string(), portuguese: z.string() }).strict())
        .min(2)
        .max(8),
    })
    .strict(),
  simplify_text: z.object({ rewrittenText: z.string(), changes: list }).strict(),
  increase_difficulty: z.object({ rewrittenText: z.string(), changes: list }).strict(),
  task: z
    .object({
      taskType: z.enum([
        "writing",
        "reading",
        "vocabulary",
        "grammar",
        "sentences",
        "questions",
        "quiz",
        "story_continuation",
        "character_diary",
      ]),
      title: z.string(),
      prompt: z.string(),
      instructions: z.array(z.string()).max(12),
      expectedEvidence: z.string(),
      grammarTarget: z.string(),
      vocabulary: list,
    })
    .strict(),
  lesson_summary: z
    .object({
      narrativeSummary: z.string(),
      pedagogicalSummary: z.string(),
      grammar: list,
      vocabulary: list,
      strengths: list,
      difficulties: list,
      suggestedTask: z.string(),
      nextStep: z.string(),
    })
    .strict(),
  progress_analysis: z
    .object({
      findings: list,
      evidence: list,
      suggestedUpdates: z
        .array(
          z
            .object({
              skill: z.string(),
              status: z.enum(["emerging", "developing", "secure", "not_observed"]),
              observation: z.string(),
              evidence: z.string(),
            })
            .strict(),
        )
        .max(12),
    })
    .strict(),
};

function toJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const definition = schema._def as {
    typeName: string;
    shape?: () => Record<string, z.ZodTypeAny>;
    type?: z.ZodTypeAny;
    innerType?: z.ZodTypeAny;
    schema?: z.ZodTypeAny;
    options?: z.ZodTypeAny[];
    values?: string[];
    checks?: Array<{ kind: string; value?: number }>;
  };
  switch (definition.typeName) {
    case "ZodObject": {
      const shape = definition.shape?.() ?? {};
      return {
        type: "object",
        properties: Object.fromEntries(
          Object.entries(shape).map(([key, value]) => [key, toJsonSchema(value)]),
        ),
        required: Object.keys(shape),
        additionalProperties: false,
      };
    }
    case "ZodArray":
      return { type: "array", items: toJsonSchema(definition.type!) };
    case "ZodString":
      return { type: "string" };
    case "ZodNumber":
      return {
        type: definition.checks?.some((check) => check.kind === "int") ? "integer" : "number",
      };
    case "ZodEnum":
      return { type: "string", enum: definition.values };
    case "ZodUnion":
      return { anyOf: definition.options?.map(toJsonSchema) ?? [] };
    case "ZodEffects":
      return toJsonSchema(definition.schema!);
    case "ZodOptional":
    case "ZodNullable":
    case "ZodDefault":
      return toJsonSchema(definition.innerType!);
    default:
      return {};
  }
}

const actionSchema = z
  .object({
    action: z.enum(Object.keys(schemas) as [string, ...string[]]),
    mesaId: z.string().uuid(),
    studentId: z.string().uuid(),
    lessonId: z.string().uuid().optional(),
    fields: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

function errorResponse(error: string, status: number, requestId: string) {
  return Response.json(
    { error, requestId },
    { status, headers: { ...headers, "x-request-id": requestId } },
  );
}

export const Route = createFileRoute("/api/gerusa/action")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const requestId = randomUUID();
        if (!isSameOrigin(request)) return errorResponse("csrf_rejected", 403, requestId);
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const raw = await request.text();
        if (new TextEncoder().encode(raw).byteLength > 16_384)
          return errorResponse("payload_too_large", 413, requestId);
        let rawBody: unknown;
        try {
          rawBody = JSON.parse(raw);
        } catch {
          return errorResponse("invalid_json", 400, requestId);
        }
        const parsed = actionSchema.safeParse(rawBody);
        if (!parsed.success) return errorResponse("invalid_request", 400, requestId);
        const { action, mesaId, studentId, lessonId, fields = {} } = parsed.data;
        const sessionToken = readSessionCookie(request.headers.get("cookie"));
        let context;
        try {
          const query = new URLSearchParams({ mesaId, studentId });
          if (lessonId) query.set("lessonId", lessonId);
          context = await gerusaCoreRequest<{ context: Record<string, unknown> }>(
            `/pedagogy/ai-context?${query}`,
            {},
            sessionToken,
          );
        } catch (error) {
          const status =
            error instanceof Error && /_40[134]$/.test(error.message)
              ? Number(error.message.slice(-3))
              : 503;
          return errorResponse(
            status === 503 ? "context_unavailable" : "context_forbidden",
            status,
            requestId,
          );
        }

        const model = process.env.OPENROUTER_MODEL?.trim() || "openrouter/free";
        if (!(model === "openrouter/free" || model.endsWith(":free")))
          return errorResponse("free_model_required", 503, requestId);
        let key: string;
        try {
          key = getOpenRouterApiKey();
        } catch {
          return errorResponse("provider_not_configured", 503, requestId);
        }
        const requiredKeys = Object.keys((schemas[action] as z.AnyZodObject).shape);
        const contractHint =
          action === "plan_lesson" || action === "next_lesson"
            ? `Inclua obrigatoriamente todas estas chaves no objeto raiz: ${requiredKeys.join(", ")}. "outline" deve ser um array de objetos, cada um com "title", "activity" e "prompt" como strings. "durationMinutes" deve ser um inteiro. As sugestões "adventureSuggestion" e "taskSuggestion" são strings. ${action === "next_lesson" ? '"evidence" deve ser um array de strings.' : ""}`
            : `Inclua obrigatoriamente todas estas chaves no objeto raiz: ${requiredKeys.join(", ")}.`;
        const system = `Você é Gerusa Poulain, mestra de RPG e professora de inglês. Execute a ação pedagógica solicitada usando apenas o contexto deste aluno. Não inclua dados de outros alunos. Crie conteúdo narrativo e útil para uma aula de inglês por RPG, adequado ao nível e à idade quando informados. Devolva somente um objeto JSON válido que corresponda exatamente ao contrato da ação ${action}; não use markdown nem texto fora do JSON. ${contractHint} A professora revisará a proposta antes de salvá-la. Contexto autorizado: ${JSON.stringify(context.context)}. Campos solicitados: ${JSON.stringify(fields)}.`;
        const providerFetch = createChatProviderFetch(fetch, {
          requestId,
          primaryModel: model,
          fallbackModel: model,
          maxRetries: 0,
        });
        let response: Response;
        try {
          response = await providerFetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
              "HTTP-Referer": new URL(request.url).origin,
              "X-Title": "Gerusa Poulain",
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: system },
                { role: "user", content: `Ação: ${action}. Gere a proposta estruturada agora.` },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: `submit_${action}`,
                    description: `Return the structured pedagogical proposal for ${action}.`,
                    parameters: toJsonSchema(schemas[action]),
                    strict: true,
                  },
                },
              ],
              tool_choice: { type: "function", function: { name: `submit_${action}` } },
              temperature: 0.45,
              max_tokens: 1800,
            }),
            signal: AbortSignal.timeout(60_000),
          });
        } catch {
          return errorResponse("provider_unavailable", 502, requestId);
        }
        if (!response.ok) {
          const status = response.status;
          await response.body?.cancel().catch(() => {});
          return errorResponse("provider_rejected", status === 429 ? 503 : 502, requestId);
        }
        const payload = (await response.json().catch(() => null)) as {
          choices?: Array<{ message?: Record<string, unknown> }>;
          error?: Record<string, unknown>;
        } | null;
        const message = payload?.choices?.[0]?.message;
        const toolCalls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];
        const firstToolCall = toolCalls[0];
        const toolArguments =
          firstToolCall &&
          typeof firstToolCall === "object" &&
          "function" in firstToolCall &&
          firstToolCall.function &&
          typeof firstToolCall.function === "object" &&
          "arguments" in firstToolCall.function &&
          typeof firstToolCall.function.arguments === "string"
            ? firstToolCall.function.arguments
            : undefined;
        let content = toolArguments ?? message?.content;
        if (Array.isArray(content)) {
          content = content
            .map((part) =>
              part && typeof part === "object" && "text" in part && typeof part.text === "string"
                ? part.text
                : "",
            )
            .join("\n");
        }
        if (typeof content !== "string") {
          console.warn(
            JSON.stringify({
              type: "gerusa_action_response_shape_rejected",
              action,
              requestId,
              payloadKeys: payload && typeof payload === "object" ? Object.keys(payload) : [],
              providerError:
                payload?.error && typeof payload.error === "object"
                  ? {
                      type: payload.error.type,
                      code: payload.error.code,
                      message:
                        typeof payload.error.message === "string"
                          ? payload.error.message.slice(0, 240)
                          : undefined,
                    }
                  : null,
              choiceCount: payload?.choices?.length ?? 0,
              messageKeys: message ? Object.keys(message) : [],
              toolCallCount: toolCalls.length,
              contentType: Array.isArray(message?.content) ? "array" : typeof message?.content,
              contentPartTypes: Array.isArray(message?.content)
                ? message.content.map((part) =>
                    part && typeof part === "object" && "type" in part ? part.type : typeof part,
                  )
                : [],
            }),
          );
          return errorResponse("invalid_provider_response", 502, requestId);
        }
        let candidate: unknown;
        const trimmedContent = content
          .trim()
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/, "");
        try {
          candidate = JSON.parse(trimmedContent);
        } catch {
          const objectStart = trimmedContent.indexOf("{");
          const objectEnd = trimmedContent.lastIndexOf("}");
          if (objectStart < 0 || objectEnd <= objectStart)
            return errorResponse("invalid_provider_json", 502, requestId);
          try {
            candidate = JSON.parse(trimmedContent.slice(objectStart, objectEnd + 1));
          } catch {
            return errorResponse("invalid_provider_json", 502, requestId);
          }
        }
        const result = schemas[action].safeParse(candidate);
        if (!result.success) {
          console.warn(
            JSON.stringify({
              type: "gerusa_action_contract_rejected",
              action,
              requestId,
              candidateKeys:
                candidate && typeof candidate === "object" && !Array.isArray(candidate)
                  ? Object.keys(candidate)
                  : [],
              issues: result.error.issues.map(({ code, path }) => ({ code, path })),
            }),
          );
          return errorResponse("invalid_provider_contract", 502, requestId);
        }
        return Response.json(
          {
            action,
            proposal: result.data,
            context: {
              studentName: (context.context.student as { name?: string } | undefined)?.name ?? null,
            },
            requestId,
          },
          { headers: { ...headers, "x-request-id": requestId } },
        );
      },
    },
  },
});
