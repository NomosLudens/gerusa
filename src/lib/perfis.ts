// Catálogo de módulos que o admin pode liberar para um perfil convidado.
// Mantido em um lugar só para o painel de Perfis, o formulário de convite e a
// página /convite mostrarem exatamente os mesmos rótulos.

export const MODULE_KEYS = ["chat", "kharis", "agenda", "treinos", "livros", "kuanyin"] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export const MODULE_LABELS: Record<ModuleKey, { title: string; descricao: string }> = {
  chat: {
    title: "Chat (Kallistis)",
    descricao: "Ler e enviar mensagens na conversa com Kallistis.",
  },
  kharis: {
    title: "Kháris",
    descricao: "Acessar a faceta Kháris, de cuidado neurodivergente, no chat.",
  },
  agenda: { title: "Agenda", descricao: "Ver e criar eventos e lembretes do calendário." },
  treinos: {
    title: "Treinos",
    descricao: "Acompanhar e registrar treinos, séries, PRs e sinais do corpo.",
  },
  livros: { title: "Livros & Resumos", descricao: "Acessar a biblioteca, resumos e infográficos." },
  kuanyin: {
    title: "Kuan-Yin (Comercial)",
    descricao: "Conversar em modo comercial, configurar negócio e cadastrar clientes.",
  },
};

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(value);
}
