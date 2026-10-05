export function discardUnpersistedAssistant<T extends { id: string; role: string }>(
  messages: T[],
  assistantMessageId: string | null,
): T[] {
  if (!assistantMessageId) return messages;
  return messages.filter(
    (message) => message.role !== "assistant" || message.id !== assistantMessageId,
  );
}
