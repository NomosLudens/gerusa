(function () {
  const API = "/api/characters";
  let timer = null,
    online = false;
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
  }
  function canonicalSnapshotForServer(p) {
    const snapshot = structuredClone(p || {});
    Object.keys(snapshot).forEach((key) => {
      if (key.startsWith("_server") || key.startsWith("server")) delete snapshot[key];
    });
    return snapshot;
  }
  function persistLocal() {
    try {
      localStorage.setItem(KEY, JSON.stringify(DB));
    } catch (e) {
      console.warn("KALLISTIS local cache:", e);
    }
  }
  async function refresh(p) {
    if (!p || !(p._serverId || p.id)) return null;
    if (p._serverMissing || (p._serverId && missingServerIds.has(p._serverId))) return null;
    try {
      const data = await request(API + "?characterId=" + encodeURIComponent(p._serverId || p.id));
      mark(p, data);
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
    if (!p) return;
    if (p._serverMissing || (p._serverId && missingServerIds.has(p._serverId))) return;
    try {
      const d = await request(API, {
        method: "PUT",
        body: JSON.stringify({
          id: p._serverId || p.id,
          snapshot: canonicalSnapshotForServer(p),
          expectedVersion: p._serverVersion,
        }),
      });
      mark(p, d);
      online = true;
      window.render();
    } catch (e) {
      online = e.status !== 401;
      console.warn("KALLISTIS character sync:", e.message);
      window.dispatchEvent(new CustomEvent("kallistis:server-error", { detail: e.message }));
    }
  }
  function queue(p) {
    if (!p || p._serverMissing || (p._serverId && missingServerIds.has(p._serverId))) return;
    clearTimeout(timer);
    timer = setTimeout(() => push(p), 700);
  }
  async function boot() {
    try {
      clearTimeout(timer);
      const data = await request(API);
      online = true;
      const remote = data.characters || [];
      const remoteIds = new Set(remote.map((r) => r.id));
      DB.personagens = DB.personagens.filter((p) => {
        if (!p._serverId || remoteIds.has(p._serverId)) return true;
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
        Object.assign(p, r.snapshot || {});
        mark(p, { character: r });
      });
      if (remote.length && !DB.atual) DB.atual = remote[0].id;
      const current = DB.personagens.find((p) => p.id === DB.atual);
      if (current && current._serverId) await refresh(current);
      persistLocal();
      render();
    } catch (e) {
      online = e.status !== 401;
    }
  }
  async function action(p, action, note, extra) {
    try {
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
      await refresh(p);
      render();
      return d;
    } catch (e) {
      alert("KALLISTIS: " + e.message);
      throw e;
    }
  }
  async function assist(p, message) {
    try {
      const d = await request(API, {
        method: "POST",
        body: JSON.stringify({ id: p._serverId || p.id, action: "assist", message }),
      });
      mark(p, d);
      p._serverMessages = d.messages || [];
      persistLocal();
      render();
      return d;
    } catch (e) {
      alert("Assistente: " + e.message);
    }
  }
  window.KALLISTIS_SERVER_BRIDGE = {
    queue,
    push,
    action,
    assist,
    refresh,
    get online() {
      return online;
    },
  };
  window.serverControls = function (p) {
    const box = el("div", { class: "panel", style: "border-color:rgba(140,95,255,.35)" });
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
    const row = el("div", { class: "row", style: "margin-top:10px" });
    row.appendChild(
      el(
        "button",
        { class: "btn", onclick: () => window.KALLISTIS_SERVER_BRIDGE.push(p) },
        "Salvar no servidor",
      ),
    );
    if (p._serverStatus === "draft" || p._serverStatus === "rejected" || !p._serverStatus)
      row.appendChild(
        el(
          "button",
          {
            class: "btn primary",
            disabled: !p.completo,
            onclick: () => window.KALLISTIS_SERVER_BRIDGE.action(p, "submit"),
          },
          "Enviar ao Mestre",
        ),
      );
    if (p._serverStatus === "submitted") {
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
    if (p._serverStatus === "approved")
      row.appendChild(
        el(
          "button",
          {
            class: "btn ghost",
            onclick: () => window.KALLISTIS_SERVER_BRIDGE.action(p, "archive"),
          },
          "Arquivar",
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
      if (!active)
        detail.appendChild(
          el(
            "button",
            { class: "btn", onclick: () => action(p, "request") },
            "Solicitar próxima progressão",
          ),
        );
      else if (active.status === "requested") {
        detail.appendChild(
          el("p", { class: "small muted" }, "Próximo Marco solicitado; aguardando reviewer."),
        );
        detail.appendChild(
          el(
            "button",
            { class: "btn primary", onclick: () => action(p, "enable") },
            "Habilitar próximo Marco",
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
          nextMarco = active.toMarco;
        const choices =
          localTrail && typeof tecnicasDisponiveis === "function"
            ? tecnicasDisponiveis(localTrail, nextMarco)
            : [];
        const select = el("select");
        select.appendChild(el("option", { value: "" }, "— escolher técnica canônica —"));
        choices.forEach((choice) =>
          select.appendChild(
            el("option", { value: choice.nome }, choice.nome + " · Nível " + choice.nivel),
          ),
        );
        const apply = el(
          "button",
          {
            class: "btn primary",
            onclick: () => {
              if (!select.value || !localTrail) return;
              const target = structuredClone(p._serverPublishedSnapshot || p),
                targetTrail = target.trilhas[Number(target.trilhaAtiva) || 0];
              targetTrail.marco = nextMarco;
              targetTrail.tecnicas = [...(targetTrail.tecnicas || []), select.value];
              targetTrail.ganhos = {
                ...(targetTrail.ganhos || {}),
                ["m" + nextMarco]: { tipo: "tecnica", valor: select.value },
              };
              action(p, "apply", "", {
                expectedVersion: p._serverVersion,
                snapshot: canonicalSnapshotForServer(target),
              });
            },
          },
          "Aplicar evolução",
        );
        detail.appendChild(el("div", { class: "row" }, select, apply));
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
            if (input.value.trim()) {
              await window.KALLISTIS_SERVER_BRIDGE.assist(p, input.value.trim());
              input.value = "";
            }
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
        (x) => x !== p && x.id !== p.id && x._serverId !== p._serverId,
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
      if (canPlayerDiscard(p)) {
        [...card.querySelectorAll("button")]
          .find((button) => button.textContent === "Remover")
          ?.setAttribute("style", "display:none");
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
  };
  window.renderServerList = function () {
    const box = el("div", { class: "panel", style: "border-color:rgba(140,95,255,.35)" });
    box.appendChild(el("div", { class: "kicker" }, "Servidor KALLISTIS"));
    box.appendChild(
      el(
        "p",
        { class: "muted small" },
        online
          ? "Rascunhos e fichas persistem na PostgreSQL do runtime."
          : "Entre na sessão KALLISTIS para sincronizar personagens.",
      ),
    );
    return box;
  };
  boot();
})();
