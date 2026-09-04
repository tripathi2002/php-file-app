window.FilesModule = {
  init() {
    this.loadFiles();
    // document.addEventListener("DOMContentLoaded", () => {
      // initial load
      //   document.addEventListener("click", (e) => {
      //     if (!e.target.matches(".three-dot-btn")) {
      //       const menus = document.querySelectorAll(".dropdown-menu");
      //       menus.forEach((menu) => menu.classList.remove("show"));
      //     }
      //   });
    // });
  },

  // Load uploaded files
  loadFiles: async function () {
    const list = document.getElementById("fileList");
    list.innerHTML = '<div class="loader"></div>';

    const res = await fetch(API_BASE + "/list.php");
    const files = await res.json();

    list.innerHTML = "";

    files.forEach((file, index) => {
      ``;
      const li = document.createElement("li");
      const menuId = `menu-${index}`;
      // handle potential quotes in filenames
      const safeFile = file.replace(/'/g, "\\'").replace(/"/g, "&quot;");
      li.innerHTML = `
        <div class="file-item-header">
          <strong>${file}</strong>
          <div class="menu-container">
            <button class="three-dot-btn" onclick="FilesModule.toggleMenu('${menuId}', event)">...</button>
            <div class="dropdown-menu" id="${menuId}">
              <button class="dropdown-item rename" onclick="FilesModule.renameFile('${safeFile}')">Rename</button>
              <button class="dropdown-item delete" onclick="FilesModule.deleteFile('${safeFile}')">Delete</button>
            </div>
          </div>
        </div>
        <div class="file-actions">
            <a class="btn view" href="${SERVER}/uploads/${file}" target="_blank">View</a>
            <a class="btn download" href="${API_BASE}/download.php?file=${file}">Download</a>
        </div>
        `;
      list.appendChild(li);
    });
  },
  toggleMenu: function (menuId, event) {
    event.stopPropagation(); // prevent document click from closing it immediately
    const menus = document.querySelectorAll(".dropdown-menu");
    menus.forEach((menu) => {
      if (menu.id !== menuId) {
        menu.classList.remove("show");
      }
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
          const res = await fetch(API_BASE + "/delete.php", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ fileName }),
          });

          const data = await res.json();

          if (data.error) {
          } else {
            this.loadFiles(); // refresh list
          }
        } catch (error) {}
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
          const res = await fetch(API_BASE + "/rename.php", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              oldName,
              newName,
            }),
          });

          const data = await res.json();

          if (data.error) {
          } else {
            FilesModule.loadFiles(); // refresh list
          }
        } catch (error) {}
      },
    });
  },
};
