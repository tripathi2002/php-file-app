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
          message: "Change PIN or revoke other device sessions?",
          confirmText: "Change PIN",
          cancelText: "Revoke others",
          onConfirm: () => this.changePin(),
          onCancel: () => this.revokeOtherSessions(),
        });
      },
    });
  },

  async revokeOtherSessions() {
    try {
      const res = await Api.request("/sessions.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revokeOthers" }),
      });
      ToastModule.show(`Revoked ${res.removed || 0} other session(s)`, "success");
      ActivityModule.log?.("Revoked other sessions");
    } catch (e) {
      ToastModule.show(e.message || "Could not revoke sessions", "error");
    }
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
    if (UploadModule?.isUploading) {
      ToastModule.show("Finish or cancel the upload first", "error");
      return;
    }
    Api.setSpace("public");
    Api.currentFolder = localStorage.getItem("fileAppLastFolder:public") || "";
    this.hide();
    this.onReady();
    this.updateSpaceUi();
  },

  switchToPersonal() {
    if (UploadModule?.isUploading) {
      ToastModule.show("Finish or cancel the upload first", "error");
      return;
    }
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
    const deep = document.getElementById("deepSearch");
    if (deep) deep.value = "";
    document.getElementById("deepSearchPanel")?.classList.add("hide");
    FilesModule.filterType = "all";
    document
      .querySelectorAll("[data-type-filter]")
      .forEach((b) => b.classList.toggle("active", b.getAttribute("data-type-filter") === "all"));

    // Deep-link: ?space=public&folder=photos
    try {
      const params = new URLSearchParams(window.location.search);
      const space = params.get("space");
      const folder = params.get("folder");
      if (space === "public" || space === "personal") {
        Api.setSpace(space);
        if (folder !== null) Api.currentFolder = folder;
      } else if (folder !== null && Api.space) {
        Api.currentFolder = folder;
      }
    } catch (e) {}

    FilesModule.loadFiles();
    HealthBanner.check();
    this.updateSpaceUi();
    RecentModule.render?.();
    ActivityModule.render?.();
  },
};
