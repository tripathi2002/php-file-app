window.AuthGate = {
  prompted: false,

  prompt() {
    if (this.prompted) return;
    this.prompted = true;

    ModalModule.show({
      title: "Access Key",
      message:
        "This app requires an access key. Generate one on the server with: php generate-key.php",
      input: true,
      inputValue: Api.getAccessKey(),
      confirmText: "Unlock",
      cancelText: "Later",
      onConfirm: (value) => {
        this.prompted = false;
        Api.setAccessKey(value);
        if (value) {
          ToastModule.show("Unlocked", "success");
          FilesModule.loadFiles();
          HealthBanner.check();
        }
      },
      onCancel: () => {
        this.prompted = false;
      },
    });
  },

  openSettings() {
    this.prompted = false;
    this.prompt();
  },
};
