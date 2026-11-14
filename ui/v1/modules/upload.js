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

  init() {
    this.syncControls();
  },

  handleFiles(files) {
    const list = Array.from(files || []).filter(Boolean);
    if (!list.length) return;
    this.queue = list.slice(1);
    this.renderQueue();
    this.handleFile(list[0]);
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
          space: Api.space || "personal",
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
      this.handleFile(next);
      this.start();
      return;
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
