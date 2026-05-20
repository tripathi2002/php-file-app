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
