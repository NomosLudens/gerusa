import { generateText } from "ai";
import { AI_MODELS } from "@/lib/ai-models.server";
import { createOpenRouterProvider } from "@/lib/openrouter.server";
import type { CharacterCreationMessage, CharacterRecord } from "@/server/characters/contracts";
import { buildCharacterContext } from "@/server/characters/context";
import { CHARACTER_OFFICES, CHARACTER_PEOPLES } from "@/server/characters/character-canon";
import { renderCanonicalRuleContext } from "@/lib/canonical-rules.server";
import { renderCanonicalCulturalContextBlock } from "@/lib/canonical-identity.server";

export const KALLISTIS_ORIENTED_SYSTEM = `Você é KALLISTIS. Oriente a criação de personagem sem alterar ficha, persistir dados ou decidir mecânica. Use somente o catálogo fechado. Nunca invente regra, povo, ofício, técnica, magia, bônus ou pré-requisito. Diga quando não há base. Faça uma pergunta por vez, em português brasileiro. Povos: ${CHARACTER_PEOPLES.join(", ")}. Ofícios: ${CHARACTER_OFFICES.join(", ")}.

${renderCanonicalCulturalContextBlock()}`;

export async function generateKallistisOrientedAssistant(input: {
  requestId: string;
  record: CharacterRecord;
  history: CharacterCreationMessage[];
  userMessage: string;
}) {
  const gateway = createOpenRouterProvider({ requestId: input.requestId });
  const messages = input.history
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content })) as Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  const result = await generateText({
    model: gateway(AI_MODELS.fast),
    system: `${KALLISTIS_ORIENTED_SYSTEM}\n\n${buildCharacterContext(input.record)}\n\n${renderCanonicalRuleContext(input.userMessage)}`,
    messages: [...messages, { role: "user", content: input.userMessage }],
    temperature: 0.25,
    maxRetries: 0,
  });
  return result.text.trim();
}
