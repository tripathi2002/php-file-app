window.FilesModule = {
  folders: [],
  files: [],
  selected: new Set(),
  sortKey: localStorage.getItem("fileAppSort") || "newest",
  filterType: "all",
  query: "",
  viewMode: localStorage.getItem("fileAppView") || "list",
  favoritesKey: "fileAppFavorites",

  init() {
    document.addEventListener("click", () => {
      document
        .querySelectorAll(".dropdown-menu.show")
        .forEach((menu) => menu.classList.remove("show"));
    });

    const search = document.getElementById("fileSearch");
    if (search) {
      search.addEventListener("input", () => {
        this.query = search.value.trim().toLowerCase();
        this.renderList();
      });
    }

    const sort = document.getElementById("fileSort");
    if (sort) {
      sort.value = this.sortKey;
      sort.addEventListener("change", () => {
        this.sortKey = sort.value;
        localStorage.setItem("fileAppSort", this.sortKey);
        this.renderList();
      });
    }

    document.querySelectorAll("[data-type-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.filterType = btn.getAttribute("data-type-filter") || "all";
        document
          .querySelectorAll("[data-type-filter]")
          .forEach((b) => b.classList.toggle("active", b === btn));
        this.renderList();
      });
    });

    document.getElementById("refreshBtn")?.addEventListener("click", () => {
      this.loadFiles();
      ToastModule.show("Refreshed", "info");
    });
    document.getElementById("selectAllBtn")?.addEventListener("click", () => this.selectAllVisible());
    document.getElementById("clearSelectBtn")?.addEventListener("click", () => this.clearSelection());
    document.getElementById("batchDeleteBtn")?.addEventListener("click", () => this.batchDelete());
    document.getElementById("batchZipBtn")?.addEventListener("click", () => this.batchZip());
    document.getElementById("batchMoveBtn")?.addEventListener("click", () => this.batchMove());
    document.getElementById("batchFavBtn")?.addEventListener("click", () => this.favoriteSelected());
    document.getElementById("batchCopyLinksBtn")?.addEventListener("click", () => this.copySelectedLinks());
    document.getElementById("viewToggleBtn")?.addEventListener("click", () => this.toggleView());
    document.getElementById("newNoteBtn")?.addEventListener("click", () => this.createNote());
    document.getElementById("emptyFolderBtn")?.addEventListener("click", () => this.emptyCurrentFolder());
    document.getElementById("slideshowBtn")?.addEventListener("click", () => this.startSlideshow());
    this.applyViewMode();
  },

  emptyCurrentFolder() {
    if (Api.readOnly) {
      ToastModule.show("Public space is read-only", "error");
      return;
    }
    const label = Api.currentFolder || "(root)";
    ModalModule.show({
      title: "Empty folder",
      message: `Delete ALL files and subfolders inside "${label}"? The folder itself stays.`,
      confirmText: "Empty it",
      danger: true,
      onConfirm: async () => {
        try {
          const res = await Api.request("/empty-folder.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folder: Api.currentFolder || "" }),
          });
          ToastModule.show(
            `Removed ${res.deletedFiles || 0} files, ${res.deletedFolders || 0} folders`,
            "success"
          );
          ActivityModule.log?.("Emptied folder", label);
          this.clearSelection();
          this.loadFiles();
        } catch (error) {
          if (error.authRequired) AuthGate.prompt();
          ToastModule.show(error.message || "Empty failed", "error");
        }
      },
    });
  },

  createNote() {
    if (Api.readOnly) {
      ToastModule.show("Public space is read-only", "error");
      return;
    }
    ModalModule.show({
      title: "New note",
      message: "Filename ending in .txt or .md",
      input: true,
      inputValue: "note.txt",
      confirmText: "Create",
      onConfirm: async (name) => {
        if (!name) return;
        try {
          await Api.request("/write.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              folder: Api.currentFolder || "",
              name,
              content: "",
            }),
          });
          ToastModule.show("Note created", "success");
          ActivityModule.log?.("Created note", name);
          this.loadFiles();
        } catch (error) {
          if (error.authRequired) AuthGate.prompt();
          ToastModule.show(error.message || "Could not create note", "error");
        }
      },
    });
  },

  toggleView() {
    this.viewMode = this.viewMode === "grid" ? "list" : "grid";
    localStorage.setItem("fileAppView", this.viewMode);
    this.applyViewMode();
    this.renderList();
  },

  applyViewMode() {
    const list = document.getElementById("fileList");
    const btn = document.getElementById("viewToggleBtn");
    list?.classList.toggle("grid-view", this.viewMode === "grid");
    if (btn) btn.textContent = this.viewMode === "grid" ? "List" : "Grid";
  },

  favId(name, isFolder) {
    return `${Api.space || "personal"}|${Api.currentFolder || ""}|${isFolder ? "d" : "f"}|${name}`;
  },

  getFavorites() {
    try {
      return JSON.parse(localStorage.getItem(this.favoritesKey) || "[]");
    } catch (e) {
      return [];
    }
  },

  isFavorite(name, isFolder) {
    return this.getFavorites().includes(this.favId(name, isFolder));
  },

  toggleFavorite(name, isFolder) {
    const id = this.favId(name, isFolder);
    let favs = this.getFavorites();
    if (favs.includes(id)) favs = favs.filter((x) => x !== id);
    else favs.push(id);
    localStorage.setItem(this.favoritesKey, JSON.stringify(favs));
    this.renderList();
  },

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  },

  formatDate(ts) {
    try {
      const d = new Date(ts * 1000);
      const diff = (Date.now() - d.getTime()) / 1000;
      if (diff < 60) return "just now";
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
      return d.toLocaleDateString();
    } catch (e) {
      return "";
    }
  },

  async showDetails(file, isFolder = false) {
    let hashLine = "";
    if (!isFolder && (file.size || 0) <= 100 * 1024 * 1024) {
      try {
        const data = await Api.request(
          `/checksum.php?name=${encodeURIComponent(file.name)}&folder=${encodeURIComponent(file.folder || Api.currentFolder || "")}&algo=sha256`
        );
        hashLine = `\nSHA-256: ${data.hash}`;
      } catch (e) {
        hashLine = `\nSHA-256: unavailable`;
      }
    }
    const lines = isFolder
      ? [`Name: ${file.name}`, `Type: Folder`, `Path: ${file.path || file.name}`]
      : [
          `Name: ${file.name}`,
          `Size: ${this.formatSize(file.size || 0)}`,
          `Type: ${file.mime || file.ext || "file"}`,
          `Modified: ${file.mtime ? new Date(file.mtime * 1000).toLocaleString() : "—"}`,
          `Folder: ${file.folder || "(root)"}`,
        ];
    ModalModule.show({
      title: "Details",
      message: lines.join("\n") + hashLine,
      confirmText: "Close",
      cancelText: "OK",
      onConfirm: () => {},
    });
  },

  startSlideshow() {
    const images = (this.files || []).filter(
      (f) =>
        (f.mime || "").startsWith("image/") ||
        ["jpg", "jpeg", "png", "gif", "webp", "ico"].includes((f.ext || "").toLowerCase())
    );
    if (!images.length) {
      ToastModule.show("No images in this folder", "error");
      return;
    }
    PreviewModule.open(images[0]);
    PreviewModule.startSlideshow?.(images);
  },

  typeIcon(ext, mime) {
    if ((mime || "").startsWith("image/")) return "IMG";
    if ((mime || "").startsWith("video/")) return "VID";
    if ((mime || "").startsWith("audio/")) return "AUD";
    if (ext === "pdf") return "PDF";
    if (["zip"].includes(ext)) return "ZIP";
    return "FILE";
  },

  applyReadOnlyUi() {
    const ro = !!Api.readOnly;
    document.getElementById("newFolderBtn")?.classList.toggle("hide", ro);
    document.getElementById("newNoteBtn")?.classList.toggle("hide", ro);
    document.getElementById("emptyFolderBtn")?.classList.toggle("hide", ro);
    document.getElementById("folderUploadBtn")?.classList.toggle("hide", ro);
    document.getElementById("trashBtn")?.classList.toggle("hide", ro);
    document.getElementById("fab")?.classList.toggle("readonly-hide", ro);
    document.getElementById("batchDeleteBtn")?.classList.toggle("hide", ro);
    document.getElementById("batchMoveBtn")?.classList.toggle("hide", ro);
    const note = document.getElementById("readOnlyNote");
    if (note) note.hidden = !ro;
    const pub = document.getElementById("publicWarn");
    if (pub) pub.hidden = Api.space !== "public";
  },

  updateQuota(limits) {
    const bar = document.getElementById("quotaBar");
    const label = document.getElementById("quotaLabel");
    if (!bar || !label || !limits) return;
    const pct = limits.quotaBytes
      ? Math.min(100, Math.round((limits.usedBytes / limits.quotaBytes) * 100))
      : 0;
    bar.style.width = pct + "%";
    bar.classList.toggle("warn", pct >= 80);
    bar.classList.toggle("danger", pct >= 95);
    const counts = `${this.folders.length} folders · ${this.files.length} files`;
    label.textContent = `${this.formatSize(limits.usedBytes)} / ${this.formatSize(limits.quotaBytes)} used · max file ${limits.maxUploadMB} MB · ${counts}`;
    this.refreshStats();
  },

  async refreshStats() {
    const el = document.getElementById("spaceStats");
    if (!el) return;
    try {
      const s = await Api.request("/stats.php");
      el.textContent = `Space total: ${s.files} files, ${s.folders} folders (${s.usedHuman})`;
      el.hidden = false;
    } catch (e) {
      el.hidden = true;
    }
  },

  updateSelectionBar() {
    const bar = document.getElementById("selectionBar");
    const count = document.getElementById("selectionCount");
    if (!bar || !count) return;
    const n = this.selected.size;
    bar.classList.toggle("show", n > 0);
    count.textContent = n ? `${n} selected` : "";
    const base = Api.space === "public" ? "Public files" : "My files";
    document.title = n ? `(${n}) ${base}` : base;
  },

  clearSelection() {
    this.selected.clear();
    this.updateSelectionBar();
    this.renderList();
  },

  selectAllVisible() {
    const { folders, files } = this.visibleItems();
    folders.forEach((f) => this.selected.add(`d:${f.name}`));
    files.forEach((f) => this.selected.add(`f:${f.name}`));
    this.updateSelectionBar();
    this.renderList();
  },

  toggleSelect(key) {
    if (this.selected.has(key)) this.selected.delete(key);
    else this.selected.add(key);
    this.updateSelectionBar();
  },

  renderBreadcrumb(folder) {
    const nav = document.getElementById("folderBreadcrumb");
    if (!nav) return;
    nav.innerHTML = "";
    const root = document.createElement("button");
    root.type = "button";
    root.className = "crumb";
    const counts = `${this.folders?.length || 0}d · ${this.files?.length || 0}f`;
    root.textContent =
      (Api.space === "public" ? "Public" : "My space") +
      (Api.currentFolder ? "" : ` (${counts})`);
    root.addEventListener("click", () => this.openFolder(""));
    nav.appendChild(root);

    if (!folder) return;
    const parts = folder.split("/");
    let acc = "";
    parts.forEach((part, i) => {
      acc = acc ? `${acc}/${part}` : part;
      const sep = document.createElement("span");
      sep.className = "crumb-sep";
      sep.textContent = "/";
      nav.appendChild(sep);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "crumb";
      btn.textContent = part;
      const path = acc;
      btn.addEventListener("click", () => this.openFolder(path));
      if (i === parts.length - 1) btn.disabled = true;
      nav.appendChild(btn);
    });
  },

  openFolder(folder) {
    this.saveScroll();
    Api.currentFolder = folder || "";
    localStorage.setItem(
      "fileAppLastFolder:" + (Api.space || ""),
      Api.currentFolder
    );
    this.clearSelection();
    this.loadFiles().then(() => this.restoreScroll());
  },

  saveScroll() {
    sessionStorage.setItem(
      "fileAppScroll:" + (Api.space || "") + ":" + (Api.currentFolder || ""),
      String(window.scrollY || 0)
    );
  },

  restoreScroll() {
    const key = "fileAppScroll:" + (Api.space || "") + ":" + (Api.currentFolder || "");
    const y = parseInt(sessionStorage.getItem(key) || "0", 10);
    if (y > 0) {
      requestAnimationFrame(() => window.scrollTo(0, y));
    }
  },

  createFolder() {
    ModalModule.show({
      title: "New folder",
      message: "Name your folder (letters, numbers, spaces — no dots).",
      input: true,
      inputValue: "",
      confirmText: "Create",
      onConfirm: async (name) => {
        if (!name) return;
        try {
          await Api.request("/mkdir.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              folder: Api.currentFolder || "",
              name,
            }),
          });
          ToastModule.show("Folder created", "success");
          this.loadFiles();
        } catch (error) {
          if (error.authRequired) AuthGate.prompt();
          ToastModule.show(error.message || "Could not create folder", "error");
        }
      },
    });
  },

  loadFiles: async function () {
    const list = document.getElementById("fileList");
    list.innerHTML = '<div class="loader" role="status" aria-label="Loading"></div>';

    try {
      const q = Api.currentFolder
        ? `?folder=${encodeURIComponent(Api.currentFolder)}`
        : "";
      const data = await Api.request("/list.php" + q);
      this.folders = data.folders || [];
      this.files = data.files || [];
      Api.limits = data.limits || null;
      Api.allowedExtensions = data.allowedExtensions || null;
      Api.readOnly = !!data.readOnly;
      if (data.mobileMasked) Api.mobileMasked = data.mobileMasked;
      this.renderBreadcrumb(Api.currentFolder || "");
      this.updateQuota(Api.limits);
      AuthGate.updateSpaceUi?.();
      RecentModule.render?.();
      ActivityModule.render?.();
      this.applyReadOnlyUi();
      this.refreshTypeChips();

      const accept =
        data.accept || (Api.allowedExtensions || []).map((e) => `.${e}`).join(",");
      const input = document.getElementById("fileInput");
      if (input && accept) input.setAttribute("accept", accept);

      this.renderList();
      this.restoreScroll();
    } catch (error) {
      list.innerHTML = "";
      const err = document.createElement("li");
      err.className = "empty-state";
      err.textContent = error.authRequired
        ? "Enter your personal space to see files."
        : error.message || "Failed to load files";
      list.appendChild(err);
      if (error.authRequired) AuthGate.prompt();
      else ToastModule.show(error.message || "Failed to load files", "error");
    }
  },

  refreshTypeChips() {
    const host = document.getElementById("dynamicExtChips");
    if (!host) return;
    const counts = {};
    (this.files || []).forEach((f) => {
      const ext = (f.ext || "").toLowerCase();
      if (!ext) return;
      counts[ext] = (counts[ext] || 0) + 1;
    });
    const top = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    host.innerHTML = "";
    top.forEach(([ext, n]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip" + (this.filterType === "ext:" + ext ? " active" : "");
      btn.textContent = `.${ext} (${n})`;
      btn.addEventListener("click", () => {
        this.filterType = "ext:" + ext;
        document
          .querySelectorAll("[data-type-filter]")
          .forEach((b) => b.classList.remove("active"));
        host.querySelectorAll(".chip").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.renderList();
      });
      host.appendChild(btn);
    });
  },

  matchesType(file) {
    const t = this.filterType;
    if (t === "all") return true;
    if (t === "fav") return this.isFavorite(file.name, false);
    if (t.startsWith("ext:")) {
      return (file.ext || "").toLowerCase() === t.slice(4);
    }
    const mime = file.mime || "";
    const ext = (file.ext || "").toLowerCase();
    if (t === "image") return mime.startsWith("image/");
    if (t === "video") return mime.startsWith("video/");
    if (t === "audio") return mime.startsWith("audio/");
    if (t === "doc")
      return ["pdf", "txt", "csv", "json", "md", "doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext);
    return true;
  },

  visibleItems() {
    const q = this.query;
    let folders = this.folders.filter((f) => {
      if (this.filterType === "fav") return this.isFavorite(f.name, true);
      if (this.filterType !== "all" && this.filterType !== "fav") return false;
      return !q || f.name.toLowerCase().includes(q);
    });
    let files = this.files.filter((f) => {
      if (!this.matchesType(f)) return false;
      return !q || f.name.toLowerCase().includes(q);
    });

    const sortKey = this.sortKey;
    const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    const bySize = (a, b) => (a.size || 0) - (b.size || 0);
    const byDate = (a, b) => (a.mtime || 0) - (b.mtime || 0);

    if (sortKey === "name") {
      folders = [...folders].sort(byName);
      files = [...files].sort(byName);
    } else if (sortKey === "name-desc") {
      folders = [...folders].sort((a, b) => byName(b, a));
      files = [...files].sort((a, b) => byName(b, a));
    } else if (sortKey === "size") {
      folders = [...folders].sort(byName);
      files = [...files].sort((a, b) => bySize(b, a));
    } else if (sortKey === "oldest") {
      folders = [...folders].sort(byDate);
      files = [...files].sort(byDate);
    } else {
      folders = [...folders].sort((a, b) => byDate(b, a));
      files = [...files].sort((a, b) => byDate(b, a));
    }

    return { folders, files };
  },

  favoriteSelected() {
    const items = this.selectedItems();
    if (!items.length) {
      ToastModule.show("Select items first", "error");
      return;
    }
    items.forEach((item) => {
      const id = this.favId(item.name, item.isFolder);
      let favs = this.getFavorites();
      if (!favs.includes(id)) favs.push(id);
      localStorage.setItem(this.favoritesKey, JSON.stringify(favs));
    });
    ToastModule.show(`Favorited ${items.length}`, "success");
    this.renderList();
  },

  async copySelectedLinks() {
    const names = this.selectedItems().filter((i) => !i.isFolder).map((i) => i.name);
    if (!names.length) {
      ToastModule.show("Select files (not folders)", "error");
      return;
    }
    const urls = names
      .map((name) => (this.files || []).find((f) => f.name === name))
      .filter(Boolean)
      .map((f) => Api.absoluteUrl(f.downloadUrl || f.viewUrl));
    if (!urls.length) {
      ToastModule.show("No links available", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(urls.join("\n"));
      ToastModule.show(`Copied ${urls.length} link(s)`, "success");
    } catch (e) {
      prompt("Links:", urls.join("\n"));
    }
  },

  renderList() {
    const list = document.getElementById("fileList");
    if (!list) return;
    list.innerHTML = "";
    const { folders, files } = this.visibleItems();

    if (!folders.length && !files.length) {
      const empty = document.createElement("li");
      empty.className = "empty-state";
      if (this.query || this.filterType !== "all") {
        empty.textContent = "No matches.";
      } else {
        empty.innerHTML = "";
        const p = document.createElement("p");
        p.textContent = "This folder is empty.";
        empty.appendChild(p);
        if (!Api.readOnly) {
          const actions = document.createElement("div");
          actions.className = "empty-actions";
          const up = document.createElement("button");
          up.type = "button";
          up.className = "btn upload";
          up.textContent = "Upload";
          up.addEventListener("click", () => openUpload());
          const folder = document.createElement("button");
          folder.type = "button";
          folder.className = "btn";
          folder.textContent = "New folder";
          folder.addEventListener("click", () => this.createFolder());
          const note = document.createElement("button");
          note.type = "button";
          note.className = "btn ghost";
          note.textContent = "New note";
          note.addEventListener("click", () => this.createNote());
          actions.append(up, folder, note);
          empty.appendChild(actions);
        }
      }
      list.appendChild(empty);
      this.updateSelectionBar();
      return;
    }

    folders.forEach((folder, index) => {
      list.appendChild(this.renderFolderRow(folder, index));
    });
    files.forEach((file, index) => {
      list.appendChild(this.renderFileRow(file, index));
    });
    this.updateSelectionBar();
  },

  renderFolderRow(folder, index) {
    const li = document.createElement("li");
    li.className = "file-row folder-row";
    if (this.selected.has(`d:${folder.name}`)) li.classList.add("selected");

    const main = document.createElement("div");
    main.className = "file-item-header";

    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "row-check";
    check.checked = this.selected.has(`d:${folder.name}`);
    check.addEventListener("click", (e) => e.stopPropagation());
    check.addEventListener("change", () => {
      this.toggleSelect(`d:${folder.name}`);
      li.classList.toggle("selected", this.selected.has(`d:${folder.name}`));
      this.updateSelectionBar();
    });

    const left = document.createElement("button");
    left.type = "button";
    left.className = "file-main folder-open";
    left.addEventListener("click", () => this.openFolder(folder.path));

    const thumb = document.createElement("div");
    thumb.className = "file-thumb";
    const badge = document.createElement("span");
    badge.className = "file-type-badge";
    badge.textContent = "DIR";
    thumb.appendChild(badge);

    const meta = document.createElement("div");
    meta.className = "file-meta";
    const title = document.createElement("strong");
    title.className = "file-name";
    title.textContent = folder.name;
    const sub = document.createElement("div");
    sub.className = "file-sub";
    sub.textContent = "Folder";
    meta.append(title, sub);
    left.append(thumb, meta);

    const star = document.createElement("button");
    star.type = "button";
    star.className = "star-btn" + (this.isFavorite(folder.name, true) ? " on" : "");
    star.textContent = this.isFavorite(folder.name, true) ? "★" : "☆";
    star.title = "Favorite";
    star.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleFavorite(folder.name, true);
    });

    const menuId = `folder-menu-${index}`;
    const menuContainer = this.buildMenu(menuId, [
      { label: "Details", className: "view", onClick: () => this.showDetails(folder, true) },
      { label: "Rename", className: "rename", onClick: () => this.renameItem(folder.name, true) },
      { label: "Move…", className: "move", onClick: () => this.moveItem(folder.name, true) },
      { label: "Delete", className: "delete", onClick: () => this.deleteItem(folder.name, true) },
    ]);

    main.append(check, left, star, menuContainer);
    li.appendChild(main);
    return li;
  },

  renderFileRow(file, index) {
    const name = file.name;
    const li = document.createElement("li");
    li.className = "file-row";
    if (this.selected.has(`f:${name}`)) li.classList.add("selected");

    const main = document.createElement("div");
    main.className = "file-item-header";

    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "row-check";
    check.checked = this.selected.has(`f:${name}`);
    check.addEventListener("click", (e) => e.stopPropagation());
    check.addEventListener("change", () => {
      this.toggleSelect(`f:${name}`);
      li.classList.toggle("selected", this.selected.has(`f:${name}`));
      this.updateSelectionBar();
    });

    const left = document.createElement("button");
    left.type = "button";
    left.className = "file-main folder-open";
    left.addEventListener("click", () => PreviewModule.open(file));

    const thumbWrap = document.createElement("div");
    thumbWrap.className = "file-thumb";
    if (file.thumbUrl) {
      const img = document.createElement("img");
      img.alt = "";
      img.loading = "lazy";
      img.src = Api.absoluteUrl(file.thumbUrl);
      thumbWrap.appendChild(img);
    } else {
      const badge = document.createElement("span");
      badge.className = "file-type-badge";
      badge.textContent = this.typeIcon(file.ext, file.mime);
      thumbWrap.appendChild(badge);
    }

    const meta = document.createElement("div");
    meta.className = "file-meta";
    const title = document.createElement("strong");
    title.className = "file-name";
    title.textContent = name;
    const sub = document.createElement("div");
    sub.className = "file-sub";
    sub.textContent = `${this.formatSize(file.size || 0)} · ${this.formatDate(file.mtime || 0)}`;
    meta.append(title, sub);
    left.append(thumbWrap, meta);

    const star = document.createElement("button");
    star.type = "button";
    star.className = "star-btn" + (this.isFavorite(name, false) ? " on" : "");
    star.textContent = this.isFavorite(name, false) ? "★" : "☆";
    star.title = "Favorite";
    star.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleFavorite(name, false);
    });

    const menuId = `menu-${index}`;
    const menuContainer = this.buildMenu(menuId, [
      { label: "Preview", className: "view", onClick: () => PreviewModule.open(file) },
      { label: "Details", className: "view", onClick: () => this.showDetails(file, false) },
      { label: "Copy link", className: "copy", onClick: () => this.copyLink(file) },
      {
        label: "Copy path",
        className: "copy",
        onClick: () => this.copyPath(file.name),
      },
      { label: "Duplicate", className: "copy", onClick: () => this.duplicateFile(name) },
      { label: "Move…", className: "move", onClick: () => this.moveItem(name, false) },
      { label: "Rename", className: "rename", onClick: () => this.renameItem(name, false) },
      { label: "Trash", className: "delete", onClick: () => this.deleteItem(name, false) },
      {
        label: "Delete forever",
        className: "delete",
        onClick: () => this.hardDeleteFile(name),
      },
    ]);

    main.append(check, left, star, menuContainer);

    const actions = document.createElement("div");
    actions.className = "file-actions";

    const view = document.createElement("button");
    view.type = "button";
    view.className = "btn view";
    view.textContent = "View";
    view.addEventListener("click", () => PreviewModule.open(file));

    const download = document.createElement("a");
    download.className = "btn download";
    download.textContent = "Download";
    download.href = Api.absoluteUrl(file.downloadUrl || file.viewUrl);

    actions.append(view, download);
    li.append(main, actions);
    return li;
  },

  buildMenu(menuId, items) {
    const menuContainer = document.createElement("div");
    menuContainer.className = "menu-container";
    const menuBtn = document.createElement("button");
    menuBtn.className = "three-dot-btn";
    menuBtn.type = "button";
    menuBtn.setAttribute("aria-label", "Actions");
    menuBtn.textContent = "⋯";
    menuBtn.addEventListener("click", (event) => this.toggleMenu(menuId, event));

    const menu = document.createElement("div");
    menu.className = "dropdown-menu";
    menu.id = menuId;
    items.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `dropdown-item ${item.className || ""}`;
      btn.textContent = item.label;
      btn.addEventListener("click", item.onClick);
      menu.appendChild(btn);
    });
    menuContainer.append(menuBtn, menu);
    return menuContainer;
  },

  toggleMenu(menuId, event) {
    event.stopPropagation();
    document.querySelectorAll(".dropdown-menu").forEach((menu) => {
      if (menu.id !== menuId) menu.classList.remove("show");
    });
    document.getElementById(menuId)?.classList.toggle("show");
  },

  async copyPath(name) {
    const path = [Api.currentFolder, name].filter(Boolean).join("/");
    try {
      await navigator.clipboard.writeText(path);
      ToastModule.show("Path copied", "success");
    } catch (e) {
      prompt("Path:", path);
    }
  },

  async copyLink(file) {
    const url = Api.absoluteUrl(file.downloadUrl || file.viewUrl);
    if (navigator.share) {
      try {
        await navigator.share({ title: file.name, url });
        ActivityModule.log?.("Shared", file.name);
        return;
      } catch (e) {
        if (e && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      ToastModule.show("Link copied", "success");
      ActivityModule.log?.("Copied link", file.name);
    } catch (e) {
      prompt("Copy this link:", url);
    }
  },

  async duplicateFile(name) {
    try {
      const res = await Api.request("/copy.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          fromFolder: Api.currentFolder || "",
          toFolder: Api.currentFolder || "",
          autoRename: true,
        }),
      });
      ToastModule.show(`Duplicated as ${res.name}`, "success");
      this.loadFiles();
    } catch (error) {
      if (error.authRequired) AuthGate.prompt();
      ToastModule.show(error.message || "Duplicate failed", "error");
    }
  },

  async pickFolder(title) {
    let folders = [];
    try {
      const data = await Api.request("/folders.php");
      folders = data.folders || [];
    } catch (e) {
      ToastModule.show(e.message || "Could not load folders", "error");
      return null;
    }
    return new Promise((resolve) => {
      const options = folders
        .map((f) => {
          const label = f.path === "" ? "(root)" : f.path;
          const pad = "  ".repeat(f.depth || 0);
          return `<option value="${f.path}">${pad}${label}</option>`;
        })
        .join("");
      ModalModule.show({
        title: title || "Move to folder",
        message: "Choose destination",
        input: false,
        html: `<select id="moveFolderSelect" class="modal-select">${options}</select>`,
        confirmText: "Move here",
        onConfirm: () => {
          const sel = document.getElementById("moveFolderSelect");
          resolve(sel ? sel.value : "");
        },
        onCancel: () => resolve(null),
      });
      // ModalModule may not support html — fallback prompt
      setTimeout(() => {
        if (!document.getElementById("moveFolderSelect")) {
          const paths = folders.map((f) => (f.path === "" ? "(root)" : f.path)).join("\n");
          const picked = prompt(`Enter destination folder path:\n${paths}`, Api.currentFolder || "");
          if (picked === null) resolve(null);
          else resolve(picked === "(root)" ? "" : picked);
        }
      }, 50);
    });
  },

  async moveItem(name, isFolder) {
    const toFolder = await this.pickDestination(name);
    if (toFolder === null) return;
    try {
      await Api.request("/move.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          fromFolder: Api.currentFolder || "",
          toFolder,
          isFolder: !!isFolder,
        }),
      });
      ToastModule.show("Moved", "success");
      this.loadFiles();
    } catch (error) {
      if (error.authRequired) AuthGate.prompt();
      ToastModule.show(error.message || "Move failed", "error");
    }
  },

  async pickDestination(excludeName) {
    let folders = [];
    try {
      const data = await Api.request("/folders.php");
      folders = (data.folders || []).filter((f) => {
        if (!excludeName) return true;
        const cur = Api.currentFolder || "";
        const self = cur === "" ? excludeName : `${cur}/${excludeName}`;
        return f.path !== self && !String(f.path).startsWith(self + "/");
      });
    } catch (e) {
      ToastModule.show(e.message || "Could not load folders", "error");
      return null;
    }

    const options = folders
      .map((f) => {
        const label = f.path === "" ? "(root)" : f.path;
        const pad = "&nbsp;".repeat((f.depth || 0) * 2);
        const selected = f.path === (Api.currentFolder || "") ? "" : "";
        return `<option value="${String(f.path).replace(/"/g, "&quot;")}">${pad}${label}</option>`;
      })
      .join("");

    return new Promise((resolve) => {
      ModalModule.show({
        title: "Move to…",
        message: "Choose a destination folder",
        html: `<select id="moveFolderSelect" class="modal-select">${options}</select>`,
        confirmText: "Move",
        onConfirm: () => {
          const sel = document.getElementById("moveFolderSelect");
          resolve(sel ? sel.value : "");
        },
        onCancel: () => resolve(null),
      });
    });
  },

  hardDeleteFile(name) {
    ModalModule.show({
      title: "Delete forever",
      message: `Permanently delete "${name}"? This skips trash.`,
      confirmText: "Delete forever",
      danger: true,
      onConfirm: async () => {
        try {
          await Api.request("/delete.php", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: name,
              folder: Api.currentFolder || "",
              isFolder: false,
            }),
          });
          ToastModule.show("Deleted forever", "success");
          ActivityModule.log?.("Hard deleted", name);
          this.loadFiles();
        } catch (error) {
          if (error.authRequired) AuthGate.prompt();
          ToastModule.show(error.message || "Delete failed", "error");
        }
      },
    });
  },

  deleteItem(name, isFolder) {
    ModalModule.show({
      title: isFolder ? "Delete folder" : "Delete file",
      message: isFolder
        ? `Delete folder "${name}"? If it has files, confirm again to delete everything inside.`
        : `Move "${name}" to trash?`,
      confirmText: isFolder ? "Delete" : "Trash",
      danger: true,
      onConfirm: async () => {
        try {
          if (!isFolder && window.TrashModule) {
            await TrashModule.softDelete(name);
            ToastModule.show("Moved to trash", "success");
            ActivityModule.log?.("Trashed", name);
            this.loadFiles();
            return;
          }
          await Api.request("/delete.php", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: name,
              folder: Api.currentFolder || "",
              isFolder: !!isFolder,
            }),
          });
          ToastModule.show(isFolder ? "Folder deleted" : "File deleted", "success");
          ActivityModule.log?.("Deleted", name);
          this.loadFiles();
        } catch (error) {
          if (error.authRequired) AuthGate.prompt();
          if (isFolder && error.code === 409) {
            ModalModule.show({
              title: "Folder not empty",
              message: `Delete "${name}" and everything inside? This cannot be undone.`,
              confirmText: "Delete all",
              danger: true,
              onConfirm: async () => {
                try {
                  await Api.request("/delete.php", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      fileName: name,
                      folder: Api.currentFolder || "",
                      isFolder: true,
                      recursive: true,
                    }),
                  });
                  ToastModule.show("Folder deleted", "success");
                  ActivityModule.log?.("Deleted folder tree", name);
                  this.loadFiles();
                } catch (e2) {
                  ToastModule.show(e2.message || "Delete failed", "error");
                }
              },
            });
            return;
          }
          ToastModule.show(error.message || "Delete failed", "error");
        }
      },
    });
  },

  renameItem(oldName, isFolder) {
    ModalModule.show({
      title: isFolder ? "Rename folder" : "Rename file",
      input: true,
      inputValue: oldName,
      confirmText: "Save",
      onConfirm: async (newName) => {
        if (!newName || newName === oldName) return;
        try {
          await Api.request("/rename.php", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              oldName,
              newName,
              folder: Api.currentFolder || "",
              isFolder: !!isFolder,
            }),
          });
          ToastModule.show("Renamed", "success");
          this.loadFiles();
        } catch (error) {
          if (error.authRequired) AuthGate.prompt();
          ToastModule.show(error.message || "Rename failed", "error");
        }
      },
    });
  },

  selectedItems() {
    const items = [];
    this.selected.forEach((key) => {
      const isFolder = key.startsWith("d:");
      const name = key.slice(2);
      items.push({ name, isFolder });
    });
    return items;
  },

  batchDelete() {
    const items = this.selectedItems();
    if (!items.length) return;
    ModalModule.show({
      title: "Delete selected",
      message: `Delete ${items.length} item(s)? Empty folders only.`,
      confirmText: "Delete",
      danger: true,
      onConfirm: async () => {
        try {
          const res = await Api.request("/batch-delete.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              folder: Api.currentFolder || "",
              items,
            }),
          });
          const failed = (res.failed || []).length;
          ToastModule.show(
            failed ? `Deleted ${res.deleted.length}, ${failed} failed` : `Deleted ${res.deleted.length}`,
            failed ? "error" : "success"
          );
          this.clearSelection();
          this.loadFiles();
        } catch (error) {
          if (error.authRequired) AuthGate.prompt();
          ToastModule.show(error.message || "Batch delete failed", "error");
        }
      },
    });
  },

  async batchMove() {
    const items = this.selectedItems();
    if (!items.length) return;
    const toFolder = await this.pickDestination();
    if (toFolder === null) return;
    let ok = 0;
    let fail = 0;
    for (const item of items) {
      try {
        await Api.request("/move.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: item.name,
            fromFolder: Api.currentFolder || "",
            toFolder,
            isFolder: item.isFolder,
          }),
        });
        ok++;
      } catch (e) {
        fail++;
      }
    }
    ToastModule.show(`Moved ${ok}${fail ? `, ${fail} failed` : ""}`, fail ? "error" : "success");
    this.clearSelection();
    this.loadFiles();
  },

  async batchZip() {
    const files = this.selectedItems().filter((i) => !i.isFolder).map((i) => i.name);
    if (!files.length) {
      ToastModule.show("Select files (not folders) to zip", "error");
      return;
    }
    try {
      const res = await fetch(API_BASE + Api.withSpace("/zip.php"), {
        method: "POST",
        headers: Api.authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          folder: Api.currentFolder || "",
          names: files,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Zip failed");
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `files-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      ToastModule.show("Zip downloaded", "success");
    } catch (error) {
      if (error.authRequired) AuthGate.prompt();
      ToastModule.show(error.message || "Zip failed", "error");
    }
  },
};
