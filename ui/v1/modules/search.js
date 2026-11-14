window.SearchModule = {
  debounce: null,

  init() {
    const input = document.getElementById("deepSearch");
    const clearBtn = document.getElementById("clearDeepSearch");
    if (!input) return;
    input.addEventListener("input", () => {
      clearTimeout(this.debounce);
      this.debounce = setTimeout(() => this.run(input.value.trim()), 280);
    });
    clearBtn?.addEventListener("click", () => {
      input.value = "";
      this.render([]);
      document.getElementById("deepSearchPanel")?.classList.add("hide");
    });
  },

  async run(q) {
    const panel = document.getElementById("deepSearchPanel");
    const list = document.getElementById("deepSearchResults");
    if (!panel || !list) return;
    if (q.length < 2) {
      panel.classList.add("hide");
      list.innerHTML = "";
      return;
    }
    panel.classList.remove("hide");
    list.innerHTML = '<li class="empty-state">Searching…</li>';
    try {
      const data = await Api.request(`/search.php?q=${encodeURIComponent(q)}`);
      this.render(data.results || [], !!data.truncated);
    } catch (e) {
      list.innerHTML = `<li class="empty-state">${e.message || "Search failed"}</li>`;
    }
  },

  render(results, truncated = false) {
    const panel = document.getElementById("deepSearchPanel");
    const list = document.getElementById("deepSearchResults");
    if (!panel || !list) return;
    list.innerHTML = "";
    if (!results.length) {
      list.innerHTML = '<li class="empty-state">No matches in this space</li>';
      return;
    }
    results.forEach((item) => {
      const li = document.createElement("li");
      li.className = "deep-result";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "deep-result-btn";
      const where = item.folder ? item.folder + "/" : "";
      btn.innerHTML = `<strong>${item.name}</strong><span>${item.type} · ${where || "root"}</span>`;
      btn.addEventListener("click", () => {
        if (item.type === "folder") {
          FilesModule.openFolder(item.path || "");
        } else {
          FilesModule.openFolder(item.folder || "");
          setTimeout(() => {
            const match = (FilesModule.files || []).find((f) => f.name === item.name);
            if (match) PreviewModule.open(match);
            else if (item.viewUrl) PreviewModule.open(item);
          }, 400);
        }
        panel.classList.add("hide");
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
    if (truncated) {
      const more = document.createElement("li");
      more.className = "empty-state";
      more.textContent = "Showing first 100 matches";
      list.appendChild(more);
    }
  },
};
