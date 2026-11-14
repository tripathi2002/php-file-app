window.ModalModule = {
  onCancel: null,
  onConfirm: null,
  previousFocus: null,
  keyHandler: null,
  danger: false,

  init() {
    if (document.getElementById("modal")) return;

    const modal = document.createElement("div");
    modal.id = "modal";
    modal.className = "modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "modalTitle");
    modal.innerHTML = `
        <div class="modal-content">
            <button type="button" class="close-btn" aria-label="Close">&times;</button>
            <h2 id="modalTitle"></h2>
            <p id="modalMessage"></p>
            <label id="modalInputLabel" class="visually-hidden" for="modalInput">Value</label>
            <input type="text" id="modalInput" class="modal-input" style="display:none;">
            <div class="modal-actions">
                <button type="button" id="confirmBtn" class="btn confirm">Confirm</button>
                <button type="button" id="cancelBtn" class="btn cancel">Cancel</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector(".close-btn").addEventListener("click", () => this.hide(true));
    modal.querySelector("#cancelBtn").addEventListener("click", () => this.hide(true));
  },

  show(options = {}) {
    this.init();
    const modal = document.getElementById("modal");
    const {
      title = "",
      message = "",
      input = false,
      inputValue = "",
      html = "",
      confirmText = "Confirm",
      cancelText = "Cancel",
      danger = false,
      onConfirm = null,
      onCancel = null,
    } = options;

    this.onCancel = onCancel;
    this.onConfirm = onConfirm;
    this.danger = danger;
    this.previousFocus = document.activeElement;

    modal.querySelector("#modalTitle").textContent = title;
    const msgEl = modal.querySelector("#modalMessage");
    if (html) {
      msgEl.innerHTML = "";
      if (message) {
        const p = document.createElement("p");
        p.textContent = message;
        msgEl.appendChild(p);
      }
      const wrap = document.createElement("div");
      wrap.innerHTML = html;
      msgEl.appendChild(wrap);
    } else {
      msgEl.textContent = message;
    }

    const inputBox = modal.querySelector("#modalInput");
    const inputLabel = modal.querySelector("#modalInputLabel");
    inputBox.style.display = input ? "block" : "none";
    inputBox.value = inputValue;
    inputLabel.textContent = title || "Value";

    const confirmBtn = modal.querySelector("#confirmBtn");
    const cancelBtn = modal.querySelector("#cancelBtn");
    confirmBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;
    confirmBtn.classList.toggle("danger", !!danger);

    confirmBtn.onclick = () => {
      const value = inputBox.value;
      if (typeof this.onConfirm === "function") this.onConfirm(value);
      this.hide(false);
    };

    this.keyHandler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        this.hide(true);
      } else if (e.key === "Enter" && input && document.activeElement === inputBox) {
        e.preventDefault();
        confirmBtn.click();
      } else if (e.key === "Tab") {
        this.trapFocus(e, modal);
      }
    };
    document.addEventListener("keydown", this.keyHandler);

    document.body.classList.add("modal-open");
    modal.style.display = "flex";

    setTimeout(() => {
      if (input) inputBox.focus();
      else confirmBtn.focus();
    }, 30);
  },

  trapFocus(e, modal) {
    const focusable = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  },

  hide(fromCancel = false) {
    const modal = document.getElementById("modal");
    modal.style.display = "none";
    document.body.classList.remove("modal-open");
    if (this.keyHandler) {
      document.removeEventListener("keydown", this.keyHandler);
      this.keyHandler = null;
    }
    if (fromCancel && typeof this.onCancel === "function") this.onCancel();
    this.onCancel = null;
    this.onConfirm = null;
    if (this.previousFocus && this.previousFocus.focus) {
      this.previousFocus.focus();
    }
  },
};
