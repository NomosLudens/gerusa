import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { ChatView } from "@/components/ChatView";
import { RouteErrorBoundary, RouteNotFoundBoundary } from "@/components/loading-states";
import { getLocalSession } from "@/lib/local-auth-client";

if (typeof window !== "undefined") {
  console.info("kallistis_e2e:chat_route_component_module_evaluated");
}

const searchSchema = z.object({
  seed: z.string().optional(),
  domain: z.string().optional(),
  mode: z.enum(["general", "character_creation"]).optional(),
  scope: z.enum(["general", "character_creation", "master"]).optional(),
  experience: z.enum(["CHARACTER_CREATION"]).optional(),
});

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  component: ChatPage,
  validateSearch: searchSchema,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary />,
  loader: async ({ params }) => {
    console.info("kallistis_e2e:chat_thread_loader_started");
    console.info("kallistis_e2e:chat_thread_get_user_started");
    const userRes = await getLocalSession();
    console.info("kallistis_e2e:chat_thread_get_user_finished");
    if (!userRes?.user) {
      throw redirect({ to: "/auth" });
    }
  },
});

export function ChatPage() {
  const { threadId } = Route.useParams();
  console.info("kallistis_e2e:chat_view_rendered");
  return <ChatView threadId={threadId} />;
}
