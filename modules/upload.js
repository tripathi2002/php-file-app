window.UploadModule = {
  controller: null,
  isCancelled: false,
  isPaused: false,
  currentChunk: 0,
  totalChunks: 0,
  fileRef: null,
  chunkSize: 5 * 1024 * 1024,

  init() {
    const fileInput = document.getElementById("fileInput");
    if (fileInput) {
      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        this.handleFile(file);
      });
    }
  },

  handleFile(file) {
    if (!file) return;
    this.fileRef = file;
    const content = document.getElementById("dropContent");

    content.innerHTML = `
            <p>Selected:</p>
            <strong>${file.name}</strong>
            <p style="font-size:12px;">
                ${(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
            <br>
            <button
                class="btn"
                onclick="UploadModule.cancel()">
                Change File
            </button>
        `;
    this.start();
  },

  start: async function () {
    const file = this.fileRef;

    if (!file) {
      //   ToastModule.show("Select file", "error");
      return;
    }

    this.isPaused = false;
    this.isCancelled = false;
    this.controller = new AbortController();
    this.totalChunks = Math.ceil(file.size / this.chunkSize);
    const progressBar = document.getElementById("progressBar");
    const status = document.getElementById("status");
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
      formData.append("chunkIndex", i);
      formData.append("totalChunks", this.totalChunks);
      formData.append("fileName", file.name);
      try {
        await this.uploadChunk(formData);
      } catch (error) {
        if (error.name === "AbortError") {
          status.innerText = this.isCancelled
            ? "Upload Cancelled"
            : "Upload Paused";
          this.currentChunk = i;
        } else {
          status.innerText = "Upload Failed: " + error.message;
        }
        return;
      }
      const percent = Math.floor(((i + 1) / this.totalChunks) * 100);
      progressBar.style.width = percent + "%";
      status.innerText = `Uploading ${percent}%`;

      await this.sleep(600);
      this.currentChunk = i + 1;
    }

    await fetch(API_BASE + "/merge.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: file.name,
        totalChunks: this.totalChunks,
      }),
    });

    status.innerText = "Upload Complete";
    this.reset();
    FilesModule && FilesModule.loadFiles();
  },

  async uploadChunk(formData) {
    return fetch(API_BASE + "/upload-chunk.php", {
      method: "POST",
      body: formData,
      signal: this.controller.signal,
    });
  },

  pause() {
    if (!this.fileRef) return;
    this.isPaused = true;
    this.controller.abort();
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
    this.controller.abort();

    await fetch(API_BASE + "/cancel.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: this.fileRef.name,
      }),
    });

    this.reset();
  },

  reset() {
    this.fileRef = null;
    this.currentChunk = 0;

    document.getElementById("fileInput").value = "";
    document.getElementById("progressBar").style.width = "0%";
    document.getElementById("status").innerText = "";
    document.getElementById("dropContent").innerHTML = `
            <p>Tap or Drag file</p>
            <p>Click to select</p>
        `;
  },
//   reset() {
//     this.isCancelled = true;
//     this.isPaused = false;

//     if (this.controller) {
//       this.controller.abort();
//       this.controller = null;
//     }

//     this.fileRef = null;
//     this.currentChunk = 0;

//     document.getElementById("fileInput").value = "";
//     document.getElementById("progressBar").style.width = "0%";
//     document.getElementById("status").innerText = "";
//     document.getElementById("dropContent").innerHTML = `
//         <p>📂 Tap or Drag file</p>
//         <p>Click to select</p>
//     `;
//   },

  sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  },
};
