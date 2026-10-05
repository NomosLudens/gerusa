import type { CharacterCreationMessage, CharacterRecord } from "./contracts";
import { generateKallistisOrientedAssistant } from "./kallistis-oriented-assistant";
import { generateText, stepCountIs } from "ai";
import { AI_MODELS } from "@/lib/ai-models.server";
import { createOpenRouterProvider } from "@/lib/openrouter.server";
import { createKallistisTools } from "@/server/chat/kallistis-tools";

export async function answerCharacterCreation(input: {
  requestId: string;
  record: CharacterRecord;
  history: CharacterCreationMessage[];
  userMessage: string;
}): Promise<string> {
  return generateKallistisOrientedAssistant(input);
}

export async function answerCharacterForge(input: {
  requestId: string;
  databaseUrl: string;
  userId: string;
  record: CharacterRecord;
  history: CharacterCreationMessage[];
  userMessage: string;
}) {
  const runtime = (await import("@/server/local-core/chat-runtime")).createLocalChatRuntime(
    input.databaseUrl,
  );
  const thread = await runtime.chat.findCanonicalThread(input.userId);
  runtime.close();
  if (!thread) return { answer: await answerCharacterCreation(input), mutation: null };
  const result = await generateText({
    model: createOpenRouterProvider({ requestId: input.requestId })(AI_MODELS.fast),
    system: `${KALLISTIS_FORGE_SYSTEM}\n\nFicha atual:\n${JSON.stringify(input.record.snapshot)}\n\nVocê só pode propor alteração de biografia quando o usuário pedir explicitamente para aplicar uma sugestão. Sugestões sem pedido de aplicação não usam ferramenta. Toda alteração é apenas preview e exige confirmação.`,
    messages: input.history
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }))
      .concat([{ role: "user", content: input.userMessage }]) as Array<{
      role: "user" | "assistant";
      content: string;
    }>,
    tools: createKallistisTools({
      databaseUrl: input.databaseUrl,
      userId: input.userId,
      threadId: thread.id,
      requestId: input.requestId,
      scope: "character_creation",
      activeCharacterId: input.record.id,
    }),
    stopWhen: stepCountIs(2),
    temperature: 0.25,
    maxRetries: 0,
  });
  const toolResults = await result.toolResults;
  const stepToolResults = (result.steps ?? []).flatMap((step: any) => step.toolResults ?? []);
  const mutation =
    [...(toolResults ?? []), ...stepToolResults].find(
      (item: any) => item.toolName === "propose_character_biography_update",
    )?.output ?? null;
  return { answer: result.text.trim(), mutation };
}

const KALLISTIS_FORGE_SYSTEM =
  "Você é KALLISTIS, orientando o jogador na Character Forge. Responda em português brasileiro, respeite o cânone e a ficha atual. Não invente fatos.";
