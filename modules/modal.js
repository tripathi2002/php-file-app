window.ModalModule = {
  onCancel: null,

  init() {
    if (document.getElementById("modal")) return;

    const modal = document.createElement("div");
    modal.id = "modal";
    modal.className = "modal";
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-btn">&times;</span>
            <h2 id="modalTitle"></h2>
            <p id="modalMessage"></p>
            <input type="text" id="modalInput" class="modal-input" style="display:none;">
            <div class="modal-actions">
                <button id="confirmBtn" class="btn confirm">Confirm</button>
                <button id="cancelBtn" class="btn cancel">Cancel</button>
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
      confirmText = "Confirm",
      cancelText = "Cancel",
      onConfirm = null,
      onCancel = null,
    } = options;

    this.onCancel = onCancel;

    modal.querySelector("#modalTitle").textContent = title;
    modal.querySelector("#modalMessage").textContent = message;

    const inputBox = modal.querySelector("#modalInput");
    inputBox.style.display = input ? "block" : "none";
    inputBox.value = inputValue;

    const confirmBtn = modal.querySelector("#confirmBtn");
    const cancelBtn = modal.querySelector("#cancelBtn");
    confirmBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;

    confirmBtn.onclick = () => {
      const value = inputBox.value;
      if (typeof onConfirm === "function") {
        onConfirm(value);
      }
      this.hide(false);
    };

    modal.style.display = "flex";
    if (input) {
      setTimeout(() => inputBox.focus(), 50);
    }
  },

  hide(fromCancel = false) {
    const modal = document.getElementById("modal");
    modal.style.display = "none";
    if (fromCancel && typeof this.onCancel === "function") {
      this.onCancel();
    }
    this.onCancel = null;
  },
};
