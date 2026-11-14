window.FilesModule = {
  init() {
    document.addEventListener("click", () => {
      document
        .querySelectorAll(".dropdown-menu.show")
        .forEach((menu) => menu.classList.remove("show"));
    });
    this.loadFiles();
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
    if (["doc", "docx"].includes(ext)) return "DOC";
    if (["xls", "xlsx"].includes(ext)) return "XLS";
    if (["ppt", "pptx"].includes(ext)) return "PPT";
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

  loadFiles: async function () {
    const list = document.getElementById("fileList");
    list.innerHTML = '<div class="loader" role="status" aria-label="Loading"></div>';

    try {
      const data = await Api.request("/list.php");
      const files = Array.isArray(data) ? data : data.files || [];
      Api.limits = data.limits || null;
      Api.allowedExtensions = data.allowedExtensions || null;
      this.updateQuota(Api.limits);

      const accept = data.accept || (Api.allowedExtensions || []).map((e) => `.${e}`).join(",");
      const input = document.getElementById("fileInput");
      if (input && accept) input.setAttribute("accept", accept);

      list.innerHTML = "";

      if (!files.length) {
        const empty = document.createElement("li");
        empty.className = "empty-state";
        empty.textContent = "No files yet. Tap + to upload.";
        list.appendChild(empty);
        return;
      }

      files.forEach((file, index) => {
        const name = typeof file === "string" ? file : file.name;
        const size = file.size || 0;
        const mtime = file.mtime || 0;
        const ext = file.ext || (name.split(".").pop() || "").toLowerCase();
        const mime = file.mime || "";
        const menuId = `menu-${index}`;

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
          badge.textContent = this.typeIcon(ext, mime);
          thumbWrap.appendChild(badge);
        }

        const meta = document.createElement("div");
        meta.className = "file-meta";
        const title = document.createElement("strong");
        title.className = "file-name";
        title.textContent = name;
        const sub = document.createElement("div");
        sub.className = "file-sub";
        sub.textContent = `${this.formatSize(size)} · ${this.formatDate(mtime)}`;
        meta.append(title, sub);
        left.append(thumbWrap, meta);

        const menuContainer = document.createElement("div");
        menuContainer.className = "menu-container";

        const menuBtn = document.createElement("button");
        menuBtn.className = "three-dot-btn";
        menuBtn.type = "button";
        menuBtn.setAttribute("aria-label", `Actions for ${name}`);
        menuBtn.setAttribute("aria-haspopup", "true");
        menuBtn.textContent = "⋯";
        menuBtn.addEventListener("click", (event) => this.toggleMenu(menuId, event));

        const menu = document.createElement("div");
        menu.className = "dropdown-menu";
        menu.id = menuId;
        menu.setAttribute("role", "menu");

        const renameBtn = document.createElement("button");
        renameBtn.className = "dropdown-item rename";
        renameBtn.type = "button";
        renameBtn.setAttribute("role", "menuitem");
        renameBtn.textContent = "Rename";
        renameBtn.addEventListener("click", () => this.renameFile(name));

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "dropdown-item delete";
        deleteBtn.type = "button";
        deleteBtn.setAttribute("role", "menuitem");
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () => this.deleteFile(name));

        menu.append(renameBtn, deleteBtn);
        menuContainer.append(menuBtn, menu);
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
        list.appendChild(li);
      });
    } catch (error) {
      list.innerHTML = "";
      const err = document.createElement("li");
      err.className = "empty-state";
      err.textContent = error.authRequired
        ? error.setupRequired
          ? "Server has no access key yet. Run php generate-key.php, then unlock here."
          : "Unlock with your access key to see files."
        : error.message || "Failed to load files";
      list.appendChild(err);
      if (error.authRequired) AuthGate.prompt();
      else ToastModule.show(error.message || "Failed to load files", "error");
    }
  },

  toggleMenu(menuId, event) {
    event.stopPropagation();
    document.querySelectorAll(".dropdown-menu").forEach((menu) => {
      if (menu.id !== menuId) menu.classList.remove("show");
    });
    const menu = document.getElementById(menuId);
    if (menu) menu.classList.toggle("show");
  },

  deleteFile(fileName) {
    ModalModule.show({
      title: "Delete File",
      message: `Delete ${fileName}?`,
      confirmText: "Delete",
      danger: true,
      onConfirm: async () => {
        try {
          await Api.request("/delete.php", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileName }),
          });
          ToastModule.show("File deleted", "success");
          this.loadFiles();
        } catch (error) {
          if (error.authRequired) AuthGate.prompt();
          ToastModule.show(error.message || "Delete failed", "error");
        }
      },
    });
  },

  renameFile(oldName) {
    ModalModule.show({
      title: "Rename File",
      input: true,
      inputValue: oldName,
      confirmText: "Save",
      onConfirm: async (newName) => {
        if (!newName || newName === oldName) return;
        try {
          await Api.request("/rename.php", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ oldName, newName }),
          });
          ToastModule.show("File renamed", "success");
          FilesModule.loadFiles();
        } catch (error) {
          if (error.authRequired) AuthGate.prompt();
          ToastModule.show(error.message || "Rename failed", "error");
        }
      },
    });
  },
};
