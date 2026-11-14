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
