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
