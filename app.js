// Auto-built UI bundle — do not edit by hand. Source: modules/*.js + script.js

/* ===== modules\api.js ===== */
window.Api = {
  limits: null,
  allowedExtensions: null,
  currentFolder: "",
  mobileMasked: "",
  space: localStorage.getItem("fileAppSpace") || "",

  getAccessKey() {
    return (
      localStorage.getItem("fileAppSession") ||
      localStorage.getItem("fileAppAccessKey") ||
      ""
    );
  },

  setAccessKey(key) {
    const value = (key || "").trim();
    if (value) {
      localStorage.setItem("fileAppSession", value);
    } else {
      localStorage.removeItem("fileAppSession");
      localStorage.removeItem("fileAppAccessKey");
    }
  },

  setSpace(space) {
    this.space = space === "public" ? "public" : "personal";
    localStorage.setItem("fileAppSpace", this.space);
    this.currentFolder = "";
  },

  clearSession() {
    this.setAccessKey("");
    this.mobileMasked = "";
    this.currentFolder = "";
  },

  authHeaders(extra = {}) {
    const headers = { ...extra };
    const key = this.getAccessKey();
    if (key) {
      headers.Authorization = `Bearer ${key}`;
      headers["X-Access-Key"] = key;
    }
    if (this.space) {
      headers["X-Space"] = this.space;
    }
    return headers;
  },

  withSpace(path) {
    if (!this.space) return path;
    const join = path.includes("?") ? "&" : "?";
    return `${path}${join}space=${encodeURIComponent(this.space)}`;
  },

  absoluteUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    const base = SERVER.replace(/\/+$/, "");
    const rel = String(path).replace(/^\/+/, "");
    return `${base}/${rel}`;
  },

  async request(path, options = {}) {
    const headers = this.authHeaders(options.headers || {});
    const res = await fetch(API_BASE + this.withSpace(path), {
      ...options,
      headers,
    });

    let data = null;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = { error: text || "Invalid server response" };
    }

    if (res.status === 401 || data?.authRequired) {
      const err = new Error(data?.error || "Unauthorized");
      err.code = res.status;
      err.authRequired = true;
      throw err;
    }

    if (!res.ok) {
      const err = new Error(data?.error || `Request failed (${res.status})`);
      err.code = res.status;
      err.data = data;
      throw err;
    }

    return data;
  },
};


/* ===== modules\toast.js ===== */
window.ToastModule = {
  container: null,

  init() {
    if (this.container) return;
    this.container = document.createElement("div");
    this.container.className = "toast-container";
    this.container.setAttribute("aria-live", "polite");
    document.body.appendChild(this.container);
  },

  show(message, type = "info") {
    this.init();
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    this.container.appendChild(el);
    setTimeout(() => {
      el.style.animation = "fadeOut 0.3s ease forwards";
      setTimeout(() => el.remove(), 300);
    }, 2800);
  },
};


/* ===== modules\modal.js ===== */
window.ModalModule = {
  onCancel: null,
  onConfirm: null,
  previousFocus: null,
  keyHandler: null,
  danger: false,

  init() {
    if (document.getElementById("modal")) return;

    const modal = document.createElement("div");
    modal.id = "modal";
    modal.className = "modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "modalTitle");
    modal.innerHTML = `
        <div class="modal-content">
            <button type="button" class="close-btn" aria-label="Close">&times;</button>
            <h2 id="modalTitle"></h2>
            <p id="modalMessage"></p>
            <label id="modalInputLabel" class="visually-hidden" for="modalInput">Value</label>
            <input type="text" id="modalInput" class="modal-input" style="display:none;">
            <div class="modal-actions">
                <button type="button" id="confirmBtn" class="btn confirm">Confirm</button>
                <button type="button" id="cancelBtn" class="btn cancel">Cancel</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector(".close-btn").addEventListener("click", () => this.hide(true));
    modal.querySelector("#cancelBtn").addEventListener("click", () => this.hide(true));
  },

  show(options = {}) {
    this.init();
    const modal = document.getElementById("modal");
    const {
      title = "",
      message = "",
      input = false,
      inputValue = "",
      html = "",
      confirmText = "Confirm",
      cancelText = "Cancel",
      danger = false,
      onConfirm = null,
      onCancel = null,
    } = options;

    this.onCancel = onCancel;
    this.onConfirm = onConfirm;
    this.danger = danger;
    this.previousFocus = document.activeElement;

    modal.querySelector("#modalTitle").textContent = title;
    const msgEl = modal.querySelector("#modalMessage");
    if (html) {
      msgEl.innerHTML = "";
      if (message) {
        const p = document.createElement("p");
        p.textContent = message;
        msgEl.appendChild(p);
      }
      const wrap = document.createElement("div");
      wrap.innerHTML = html;
      msgEl.appendChild(wrap);
    } else {
      msgEl.textContent = message;
    }

    const inputBox = modal.querySelector("#modalInput");
    const inputLabel = modal.querySelector("#modalInputLabel");
    inputBox.style.display = input ? "block" : "none";
    inputBox.value = inputValue;
    inputLabel.textContent = title || "Value";

    const confirmBtn = modal.querySelector("#confirmBtn");
    const cancelBtn = modal.querySelector("#cancelBtn");
    confirmBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;
    confirmBtn.classList.toggle("danger", !!danger);

    confirmBtn.onclick = () => {
      const value = inputBox.value;
      if (typeof this.onConfirm === "function") this.onConfirm(value);
      this.hide(false);
    };

    this.keyHandler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        this.hide(true);
      } else if (e.key === "Enter" && input && document.activeElement === inputBox) {
        e.preventDefault();
        confirmBtn.click();
      } else if (e.key === "Tab") {
        this.trapFocus(e, modal);
      }
    };
    document.addEventListener("keydown", this.keyHandler);

    document.body.classList.add("modal-open");
    modal.style.display = "flex";

    setTimeout(() => {
      if (input) inputBox.focus();
      else confirmBtn.focus();
    }, 30);
  },

  trapFocus(e, modal) {
    const focusable = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  },

  hide(fromCancel = false) {
    const modal = document.getElementById("modal");
    modal.style.display = "none";
    document.body.classList.remove("modal-open");
    if (this.keyHandler) {
      document.removeEventListener("keydown", this.keyHandler);
      this.keyHandler = null;
    }
    if (fromCancel && typeof this.onCancel === "function") this.onCancel();
    this.onCancel = null;
    this.onConfirm = null;
    if (this.previousFocus && this.previousFocus.focus) {
      this.previousFocus.focus();
    }
  },
};


/* ===== modules\theme.js ===== */
window.ThemeModule = {
  KEY: "fileAppTheme",

  init() {
    const saved = localStorage.getItem(this.KEY) || "system";
    this.apply(saved);
    const btn = document.getElementById("themeBtn");
    if (btn) btn.addEventListener("click", () => this.cycle());
    if (window.matchMedia) {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        if ((localStorage.getItem(this.KEY) || "system") === "system") {
          this.apply("system");
        }
      });
    }
  },

  current() {
    return localStorage.getItem(this.KEY) || "system";
  },

  resolved() {
    const mode = this.current();
    if (mode === "light" || mode === "dark") return mode;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  },

  apply(mode) {
    localStorage.setItem(this.KEY, mode);
    const resolved = mode === "system"
      ? (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light")
      : mode;
    document.documentElement.setAttribute("data-theme", resolved);
    const btn = document.getElementById("themeBtn");
    if (btn) {
      btn.textContent = resolved === "dark" ? "Light" : "Dark";
      btn.setAttribute("aria-label", `Switch to ${resolved === "dark" ? "light" : "dark"} theme`);
    }
  },

  cycle() {
    const order = ["system", "light", "dark"];
    const cur = this.current();
    const next = order[(order.indexOf(cur) + 1) % order.length];
    this.apply(next);
    ToastModule.show(
      next === "system" ? "Theme: system" : `Theme: ${next}`,
      "info"
    );
  },
};


/* ===== modules\density.js ===== */
window.DensityModule = {
  KEY: "fileAppDensity",

  init() {
    this.apply(localStorage.getItem(this.KEY) || "comfortable");
    document.getElementById("densityBtn")?.addEventListener("click", () => this.toggle());
  },

  toggle() {
    const next = this.current() === "compact" ? "comfortable" : "compact";
    this.apply(next);
    ToastModule.show(next === "compact" ? "Compact view" : "Comfortable view", "info");
  },

  current() {
    return localStorage.getItem(this.KEY) || "comfortable";
  },

  apply(mode) {
    localStorage.setItem(this.KEY, mode);
    document.documentElement.setAttribute("data-density", mode);
    const btn = document.getElementById("densityBtn");
    if (btn) btn.textContent = mode === "compact" ? "Comfort" : "Compact";
  },
};


/* ===== modules\conflict.js ===== */
window.ConflictModule = {
  async resolve(fileName) {
    return new Promise((resolve) => {
      ModalModule.show({
        title: "File exists",
        message: `"${fileName}" already exists. What should we do?`,
        confirmText: "Overwrite",
        cancelText: "Keep both",
        danger: true,
        onConfirm: () => resolve("overwrite"),
        onCancel: () => resolve("rename"),
      });
    });
  },

  suggestedName(name) {
    const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
    const base = ext ? name.slice(0, -ext.length) : name;
    return `${base} (copy)${ext}`;
  },
};


/* ===== modules\preview.js ===== */
window.PreviewModule = {
  el: null,
  body: null,
  current: null,
  index: -1,
  slideshowTimer: null,
  slideshowList: null,

  init() {
    if (document.getElementById("previewOverlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "previewOverlay";
    overlay.className = "preview-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "File preview");
    overlay.innerHTML = `
      <div class="preview-sheet" id="previewSheet">
        <header class="preview-header">
          <strong id="previewTitle">Preview</strong>
          <div class="preview-actions">
            <button type="button" id="previewPrev" class="btn ghost" aria-label="Previous">‹</button>
            <button type="button" id="previewNext" class="btn ghost" aria-label="Next">›</button>
            <a id="previewOpen" class="btn view" target="_blank" rel="noopener noreferrer">Open</a>
            <button type="button" id="previewClose" class="btn cancel">Close</button>
          </div>
        </header>
        <div class="preview-body" id="previewBody"></div>
      </div>`;
    document.body.appendChild(overlay);
    this.el = overlay;
    this.body = document.getElementById("previewBody");
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.close();
    });
    document.getElementById("previewClose").addEventListener("click", () => this.close());
    document.getElementById("previewPrev").addEventListener("click", () => this.nav(-1));
    document.getElementById("previewNext").addEventListener("click", () => this.nav(1));
    document.getElementById("previewSheet").addEventListener("click", (e) => e.stopPropagation());
    document.addEventListener("keydown", (e) => {
      if (!this.el?.classList.contains("show")) return;
      if (e.key === "Escape") this.close();
      if (e.key === "ArrowLeft") this.nav(-1);
      if (e.key === "ArrowRight") this.nav(1);
    });

    let touchX = 0;
    this.body.addEventListener(
      "touchstart",
      (e) => {
        touchX = e.touches[0].clientX;
      },
      { passive: true }
    );
    this.body.addEventListener(
      "touchend",
      (e) => {
        const dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 60) this.nav(dx < 0 ? 1 : -1);
      },
      { passive: true }
    );
  },

  fileList() {
    return (FilesModule.files || []).slice();
  },

  open(file) {
    this.init();
    const list = this.fileList();
    this.index = list.findIndex((f) => f.name === file.name);
    this.current = file;
    this.render(file);
  },

  nav(delta) {
    const list = this.fileList();
    if (!list.length) return;
    if (this.index < 0) this.index = 0;
    this.index = (this.index + delta + list.length) % list.length;
    this.current = list[this.index];
    this.render(this.current);
  },

  render(file) {
    const title = document.getElementById("previewTitle");
    const openBtn = document.getElementById("previewOpen");
    const url = Api.absoluteUrl(file.viewUrl || file.downloadUrl);
    const list = this.fileList();
    title.textContent =
      list.length && this.index >= 0
        ? `${file.name || "Preview"} (${this.index + 1}/${list.length})`
        : file.name || "Preview";
    openBtn.href = url;
    this.body.innerHTML = "";

    const mime = file.mime || "";
    const ext = (file.ext || "").toLowerCase();

    if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "ico"].includes(ext)) {
      const img = document.createElement("img");
      img.src = url;
      img.alt = file.name || "";
      img.className = "preview-media";
      this.body.appendChild(img);
    } else if (mime.startsWith("video/") || ["mp4", "webm"].includes(ext)) {
      const video = document.createElement("video");
      video.src = url;
      video.controls = true;
      video.className = "preview-media";
      this.body.appendChild(video);
    } else if (mime.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a"].includes(ext)) {
      const audio = document.createElement("audio");
      audio.src = url;
      audio.controls = true;
      audio.className = "preview-audio";
      this.body.appendChild(audio);
    } else if (ext === "pdf" || mime === "application/pdf") {
      const iframe = document.createElement("iframe");
      iframe.src = url;
      iframe.title = file.name || "PDF";
      iframe.className = "preview-frame";
      this.body.appendChild(iframe);
    } else if (["txt", "md", "csv", "json"].includes(ext) || mime.startsWith("text/")) {
      const wrap = document.createElement("div");
      wrap.className = "preview-editor-wrap";
      const ta = document.createElement("textarea");
      ta.className = "preview-text preview-editor";
      ta.value = "Loading…";
      ta.readOnly = !!Api.readOnly || !["txt", "md", "csv", "json"].includes(ext);
      wrap.appendChild(ta);
      if (!ta.readOnly) {
        const save = document.createElement("button");
        save.type = "button";
        save.className = "btn confirm";
        save.textContent = "Save";
        save.addEventListener("click", async () => {
          try {
            await Api.request("/write.php", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                folder: file.folder || Api.currentFolder || "",
                name: file.name,
                content: ta.value,
                overwrite: true,
              }),
            });
            ToastModule.show("Saved", "success");
            ActivityModule.log?.("Edited", file.name);
            FilesModule.loadFiles?.();
          } catch (err) {
            ToastModule.show(err.message || "Save failed", "error");
          }
        });
        wrap.appendChild(save);
      }
      this.body.appendChild(wrap);
      fetch(url)
        .then((r) => r.text())
        .then((t) => {
          ta.value = t.slice(0, 512000);
        })
        .catch(() => {
          ta.value = "Could not load preview.";
        });
    } else {
      const p = document.createElement("p");
      p.className = "preview-fallback";
      p.textContent = "No inline preview for this type. Use Open or Download.";
      this.body.appendChild(p);
    }

    this.el.classList.add("show");
    document.body.classList.add("modal-open");
    RecentModule.remember?.(file);
    ActivityModule.log?.("Opened", file.name);
  },

  startSlideshow(list) {
    this.stopSlideshow();
    this.slideshowList = list || this.fileList().filter(
      (f) =>
        (f.mime || "").startsWith("image/") ||
        ["jpg", "jpeg", "png", "gif", "webp", "ico"].includes((f.ext || "").toLowerCase())
    );
    if (!this.slideshowList.length) return;
    ToastModule.show("Slideshow · arrows to jump · Esc to stop", "info");
    this.slideshowTimer = setInterval(() => this.nav(1), 3500);
  },

  stopSlideshow() {
    if (this.slideshowTimer) {
      clearInterval(this.slideshowTimer);
      this.slideshowTimer = null;
    }
    this.slideshowList = null;
  },

  close() {
    this.stopSlideshow();
    if (!this.el) return;
    this.el.classList.remove("show");
    if (this.body) this.body.innerHTML = "";
    this.current = null;
    this.index = -1;
    document.body.classList.remove("modal-open");
  },
};


/* ===== modules\activity.js ===== */
window.ActivityModule = {
  KEY: "fileAppActivity",
  MAX: 40,

  log(action, detail = "") {
    const entry = {
      t: Date.now(),
      space: Api.space || "",
      action,
      detail: String(detail || "").slice(0, 120),
    };
    const list = this.all();
    list.unshift(entry);
    localStorage.setItem(this.KEY, JSON.stringify(list.slice(0, this.MAX)));
    this.render();
  },

  all() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || "[]");
    } catch (e) {
      return [];
    }
  },

  clear() {
    localStorage.removeItem(this.KEY);
    this.render();
  },

  render() {
    const el = document.getElementById("activityList");
    if (!el) return;
    const items = this.all().filter((x) => !Api.space || x.space === Api.space).slice(0, 8);
    el.innerHTML = "";
    if (!items.length) {
      el.innerHTML = '<li class="activity-empty">No recent activity on this device</li>';
      return;
    }
    items.forEach((item) => {
      const li = document.createElement("li");
      const when = new Date(item.t).toLocaleString();
      li.textContent = `${item.action}${item.detail ? ": " + item.detail : ""} · ${when}`;
      el.appendChild(li);
    });
  },

  init() {
    document.getElementById("clearActivityBtn")?.addEventListener("click", () => {
      this.clear();
      ToastModule.show("Activity cleared", "info");
    });
    this.render();
  },
};


/* ===== modules\recent.js ===== */
window.RecentModule = {
  KEY: "fileAppRecent",
  MAX: 12,

  remember(file) {
    if (!file?.name) return;
    const entry = {
      name: file.name,
      folder: file.folder || Api.currentFolder || "",
      space: Api.space || "personal",
      mime: file.mime || "",
      ext: file.ext || "",
      viewUrl: file.viewUrl || "",
      downloadUrl: file.downloadUrl || "",
      t: Date.now(),
    };
    let list = this.all().filter(
      (x) => !(x.space === entry.space && x.folder === entry.folder && x.name === entry.name)
    );
    list.unshift(entry);
    localStorage.setItem(this.KEY, JSON.stringify(list.slice(0, this.MAX)));
    this.render();
  },

  all() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || "[]");
    } catch (e) {
      return [];
    }
  },

  render() {
    const el = document.getElementById("recentStrip");
    if (!el) return;
    const items = this.all().filter((x) => x.space === (Api.space || "personal")).slice(0, 8);
    el.innerHTML = "";
    if (!items.length) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    items.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "recent-chip";
      btn.textContent = item.name;
      btn.title = (item.folder ? item.folder + "/" : "") + item.name;
      btn.addEventListener("click", () => {
        if ((item.folder || "") !== (Api.currentFolder || "")) {
          Api.currentFolder = item.folder || "";
          FilesModule.loadFiles().then(() => {
            const match = (FilesModule.files || []).find((f) => f.name === item.name);
            if (match) PreviewModule.open(match);
            else ToastModule.show("File not found here anymore", "error");
          });
        } else {
          const match = (FilesModule.files || []).find((f) => f.name === item.name);
          if (match) PreviewModule.open(match);
          else ToastModule.show("File not found here anymore", "error");
        }
      });
      el.appendChild(btn);
    });
  },

  init() {
    this.render();
  },
};


/* ===== modules\offline.js ===== */
window.OfflineModule = {
  init() {
    const banner = document.getElementById("offlineBanner");
    if (!banner) return;
    const sync = () => {
      const offline = !navigator.onLine;
      banner.hidden = !offline;
      if (offline) ToastModule.show("You are offline", "error");
    };
    window.addEventListener("online", () => {
      banner.hidden = true;
      ToastModule.show("Back online", "success");
      if (Api.space) FilesModule.loadFiles();
    });
    window.addEventListener("offline", sync);
    sync();
  },
};


/* ===== modules\paste-upload.js ===== */
window.PasteUploadModule = {
  init() {
    document.addEventListener("paste", (e) => this.onPaste(e));
    const listCard = document.querySelector(".file-list");
    if (!listCard) return;

    ["dragenter", "dragover", "dragleave", "drop"].forEach((name) => {
      listCard.addEventListener(name, (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
      });
    });
    listCard.addEventListener("dragover", () => listCard.classList.add("drop-target"));
    listCard.addEventListener("dragleave", () => listCard.classList.remove("drop-target"));
    listCard.addEventListener("drop", (e) => {
      listCard.classList.remove("drop-target");
      if (Api.readOnly || !canUseCurrentSpace()) return;
      const files = Array.from(e.dataTransfer.files || []);
      if (!files.length) return;
      openUpload();
      UploadModule.handleFiles(files);
    });
  },

  onPaste(e) {
    if (document.getElementById("loginGate")?.classList.contains("show")) return;
    if (Api.readOnly || !canUseCurrentSpace()) return;
    const items = Array.from(e.clipboardData?.items || []);
    const files = [];
    items.forEach((item, i) => {
      if (item.kind !== "file") return;
      const file = item.getAsFile();
      if (!file) return;
      if (!file.name || file.name === "image.png") {
        const ext = (file.type.split("/")[1] || "png").replace("jpeg", "jpg");
        files.push(new File([file], `paste-${Date.now()}-${i}.${ext}`, { type: file.type }));
      } else {
        files.push(file);
      }
    });
    if (!files.length) return;
    e.preventDefault();
    openUpload();
    UploadModule.handleFiles(files);
    ToastModule.show(`Pasted ${files.length} file(s)`, "info");
  },
};


/* ===== modules\search.js ===== */
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


/* ===== modules\auth-gate.js ===== */
window.AuthGate = {
  el: null,

  init() {
    this.el = document.getElementById("loginGate");
    if (!this.el) return;

    const form = document.getElementById("loginForm");
    const mobileInput = document.getElementById("loginMobile");
    const pinInput = document.getElementById("loginPin");
    const submitBtn = document.getElementById("loginSubmit");
    const errorEl = document.getElementById("loginError");
    const publicBtn = document.getElementById("enterPublicBtn");
    const personalTab = document.getElementById("showPersonalBtn");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.textContent = "";
      submitBtn.disabled = true;
      try {
        await this.enterPersonal(mobileInput.value, pinInput.value);
      } catch (err) {
        errorEl.textContent = err.message || "Could not enter";
      } finally {
        submitBtn.disabled = false;
      }
    });

    if (publicBtn) {
      publicBtn.addEventListener("click", () => this.enterPublic());
    }
    if (personalTab) {
      personalTab.addEventListener("click", () => this.showPersonalForm());
    }
  },

  show() {
    if (!this.el) return;
    this.el.classList.add("show");
    this.el.setAttribute("aria-hidden", "false");
    document.getElementById("appShell")?.classList.add("blurred");
    document.getElementById("fab")?.classList.add("hide");
  },

  hide() {
    if (!this.el) return;
    this.el.classList.remove("show");
    this.el.setAttribute("aria-hidden", "true");
    document.getElementById("appShell")?.classList.remove("blurred");
    const fab = document.getElementById("fab");
    if (fab && !Api.readOnly) fab.classList.remove("hide");
  },

  showPersonalForm() {
    document.getElementById("gateChoices")?.classList.add("hide");
    document.getElementById("personalFormWrap")?.classList.remove("hide");
    document.getElementById("loginMobile")?.focus();
  },

  showChoices() {
    document.getElementById("gateChoices")?.classList.remove("hide");
    document.getElementById("personalFormWrap")?.classList.add("hide");
    document.getElementById("loginError").textContent = "";
  },

  enterPublic() {
    Api.setSpace("public");
    // Keep personal session so the Personal tab can switch back without re-login.
    Api.currentFolder = localStorage.getItem("fileAppLastFolder:public") || "";
    ToastModule.show("Public space — no login needed", "info");
    this.hide();
    this.onReady();
    this.updateSpaceUi();
  },

  async enterPersonal(mobile, pin) {
    Api.setSpace("personal");
    Api.currentFolder = localStorage.getItem("fileAppLastFolder:personal") || "";
    const res = await fetch(API_BASE + "/session.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "enter", mobile, pin }),
    });
    const data = await res.json().catch(() => ({}));

    if (res.status === 404 && data.needsRegister) {
      const create = await fetch(API_BASE + "/session.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register", mobile, pin }),
      });
      const created = await create.json().catch(() => ({}));
      if (!create.ok) {
        throw new Error(created.error || "Could not create personal space");
      }
      Api.setAccessKey(created.token);
      Api.mobileMasked = created.mobileMasked || "";
      ToastModule.show("Personal space created", "success");
      this.hide();
      this.onReady();
      this.updateSpaceUi();
      return;
    }

    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }

    Api.setAccessKey(data.token);
    Api.mobileMasked = data.mobileMasked || "";
    ToastModule.show(data.message || "Welcome", "success");
    this.hide();
    this.onReady();
    this.updateSpaceUi();
  },

  async logout() {
    if (Api.space === "personal") {
      try {
        await Api.request("/session.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "logout" }),
        });
      } catch (e) {
        // still clear local session
      }
    }
    Api.clearSession();
    Api.space = "";
    localStorage.removeItem("fileAppSpace");
    ToastModule.show("Left space", "info");
    this.showChoices();
    this.prompt();
  },

  async check() {
    // Restore last space if any
    if (Api.space === "public") {
      this.hide();
      return true;
    }
    if (Api.space === "personal" && Api.getAccessKey()) {
      try {
        const me = await Api.request("/session.php?action=me");
        if (!me.authenticated) {
          Api.clearSession();
          this.showChoices();
          this.prompt();
          return false;
        }
        Api.mobileMasked = me.mobileMasked || "";
        this.hide();
        return true;
      } catch (e) {
        Api.clearSession();
        this.showChoices();
        this.prompt();
        return false;
      }
    }
    this.showChoices();
    this.prompt();
    return false;
  },

  prompt() {
    this.show();
  },

  async openSettings() {
    let statsLine = "";
    try {
      const s = await Api.request("/stats.php");
      statsLine = `\n\n${s.files} files · ${s.folders} folders · ${s.usedHuman}`;
    } catch (e) {}

    if (Api.space === "public") {
      ModalModule.show({
        title: "Public space",
        message:
          (Api.readOnly
            ? "Read-only public space."
            : "Anyone can see and change files here.") +
          " Switch to a personal space for private files." +
          statsLine,
        confirmText: "Leave public",
        cancelText: "Stay",
        danger: true,
        onConfirm: () => this.logout(),
      });
      return;
    }
    ModalModule.show({
      title: "Personal space",
      message:
        (Api.mobileMasked
          ? `Signed in as ${Api.mobileMasked}`
          : "You are in your private space.") +
        statsLine +
        "\n\nConfirm to logout, or cancel then use Change PIN from the next prompt.",
      confirmText: "Leave / Logout",
      cancelText: "More…",
      danger: true,
      onConfirm: () => this.logout(),
      onCancel: () => {
        ModalModule.show({
          title: "Account",
          message: "Change your PIN?",
          confirmText: "Change PIN",
          cancelText: "Close",
          onConfirm: () => this.changePin(),
        });
      },
    });
  },

  changePin() {
    ModalModule.show({
      title: "Current PIN",
      input: true,
      inputValue: "",
      confirmText: "Next",
      onConfirm: (currentPin) => {
        if (!currentPin) return;
        ModalModule.show({
          title: "New PIN",
          message: "4–6 digits",
          input: true,
          inputValue: "",
          confirmText: "Save",
          onConfirm: async (newPin) => {
            try {
              await Api.request("/change-pin.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPin, newPin }),
              });
              ToastModule.show("PIN updated", "success");
              ActivityModule.log?.("Changed PIN");
            } catch (e) {
              ToastModule.show(e.message || "Could not change PIN", "error");
            }
          },
        });
      },
    });
  },

  updateSpaceUi() {
    const label = document.getElementById("accountLabel");
    const title = document.getElementById("spaceTitle");
    const publicTab = document.getElementById("tabPublic");
    const personalTab = document.getElementById("tabPersonal");
    if (Api.space === "public") {
      if (label) label.textContent = "Public";
      if (title) title.textContent = "Public files";
      publicTab?.classList.add("active");
      personalTab?.classList.remove("active");
    } else {
      if (label) label.textContent = Api.mobileMasked || "Account";
      if (title) title.textContent = "My files";
      personalTab?.classList.add("active");
      publicTab?.classList.remove("active");
    }
  },

  switchToPublic() {
    Api.setSpace("public");
    Api.currentFolder = localStorage.getItem("fileAppLastFolder:public") || "";
    this.hide();
    this.onReady();
    this.updateSpaceUi();
  },

  switchToPersonal() {
    if (Api.getAccessKey()) {
      Api.setSpace("personal");
      Api.currentFolder = localStorage.getItem("fileAppLastFolder:personal") || "";
      this.hide();
      this.onReady();
      this.updateSpaceUi();
      return;
    }
    Api.setSpace("personal");
    this.showPersonalForm();
    this.prompt();
  },

  onReady() {
    FilesModule.loadFiles();
    HealthBanner.check();
    this.updateSpaceUi();
  },
};


/* ===== modules\health-banner.js ===== */
window.HealthBanner = {
  el: null,

  init() {
    this.el = document.getElementById("healthBanner");
    if (!this.el) {
      this.el = document.createElement("div");
      this.el.id = "healthBanner";
      this.el.className = "health-banner";
      this.el.hidden = true;
      document.body.prepend(this.el);
    }
    this.check();
  },

  async check() {
    try {
      const res = await fetch(`${SERVER}/api/${APP_API_VERSION}/health.php`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || data.status !== "ok") {
        this.show(
          "Storage is not writable. Uploads will fail until the server folders are fixed."
        );
      } else {
        this.hide();
      }
    } catch (e) {
      this.show("Cannot reach the API health check.");
    }
  },

  show(message) {
    this.el.textContent = message;
    this.el.hidden = false;
  },

  hide() {
    this.el.hidden = true;
    this.el.textContent = "";
  },
};


/* ===== modules\upload.js ===== */
window.UploadModule = {
  controller: null,
  isCancelled: false,
  isPaused: false,
  isUploading: false,
  currentChunk: 0,
  totalChunks: 0,
  fileRef: null,
  uploadId: null,
  queue: [],
  chunkSize: 5 * 1024 * 1024,
  transferStartedAt: 0,
  bytesSent: 0,

  init() {
    this.syncControls();
  },

  formatSpeed(bytesPerSec) {
    if (!bytesPerSec || bytesPerSec < 1) return "";
    if (bytesPerSec < 1024) return `${Math.round(bytesPerSec)} B/s`;
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`;
  },

  handleFiles(files) {
    const list = Array.from(files || []).filter(Boolean);
    if (!list.length) return;
    this.queue = list.slice(1);
    this.renderQueue();
    this.handleFile(list[0]);
  },

  /** Upload a directory selection (webkitdirectory FileList). */
  async uploadFolderTree(fileList) {
    const files = Array.from(fileList || []).filter((f) => f && f.name !== ".DS_Store");
    if (!files.length) return;

    const base = Api.currentFolder || "";
    const folderSet = new Set();
    files.forEach((f) => {
      const rel = (f.webkitRelativePath || f.name).replace(/\\/g, "/");
      const parts = rel.split("/");
      parts.pop();
      let acc = base;
      parts.forEach((part) => {
        if (!part || part === "." || part.includes(".")) return;
        acc = acc ? `${acc}/${part}` : part;
        folderSet.add(acc);
      });
    });

    const folders = Array.from(folderSet).sort(
      (a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b)
    );

    ToastModule.show(`Preparing ${folders.length} folders…`, "info");
    for (const full of folders) {
      const parts = full.split("/");
      const name = parts.pop();
      const parent = parts.join("/");
      try {
        await Api.request("/mkdir.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder: parent, name }),
        });
      } catch (e) {
        if (e.code !== 409) {
          ToastModule.show(e.message || "Folder create failed", "error");
          return;
        }
      }
    }

    // Queue files with target folder metadata
    this.folderQueueMeta = files.map((f) => {
      const rel = (f.webkitRelativePath || f.name).replace(/\\/g, "/");
      const parts = rel.split("/");
      const name = parts.pop();
      const sub = parts.join("/");
      const folder = [base, sub].filter(Boolean).join("/");
      return { file: f, folder, name };
    });

    openUpload();
    const first = this.folderQueueMeta.shift();
    this.pendingTargetFolder = first.folder;
    this.queue = this.folderQueueMeta.map((x) => {
      // stash target on file object
      x.file.__targetFolder = x.folder;
      return x.file;
    });
    this.renderQueue();
    this.handleFile(first.file);
    // Override current folder only for upload destination
    this._savedFolder = Api.currentFolder;
    Api.currentFolder = first.folder;
    ToastModule.show(`Uploading ${files.length} files from folder`, "info");
  },

  renderQueue() {
    const el = document.getElementById("uploadQueue");
    if (!el) return;
    if (!this.queue.length) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    el.hidden = false;
    el.innerHTML = "";
    this.queue.forEach((f, i) => {
      const li = document.createElement("li");
      li.textContent = `${i + 1}. ${f.name}`;
      el.appendChild(li);
    });
  },

  newUploadId() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  },

  syncControls() {
    const hasFile = !!this.fileRef;
    const uploading = this.isUploading && !this.isPaused;
    const paused = this.isUploading && this.isPaused;

    const startBtn = document.getElementById("startUploadBtn");
    const pauseBtn = document.getElementById("pauseUploadBtn");
    const resumeBtn = document.getElementById("resumeUploadBtn");
    const cancelBtn = document.getElementById("cancelUploadBtn");

    if (startBtn) startBtn.disabled = !hasFile || this.isUploading;
    if (pauseBtn) pauseBtn.disabled = !uploading;
    if (resumeBtn) resumeBtn.disabled = !paused;
    if (cancelBtn) cancelBtn.disabled = !hasFile;
  },

  handleFile(file) {
    if (!file) return;

    if (Api.limits?.maxUploadBytes && file.size > Api.limits.maxUploadBytes) {
      ToastModule.show(
        `File too large. Max ${Api.limits.maxUploadMB || 50} MB.`,
        "error"
      );
      return;
    }

    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (
      Array.isArray(Api.allowedExtensions) &&
      Api.allowedExtensions.length &&
      !Api.allowedExtensions.includes(ext)
    ) {
      ToastModule.show(`File type .${ext} is not allowed.`, "error");
      return;
    }

    this.fileRef = file;
    this.uploadId = this.newUploadId();
    this.currentChunk = 0;
    this.isUploading = false;
    this.isPaused = false;
    this.isCancelled = false;

    const content = document.getElementById("dropContent");
    content.innerHTML = "";
    const selected = document.createElement("p");
    selected.textContent = "Selected:";
    const name = document.createElement("strong");
    name.textContent = file.name;
    const size = document.createElement("p");
    size.style.fontSize = "12px";
    size.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
    const changeBtn = document.createElement("button");
    changeBtn.type = "button";
    changeBtn.className = "btn";
    changeBtn.textContent = "Change File";
    changeBtn.addEventListener("click", () => this.clearSelection());

    content.append(selected, name, size, document.createElement("br"), changeBtn);
    document.getElementById("status").innerText = "Ready to upload";
    this.syncControls();
  },

  clearSelection() {
    if (this.isUploading) {
      this.cancel();
      return;
    }
    this.reset();
  },

  start: async function () {
    const file = this.fileRef;
    const status = document.getElementById("status");
    const progressBar = document.getElementById("progressBar");

    if (!file || this.isUploading) return;

    this.isPaused = false;
    this.isCancelled = false;
    this.isUploading = true;
    this.controller = new AbortController();
    this.totalChunks = Math.ceil(file.size / this.chunkSize) || 1;
    if (!this.uploadId) this.uploadId = this.newUploadId();
    this.transferStartedAt = Date.now();
    this.bytesSent = this.currentChunk * this.chunkSize;
    this.syncControls();

    try {
      const state = await Api.request(
        `/status.php?uploadId=${encodeURIComponent(this.uploadId)}&fileName=${encodeURIComponent(file.name)}&totalChunks=${this.totalChunks}`
      );
      if (state.uploadId) this.uploadId = state.uploadId;
      if (Array.isArray(state.received) && state.received.length) {
        const next = Math.max(...state.received) + 1;
        if (next > this.currentChunk) {
          this.currentChunk = next;
          status.innerText = `Resuming from chunk ${this.currentChunk}…`;
        }
      }
    } catch (e) {
      // continue fresh
    }

    for (let i = this.currentChunk; i < this.totalChunks; i++) {
      if (this.isCancelled) {
        status.innerText = "Upload Cancelled";
        this.isUploading = false;
        this.syncControls();
        return;
      }
      if (this.isPaused) {
        status.innerText = "Upload Paused";
        this.currentChunk = i;
        this.syncControls();
        return;
      }

      const chunk = file.slice(i * this.chunkSize, (i + 1) * this.chunkSize);
      const formData = new FormData();
      formData.append("file", chunk);
      formData.append("chunkIndex", String(i));
      formData.append("totalChunks", String(this.totalChunks));
      formData.append("fileName", file.name);
      formData.append("uploadId", this.uploadId);
      formData.append("fileSize", String(file.size));
      formData.append("folder", Api.currentFolder || "");
      formData.append("space", Api.space || "personal");

      try {
        const data = await this.uploadChunk(formData);
        if (data?.uploadId) this.uploadId = data.uploadId;
      } catch (error) {
        if (error.name === "AbortError") {
          status.innerText = this.isCancelled ? "Upload Cancelled" : "Upload Paused";
          this.currentChunk = i;
          if (this.isCancelled) {
            this.isUploading = false;
          }
        } else if (error.authRequired) {
          status.innerText = "Unlock required — set your access key";
          AuthGate.prompt();
          this.isUploading = false;
        } else if (error.code === 413) {
          const maxMB = error.data?.maxMB || Api.limits?.maxUploadMB || 50;
          status.innerText = `File too large (max ${maxMB} MB)`;
          ToastModule.show(status.innerText, "error");
          this.isUploading = false;
        } else {
          status.innerText = "Upload Failed: " + error.message;
          ToastModule.show(error.message, "error");
          this.isUploading = false;
        }
        this.syncControls();
        return;
      }

      const percent = Math.floor(((i + 1) / this.totalChunks) * 100);
      progressBar.style.width = percent + "%";
      this.bytesSent = Math.min(file.size, (i + 1) * this.chunkSize);
      const elapsed = Math.max(0.001, (Date.now() - this.transferStartedAt) / 1000);
      const speed = this.formatSpeed(this.bytesSent / elapsed);
      const left = file.size - this.bytesSent;
      const eta =
        this.bytesSent > 0 ? Math.max(0, Math.round(left / (this.bytesSent / elapsed))) : 0;
      const etaLabel = eta > 60 ? `${Math.round(eta / 60)}m` : `${eta}s`;
      status.innerText = speed
        ? `Uploading ${percent}% · ${speed} · ETA ${etaLabel}`
        : `Uploading ${percent}%`;
      this.currentChunk = i + 1;
    }

    try {
      await Api.request("/merge.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          totalChunks: this.totalChunks,
          uploadId: this.uploadId,
          folder: Api.currentFolder || "",
          space: Api.space || "personal",
        }),
      });
    } catch (error) {
      if (error.code === 409) {
        const choice = ConflictModule
          ? await ConflictModule.resolve(file.name)
          : (confirm(`"${file.name}" already exists. Overwrite?`) ? "overwrite" : "cancel");
        if (choice === "overwrite") {
          try {
            await Api.request("/merge.php", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: file.name,
                totalChunks: this.totalChunks,
                uploadId: this.uploadId,
                folder: Api.currentFolder || "",
                space: Api.space || "personal",
                overwrite: true,
              }),
            });
          } catch (e2) {
            status.innerText = "Merge Failed: " + e2.message;
            ToastModule.show(e2.message, "error");
            this.isUploading = false;
            this.syncControls();
            return;
          }
        } else if (choice === "rename") {
          try {
            const newName = ConflictModule.suggestedName(file.name);
            await Api.request("/merge.php", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: file.name,
                saveAs: newName,
                totalChunks: this.totalChunks,
                uploadId: this.uploadId,
                folder: Api.currentFolder || "",
                space: Api.space || "personal",
                overwrite: false,
              }),
            });
            ToastModule.show(`Saved as ${newName}`, "success");
          } catch (e2) {
            status.innerText = "Merge Failed: " + e2.message;
            ToastModule.show(e2.message, "error");
            this.isUploading = false;
            this.syncControls();
            return;
          }
        } else {
          status.innerText = "Upload cancelled (file exists)";
          this.isUploading = false;
          this.syncControls();
          return;
        }
      } else {
        status.innerText = "Merge Failed: " + error.message;
        ToastModule.show(error.message, "error");
        this.isUploading = false;
        this.syncControls();
        return;
      }
    }

    status.innerText = "Upload Complete";
    ToastModule.show("Upload complete", "success");
    ActivityModule.log?.("Uploaded", file.name);
    this.isUploading = false;
    FilesModule && FilesModule.loadFiles();
    if (this.queue.length) {
      const next = this.queue.shift();
      this.renderQueue();
      this.reset(false);
      if (next.__targetFolder !== undefined) {
        Api.currentFolder = next.__targetFolder;
      }
      this.handleFile(next);
      this.start();
      return;
    }
    if (this._savedFolder !== undefined) {
      Api.currentFolder = this._savedFolder;
      this._savedFolder = undefined;
      FilesModule && FilesModule.loadFiles();
    }
    this.reset();
  },

  async uploadChunk(formData) {
    const res = await fetch(API_BASE + "/upload-chunk.php", {
      method: "POST",
      body: formData,
      headers: Api.authHeaders(),
      signal: this.controller.signal,
    });

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = { error: text || "Invalid server response" };
    }

    if (res.status === 401 || res.status === 503 || data?.authRequired) {
      const err = new Error(data?.error || "Unauthorized");
      err.authRequired = true;
      throw err;
    }

    if (!res.ok) {
      const err = new Error(data?.error || `Chunk failed (${res.status})`);
      err.code = res.status;
      err.data = data;
      throw err;
    }

    return data;
  },

  pause() {
    if (!this.isUploading || this.isPaused) return;
    this.isPaused = true;
    if (this.controller) this.controller.abort();
    this.syncControls();
  },

  resume() {
    if (!this.fileRef || !this.isPaused) return;
    this.isPaused = false;
    this.isUploading = false;
    this.start();
  },

  async cancel() {
    if (!this.fileRef) {
      this.reset();
      return;
    }
    this.isCancelled = true;
    if (this.controller) this.controller.abort();

    try {
      await Api.request("/cancel.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: this.fileRef.name,
          uploadId: this.uploadId,
        }),
      });
    } catch (e) {
      // session may already be gone
    }

    this.isUploading = false;
    this.reset();
  },

  reset(clearQueue = true) {
    this.fileRef = null;
    this.currentChunk = 0;
    this.uploadId = null;
    this.isCancelled = false;
    this.isPaused = false;
    this.isUploading = false;
    if (clearQueue) {
      this.queue = [];
      this.renderQueue();
    }

    const input = document.getElementById("fileInput");
    if (input) input.value = "";
    document.getElementById("progressBar").style.width = "0%";
    document.getElementById("status").innerText = "";
    document.getElementById("dropContent").innerHTML = `
            <p>Tap or Drag files</p>
            <p>Click to select (multiple OK)</p>
        `;
    this.syncControls();
  },
};


/* ===== modules\files.js ===== */
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
    document.getElementById("fab")?.classList.toggle("readonly-hide", ro);
    document.getElementById("batchDeleteBtn")?.classList.toggle("hide", ro);
    document.getElementById("batchMoveBtn")?.classList.toggle("hide", ro);
    const note = document.getElementById("readOnlyNote");
    if (note) note.hidden = !ro;
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
    Api.currentFolder = folder || "";
    localStorage.setItem(
      "fileAppLastFolder:" + (Api.space || ""),
      Api.currentFolder
    );
    this.clearSelection();
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

      const accept =
        data.accept || (Api.allowedExtensions || []).map((e) => `.${e}`).join(",");
      const input = document.getElementById("fileInput");
      if (input && accept) input.setAttribute("accept", accept);

      this.renderList();
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

  matchesType(file) {
    const t = this.filterType;
    if (t === "all") return true;
    if (t === "fav") return this.isFavorite(file.name, false);
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

    folders = [...folders].sort(byName);
    if (sortKey === "name") files = [...files].sort(byName);
    else if (sortKey === "name-desc") files = [...files].sort((a, b) => byName(b, a));
    else if (sortKey === "size") files = [...files].sort((a, b) => bySize(b, a));
    else if (sortKey === "oldest") files = [...files].sort(byDate);
    else files = [...files].sort((a, b) => byDate(b, a));

    return { folders, files };
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
      { label: "Duplicate", className: "copy", onClick: () => this.duplicateFile(name) },
      { label: "Move…", className: "move", onClick: () => this.moveItem(name, false) },
      { label: "Rename", className: "rename", onClick: () => this.renameItem(name, false) },
      { label: "Delete", className: "delete", onClick: () => this.deleteItem(name, false) },
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

  deleteItem(name, isFolder) {
    ModalModule.show({
      title: isFolder ? "Delete folder" : "Delete file",
      message: isFolder
        ? `Delete folder "${name}"? If it has files, confirm again to delete everything inside.`
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


/* ===== modules\dragdrop.js ===== */
window.DragDropModule = {
  init() {
    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("fileInput");

    if (!dropZone || !fileInput) return;

    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(eventName, this.preventDefaults);
    });

    dropZone.addEventListener("dragover", () => {
      dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("dragover");
    });

    dropZone.addEventListener("drop", (e) => {
      dropZone.classList.remove("dragover");
      const files = Array.from(e.dataTransfer.files || []);
      UploadModule.handleFiles(files);
    });

    fileInput.addEventListener("change", (e) => {
      const files = Array.from(e.target.files || []);
      UploadModule.handleFiles(files);
    });
  },

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  },
};


/* ===== modules\shortcuts.js ===== */
window.ShortcutsModule = {
  init() {
    document.addEventListener("keydown", (e) => this.onKey(e));
  },

  isTypingTarget(el) {
    if (!el) return false;
    const tag = (el.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
  },

  onKey(e) {
    if (this.isTypingTarget(e.target)) {
      if (e.key === "Escape") e.target.blur();
      return;
    }
    if (document.getElementById("loginGate")?.classList.contains("show")) return;
    if (document.getElementById("previewOverlay")?.classList.contains("show")) return;

    if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      document.getElementById("fileSearch")?.focus();
      return;
    }
    if ((e.key === "u" || e.key === "U") && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      openUpload();
      return;
    }
    if ((e.key === "n" || e.key === "N") && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      FilesModule.createFolder();
      return;
    }
    if ((e.key === "t" || e.key === "T") && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      FilesModule.createNote?.();
      return;
    }
    if ((e.key === "r" || e.key === "R") && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      FilesModule.loadFiles();
      ToastModule.show("Refreshed", "info");
      return;
    }
    if ((e.key === "a" || e.key === "A") && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      FilesModule.selectAllVisible?.();
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      if (FilesModule.selected?.size) {
        e.preventDefault();
        FilesModule.batchDelete?.();
      }
      return;
    }
    if (e.key === "Escape") {
      closeUpload();
      FilesModule.clearSelection?.();
    }
  },
};


/* ===== script.js ===== */
const APP_UI_VERSION = "1.7.0";
const APP_API_VERSION = "v1";

function detectServerBase() {
  let path = window.location.pathname || "";
  path = path.replace(/\/+$/, "") || "";
  if (path.endsWith("/index.html")) {
    path = path.slice(0, -"/index.html".length);
  }
  if (/\/ui\/v\d+$/i.test(path)) {
    path = path.replace(/\/ui\/v\d+$/i, "");
  }
  return path || "";
}

const CONFIG = {
  SERVER: `${window.location.origin}${detectServerBase()}`,
};

const SERVER = CONFIG.SERVER;
let API_BASE = `${SERVER}/api/${APP_API_VERSION}`;

async function resolveApiBase() {
  try {
    const res = await fetch(`${API_BASE}/version.php`, { cache: "no-store" });
    if (res.ok) return;
  } catch (e) {}
  API_BASE = SERVER;
}

function bindUiEvents() {
  const accountBtn = document.getElementById("accountBtn");
  const fab = document.getElementById("fab");
  const overlay = document.getElementById("overlay");
  const uploadBox = document.getElementById("uploadBox");
  const startBtn = document.getElementById("startUploadBtn");
  const pauseBtn = document.getElementById("pauseUploadBtn");
  const resumeBtn = document.getElementById("resumeUploadBtn");
  const cancelBtn = document.getElementById("cancelUploadBtn");
  const newFolderBtn = document.getElementById("newFolderBtn");
  const tabPublic = document.getElementById("tabPublic");
  const tabPersonal = document.getElementById("tabPersonal");
  const backBtn = document.getElementById("backToChoicesBtn");

  if (accountBtn) accountBtn.addEventListener("click", () => AuthGate.openSettings());
  if (newFolderBtn) newFolderBtn.addEventListener("click", () => FilesModule.createFolder());
  if (tabPublic) tabPublic.addEventListener("click", () => AuthGate.switchToPublic());
  if (tabPersonal) tabPersonal.addEventListener("click", () => AuthGate.switchToPersonal());
  if (backBtn) backBtn.addEventListener("click", () => AuthGate.showChoices());
  if (fab) fab.addEventListener("click", () => openUpload());
  if (overlay) overlay.addEventListener("click", () => closeUpload());
  if (uploadBox) uploadBox.addEventListener("click", (e) => e.stopPropagation());
  if (startBtn) startBtn.addEventListener("click", () => UploadModule.start());
  if (pauseBtn) pauseBtn.addEventListener("click", () => UploadModule.pause());
  if (resumeBtn) resumeBtn.addEventListener("click", () => UploadModule.resume());
  if (cancelBtn) cancelBtn.addEventListener("click", () => UploadModule.cancel());
}

async function bootApp() {
  await resolveApiBase();
  bindUiEvents();
  ThemeModule.init();
  DensityModule.init();
  ToastModule.init();
  ModalModule.init();
  PreviewModule.init();
  AuthGate.init();
  HealthBanner.init();
  FilesModule.init();
  UploadModule.init();
  DragDropModule.init();
  ShortcutsModule.init();
  ActivityModule.init();
  RecentModule.init();
  OfflineModule.init();
  PasteUploadModule.init();
  SearchModule.init();
  initFolderUpload();
  initZipFolder();
  initPullToRefresh();
  // ConflictModule is used on demand during upload merge

  const ok = await AuthGate.check();
  if (ok) {
    AuthGate.onReady();
  }
}

function canUseCurrentSpace() {
  if (Api.space === "public") return true;
  return !!Api.getAccessKey();
}

function openUpload() {
  if (!canUseCurrentSpace()) {
    AuthGate.prompt();
    return;
  }
  if (Api.readOnly) {
    ToastModule.show("Public space is read-only", "error");
    return;
  }
  const fab = document.getElementById("fab");
  const overlay = document.getElementById("overlay");
  fab.classList.add("hide");
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
  UploadModule.syncControls();
}

function closeUpload() {
  const fab = document.getElementById("fab");
  const overlay = document.getElementById("overlay");
  if (!Api.readOnly) fab.classList.remove("hide");
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden", "true");
}

function initZipFolder() {
  document.getElementById("zipFolderBtn")?.addEventListener("click", async () => {
    if (!canUseCurrentSpace()) {
      AuthGate.prompt();
      return;
    }
    const names = (FilesModule.files || []).map((f) => f.name);
    if (!names.length) {
      ToastModule.show("No files in this folder to zip", "error");
      return;
    }
    try {
      const res = await fetch(API_BASE + Api.withSpace("/zip.php"), {
        method: "POST",
        headers: Api.authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          folder: Api.currentFolder || "",
          names: names.slice(0, 30),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Zip failed");
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `folder-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      ToastModule.show(
        names.length > 30 ? "Zipped first 30 files" : "Folder zip downloaded",
        "success"
      );
      ActivityModule.log?.("Zipped folder", Api.currentFolder || "root");
    } catch (e) {
      ToastModule.show(e.message || "Zip failed", "error");
    }
  });
}

function initFolderUpload() {
  const btn = document.getElementById("folderUploadBtn");
  const input = document.getElementById("folderInput");
  if (!btn || !input) return;
  btn.addEventListener("click", () => {
    if (Api.readOnly) {
      ToastModule.show("Public space is read-only", "error");
      return;
    }
    if (!canUseCurrentSpace()) {
      AuthGate.prompt();
      return;
    }
    input.click();
  });
  input.addEventListener("change", async () => {
    const files = Array.from(input.files || []);
    input.value = "";
    if (!files.length) return;
    await UploadModule.uploadFolderTree(files);
  });
}

function initPullToRefresh() {
  let startY = 0;
  let pulling = false;
  const shell = document.getElementById("appShell");
  if (!shell) return;
  shell.addEventListener(
    "touchstart",
    (e) => {
      if (window.scrollY <= 0) {
        startY = e.touches[0].clientY;
        pulling = true;
      }
    },
    { passive: true }
  );
  shell.addEventListener(
    "touchend",
    (e) => {
      if (!pulling) return;
      pulling = false;
      const dy = e.changedTouches[0].clientY - startY;
      if (dy > 80 && canUseCurrentSpace()) {
        FilesModule.loadFiles();
        ToastModule.show("Refreshed", "info");
      }
    },
    { passive: true }
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => bootApp());
} else {
  bootApp();
}
