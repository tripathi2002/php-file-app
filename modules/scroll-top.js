window.ScrollTopModule = {
  init() {
    if (document.getElementById("scrollTopBtn")) return;
    const btn = document.createElement("button");
    btn.id = "scrollTopBtn";
    btn.type = "button";
    btn.className = "scroll-top-btn hide";
    btn.setAttribute("aria-label", "Back to top");
    btn.textContent = "↑";
    btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    document.body.appendChild(btn);
    window.addEventListener(
      "scroll",
      () => {
        btn.classList.toggle("hide", window.scrollY < 400);
      },
      { passive: true }
    );
  },
};
