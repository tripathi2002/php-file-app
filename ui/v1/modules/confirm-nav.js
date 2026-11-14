window.ConfirmNavModule = {
  init() {
    window.addEventListener("beforeunload", (e) => {
      if (UploadModule?.isUploading) {
        e.preventDefault();
        e.returnValue = "";
      }
    });
  },
};
