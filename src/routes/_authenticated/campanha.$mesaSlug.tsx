import { createFileRoute } from "@tanstack/react-router";
import { CampaignPageShell } from "@/components/CampaignPageShell";
export const Route = createFileRoute("/_authenticated/campanha/$mesaSlug")({
  component: CampaignPage,
});
function CampaignPage() {
  const { mesaSlug } = Route.useParams();
  return <CampaignPageShell mesaSlug={mesaSlug} />;
}
