window.ToastModule = {
  container: null,

  init() {
    if (this.container) return;
    this.container = document.createElement("div");
    this.container.className = "toast-container";
    this.container.setAttribute("aria-live", "polite");
    document.body.appendChild(this.container);
  },

  show(message, type = "info") {
    this.init();
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    this.container.appendChild(el);
    setTimeout(() => {
      el.style.animation = "fadeOut 0.3s ease forwards";
      setTimeout(() => el.remove(), 300);
    }, 2800);
  },
};
