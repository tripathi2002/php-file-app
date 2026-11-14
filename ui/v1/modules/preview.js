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
