window.FilesModule = {
  init() {
    document.addEventListener("click", () => {
      document
        .querySelectorAll(".dropdown-menu.show")
        .forEach((menu) => menu.classList.remove("show"));
    });
  },

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  },

  formatDate(ts) {
    try {
      return new Date(ts * 1000).toLocaleString();
    } catch (e) {
      return "";
    }
  },

  typeIcon(ext, mime) {
    if ((mime || "").startsWith("image/")) return "IMG";
    if ((mime || "").startsWith("video/")) return "VID";
    if ((mime || "").startsWith("audio/")) return "AUD";
    if (ext === "pdf") return "PDF";
    if (["zip"].includes(ext)) return "ZIP";
    return "FILE";
  },

  updateQuota(limits) {
    const bar = document.getElementById("quotaBar");
    const label = document.getElementById("quotaLabel");
    if (!bar || !label || !limits) return;
    const pct = limits.quotaBytes
      ? Math.min(100, Math.round((limits.usedBytes / limits.quotaBytes) * 100))
      : 0;
    bar.style.width = pct + "%";
    label.textContent = `${this.formatSize(limits.usedBytes)} / ${this.formatSize(limits.quotaBytes)} used · max file ${limits.maxUploadMB} MB`;
  },

  renderBreadcrumb(folder) {
    const nav = document.getElementById("folderBreadcrumb");
    if (!nav) return;
    nav.innerHTML = "";
    const root = document.createElement("button");
    root.type = "button";
    root.className = "crumb";
    root.textContent = "My space";
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
    Api.currentFolder = folder || "";
    this.loadFiles();
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
    this.renderBreadcrumb(Api.currentFolder || "");

    try {
      const q = Api.currentFolder
        ? `?folder=${encodeURIComponent(Api.currentFolder)}`
        : "";
      const data = await Api.request("/list.php" + q);
      const folders = data.folders || [];
      const files = data.files || [];
      Api.limits = data.limits || null;
      Api.allowedExtensions = data.allowedExtensions || null;
      Api.mobileMasked = data.mobileMasked || Api.mobileMasked;
      this.updateQuota(Api.limits);

      const accountLabel = document.getElementById("accountLabel");
      if (accountLabel) accountLabel.textContent = Api.mobileMasked || "Account";

      const accept =
        data.accept || (Api.allowedExtensions || []).map((e) => `.${e}`).join(",");
      const input = document.getElementById("fileInput");
      if (input && accept) input.setAttribute("accept", accept);

      list.innerHTML = "";

      if (!folders.length && !files.length) {
        const empty = document.createElement("li");
        empty.className = "empty-state";
        empty.textContent = "Empty. Create a folder or upload a file.";
        list.appendChild(empty);
        return;
      }

      folders.forEach((folder, index) => {
        list.appendChild(this.renderFolderRow(folder, index));
      });
      files.forEach((file, index) => {
        list.appendChild(this.renderFileRow(file, index));
      });
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

  renderFolderRow(folder, index) {
    const li = document.createElement("li");
    li.className = "file-row folder-row";
    const main = document.createElement("div");
    main.className = "file-item-header";

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

    const menuId = `folder-menu-${index}`;
    const menuContainer = this.buildMenu(menuId, [
      {
        label: "Rename",
        className: "rename",
        onClick: () => this.renameItem(folder.name, true),
      },
      {
        label: "Delete",
        className: "delete",
        onClick: () => this.deleteItem(folder.name, true),
      },
    ]);

    main.append(left, menuContainer);
    li.appendChild(main);
    return li;
  },

  renderFileRow(file, index) {
    const name = file.name;
    const li = document.createElement("li");
    li.className = "file-row";

    const main = document.createElement("div");
    main.className = "file-item-header";

    const left = document.createElement("div");
    left.className = "file-main";

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

    const menuId = `menu-${index}`;
    const menuContainer = this.buildMenu(menuId, [
      {
        label: "Rename",
        className: "rename",
        onClick: () => this.renameItem(name, false),
      },
      {
        label: "Delete",
        className: "delete",
        onClick: () => this.deleteItem(name, false),
      },
    ]);

    main.append(left, menuContainer);

    const actions = document.createElement("div");
    actions.className = "file-actions";

    const view = document.createElement("a");
    view.className = "btn view";
    view.target = "_blank";
    view.rel = "noopener noreferrer";
    view.textContent = "View";
    view.href = Api.absoluteUrl(file.viewUrl || file.downloadUrl);

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

  deleteItem(name, isFolder) {
    ModalModule.show({
      title: isFolder ? "Delete folder" : "Delete file",
      message: isFolder
        ? `Delete empty folder "${name}"?`
        : `Delete ${name}?`,
      confirmText: "Delete",
      danger: true,
      onConfirm: async () => {
        try {
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
          this.loadFiles();
        } catch (error) {
          if (error.authRequired) AuthGate.prompt();
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
};
