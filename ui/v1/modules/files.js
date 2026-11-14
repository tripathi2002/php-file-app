window.FilesModule = {
  init() {
    document.addEventListener("click", () => {
      document
        .querySelectorAll(".dropdown-menu.show")
        .forEach((menu) => menu.classList.remove("show"));
    });
    this.loadFiles();
  },

  loadFiles: async function () {
    const list = document.getElementById("fileList");
    list.innerHTML = '<div class="loader"></div>';

    try {
      const files = await Api.request("/list.php");
      list.innerHTML = "";

      if (!Array.isArray(files) || files.length === 0) {
        const empty = document.createElement("li");
        empty.className = "empty-state";
        empty.textContent = "No files yet. Tap + to upload.";
        list.appendChild(empty);
        return;
      }

      files.forEach((file, index) => {
        const li = document.createElement("li");
        const menuId = `menu-${index}`;

        const header = document.createElement("div");
        header.className = "file-item-header";

        const title = document.createElement("strong");
        title.textContent = file;

        const menuContainer = document.createElement("div");
        menuContainer.className = "menu-container";

        const menuBtn = document.createElement("button");
        menuBtn.className = "three-dot-btn";
        menuBtn.type = "button";
        menuBtn.textContent = "...";
        menuBtn.addEventListener("click", (event) => {
          this.toggleMenu(menuId, event);
        });

        const menu = document.createElement("div");
        menu.className = "dropdown-menu";
        menu.id = menuId;

        const renameBtn = document.createElement("button");
        renameBtn.className = "dropdown-item rename";
        renameBtn.type = "button";
        renameBtn.textContent = "Rename";
        renameBtn.addEventListener("click", () => this.renameFile(file));

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "dropdown-item delete";
        deleteBtn.type = "button";
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () => this.deleteFile(file));

        menu.append(renameBtn, deleteBtn);
        menuContainer.append(menuBtn, menu);
        header.append(title, menuContainer);

        const actions = document.createElement("div");
        actions.className = "file-actions";

        const view = document.createElement("a");
        view.className = "btn view";
        view.target = "_blank";
        view.rel = "noopener noreferrer";
        view.textContent = "View";
        view.href = Api.withKey(
          `${API_BASE}/download.php?file=${encodeURIComponent(file)}&view=1`
        );

        const download = document.createElement("a");
        download.className = "btn download";
        download.textContent = "Download";
        download.href = Api.withKey(
          `${API_BASE}/download.php?file=${encodeURIComponent(file)}`
        );

        actions.append(view, download);
        li.append(header, actions);
        list.appendChild(li);
      });
    } catch (error) {
      list.innerHTML = "";
      const err = document.createElement("li");
      err.className = "empty-state";
      err.textContent = error.authRequired
        ? "Unlock with your access key to see files."
        : error.message || "Failed to load files";
      list.appendChild(err);
      if (error.authRequired) {
        AuthGate.prompt();
      } else {
        ToastModule.show(error.message || "Failed to load files", "error");
      }
    }
  },

  toggleMenu: function (menuId, event) {
    event.stopPropagation();
    document.querySelectorAll(".dropdown-menu").forEach((menu) => {
      if (menu.id !== menuId) menu.classList.remove("show");
    });
    const menu = document.getElementById(menuId);
    if (menu) menu.classList.toggle("show");
  },

  deleteFile: async function (fileName) {
    ModalModule.show({
      title: "Delete File",
      message: `Delete ${fileName}?`,
      confirmText: "Delete",
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

  renameFile: function (oldName) {
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
