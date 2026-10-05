(function () {
  const query = new URLSearchParams(window.location.search);
  const requestedAdminMode = query.get("mode") === "tal";
  let adminMode = false;
  const targetCharacterId = query.get("characterId") || "";
  let API = "/api/characters";
  let timer = null,
    online = false,
    bootComplete = false,
    listLoaded = false,
    serverMesas = [],
    canAssignMesas = false,
    canDeleteCharacters = false;
  const missingServerIds = new Set();
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>\"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
  async function request(path, options) {
    const r = await fetch(path, {
      credentials: "same-origin",
      cache: "no-store",
      ...options,
      headers: { "content-type": "application/json", ...((options && options.headers) || {}) },
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok)
      throw Object.assign(new Error(data.error || "request_failed"), { data, status: r.status });
    return data;
  }
  function mark(p, data) {
    if (!p || !data) return;
    const c = data.character || data;
    if (!c.id) return;
    missingServerIds.delete(c.id);
    p._serverMissing = false;
    p._serverId = c.id;
    p._serverVersion = c.version;
    p._serverStatus = c.status;
    p._serverUpdatedAt = c.updatedAt;
    p._serverPublishedVersion = c.publishedVersion;
    p._serverPublishedSnapshot = c.publishedSnapshot || null;
    if (Array.isArray(c.mesas)) {
      p._serverMesas = c.mesas;
      p._serverMesaIds = c.mesas.map((mesa) => mesa.id);
      if (!p._mesaSelectionDirty) p.mesaIds = p._serverMesaIds.slice();
    }
  }
  function hasLocalSyncWork(p) {
    return ["pending", "syncing", "conflict"].includes(p?._serverSyncState);
  }
  function clearSyncState(p) {
    if (!p) return;
    delete p._serverSyncState;
    delete p._serverSyncError;
    delete p._serverSyncBaseVersion;
    delete p._serverRemoteSnapshot;
    delete p._serverRemoteVersion;
  }
  function setSyncState(p, state, error) {
    if (!p) return;
    if (state === "pending" && !Object.prototype.hasOwnProperty.call(p, "_serverSyncBaseVersion")) {
      p._serverSyncBaseVersion = p._serverVersion ?? null;
    }
    p._serverSyncState = state;
    if (error) p._serverSyncError = String(error);
    else delete p._serverSyncError;
  }
  function preserveRemoteConflict(p, character, error) {
    if (!p || !character) return;
    mark(p, { character });
    p._serverRemoteSnapshot = character.snapshot || null;
    p._serverRemoteVersion = character.version;
    setSyncState(p, "conflict", error);
  }
  function applyRemote(p, data) {
    const character = data?.character || data;
    if (!p || !character) return;
    if (character.snapshot) {
      Object.assign(p, character.snapshot);
      normalizarPersonagem(p);
    }
    mark(p, { character });
    clearSyncState(p);
  }
  function canonicalSnapshotForServer(p) {
    const snapshot = structuredClone(p || {});
    if (snapshot.atributosBase && typeof snapshot.atributosBase === "object") {
      const attributes = snapshot.atributosBase;
      if (Object.prototype.hasOwnProperty.call(attributes, "Presenca")) {
        if (!Object.prototype.hasOwnProperty.call(attributes, "Presença")) {
          attributes.Presença = attributes.Presenca;
        }
        delete attributes.Presenca;
      }
    }
    Object.keys(snapshot).forEach((key) => {
      if (
        key.startsWith("_server") ||
        key.startsWith("server") ||
        key === "mesaIds" ||
        key === "checkpoints"
      )
        delete snapshot[key];
    });
    return snapshot;
  }
  function persistLocal() {
    try {
      const local = {
        ...DB,
        personagens: DB.personagens.map((personagem) => {
          const copy = { ...personagem };
          [
            "_serverMessages",
            "_serverEvents",
            "_serverVersions",
            "_serverProgression",
            "_serverContext",
            "_serverPublishedSnapshot",
            "_serverRemoteSnapshot",
          ].forEach((key) => delete copy[key]);
          if (Array.isArray(copy.checkpoints)) {
            copy.checkpoints = copy.checkpoints.map((checkpoint) => ({
              id: checkpoint?.id,
              em: checkpoint?.em,
              label: checkpoint?.label,
            }));
          }
          return copy;
        }),
      };
      localStorage.setItem(KEY, JSON.stringify(local));
    } catch (e) {
      console.warn("KALLISTIS local cache:", e);
    }
  }
  async function refresh(p) {
    if (!p || !(p._serverId || p.id)) return null;
    if (p._serverMissing || (p._serverId && missingServerIds.has(p._serverId))) return null;
    try {
      const data = await request(API + "?characterId=" + encodeURIComponent(p._serverId || p.id));
      const character = data.character;
      const localWork = hasLocalSyncWork(p);
      const baseVersion = p._serverSyncBaseVersion;
      if (
        localWork &&
        ((Number.isFinite(Number(baseVersion)) &&
          Number(character?.version) !== Number(baseVersion)) ||
          ["submitted", "approved", "archived"].includes(character?.status))
      ) {
        preserveRemoteConflict(
          p,
          character,
          ["submitted", "approved", "archived"].includes(character?.status)
            ? "character_not_editable"
            : "stale_character_version",
        );
      } else if (!localWork || p._serverSyncState === "syncing") {
        applyRemote(p, data);
      } else {
        mark(p, data);
      }
      p._serverMessages = data.messages || [];
      p._serverEvents = data.events || [];
      p._serverVersions = data.versions || [];
      p._serverProgression = data.progression || [];
      p._serverContext = data.context || "";
      persistLocal();
      return data;
    } catch (e) {
      if (e.status === 404 && (p._serverId || p.id)) {
        if (p._serverId) {
          missingServerIds.add(p._serverId);
          p._serverMissing = true;
          if (hasLocalSyncWork(p)) {
            setSyncState(p, "conflict", "server_record_missing");
            persistLocal();
            window.render();
            throw e;
          }
          clearTimeout(timer);
        }
        DB.personagens = DB.personagens.filter((x) =>
          p._serverId ? x._serverId !== p._serverId : x !== p,
        );
        if (DB.atual === p.id || DB.atual === p._serverId) DB.atual = DB.personagens[0]?.id || null;
        persistLocal();
        render();
      }
      throw e;
    }
  }
  async function push(p) {
    if (!p) return false;
    if (adminMode && !p._serverId) {
      clearSyncState(p);
      persistLocal();
      return false;
    }
    if (p._serverSyncState === "conflict") return false;
    if (p._serverMissing || (p._serverId && missingServerIds.has(p._serverId))) return false;
    if (["submitted", "approved", "archived"].includes(p._serverStatus)) {
      setSyncState(p, "conflict", "character_not_editable");
      persistLocal();
      window.render();
      return false;
    }
    setSyncState(p, "syncing");
    persistLocal();
    try {
      const d = await request(API, {
        method: "PUT",
        body: JSON.stringify({
          id: p._serverId || p.id,
          snapshot: canonicalSnapshotForServer(p),
          ...(canAssignMesas
            ? { mesaIds: Array.isArray(p.mesaIds) ? p.mesaIds : p._serverMesaIds || [] }
            : {}),
          expectedVersion: p._serverVersion,
        }),
      });
      mark(p, d);
      clearSyncState(p);
      online = true;
      persistLocal();
      window.render();
      return true;
    } catch (e) {
      online = e.status !== 401;
      setSyncState(p, "pending", e.message);
      if (
        e.status === 409 ||
        ["character_not_editable", "stale_character_version"].includes(e.message)
      ) {
        await refresh(p).catch(() => undefined);
      }
      persistLocal();
      console.warn("KALLISTIS character sync:", e.message);
      window.dispatchEvent(new CustomEvent("kallistis:server-error", { detail: e.message }));
      window.render();
      return false;
    }
  }
  function queue(p) {
    if (!p || p._serverMissing || (p._serverId && missingServerIds.has(p._serverId))) return;
    if (adminMode && !p._serverId) return;
    if (["submitted", "approved", "archived"].includes(p._serverStatus)) {
      setSyncState(p, "conflict", "character_not_editable");
      persistLocal();
      return;
    }
    setSyncState(p, "pending");
    persistLocal();
    clearTimeout(timer);
    timer = setTimeout(() => push(p), 700);
  }
  async function boot() {
    try {
      clearTimeout(timer);
      if (requestedAdminMode) {
        let authorized = false;
        try {
          const profile = await request("/api/profile");
          authorized = profile.is_system_master === true || profile.is_master === true;
        } catch (e) {
          authorized = false;
        }
        if (authorized) {
          adminMode = true;
          API = "/api/master/characters";
        }
        window.KALLISTIS_SET_TAL_MODE?.(authorized);
      }
      const data = await request(
        API + (targetCharacterId ? "?characterId=" + encodeURIComponent(targetCharacterId) : ""),
      );
      online = true;
      const remote = data.characters || (data.character ? [data.character] : []);
      serverMesas = Array.isArray(data.mesas) ? data.mesas : [];
      canAssignMesas = data.canAssignMesas === true;
      canDeleteCharacters = adminMode || document.body.innerText.includes("MODO TAL");
      const remoteIds = new Set(remote.map((r) => r.id));
      DB.personagens = DB.personagens.filter((p) => {
        if (p._serverSyncState === "syncing") setSyncState(p, "pending");
        if (!p._serverId || remoteIds.has(p._serverId)) return true;
        if (hasLocalSyncWork(p)) {
          p._serverMissing = true;
          setSyncState(p, "conflict", "server_record_missing");
          return true;
        }
        missingServerIds.add(p._serverId);
        p._serverMissing = true;
        return false;
      });
      if (DB.atual && !DB.personagens.some((p) => p.id === DB.atual)) DB.atual = null;
      remote.forEach((r) => {
        let p = DB.personagens.find((x) => x.id === r.id || x._serverId === r.id);
        if (!p) {
          p = normalizarPersonagem(r.snapshot || {});
          p.id = r.id;
          DB.personagens.push(p);
        }
        const localWork = hasLocalSyncWork(p);
        const baseVersion = p._serverSyncBaseVersion;
        if (
          localWork &&
          ((Number.isFinite(Number(baseVersion)) && Number(r.version) !== Number(baseVersion)) ||
            ["submitted", "approved", "archived"].includes(r.status))
        ) {
          preserveRemoteConflict(
            p,
            r,
            ["submitted", "approved", "archived"].includes(r.status)
              ? "character_not_editable"
              : "stale_character_version",
          );
        } else if (!localWork) {
          applyRemote(p, { character: r });
        } else {
          mark(p, { character: r });
        }
      });
      if (targetCharacterId && remoteIds.has(targetCharacterId)) {
        DB.atual = targetCharacterId;
        if (typeof VIEW !== "undefined") VIEW = "dossie";
      } else if (remote.length && !DB.atual) DB.atual = remote[0].id;
      const current = DB.personagens.find((p) => p.id === DB.atual);
      bootComplete = true;
      listLoaded = true;
      window.render();
      if (current && current._serverId) await refresh(current).catch(() => undefined);
      setTimeout(() => {
        DB.personagens.filter((p) => p._serverSyncState === "pending").forEach((p) => void push(p));
      }, 0);
      persistLocal();
      window.render();
      if (targetCharacterId) window.KALLISTIS_TAL_OPEN?.(targetCharacterId);
    } catch (e) {
      online = e.status !== 401;
      bootComplete = true;
      listLoaded = false;
      window.render();
    }
  }
  const VALIDATION_LABELS = {
    origin_required: "Origem",
    concept_required: "Conceito completo",
    role_invalid: "Papel válido do Ofício",
    key_invalid: "Chave válida",
    office_second_skill_required: "Segunda perícia do Ofício",
    cross_learning_skill_required: "Perícia da Aprendizagem Cruzada",
    heritage_invalid: "Herança válida",
    heritage_technique_invalid: "Técnica válida de outro Ofício",
    equipment_weapon_required: "Arma principal",
    equipment_weapon_proficiency_invalid: "Arma compatível com a proficiência",
    equipment_armor_invalid: "Armadura permitida",
    equipment_kit_invalid: "Kit coerente com o Ofício",
    equipment_consumables_invalid: "Dois consumíveis diferentes",
    skill_provenance_required: "Procedência das perícias",
    evocation_required: "Vínculo evocado",
  };
  function validationMessage(error) {
    const errors = error?.data?.validation?.errors || [];
    if (!errors.length) return error?.message || "request_failed";
    const labels = [
      ...new Set(
        errors
          .map((item) => {
            if (VALIDATION_LABELS[item]) return VALIDATION_LABELS[item];
            const provenance = /^skill_provenance_invalid_(.+)$/.exec(item);
            if (provenance) return `Procedência da perícia: ${provenance[1]}`;
            return item;
          })
          .filter(Boolean),
      ),
    ];
    return "A ficha ainda não pode ser enviada. Falta revisar: " + labels.join(", ") + ".";
  }
  async function action(p, action, note, extra) {
    try {
      if (action === "submit" || hasLocalSyncWork(p)) {
        const synced = await push(p);
        if (!synced) throw new Error(p._serverSyncError || "sync_conflict_requires_resolution");
      }
      const d = await request(API, {
        method: "POST",
        body: JSON.stringify({
          id: p._serverId || p.id,
          action,
          note,
          ...(extra || {}),
          ...(extra && extra.snapshot
            ? { snapshot: canonicalSnapshotForServer(extra.snapshot) }
            : {}),
        }),
      });
      mark(p, d);
      clearSyncState(p);
      if (!["discard", "delete"].includes(action)) await refresh(p);
      render();
      return d;
    } catch (e) {
      const message = action === "submit" ? validationMessage(e) : e.message;
      alert("KALLISTIS: " + message);
      throw e;
    }
  }
  async function assist(p, message) {
    const query = encodeURIComponent(String(message || "").trim());
    const target = "/chat?scope=character_creation" + (query ? "&seed=" + query : "");
    if (window.top && window.top !== window) window.top.location.href = target;
    else window.location.href = target;
    return { redirected: true, target };
  }
  async function discardLocalChanges(p) {
    if (!p || !(p._serverId || p.id)) return false;
    const data = await request(API + "?characterId=" + encodeURIComponent(p._serverId || p.id));
    applyRemote(p, data);
    p._serverMessages = data.messages || [];
    p._serverEvents = data.events || [];
    p._serverVersions = data.versions || [];
    p._serverProgression = data.progression || [];
    p._serverContext = data.context || "";
    persistLocal();
    window.render();
    return true;
  }
  async function setMesas(p, mesaIds) {
    if (!canAssignMesas) throw new Error("mesa_assignment_forbidden");
    if (!p?._serverId) throw new Error("character_not_persisted");
    try {
      const d = await request(API, {
        method: "PUT",
        body: JSON.stringify({ id: p._serverId, mesaIds: [...new Set(mesaIds)] }),
      });
      p._mesaSelectionDirty = false;
      mark(p, d);
      persistLocal();
      window.render();
      return d;
    } catch (e) {
      alert("Mesas: " + e.message);
      throw e;
    }
  }
  window.KALLISTIS_SERVER_BRIDGE = {
    queue,
    push,
    action,
    assist,
    setMesas,
    refresh,
    discardLocalChanges,
    get mesas() {
      return serverMesas;
    },
    get canAssignMesas() {
      return canAssignMesas;
    },
    get canDeleteCharacters() {
      return canDeleteCharacters;
    },
    get online() {
      return online;
    },
    get listLoaded() {
      return listLoaded;
    },
    get bootComplete() {
      return bootComplete;
    },
  };
  window.serverControls = function (p) {
    if (p && p._serverId && !p._serverProgression) {
      void refresh(p)
        .then(() => window.render())
        .catch(() => undefined);
    }
    const box = el("div", { class: "panel", style: "border-color:rgba(140,95,255,.35)" });
    const protectedStatus = ["submitted", "approved", "archived"].includes(p._serverStatus);
    box.appendChild(el("div", { class: "kicker" }, "Ciclo persistido"));
    box.appendChild(
      el(
        "p",
        { class: "muted small" },
        online
          ? "PostgreSQL KALLISTIS · sessão local"
          : "Sessão não autenticada ou servidor indisponível",
      ),
    );
    const status = el(
      "p",
      { class: "note" },
      "Estado: " +
        (p._serverStatus || "rascunho local") +
        (p._serverVersion ? " · versão " + p._serverVersion : ""),
    );
    box.appendChild(status);
    if (p._serverStatus === "rejected") {
      const rejection = [...(p._serverEvents || [])]
        .reverse()
        .find(
          (event) =>
            event.eventType === "character_rejected" &&
            typeof event.payload?.note === "string" &&
            event.payload.note.trim(),
        );
      box.appendChild(
        el(
          "div",
          { class: "card", style: "margin-top:10px" },
          el("b", null, "Nota do Mestre"),
          el(
            "p",
            { class: "small", style: "white-space:pre-wrap;margin-top:6px" },
            rejection
              ? rejection.payload.note.trim()
              : "O Mestre devolveu a ficha sem observação. Você pode fazer ajustes e reenviar.",
          ),
        ),
      );
    }
    if (p._serverSyncState === "pending" || p._serverSyncState === "syncing") {
      box.appendChild(
        el(
          "p",
          { class: "note", style: "margin-top:8px" },
          p._serverSyncState === "syncing"
            ? "Sincronizando esta alteração com o servidor…"
            : "Alteração local pendente. Ela ainda não foi confirmada pelo servidor.",
        ),
      );
      box.appendChild(
        el(
          "button",
          { class: "btn ghost", style: "margin-top:8px", onclick: () => void push(p) },
          "Tentar sincronizar agora",
        ),
      );
    }
    if (p._serverSyncState === "conflict") {
      box.appendChild(
        el(
          "p",
          { class: "note", style: "margin-top:8px;border-color:rgba(255,190,80,.45)" },
          "Conflito de sincronização: o servidor mudou ou protegeu esta ficha. Suas alterações locais não foram salvas.",
        ),
      );
      box.appendChild(
        el(
          "button",
          {
            class: "btn ghost",
            style: "margin-top:8px",
            onclick: async () => {
              if (confirm("Descartar as alterações locais e usar a versão do servidor?"))
                await discardLocalChanges(p);
            },
          },
          "Descartar alterações locais e usar servidor",
        ),
      );
    }
    const row = el("div", { class: "row", style: "margin-top:10px" });
    if (!protectedStatus)
      row.appendChild(
        el(
          "button",
          { class: "btn", onclick: () => window.KALLISTIS_SERVER_BRIDGE.push(p) },
          "Salvar no servidor",
        ),
      );
    const clientComplete =
      typeof window.pendenciasCriacao === "function"
        ? window.pendenciasCriacao(p).length === 0
        : p.completo === true;
    if (p._serverStatus === "draft" || p._serverStatus === "rejected" || !p._serverStatus)
      row.appendChild(
        el(
          "button",
          {
            class: "btn primary",
            disabled: !clientComplete,
            onclick: () => window.KALLISTIS_SERVER_BRIDGE.action(p, "submit"),
          },
          "Enviar ao Mestre",
        ),
      );
    if (adminMode && p._serverStatus === "submitted") {
      const rejectNote = el("input", {
        placeholder: "Nota da rejeição",
        style: "flex:1",
      });
      row.appendChild(rejectNote);
      row.appendChild(
        el(
          "button",
          {
            class: "btn danger",
            onclick: () =>
              window.KALLISTIS_SERVER_BRIDGE.action(p, "reject", rejectNote.value.trim()),
          },
          "Rejeitar",
        ),
      );
      row.appendChild(
        el(
          "button",
          {
            class: "btn primary",
            onclick: () => window.KALLISTIS_SERVER_BRIDGE.action(p, "approve"),
          },
          "Aprovar / publicar",
        ),
      );
    }
    if (canDeleteCharacters && ["draft", "rejected", "approved"].includes(p._serverStatus))
      row.appendChild(
        el(
          "button",
          {
            class: "btn danger",
            onclick: async () => {
              if (
                !window.confirm(
                  "Apagar " +
                    (p.nome || "esta personagem") +
                    "?\n\nEste personagem será removido da sua lista e não poderá mais ser usado.",
                )
              )
                return;
              await window.KALLISTIS_SERVER_BRIDGE.action(p, "delete");
            },
          },
          "Apagar personagem",
        ),
      );
    box.appendChild(row);
    const detail = el("div", { class: "server-character-detail" });
    if (p._serverMessages && p._serverMessages.length) {
      detail.appendChild(el("div", { class: "sep" }));
      detail.appendChild(el("div", { class: "kicker" }, "Assistente de criação · persistido"));
      p._serverMessages.forEach((m) =>
        detail.appendChild(
          el(
            "div",
            { class: "card", style: "margin-top:8px" },
            el("b", null, m.role === "assistant" ? "KALLISTIS" : "Você"),
            el("p", { style: "white-space:pre-wrap;margin-top:6px" }, m.content),
          ),
        ),
      );
    }
    if (
      !protectedStatus &&
      p._serverMutation &&
      p._serverMutation.status === "requires_confirmation"
    ) {
      const mutation = p._serverMutation;
      detail.appendChild(
        el(
          "div",
          { class: "card", style: "margin-top:8px;border-color:rgba(140,95,255,.5)" },
          el("b", null, "Preview de alteração"),
          el(
            "p",
            { style: "white-space:pre-wrap;margin-top:6px" },
            "Antes: " +
              (mutation.beforeBiography || "—") +
              "\nDepois: " +
              (mutation.nextBiography || "—"),
          ),
          el(
            "div",
            { style: "display:flex;gap:8px;margin-top:8px" },
            el(
              "button",
              {
                class: "btn",
                onclick: async () => {
                  const r = await request("/api/chat/mutations", {
                    method: "POST",
                    body: JSON.stringify({
                      action: "confirm",
                      confirmationId: mutation.confirmationId,
                    }),
                  });
                  if (r.status === "completed" || r.operation) {
                    p._serverMutation = null;
                    await refresh(p);
                    render();
                  }
                },
              },
              "Confirmar",
            ),
            el(
              "button",
              {
                class: "btn ghost",
                onclick: async () => {
                  await request("/api/chat/mutations", {
                    method: "POST",
                    body: JSON.stringify({
                      action: "cancel",
                      confirmationId: mutation.confirmationId,
                    }),
                  });
                  p._serverMutation = null;
                  render();
                },
              },
              "Cancelar",
            ),
          ),
        ),
      );
    }
    const published = p._serverPublishedSnapshot;
    if (published && p._serverStatus === "approved") {
      const trail = Array.isArray(published.trilhas)
        ? published.trilhas[Number(published.trilhaAtiva) || 0]
        : null;
      const concept = published.conceito || {};
      detail.appendChild(el("div", { class: "sep" }));
      detail.appendChild(el("div", { class: "kicker" }, "Resumo rápido"));
      detail.appendChild(
        el(
          "p",
          { class: "small muted" },
          [
            published.nome,
            published.povo,
            published.heranca,
            published.origem,
            trail && trail.oficio,
            trail && "Marco " + trail.marco,
            concept.identidade,
            concept.objetivo,
          ]
            .filter(Boolean)
            .join(" · "),
        ),
      );
    }
    if (p._serverContext) {
      const ctx = el("details", { style: "margin-top:10px" });
      ctx.appendChild(el("summary", null, "Contexto Hermes"));
      ctx.appendChild(
        el(
          "pre",
          {
            class: "small",
            style: "white-space:pre-wrap;overflow:auto;max-height:360px;margin-top:8px",
          },
          p._serverContext,
        ),
      );
      detail.appendChild(ctx);
    }
    if (p._serverEvents && p._serverEvents.length) {
      const history = el("details", { style: "margin-top:10px" });
      history.appendChild(el("summary", null, "Event ledger / histórico do servidor"));
      p._serverEvents.forEach((event) =>
        history.appendChild(
          el(
            "p",
            { class: "small muted", style: "margin-top:6px" },
            event.eventType + " · v" + (event.versionAfter ?? "—"),
          ),
        ),
      );
      detail.appendChild(history);
    }
    const progression = p._serverProgression || [];
    const active = progression.find((x) =>
      ["requested", "authorized", "in_progress"].includes(x.status),
    );
    if (p._serverStatus === "approved") {
      detail.appendChild(el("div", { class: "sep" }));
      detail.appendChild(el("div", { class: "kicker" }, "Progressão server-side"));
      if (!active) {
        const currentTrail = typeof trilha === "function" ? trilha(p) : null;
        const currentMarco = Number(currentTrail?.marco || 1);
        const latest = progression.length ? progression[progression.length - 1] : null;
        if (
          latest &&
          latest.toMarco >= 11 &&
          ["DEVOLVIDA_PARA_AJUSTE", "NAO_HOMOLOGADA"].includes(latest.epicManifestationStatus)
        ) {
          detail.appendChild(
            el(
              "p",
              { class: "small", style: "color:#f3c6c6;margin-bottom:8px" },
              (latest.epicManifestationStatus === "DEVOLVIDA_PARA_AJUSTE"
                ? "Manifestação devolvida para ajuste."
                : "Manifestação não homologada.") +
                " Feedback do Mestre: " +
                (latest.epicManifestationFeedback || "—"),
            ),
          );
        }
        if (currentTrail && currentMarco >= 10 && currentMarco < 15) {
          const nextMarco = currentMarco + 1;
          const cap = nextMarco - 5;
          const attributes = typeof atributos === "function" ? atributos(p) : {};
          const attribute = el("select");
          attribute.appendChild(
            el("option", { value: "" }, "— escolher Atributo (máximo " + cap + ") —"),
          );
          ATTRS.filter((name) => Number(attributes[name] || 0) < cap).forEach((name) =>
            attribute.appendChild(
              el(
                "option",
                { value: name },
                name +
                  " · " +
                  (attributes[name] || 0) +
                  " → " +
                  (Number(attributes[name] || 0) + 1),
              ),
            ),
          );
          const name = el("input", { placeholder: "Nome da Manifestação Épica" });
          const concept = el("textarea", {
            placeholder: "Conceito: o que esta manifestação expressa",
          });
          const description = el("textarea", { placeholder: "Descrição narrativa" });
          const visual = el("textarea", { placeholder: "Manifestação visual ou ficcional" });
          const activation = el("input", { placeholder: "Ativação (ação, reação, preparação...)" });
          const effect = el("textarea", { placeholder: "Efeito permitido" });
          const cost = el("input", { placeholder: "Custo ou preço" });
          const duration = el("input", { placeholder: "Duração" });
          const targets = el("input", { placeholder: "Alvos ou objeto" });
          const limits = el("textarea", { placeholder: "Limitações" });
          const risks = el("textarea", { placeholder: "Consequências ou riscos" });
          const type = el("select");
          type.appendChild(el("option", { value: "normal" }, "Manifestação normal"));
          type.appendChild(el("option", { value: "magia_epica" }, "Magia Épica"));
          const grade = el("select");
          ["I", "II", "III"]
            .filter((value) => ["I", "I", "II", "II", "III"][nextMarco - 11] >= value)
            .forEach((value) => grade.appendChild(el("option", { value }, "Grau Épico " + value)));
          const refreshGrade = () => {
            grade.style.display = type.value === "magia_epica" ? "" : "none";
          };
          type.onchange = refreshGrade;
          refreshGrade();
          detail.appendChild(
            el(
              "p",
              { class: "small muted" },
              "M" +
                nextMarco +
                " exige +1 Atributo, uma Manifestação Épica criada pelo jogador e aprovação do Mestre. Horizonte: " +
                ["Cena", "Bairro", "Cidade", "Povo", "Mundo"][nextMarco - 11] +
                ". Horizonte é escala narrativa de consequência, não área física.",
            ),
          );
          detail.appendChild(el("div", { class: "row", style: "margin-top:8px" }, attribute));
          detail.appendChild(
            el(
              "div",
              { style: "display:grid;gap:8px;margin-top:8px" },
              name,
              concept,
              description,
              visual,
              activation,
              type,
              grade,
              effect,
              cost,
              duration,
              targets,
              limits,
              risks,
            ),
          );
          detail.appendChild(
            el(
              "button",
              {
                class: "btn primary",
                style: "margin-top:10px",
                onclick: () => {
                  if (
                    !attribute.value ||
                    !name.value.trim() ||
                    !concept.value.trim() ||
                    !description.value.trim() ||
                    !visual.value.trim() ||
                    !activation.value.trim() ||
                    !effect.value.trim() ||
                    !cost.value.trim() ||
                    !duration.value.trim() ||
                    !targets.value.trim() ||
                    !limits.value.trim() ||
                    !risks.value.trim()
                  )
                    return;
                  const target = structuredClone(p);
                  const targetTrail = target.trilhas[Number(target.trilhaAtiva) || 0];
                  targetTrail.marco = nextMarco;
                  targetTrail.atributosGanhos = {
                    ...(targetTrail.atributosGanhos || {}),
                    [attribute.value]:
                      Number(targetTrail.atributosGanhos?.[attribute.value] || 0) + 1,
                  };
                  targetTrail.manifestacoesEpicas = [
                    ...(targetTrail.manifestacoesEpicas || []),
                    {
                      nome: name.value.trim(),
                      conceito: concept.value.trim(),
                      descricao: description.value.trim(),
                      manifestacao_visual_ou_ficcional: visual.value.trim(),
                      horizonte: ["CENA", "BAIRRO", "CIDADE", "POVO", "MUNDO"][nextMarco - 11],
                      ativacao: activation.value.trim(),
                      efeito: effect.value.trim(),
                      custo: cost.value.trim(),
                      duracao: duration.value.trim(),
                      alvos_ou_objeto: targets.value.trim(),
                      limitacoes: limits.value.trim(),
                      consequencias_ou_riscos: risks.value.trim(),
                      tipo: type.value,
                      grauMagiaEpica: type.value === "magia_epica" ? grade.value : null,
                      statusHomologacao: "EM_ANALISE",
                      mechanicallyActive: false,
                      reviewRequired: false,
                      masterFeedback: "",
                      marco: nextMarco,
                      oficio: targetTrail.oficio,
                      aprovadaPeloMestre: false,
                    },
                  ];
                  targetTrail.magiaEpica = nextMarco >= 15 ? "III" : nextMarco >= 13 ? "II" : "I";
                  targetTrail.ganhos = {
                    ...(targetTrail.ganhos || {}),
                    ["m" + nextMarco]: { tipo: "atributo", valor: attribute.value },
                    ["m" + nextMarco + "-manifestacao"]: {
                      tipo: "manifestacao_epica",
                      valor: name.value.trim(),
                    },
                    ["m" + nextMarco + "-magia-epica"]: {
                      tipo: "magia_epica",
                      valor: targetTrail.magiaEpica,
                    },
                  };
                  action(p, "request", "", { snapshot: canonicalSnapshotForServer(target) });
                },
              },
              "Enviar proposta ao Mestre",
            ),
          );
        } else {
          detail.appendChild(
            el(
              "button",
              { class: "btn", onclick: () => action(p, "request") },
              "Solicitar próxima progressão",
            ),
          );
        }
      } else if (active.status === "requested") {
        detail.appendChild(
          el(
            "p",
            { class: "small muted" },
            active.toMarco >= 11
              ? "Manifestação enviada para homologação; aguardando análise do Mestre."
              : "Próximo Marco solicitado; aguardando reviewer.",
          ),
        );
        if (active.toMarco < 11)
          detail.appendChild(
            el(
              "button",
              { class: "btn primary", onclick: () => action(p, "enable") },
              "Habilitar próximo Marco",
            ),
          );
        if (active.toMarco >= 11 && active.epicManifestationFeedback)
          detail.appendChild(
            el(
              "p",
              { class: "small muted", style: "margin-top:8px" },
              "Feedback do Mestre: " + active.epicManifestationFeedback,
            ),
          );
      } else if (active.status === "authorized") {
        detail.appendChild(
          el("p", { class: "small muted" }, "Próximo Marco habilitado pelo reviewer."),
        );
        detail.appendChild(
          el(
            "button",
            { class: "btn primary", onclick: () => action(p, "start") },
            "Começar evolução",
          ),
        );
      } else if (active.status === "in_progress") {
        const localTrail = typeof trilha === "function" ? trilha(p) : null,
          nextMarco = active.toMarco,
          target = active.proposedSnapshot
            ? structuredClone(active.proposedSnapshot)
            : structuredClone(p),
          targetTrail = target.trilhas[Number(target.trilhaAtiva) || 0],
          controls = [];
        const addGainControl = (gain) => {
          const select = el("select");
          select.appendChild(
            el("option", { value: "" }, "— escolher " + gain.rotulo.toLowerCase() + " —"),
          );
          const options =
            gain.tipo === "especializacao"
              ? (
                  CANON.oficios.find((office) => office.nome === localTrail.oficio)
                    ?.especializacoes || []
                )
                  .filter((item) => !(localTrail.especializacoes || []).includes(item.nome))
                  .map((item) => ({ value: item.nome, label: item.nome }))
              : gain.tipo === "pericia"
                ? SKILLS.map((name) => ({ value: name, label: name }))
                : (typeof tecnicasDisponiveis === "function"
                    ? tecnicasDisponiveis(localTrail, nextMarco)
                    : []
                  ).map((item) => ({
                    value: item.nome,
                    label: item.nome + " · Nível " + item.nivel,
                  }));
          options.forEach((item) =>
            select.appendChild(el("option", { value: item.value }, item.label)),
          );
          controls.push({
            gain,
            select,
            apply: (value) => {
              if (gain.tipo === "especializacao")
                targetTrail.especializacoes = [...(targetTrail.especializacoes || []), value];
              else if (gain.tipo === "pericia")
                targetTrail.pericias = [...new Set([...(targetTrail.pericias || []), value])];
              else targetTrail.tecnicas = [...(targetTrail.tecnicas || []), value];
              targetTrail.ganhos = {
                ...(targetTrail.ganhos || {}),
                [gain.id]: { tipo: gain.tipo, valor: value },
              };
            },
          });
          return el(
            "div",
            { class: "row", style: "margin-top:8px" },
            el("span", { class: "small muted" }, gain.rotulo),
            select,
          );
        };
        const genericGains =
          nextMarco < 11 && localTrail && typeof ganhosMarco === "function"
            ? ganhosMarco(nextMarco, localTrail)
            : [];
        const currentForms = localTrail?.knownForms || [];
        const magicNeeds =
          nextMarco < 11 &&
          localTrail?.oficio === "Tecelão" &&
          typeof tecelaoMagicDeficit === "function"
            ? tecelaoMagicDeficit({ trilhas: [localTrail], trilhaAtiva: 0 }, nextMarco)
            : 0;
        const magicSelects = Array.from({ length: magicNeeds }, (_, index) => {
          const select = el("select");
          select.appendChild(el("option", { value: "" }, "— escolher Forma canônica —"));
          (globalThis.KALLISTIS_MAGIC_FORMS?.forms || [])
            .filter((form) => !currentForms.some((known) => known.formId === form.id))
            .forEach((form) =>
              select.appendChild(el("option", { value: form.id }, form.canonicalName)),
            );
          return { select };
        });
        const apply = el(
          "button",
          {
            class: "btn primary",
            onclick: () => {
              if (
                !targetTrail ||
                controls.some((control) => !control.select.value) ||
                magicSelects.some((item) => !item.select.value)
              )
                return;
              targetTrail.marco = nextMarco;
              controls.forEach((control) => control.apply(control.select.value));
              const selectedMagic = magicSelects.map((item) => item.select.value);
              targetTrail.knownForms = [
                ...(targetTrail.knownForms || []),
                ...selectedMagic.map((formId) => ({
                  formId,
                  maxGrade: Math.min(6, nextMarco >= 5 ? 3 : nextMarco >= 3 ? 2 : 1),
                })),
              ];
              targetTrail.ganhos = { ...(targetTrail.ganhos || {}) };
              selectedMagic.forEach((formId, index) => {
                targetTrail.ganhos["tecelao-forma-" + index] = {
                  tipo: "forma_tecelao",
                  valor: formId,
                };
              });
              action(p, "apply", "", {
                expectedVersion: p._serverVersion,
                snapshot: canonicalSnapshotForServer(target),
              });
            },
          },
          "Aplicar evolução",
        );
        if (genericGains.length)
          genericGains.forEach((gain) => detail.appendChild(addGainControl(gain)));
        if (magicSelects.length)
          magicSelects.forEach((item) =>
            detail.appendChild(
              el(
                "div",
                { class: "row", style: "margin-top:8px" },
                el("span", { class: "small muted" }, "+1 magia de Grau " + item.grade),
                item.select,
              ),
            ),
          );
        if (nextMarco >= 11 && active.proposedSnapshot) {
          const epicTrail = targetTrail;
          const proposal = (epicTrail.manifestacoesEpicas || []).slice(-1)[0];
          detail.appendChild(
            el(
              "div",
              { class: "card", style: "margin-top:10px" },
              el("b", null, "Manifestação Épica proposta"),
              el(
                "p",
                { class: "small muted" },
                (proposal?.nome || "—") +
                  " · Horizonte " +
                  (proposal?.horizonte ||
                    ["Cena", "Bairro", "Cidade", "Povo", "Mundo"][nextMarco - 11]) +
                  " · " +
                  (proposal?.statusHomologacao ||
                    (proposal?.aprovadaPeloMestre ? "HOMOLOGADA" : "EM_ANALISE")),
              ),
              el(
                "p",
                { class: "small", style: "white-space:pre-wrap;margin-top:6px" },
                [
                  proposal?.conceito,
                  proposal?.descricao,
                  "Ativação: " + (proposal?.ativacao || "—"),
                  "Efeito: " + (proposal?.efeito || "—"),
                  "Custo: " + (proposal?.custo || "—"),
                  "Limitações: " + (proposal?.limitacoes || "—"),
                  "Riscos: " + (proposal?.consequencias_ou_riscos || "—"),
                  proposal?.masterFeedback ? "Feedback do Mestre: " + proposal.masterFeedback : "",
                ]
                  .filter(Boolean)
                  .join("\n"),
              ),
            ),
          );
        }
        detail.appendChild(el("div", { class: "row", style: "margin-top:10px" }, apply));
      }
    }
    box.appendChild(detail);
    const ar = el("div", { class: "row", style: "margin-top:10px" });
    const input = el("input", {
      placeholder: "Pergunte à KALLISTIS sobre esta ficha",
      style: "flex:1",
    });
    ar.appendChild(input);
    ar.appendChild(
      el(
        "button",
        {
          class: "btn ghost",
          onclick: async () => {
            await window.KALLISTIS_SERVER_BRIDGE.assist(p, input.value.trim());
            input.value = "";
          },
        },
        "Consultar",
      ),
    );
    box.appendChild(ar);
    return box;
  };

  const comparisonIds = new Set();
  const canPlayerDiscard = (p) =>
    !p._serverStatus || ["draft", "rejected"].includes(p._serverStatus);
  const comparisonTrail = (p) => (typeof trilha === "function" ? trilha(p) : null);
  const comparisonDerived = (p) =>
    p.completo && typeof derivados === "function" ? derivados(p) : null;
  const comparisonValue = (p, field) => {
    const trail = comparisonTrail(p),
      derived = comparisonDerived(p);
    if (field === "status") return p._serverStatus || "rascunho local";
    if (field === "povo") return p.povo || "—";
    if (field === "heranca") return p.heranca || "—";
    if (field === "origem") return p.origem || "—";
    if (field === "oficio") return trail?.oficio || "—";
    if (field === "marco") return trail ? "Marco " + trail.marco : "—";
    if (field === "papel") return trail?.papel || "—";
    if (field === "conceito")
      return [p.conceito?.identidade, p.conceito?.objetivo].filter(Boolean).join(" · ") || "—";
    if (field === "recursos")
      return derived
        ? [
            "VIT " + derived.vitalidade,
            "LUC " + derived.lucidez,
            "FLX " + derived.fluxo,
            "GRD " + derived.guarda,
          ].join(" · ")
        : "—";
    if (field === "biografia") return p.biografia || "—";
    return p.nome || "—";
  };
  async function discardCharacter(p) {
    if (
      !confirm(
        "Descartar " +
          (p.nome || "esta personagem") +
          "? O rascunho será arquivado e não aparecerá entre as personagens ativas.",
      )
    )
      return;
    try {
      if (p._serverId) await action(p, "discard", "Descartado pelo jogador");
      DB.personagens = DB.personagens.filter(
        (x) => x !== p && x.id !== p.id && (!p._serverId || x._serverId !== p._serverId),
      );
      comparisonIds.delete(p.id);
      if (DB.atual === p.id || DB.atual === p._serverId) DB.atual = DB.personagens[0]?.id || null;
      save();
      VIEW = "personagens";
      window.render();
    } catch (e) {}
  }
  function comparisonSurface() {
    const app = document.querySelector("#app"),
      selected = DB.personagens.filter((p) => comparisonIds.has(p.id));
    app.innerHTML = "";
    if (selected.length < 2) {
      app.appendChild(
        el(
          "div",
          { class: "panel" },
          el("div", { class: "kicker" }, "Comparação"),
          el("h1", null, "Selecione pelo menos duas personagens"),
          el(
            "p",
            { class: "muted" },
            "Volte à lista, marque as fichas que deseja comparar e abra esta superfície novamente.",
          ),
          el(
            "button",
            {
              class: "btn primary",
              onclick: () => {
                VIEW = "personagens";
                window.render();
              },
            },
            "Voltar às personagens",
          ),
        ),
      );
      return;
    }
    const wrap = el("div");
    wrap.appendChild(
      el(
        "div",
        { class: "panel" },
        el("div", { class: "kicker" }, "Comparação de fichas"),
        el("h1", null, "Escolha com clareza"),
        el(
          "p",
          { class: "muted" },
          "Compare os dados registrados antes de manter uma ficha. Descarte somente rascunhos ou fichas rejeitadas; fichas enviadas ou aprovadas permanecem protegidas por seu fluxo próprio.",
        ),
        el(
          "button",
          {
            class: "btn",
            onclick: () => {
              VIEW = "personagens";
              window.render();
            },
          },
          "Voltar às personagens",
        ),
      ),
    );
    const table = el("table", {
      "aria-label": "Comparação de personagens",
      style: "min-width:760px",
    });
    const head = el("thead"),
      headRow = el("tr");
    headRow.appendChild(el("th", null, "Campo"));
    selected.forEach((p) => headRow.appendChild(el("th", null, p.nome || "Sem nome")));
    head.appendChild(headRow);
    table.appendChild(head);
    const body = el("tbody");
    [
      ["Status", "status"],
      ["Povo", "povo"],
      ["Herança", "heranca"],
      ["Origem", "origem"],
      ["Ofício", "oficio"],
      ["Progressão", "marco"],
      ["Papel", "papel"],
      ["Conceito", "conceito"],
      ["Recursos derivados", "recursos"],
      ["Biografia", "biografia"],
    ].forEach(([label, field]) => {
      const row = el("tr");
      row.appendChild(el("th", null, label));
      selected.forEach((p) =>
        row.appendChild(
          el(
            "td",
            { style: "vertical-align:top;white-space:pre-wrap;max-width:300px" },
            String(comparisonValue(p, field)),
          ),
        ),
      );
      body.appendChild(row);
    });
    const actionRow = el("tr");
    actionRow.appendChild(el("th", null, "Ação"));
    selected.forEach((p) =>
      actionRow.appendChild(
        el(
          "td",
          { style: "vertical-align:top" },
          canPlayerDiscard(p)
            ? el(
                "button",
                { class: "btn danger", onclick: () => void discardCharacter(p) },
                "Descartar",
              )
            : el(
                "span",
                { class: "small muted" },
                "Protegida pelo fluxo " + (p._serverStatus || "atual"),
              ),
        ),
      ),
    );
    body.appendChild(actionRow);
    table.appendChild(body);
    wrap.appendChild(el("div", { class: "panel", style: "overflow:auto" }, table));
    app.appendChild(wrap);
  }
  function enhanceCharacterList() {
    const list = document.querySelector(".cardlist"),
      listPanel = list?.parentElement;
    if (!list || !listPanel) return;
    if (DB.personagens.length >= 2 && !listPanel.querySelector("[data-character-compare-panel]")) {
      const selectedCount = DB.personagens.filter((p) => comparisonIds.has(p.id)).length;
      listPanel.insertBefore(
        el(
          "div",
          { class: "card", style: "margin:10px 0", "data-character-compare-panel": "true" },
          el(
            "div",
            { class: "row", style: "justify-content:space-between;align-items:center" },
            el(
              "div",
              null,
              el("b", null, "Comparar fichas"),
              el(
                "p",
                { class: "small muted" },
                "Marque duas ou mais personagens para comparar lado a lado.",
              ),
            ),
            el(
              "button",
              {
                class: "btn primary",
                disabled: selectedCount < 2,
                onclick: () => {
                  VIEW = "comparar";
                  window.render();
                },
              },
              "Comparar selecionadas (" + selectedCount + ")",
            ),
          ),
        ),
        list,
      );
    }
    [...list.children].forEach((card, index) => {
      const p = DB.personagens[index];
      if (!p || card.querySelector("[data-character-compare]")) return;
      [...card.querySelectorAll("button")]
        .find((button) => button.textContent === "Remover")
        ?.setAttribute("style", "display:none");
      const checkbox = el("input", {
        type: "checkbox",
        "aria-label": "Comparar " + (p.nome || "esta personagem"),
      });
      checkbox.checked = comparisonIds.has(p.id);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) comparisonIds.add(p.id);
        else comparisonIds.delete(p.id);
        window.render();
      });
      card.appendChild(
        el(
          "label",
          {
            class: "small",
            style: "display:inline-flex;align-items:center;gap:5px;margin-top:10px",
            "data-character-compare": "true",
          },
          checkbox,
          "Comparar",
        ),
      );
      if (canDeleteCharacters && p._serverId) {
        card.appendChild(
          el(
            "button",
            {
              class: "btn danger",
              style: "margin-top:8px",
              onclick: async () => {
                if (
                  !confirm(
                    "Apagar " +
                      (p.nome || "esta personagem") +
                      "?\n\nEste personagem será removido da sua lista e não poderá mais ser usado.",
                  )
                )
                  return;
                await action(p, "delete");
                DB.personagens = DB.personagens.filter(
                  (x) => x !== p && x.id !== p.id && x._serverId !== p._serverId,
                );
                save();
                VIEW = "personagens";
                window.render();
              },
              "data-character-delete": "true",
            },
            "Apagar personagem",
          ),
        );
      } else if (canPlayerDiscard(p)) {
        card.appendChild(
          el(
            "button",
            {
              class: "btn danger",
              style: "margin-top:8px",
              onclick: () => void discardCharacter(p),
              "data-character-discard": "true",
            },
            "Descartar",
          ),
        );
      }
    });
  }
  const baseRender = window.render;
  if (!TABS.some(([id]) => id === "comparar")) TABS.splice(1, 0, ["comparar", "Comparar"]);
  function creationAssistant(p) {
    const box = el("div", { class: "panel", style: "border-color:rgba(140,95,255,.35)" });
    box.appendChild(el("div", { class: "kicker" }, "Assistente de criação"));
    box.appendChild(
      el(
        "p",
        { class: "muted small" },
        "Pergunte à KALLISTIS sobre o cânone, suas escolhas ou o próximo passo. A assistência não altera a ficha sem sua confirmação.",
      ),
    );
    if (p._serverMessages && p._serverMessages.length) {
      p._serverMessages.forEach((m) =>
        box.appendChild(
          el(
            "div",
            { class: "card", style: "margin-top:8px" },
            el("b", null, m.role === "assistant" ? "KALLISTIS" : "Você"),
            el("p", { style: "white-space:pre-wrap;margin-top:6px" }, m.content),
          ),
        ),
      );
    }
    const row = el("div", { class: "row", style: "margin-top:10px" });
    const input = el("input", { placeholder: "Ex.: ajude-me a escolher um Povo", style: "flex:1" });
    const button = el(
      "button",
      {
        class: "btn ghost",
        onclick: async () => {
          const message = input.value.trim();
          if (!message) return;
          button.disabled = true;
          try {
            await assist(p, message);
            input.value = "";
          } finally {
            button.disabled = false;
          }
        },
      },
      "Consultar",
    );
    row.appendChild(input);
    row.appendChild(button);
    box.appendChild(row);
    return box;
  }
  window.render = function () {
    const comparing = VIEW === "comparar";
    if (comparing) VIEW = "personagens";
    baseRender();
    if (comparing) {
      VIEW = "comparar";
      comparisonSurface();
      [...document.querySelectorAll("#tabs button")].forEach((button) =>
        button.setAttribute("aria-current", button.textContent === "Comparar" ? "true" : "false"),
      );
    } else if (VIEW === "personagens") enhanceCharacterList();
    else if (VIEW === "criar") {
      const current = DB.personagens.find((p) => p.id === DB.atual);
      if (current) document.querySelector("#app")?.appendChild(creationAssistant(current));
    }
  };
  window.renderServerList = function () {
    const box = el("div", { class: "panel", style: "border-color:rgba(140,95,255,.35)" });
    box.appendChild(el("div", { class: "kicker" }, "Servidor KALLISTIS"));
    let syncMessage;
    if (!bootComplete) syncMessage = "Conferindo os status das personagens no servidor…";
    else if (!listLoaded) {
      syncMessage =
        "Não foi possível confirmar os status no servidor. Os dados locais podem estar desatualizados.";
    } else if (online) syncMessage = "Rascunhos e fichas persistem na PostgreSQL do runtime.";
    else syncMessage = "Entre na sessão KALLISTIS para sincronizar personagens.";
    box.appendChild(el("p", { class: "muted small" }, syncMessage));
    return box;
  };
  boot();
})();
