window.ModalModule = {
  outsideClickHandler: null,

  init() {
    if (document.getElementById("modal")) return;

    const modal = document.createElement("div");

    modal.id = "modal";

    modal.className = "modal";

    modal.innerHTML = `

        <div class="modal-content">

            <span class="close-btn">
                &times;
            </span>

            <h2 id="modalTitle"></h2>

            <p id="modalMessage"></p>

            <input
                type="text"
                id="modalInput"
                class="modal-input"
                style="display:none;">

            <div class="modal-actions">

                <button
                    id="confirmBtn"
                    class="btn confirm">

                    Confirm

                </button>

                <button
                    id="cancelBtn"
                    class="btn cancel">

                    Cancel

                </button>

            </div>

        </div>

    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector(".close-btn");

    const cancelBtn = modal.querySelector("#cancelBtn");

    closeBtn.addEventListener("click", () => {
      this.hide();
    });

    cancelBtn.addEventListener("click", () => {
      this.hide();
    });
  },

  show(options = {}) {
    const modal = document.getElementById("modal");

    const {
      title = "",
      message = "",
      input = false,
      inputValue = "",
      confirmText = "Confirm",
      cancelText = "Cancel",
      onConfirm = null,
    } = options;

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

      this.hide();
    };

    modal.style.display = "flex";
  },

  hide() {
    const modal = document.getElementById("modal");
    modal.style.display = "none";
    if (this.outsideClickHandler) {
      modal.removeEventListener("click", this.outsideClickHandler);

      this.outsideClickHandler = null;
    }
    // document.removeEventListener("click", this.outsideClickHandler);
  },
};
