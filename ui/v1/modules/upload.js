window.UploadModule = {
  controller: null,
  isCancelled: false,
  isPaused: false,
  currentChunk: 0,
  totalChunks: 0,
  fileRef: null,
  uploadId: null,
  chunkSize: 5 * 1024 * 1024,

  // File input change is handled by DragDropModule to avoid double-start.
  init() {},

  newUploadId() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  },

  handleFile(file) {
    if (!file) return;
    this.fileRef = file;
    this.uploadId = this.newUploadId();
    this.currentChunk = 0;
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
    changeBtn.className = "btn";
    changeBtn.textContent = "Change File";
    changeBtn.addEventListener("click", () => this.cancel());

    content.append(selected, name, size, document.createElement("br"), changeBtn);
    this.start();
  },

  start: async function () {
    const file = this.fileRef;
    const status = document.getElementById("status");
    const progressBar = document.getElementById("progressBar");

    if (!file) {
      return;
    }

    this.isPaused = false;
    this.isCancelled = false;
    this.controller = new AbortController();
    this.totalChunks = Math.ceil(file.size / this.chunkSize) || 1;
    if (!this.uploadId) {
      this.uploadId = this.newUploadId();
    }

    try {
      const state = await Api.request(
        `/status.php?uploadId=${encodeURIComponent(this.uploadId)}&fileName=${encodeURIComponent(file.name)}&totalChunks=${this.totalChunks}`
      );
      if (Array.isArray(state.received) && state.received.length) {
        const next = [...state.received].sort((a, b) => a - b).pop() + 1;
        if (next > this.currentChunk) {
          this.currentChunk = next;
          status.innerText = `Resuming from chunk ${this.currentChunk}…`;
        }
      }
    } catch (e) {
      // status is optional; continue from currentChunk
    }

    for (let i = this.currentChunk; i < this.totalChunks; i++) {
      if (this.isCancelled) {
        status.innerText = "Upload Cancelled";
        return;
      }
      if (this.isPaused) {
        status.innerText = "Upload Paused";
        this.currentChunk = i;
        return;
      }

      const chunk = file.slice(i * this.chunkSize, (i + 1) * this.chunkSize);
      const formData = new FormData();
      formData.append("file", chunk);
      formData.append("chunkIndex", String(i));
      formData.append("totalChunks", String(this.totalChunks));
      formData.append("fileName", file.name);
      formData.append("uploadId", this.uploadId);

      try {
        await this.uploadChunk(formData);
      } catch (error) {
        if (error.name === "AbortError") {
          status.innerText = this.isCancelled
            ? "Upload Cancelled"
            : "Upload Paused";
          this.currentChunk = i;
        } else if (error.authRequired) {
          status.innerText = "Unlock required — set your access key";
          AuthGate.prompt();
        } else {
          status.innerText = "Upload Failed: " + error.message;
          ToastModule.show(error.message, "error");
        }
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
        }),
      });
    } catch (error) {
      if (error.code === 409) {
        const overwrite = confirm(
          `"${file.name}" already exists. Overwrite?`
        );
        if (overwrite) {
          try {
            await Api.request("/merge.php", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: file.name,
                totalChunks: this.totalChunks,
                uploadId: this.uploadId,
                overwrite: true,
              }),
            });
          } catch (e2) {
            status.innerText = "Merge Failed: " + e2.message;
            ToastModule.show(e2.message, "error");
            return;
          }
        } else {
          status.innerText = "Upload cancelled (file exists)";
          return;
        }
      } else {
        status.innerText = "Merge Failed: " + error.message;
        ToastModule.show(error.message, "error");
        return;
      }
    }

    status.innerText = "Upload Complete";
    ToastModule.show("Upload complete", "success");
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

    if (res.status === 401 || data?.authRequired) {
      const err = new Error(data?.error || "Unauthorized");
      err.authRequired = true;
      throw err;
    }

    if (!res.ok) {
      throw new Error(data?.error || `Chunk failed (${res.status})`);
    }

    return data;
  },

  pause() {
    if (!this.fileRef) return;
    this.isPaused = true;
    if (this.controller) this.controller.abort();
  },

  resume() {
    this.isPaused = false;
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
      // ignore cancel errors
    }

    this.reset();
  },

  reset() {
    this.fileRef = null;
    this.currentChunk = 0;
    this.uploadId = null;
    this.isCancelled = false;
    this.isPaused = false;

    document.getElementById("fileInput").value = "";
    document.getElementById("progressBar").style.width = "0%";
    document.getElementById("status").innerText = "";
    document.getElementById("dropContent").innerHTML = `
            <p>Tap or Drag file</p>
            <p>Click to select</p>
        `;
  },
};
