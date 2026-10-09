import { useCallback, useState } from "react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { MasterCommandCenter } from "@/components/MasterCommandCenter";
import { MasterSheetsPanel } from "@/components/MasterSheetsPanel";
import { MesaLiveSessionPanel } from "@/components/MesaLiveSessionPanel";
import { CampaignContinuityManager } from "@/components/CampaignContinuityManager";
import { CharacterReviewQueue } from "@/components/CharacterReviewQueue";
import { MasterOperationalRail } from "@/components/MasterOperationalRail";
import { GerusaStudentsPanel } from "@/components/GerusaStudentsPanel";
import { GerusaTeachersPanel } from "@/components/GerusaTeachersPanel";
import { GerusaAccountPanel } from "@/components/GerusaAccountPanel";
import { GerusaCampaignsPanel } from "@/components/GerusaCampaignsPanel";
import { useProfile } from "@/lib/use-profile";
import { signOutLocal } from "@/lib/local-auth-client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mestre")({ component: MestrePage });

function MestrePage() {
  const { profile, isSystemMaster } = useProfile();
  const navigate = useNavigate();
  const router = useRouter();
  const [selectedMesa, setSelectedMesa] = useState<string | undefined>(() =>
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("mesaId") ?? undefined)
      : undefined,
  );
  const [selectedStudent, setSelectedStudent] = useState<string | undefined>();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | undefined>();
  const [tab, setTab] = useState("overview");
  const [focusLessonId, setFocusLessonId] = useState<string | undefined>();
  const handleMesaChange = useCallback((mesaId: string) => {
    setSelectedMesa(mesaId);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (mesaId) url.searchParams.set("mesaId", mesaId);
    else url.searchParams.delete("mesaId");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, []);
  const changeMesaAndStudent = useCallback(
    (mesaId: string) => {
      handleMesaChange(mesaId);
      setSelectedStudent(undefined);
      setSelectedCampaignId(undefined);
      setFocusLessonId(undefined);
    },
    [handleMesaChange],
  );
  const changeStudent = useCallback((studentId: string) => {
    setSelectedStudent(studentId);
    setSelectedCampaignId(undefined);
    setFocusLessonId(undefined);
  }, []);
  async function logout() {
    try {
      await signOutLocal();
      await router.invalidate();
      await navigate({ to: "/auth", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível sair.");
    }
  }

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-[#10070b] px-3 py-4 text-[#f5e9df] sm:px-6 sm:py-7">
      <header className="mx-auto mb-5 flex max-w-6xl items-center justify-between gap-4 rounded-xl border border-[#742233]/45 bg-[#180b11] p-4">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/gerusa-logo.png" alt="" className="h-10 w-10 rounded-full" />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.16em] text-[#d5a56c]">Professora</p>
            <p className="truncate font-medium">{profile?.display_name || "Gerusa"}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="min-h-11 rounded-lg border border-[#8a3045] px-4 text-sm hover:bg-[#742233]/25"
        >
          Sair
        </button>
      </header>
      <main className="mx-auto max-w-6xl">
        <MasterCommandCenter
          selectedMesa={selectedMesa}
          onSelectedMesaChange={changeMesaAndStudent}
          selectedStudent={selectedStudent}
          onSelectedStudentChange={changeStudent}
        />
        <nav className="mb-5 flex gap-2 overflow-x-auto pb-2" aria-label="Ferramentas pedagógicas">
          {[
            ["overview", "Visão geral"],
            ["students", "Alunos"],
            ...(isSystemMaster ? [["teachers", "Equipe"]] : []),
            ["campaigns", "Campanhas"],
            ["account", "Minha conta"],
            ["planning", "Planejamento"],
            ["adventures", "Aventuras"],
            ["lesson", "Aula ao vivo"],
            ["tasks", "Tarefas"],
            ["library", "Biblioteca"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-current={tab === value ? "page" : undefined}
              className={`min-h-11 shrink-0 rounded-lg border px-4 text-sm ${tab === value ? "border-[#d5a56c]/60 bg-[#4c1425] text-[#fff4e8]" : "border-[#742233]/50 bg-[#180b11] text-[#e7c9b7]/75"}`}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </nav>
        {tab === "overview" ? (
          <>
            <MasterSheetsPanel
              selectedMesa={selectedMesa}
              selectedStudent={selectedStudent}
              selectedCampaignId={selectedCampaignId}
              onSelectedCampaignChange={setSelectedCampaignId}
              onOpenSession={(lessonId) => {
                setFocusLessonId(lessonId);
                setTab("lesson");
              }}
            />
            <MasterOperationalRail
              mesaId={selectedMesa ?? null}
              studentId={selectedStudent}
              onNavigate={setTab}
            />
          </>
        ) : null}
        {tab === "students" ? (
          <GerusaStudentsPanel
            onOpenStudent={(studentId) => {
              setSelectedStudent(studentId);
              setTab("overview");
            }}
          />
        ) : null}
        {tab === "teachers" && isSystemMaster ? <GerusaTeachersPanel /> : null}
        {tab === "campaigns" ? (
          <GerusaCampaignsPanel
            selectedMesa={selectedMesa}
            selectedStudent={selectedStudent}
            selectedCampaignId={selectedCampaignId}
            onSelectedCampaignChange={setSelectedCampaignId}
          />
        ) : null}
        {tab === "account" ? <GerusaAccountPanel /> : null}
        {tab === "planning" ? (
          <MasterSheetsPanel
            selectedMesa={selectedMesa}
            selectedStudent={selectedStudent}
            selectedCampaignId={selectedCampaignId}
            onSelectedCampaignChange={setSelectedCampaignId}
            onOpenSession={(lessonId) => {
              setFocusLessonId(lessonId);
              setTab("lesson");
            }}
          />
        ) : null}
        {tab === "adventures" ? (
          <CampaignContinuityManager
            selectedMesa={selectedMesa}
            selectedStudent={selectedStudent}
            selectedCampaignId={selectedCampaignId}
            onSelectedCampaignChange={setSelectedCampaignId}
          />
        ) : null}
        {tab === "lesson" ? (
          <MesaLiveSessionPanel
            mesaId={selectedMesa}
            studentId={selectedStudent}
            selectedCampaignId={selectedCampaignId}
            focusLessonId={focusLessonId}
          />
        ) : null}
        {tab === "tasks" ? (
          <CharacterReviewQueue
            mesaId={selectedMesa}
            studentId={selectedStudent}
            selectedCampaignId={selectedCampaignId}
            onSelectedCampaignChange={setSelectedCampaignId}
          />
        ) : null}
        {tab === "library" ? (
          <CampaignContinuityManager
            selectedMesa={selectedMesa}
            selectedStudent={selectedStudent}
            selectedCampaignId={selectedCampaignId}
            onSelectedCampaignChange={setSelectedCampaignId}
            libraryMode
          />
        ) : null}
      </main>
    </div>
  );
}
