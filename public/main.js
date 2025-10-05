(function () {
  const apiBase = "/api";
  const state = { items: [], sort: { key: "id", dir: "desc" }, filter: "" };
  const els = {
    tbody: document.querySelector("#urls-table tbody"),
    rowTpl: document.getElementById("rowTemplate"),
    result: document.getElementById("result"),
    liveMessage: document.getElementById("liveMessage"),
    search: document.getElementById("search"),
    clearFilter: document.getElementById("clearFilterBtn"),
    themeToggle: document.getElementById("themeToggle"),
    tableStatus: document.getElementById("tableStatus"),
    submitBtn: document.getElementById("submitBtn"),
    form: document.getElementById("shorten-form"),
    onlineStatus: document.getElementById("onlineStatus"),
    refreshBtn: document.getElementById("refreshBtn"),
  };

  // THEME
  function applyTheme(theme) {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.dataset.theme = theme;
    els.themeToggle.setAttribute("aria-pressed", theme === "dark");
    localStorage.setItem("theme", theme);
  }
  const savedTheme =
    localStorage.getItem("theme") ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(savedTheme);
  els.themeToggle?.addEventListener("click", () =>
    applyTheme(
      document.documentElement.classList.contains("dark") ? "light" : "dark"
    )
  );

  // NETWORK STATUS
  function updateOnlineStatus() {
    document.body.classList.toggle("offline", !navigator.onLine);
  }
  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);
  updateOnlineStatus();

  // API helper
  async function api(path, opts = {}) {
    const res = await fetch(apiBase + path, {
      headers: { "Content-Type": "application/json" },
      ...opts,
    });
    if (!res.ok) {
      let err;
      try {
        err = await res.json();
      } catch {
        err = { error: res.statusText };
      }
      throw err;
    }
    return res.json();
  }

  function setLive(msg, type = "") {
    if (!msg) {
      els.liveMessage.style.display = "none";
      return;
    }
    els.liveMessage.textContent = msg;
    els.liveMessage.className = "message " + (type || "");
    els.liveMessage.style.display = "block";
  }

  function sortItems(items) {
    const { key, dir } = state.sort;
    const mul = dir === "asc" ? 1 : -1;
    return items.slice().sort((a, b) => {
      if (key === "id") return (a.id - b.id) * mul;
      if (key === "short") return a.shortUrl.localeCompare(b.shortUrl) * mul;
      if (key === "clicks") return (a.clickCount - b.clickCount) * mul;
      return 0;
    });
  }

  function filteredItems() {
    const f = state.filter.trim().toLowerCase();
    let arr = state.items;
    if (f)
      arr = arr.filter(
        (i) =>
          i.originalUrl.toLowerCase().includes(f) ||
          i.shortUrl.toLowerCase().includes(f)
      );
    arr = sortItems(arr);
    els.tableStatus.textContent = f
      ? arr.length + " filtered result" + (arr.length !== 1 ? "s" : "")
      : arr.length + " total URLs";
    return arr;
  }

  function createCellContent(u) {
    const original = `<a href="${
      u.originalUrl
    }" target="_blank" rel="noopener">${escapeHtml(
      truncate(u.originalUrl, 80)
    )}</a>`;
    const short = `<a href="${
      u.shortUrl
    }" target="_blank" rel="noopener" class="mono">${escapeHtml(
      u.shortUrl
    )}</a>`;
    return { original, short };
  }

  function escapeHtml(str) {
    return str.replace(
      /[&<>\"]/g,
      (s) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[s])
    );
  }
  function truncate(str, n) {
    return str.length > n ? str.slice(0, n - 1) + "…" : str;
  }

  function render(highlightId) {
    els.tbody.innerHTML = "";
    const items = filteredItems();
    if (!items.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = '<td colspan="5" class="empty">No URLs yet</td>';
      els.tbody.appendChild(tr);
      return;
    }
    for (const u of items) {
      const clone = els.rowTpl.content.firstElementChild.cloneNode(true);
      clone.querySelector('[data-col="id"]').textContent = u.id;
      const { original, short } = createCellContent(u);
      clone.querySelector('[data-col="original"]').innerHTML = original;
      const shortCell = clone.querySelector('[data-col="short"]');
      shortCell.innerHTML =
        short +
        ` <button type="button" class="secondary copy-btn" data-copy="${u.shortUrl}" title="Copy short URL">Copy</button>`;
      clone.querySelector('[data-col="clicks"]').textContent = u.clickCount;
      const actions = clone.querySelector('[data-col="actions"]');
      actions.innerHTML = `<div class="actions"><button type="button" class="secondary" data-open="${u.shortUrl}" title="Open in new tab">Open</button><button type="button" class="danger" data-delete="${u.id}" title="Delete">Delete</button></div>`;
      if (highlightId && highlightId === u.id) clone.classList.add("highlight");
      els.tbody.appendChild(clone);
    }
  }

  async function load(showLoading = true) {
    if (showLoading) showLoadingRow();
    try {
      const data = await api("/urls");
      state.items = Array.isArray(data.items) ? data.items : [];
      render();
    } catch (err) {
      setLive(err.error || "Failed to load URLs", "error");
      els.tbody.innerHTML =
        '<tr class="loading-row"><td colspan="5">Failed to load.</td></tr>';
    }
  }

  function showLoadingRow() {
    els.tbody.innerHTML =
      '<tr class="loading-row"><td colspan="5">Loading…</td></tr>';
  }

  // FORM SUBMIT
  els.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setLive("");
    if (!els.form.reportValidity()) return;
    const originalUrl = els.form.originalUrl.value.trim();
    const customCodeVal = els.form.customCode.value.trim();
    const customCode = customCodeVal || undefined;
    if (customCode && !/^[A-Za-z0-9_-]{3,32}$/.test(customCode)) {
      setLive("Custom code invalid format", "error");
      return;
    }
    els.submitBtn.disabled = true;
    els.submitBtn.textContent = "Shortening…";
    try {
      const result = await api("/shorten", {
        method: "POST",
        body: JSON.stringify({ originalUrl, customCode }),
      });
      if (result.shortUrl) {
        els.result.style.display = "block";
        els.result.innerHTML = `<strong>Short URL:</strong> <a href="${result.shortUrl}" target="_blank" rel="noopener" class="mono">${result.shortUrl}</a> <button type="button" class="secondary copy-btn" data-copy="${result.shortUrl}">Copy</button>`;
        setLive("Short URL created", "success");
      }
      els.form.reset();
      await load(false); // refresh silently
      const newId =
        result.id ||
        (state.items[state.items.length - 1] &&
          state.items[state.items.length - 1].id); // best guess
      render(newId);
    } catch (err) {
      setLive(err.error || "Error creating short URL", "error");
    } finally {
      els.submitBtn.disabled = false;
      els.submitBtn.textContent = "Shorten";
    }
  });

  // TABLE INTERACTION
  els.tbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.dataset.copy) return copyToClipboard(btn.dataset.copy, btn);
    if (btn.dataset.open) {
      window.open(btn.dataset.open, "_blank", "noopener");
      return;
    }
    if (btn.dataset.delete) {
      if (!confirm("Delete this URL?")) return;
      try {
        await fetch(apiBase + "/urls/" + btn.dataset.delete, {
          method: "DELETE",
        });
        setLive("Deleted", "success");
        await load(false);
      } catch {
        setLive("Delete failed", "error");
      }
    }
  });

  // GLOBAL copy buttons (result area)
  document.body.addEventListener("click", (e) => {
    const b = e.target.closest("button.copy-btn");
    if (b && b.dataset.copy) copyToClipboard(b.dataset.copy, b);
  });

  async function copyToClipboard(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = "Copied!";
        btn.disabled = true;
        setTimeout(() => {
          btn.textContent = orig;
          btn.disabled = false;
        }, 1600);
      }
      setLive("Copied to clipboard", "success");
    } catch {
      setLive("Copy failed", "error");
    }
  }

  // SEARCH / FILTER
  let filterTimer;
  els.search.addEventListener("input", () => {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(() => {
      state.filter = els.search.value;
      render();
      els.clearFilter.style.display = state.filter ? "inline-block" : "none";
    }, 180);
  });
  els.clearFilter.addEventListener("click", () => {
    els.search.value = "";
    state.filter = "";
    render();
    els.clearFilter.style.display = "none";
  });

  // SORT
  document.querySelectorAll("th.sortable").forEach((th) =>
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (state.sort.key === key)
        state.sort.dir = state.sort.dir === "asc" ? "desc" : "asc";
      else {
        state.sort.key = key;
        state.sort.dir = "asc";
      }
      render();
    })
  );

  // REFRESH
  els.refreshBtn.addEventListener("click", () => load());

  // INIT
  load();
})();
