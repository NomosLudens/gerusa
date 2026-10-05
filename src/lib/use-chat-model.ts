import { useCallback, useState } from "react";
import { CHAT_MODEL_KEY, CHAT_MODELS, isChatModel, type ChatModel } from "./chat-models";

export { CHAT_MODEL_KEY, CHAT_MODELS, type ChatModel };

export function useChatModel() {
  const [activeChatModel, setActiveChatModelState] = useState<ChatModel | undefined>(() => {
    const saved = typeof localStorage === "undefined" ? null : localStorage.getItem(CHAT_MODEL_KEY);
    return isChatModel(saved) ? saved : undefined;
  });

  const setActiveChatModel = useCallback((next: ChatModel) => {
    setActiveChatModelState(next);
    localStorage.setItem(CHAT_MODEL_KEY, next);
  }, []);

  return { activeChatModel, setActiveChatModel, chatModels: CHAT_MODELS };
}
