import { useCallback, useEffect, useState } from "react";

export type Gender = "feminino" | "masculino" | "neutro";
export type TreatmentType =
  | "ele_dele"
  | "ela_dela"
  | "elu_delu"
  | "use_name"
  | "not_informed"
  | "other";
export type Mesa = {
  id: string;
  slug: string;
  name: string;
  member_role?: "mestre" | "jogador";
  membership_status?: "active" | "invited" | "left";
  campaigns?: Array<{ id: string; name: string }>;
};
export type MesaMembership = Mesa & {
  member_role: "mestre" | "jogador";
  membership_status: "active" | "invited" | "left";
};
export type Onboarding = {
  treatment_type: TreatmentType | null;
  treatment_custom: string | null;
  general_community: boolean;
  onboarding_completed: boolean;
  mesa: MesaMembership | null;
};
export type Profile = {
  id: string;
  display_name: string | null;
  pronouns: string | null;
  avatar_url: string | null;
  gender: Gender | null;
  updated_at?: string;
};
type ProfileResponse = {
  profile: Profile | null;
  onboarding?: Onboarding;
  mesas?: Mesa[];
  is_system_master?: boolean;
  allowed_app_ids?: string[];
};

export function hasSupabaseConfig(
  config:
    | { SUPABASE_URL?: string; SUPABASE_PUBLISHABLE_KEY?: string; SUPABASE_ANON_KEY?: string }
    | undefined,
): boolean {
  const key = config?.SUPABASE_PUBLISHABLE_KEY || config?.SUPABASE_ANON_KEY;
  return Boolean(config?.SUPABASE_URL && key);
}

async function readProfileResponse(response: Response): Promise<ProfileResponse> {
  const body = (await response.json().catch(() => null)) as
    | ProfileResponse
    | { error?: string }
    | null;
  if (!response.ok)
    throw new Error(
      body && "error" in body
        ? body.error || "Falha ao carregar perfil"
        : "Falha ao carregar perfil",
    );
  return body && "profile" in body ? body : { profile: null };
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [isSystemMaster, setIsSystemMaster] = useState(false);
  const [allowedAppIds, setAllowedAppIds] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/profile", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = await readProfileResponse(response);
      setProfile(data.profile);
      setOnboarding(data.onboarding ?? null);
      setMesas(data.mesas ?? []);
      setIsSystemMaster(data.is_system_master === true);
      setAllowedAppIds(data.allowed_app_ids ?? null);
    } catch (err) {
      setProfile(null);
      setOnboarding(null);
      setMesas([]);
      setIsSystemMaster(false);
      setAllowedAppIds(null);
      setError(err instanceof Error ? err.message : "Falha ao carregar perfil");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const avatarSignedUrl = profile?.avatar_url
    ? `${profile.avatar_url}?v=${encodeURIComponent(profile.updated_at ?? "")}`
    : null;
  return {
    profile,
    onboarding,
    mesas,
    isSystemMaster,
    allowedAppIds,
    avatarUrl: profile?.avatar_url ?? null,
    avatarSignedUrl,
    loading,
    error,
    reload: load,
  };
}

export async function saveProfile(
  patch: Partial<Pick<Profile, "display_name" | "pronouns" | "avatar_url" | "gender">>,
) {
  const current = await fetch("/api/profile", { credentials: "same-origin", cache: "no-store" });
  const currentBody = await readProfileResponse(current);
  const response = await fetch("/api/profile", {
    method: "PUT",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      display_name: patch.display_name ?? currentBody.profile?.display_name ?? null,
      pronouns: patch.pronouns ?? currentBody.profile?.pronouns ?? null,
      avatar_url: patch.avatar_url ?? currentBody.profile?.avatar_url ?? null,
      gender: patch.gender ?? currentBody.profile?.gender ?? null,
    }),
  });
  await readProfileResponse(response);
}

export async function saveOnboarding(input: {
  treatment_type: TreatmentType;
  treatment_custom: string | null;
  general_community: boolean;
}) {
  const response = await fetch("/api/profile", {
    method: "PUT",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  await readProfileResponse(response);
}

export async function uploadAvatar(file: File): Promise<string> {
  const form = new FormData();
  form.append("avatar", file, file.name || "avatar");
  const response = await fetch("/api/profile/avatar", {
    method: "PUT",
    credentials: "same-origin",
    body: form,
  });
  const body = (await response.json().catch(() => null)) as {
    profile?: Profile;
    error?: string;
  } | null;
  if (!response.ok) throw new Error(body?.error ?? "Falha ao enviar foto");
  return body?.profile?.avatar_url ?? "/api/profile/avatar";
}
export async function removeOwnAvatar(): Promise<void> {
  const response = await fetch("/api/profile/avatar", {
    method: "DELETE",
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error("Falha ao remover foto");
}

export function welcomeGreeting(treatmentType: TreatmentType | null | undefined): string {
  if (treatmentType === "ele_dele") return "Bem-vindo de volta.";
  if (treatmentType === "ela_dela") return "Bem-vinda de volta.";
  return "Bem-vinde de volta.";
}
