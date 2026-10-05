import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ChatView } from "@/components/ChatView";
import { CommunityChatView } from "@/components/CommunityChatView";
import { ensureThread } from "@/lib/ensure-thread";

import { RouteErrorBoundary, RouteNotFoundBoundary } from "@/components/loading-states";

const searchSchema = z.object({
  mode: z.enum(["general", "character_creation"]).optional(),
  scope: z.enum(["general", "character_creation", "master"]).optional(),
});

export const Route = createFileRoute("/_authenticated/chat/")({
  pendingMs: Infinity,
  validateSearch: searchSchema,
  component: ChatIndex,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary />,
});

function ChatIndex() {
  const { mode, scope: requestedScope } = Route.useSearch();
  const scope = requestedScope ?? mode ?? "general";
  const [threadId, setThreadId] = useState<string | null>(null);

  useEffect(() => {
    if (scope === "general") return;
    let active = true;
    void ensureThread(scope)
      .then((id) => {
        if (active) setThreadId(id);
      })
      .catch(() => {
        if (active) setThreadId(null);
      });
    return () => {
      active = false;
    };
  }, [scope]);

  if (scope === "general") return <CommunityChatView />;
  return threadId ? (
    <ChatView threadId={threadId} />
  ) : (
    <p className="p-6 text-sm">Abrindo o chat…</p>
  );
}
