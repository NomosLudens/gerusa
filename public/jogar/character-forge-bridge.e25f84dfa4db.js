(function () {
  const API = "/api/characters";
  let timer = null,
    online = false;
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
    p._serverId = c.id;
    p._serverVersion = c.version;
    p._serverStatus = c.status;
    p._serverUpdatedAt = c.updatedAt;
  }
  async function push(p) {
    if (!p) return;
    try {
      const d = await request(API, {
        method: "PUT",
        body: JSON.stringify({
          id: p._serverId || p.id,
          snapshot: p,
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
    clearTimeout(timer);
    timer = setTimeout(() => push(p), 700);
  }
  async function boot() {
    try {
      const data = await request(API);
      online = true;
      const remote = data.characters || [];
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
      localStorage.setItem(KEY, JSON.stringify(DB));
      render();
    } catch (e) {
      online = e.status !== 401;
    }
  }
  async function action(p, action, note) {
    try {
      const d = await request(API, {
        method: "POST",
        body: JSON.stringify({ id: p._serverId || p.id, action, note }),
      });
      mark(p, d);
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
    const ar = el("div", { class: "row", style: "margin-top:10px" });
    const input = el("input", {
      placeholder: "Pergunte ao Assistente de Criação",
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
