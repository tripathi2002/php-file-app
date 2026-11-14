window.FilterPresetsModule = {
  KEY: "fileAppFilterPresets",

  init() {
    document.getElementById("saveFilterBtn")?.addEventListener("click", () => this.save());
    document.getElementById("loadFilterBtn")?.addEventListener("click", () => this.load());
  },

  all() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || "{}");
    } catch (e) {
      return {};
    }
  },

  save() {
    const name = prompt("Name this filter preset:");
    if (!name) return;
    const presets = this.all();
    presets[name.trim()] = {
      query: FilesModule.query || "",
      filterType: FilesModule.filterType || "all",
      sortKey: FilesModule.sortKey || "newest",
    };
    localStorage.setItem(this.KEY, JSON.stringify(presets));
    ToastModule.show(`Saved filter “${name.trim()}”`, "success");
  },

  load() {
    const presets = this.all();
    const names = Object.keys(presets);
    if (!names.length) {
      ToastModule.show("No saved filters yet", "info");
      return;
    }
    const pick = prompt("Load preset:\n" + names.join("\n"), names[0]);
    if (!pick || !presets[pick]) return;
    const p = presets[pick];
    FilesModule.query = p.query || "";
    FilesModule.filterType = p.filterType || "all";
    FilesModule.sortKey = p.sortKey || "newest";
    const search = document.getElementById("fileSearch");
    if (search) search.value = FilesModule.query;
    const sort = document.getElementById("fileSort");
    if (sort) sort.value = FilesModule.sortKey;
    document.querySelectorAll("[data-type-filter]").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-type-filter") === FilesModule.filterType);
    });
    FilesModule.renderList();
    ToastModule.show(`Loaded “${pick}”`, "success");
  },
};
