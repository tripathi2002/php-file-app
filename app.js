// Auto-built UI bundle — do not edit by hand. Source: modules/*.js + script.js

/* ===== modules\api.js ===== */
window.Api = {
  limits: null,
  allowedExtensions: null,
  currentFolder: "",
  mobileMasked: "",

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
    return headers;
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
    const res = await fetch(API_BASE + path, { ...options, headers });

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
    modal.querySelector("#modalMessage").textContent = message;

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

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.textContent = "";
      submitBtn.disabled = true;
      try {
        await this.enter(mobileInput.value, pinInput.value);
      } catch (err) {
        errorEl.textContent = err.message || "Could not enter";
      } finally {
        submitBtn.disabled = false;
      }
    });
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
    document.getElementById("fab")?.classList.remove("hide");
  },

  async enter(mobile, pin) {
    const res = await fetch(API_BASE + "/auth.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "enter", mobile, pin }),
    });
    const data = await res.json().catch(() => ({}));

    if (res.status === 404 && data.needsRegister) {
      // First time — create space with same mobile + PIN
      const create = await fetch(API_BASE + "/auth.php", {
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
  },

  async logout() {
    try {
      await Api.request("/auth.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
    } catch (e) {
      // still clear local session
    }
    Api.clearSession();
    ToastModule.show("Left personal space", "info");
    this.prompt();
  },

  async check() {
    if (!Api.getAccessKey()) {
      this.prompt();
      return false;
    }
    try {
      const me = await Api.request("/auth.php?action=me");
      if (!me.authenticated) {
        Api.clearSession();
        this.prompt();
        return false;
      }
      Api.mobileMasked = me.mobileMasked || "";
      this.hide();
      return true;
    } catch (e) {
      Api.clearSession();
      this.prompt();
      return false;
    }
  },

  prompt() {
    this.show();
    const mobile = document.getElementById("loginMobile");
    if (mobile) setTimeout(() => mobile.focus(), 50);
  },

  openSettings() {
    // Account menu: logout is the main action users need
    ModalModule.show({
      title: "Personal space",
      message: Api.mobileMasked
        ? `Signed in as ${Api.mobileMasked}`
        : "You are in your private space.",
      confirmText: "Leave / Logout",
      cancelText: "Stay",
      danger: true,
      onConfirm: () => this.logout(),
    });
  },

  onReady() {
    FilesModule.loadFiles();
    HealthBanner.check();
    const label = document.getElementById("accountLabel");
    if (label) label.textContent = Api.mobileMasked || "Account";
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
  chunkSize: 5 * 1024 * 1024,

  init() {
    this.syncControls();
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
      status.innerText = `Uploading ${percent}%`;
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
        }),
      });
    } catch (error) {
      if (error.code === 409) {
        const overwrite = confirm(`"${file.name}" already exists. Overwrite?`);
        if (overwrite) {
          try {
            await Api.request("/merge.php", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: file.name,
                totalChunks: this.totalChunks,
                uploadId: this.uploadId,
                folder: Api.currentFolder || "",
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
    this.isUploading = false;
    this.reset();
    FilesModule && FilesModule.loadFiles();
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

  reset() {
    this.fileRef = null;
    this.currentChunk = 0;
    this.uploadId = null;
    this.isCancelled = false;
    this.isPaused = false;
    this.isUploading = false;

    const input = document.getElementById("fileInput");
    if (input) input.value = "";
    document.getElementById("progressBar").style.width = "0%";
    document.getElementById("status").innerText = "";
    document.getElementById("dropContent").innerHTML = `
            <p>Tap or Drag file</p>
            <p>Click to select</p>
        `;
    this.syncControls();
  },
};


/* ===== modules\files.js ===== */
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
      const file = e.dataTransfer.files[0];
      UploadModule.handleFile(file);
    });

    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      UploadModule.handleFile(file);
    });
  },

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  },
};


/* ===== script.js ===== */
const APP_UI_VERSION = "1.4.0";
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

  if (accountBtn) accountBtn.addEventListener("click", () => AuthGate.openSettings());
  if (newFolderBtn) newFolderBtn.addEventListener("click", () => FilesModule.createFolder());
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
  ToastModule.init();
  ModalModule.init();
  AuthGate.init();
  HealthBanner.init();
  FilesModule.init();
  UploadModule.init();
  DragDropModule.init();

  const ok = await AuthGate.check();
  if (ok) {
    AuthGate.onReady();
  }
}

function openUpload() {
  if (!Api.getAccessKey()) {
    AuthGate.prompt();
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
  fab.classList.remove("hide");
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden", "true");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => bootApp());
} else {
  bootApp();
}
