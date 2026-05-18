const API_BASE = "https://vibhu.pro/file-app/";
const FRONTEND_BASE = "https://file.vibhu.pro/";
let controller = null;
let isCancelled = false;
let isPaused = false;

let currentChunk = 0; // important
let totalChunks = 0;
let fileRef = null;

async function startUpload() {
  const file = fileRef || document.getElementById("fileInput").files[0];
  //   const file = document.getElementById("fileInput").files[0];
  if (!file) return uiToast("Select file", "error");

  fileRef = file;
  isPaused = false;
  isCancelled = false;

  controller = new AbortController(); // init

  const chunkSize = 5 * 1024 * 1024;
  const totalChunks = Math.ceil(file.size / chunkSize);

  const progressBar = document.getElementById("progressBar");
  const status = document.getElementById("status");

  const REQUEST_DELAY = 200; // match backend throttle

  for (let i = currentChunk; i < totalChunks; i++) {
    // stop loop if cancelled
    if (isCancelled) {
      status.innerText = "Upload Cancelled";
      return;
    }

    if (isPaused) {
      status.innerText = "Upload Paused";
      currentChunk = i; // save progress
      return;
    }

    const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);

    const formData = new FormData();
    formData.append("file", chunk);
    formData.append("chunkIndex", i);
    formData.append("totalChunks", totalChunks);
    formData.append("fileName", file.name);

    // pass controller signal
    await uploadChunkWithControl(formData, controller.signal);

    // await fetch("upload-chunk.php", {
    //     method: "POST",
    //     body: formData
    // });

    // Respect throttle (important)
    await sleep(REQUEST_DELAY);

    const percent = Math.floor(((i + 1) / totalChunks) * 100);
    progressBar.style.width = percent + "%";
    // status.innerText = `Uploading... ${percent}%`;
    // status.innerText = `Uploading chunk ${i + 1}/${totalChunks}`;
    status.innerText = `Uploading ${file.name}... ${percent}%`;

    currentChunk = i + 1; // update progress
  }

  if (!isCancelled) {
    await fetch(API_BASE + "merge.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        totalChunks,
      }),
    });

    status.innerText = "Upload Complete";
    // currentChunk = 0;
    resetDropZone();
    // reset
  }

  loadFiles();
}

async function deleteFile(fileName) {
  const confirmed = await uiConfirm(`Delete ${fileName}?`, true);
  if (!confirmed) return;

  const res = await fetch(API_BASE + "delete.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fileName }),
  });

  const data = await res.json();

  if (data.error) {
    uiToast(data.error, "error");
  } else {
    uiToast("Deleted successfully", "success");
    loadFiles(); // refresh list
  }
}

async function cancelUpload() {
  if (!controller || !fileRef) return; // Use fileRef

  isCancelled = true;
  controller.abort(); // stop request

  const file = document.getElementById("fileInput").files[0];

  // 🧹 cleanup backend chunks
  await fetch(API_BASE + "cancel.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: fileRef.name, // Use fileRef here
    }),
  });
}

function pauseUpload() {
  if (!controller) return;

  isPaused = true;
  controller.abort(); // stop current request
}

function resumeUpload() {
  if (!fileRef) return uiToast("No file to resume", "error");

  isPaused = false;

  controller = new AbortController();

  startUpload(); // 👈 continues from currentChunk
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadChunkWithControl(
  formData,
  signal,
  retries = 3,
  delay = 300,
) {
  const status = document.getElementById("status"); // 👈 add this
  try {
    const res = await fetch(API_BASE + "upload-chunk.php", {
      method: "POST",
      body: formData,
      signal, // 👈 important
    });

    if (res.status === 429) {
      status.innerText = "Rate limited, retrying...";

      console.warn(`Rate limited, retrying in ${delay}ms`);
      await sleep(delay);
      return uploadChunkWithControl(formData, signal, retries, delay * 2); // exponential backoff
    }

    if (!res.ok) throw new Error("Upload failed");

    return await res.json();
  } catch (err) {
    if (err.name === "AbortError") {
      return;
    }

    if (retries > 0) {
      status.innerText = "Network issue, retrying...";

      await sleep(delay);
      return uploadChunkWithControl(formData, signal, retries - 1, delay * 2);
    }
    throw err;
  }
}

// Load uploaded files
async function loadFiles() {
  const list = document.getElementById("fileList");
  list.innerHTML = '<div class="loader"></div>';

  const res = await fetch(API_BASE + "list.php");
  const files = await res.json();

  list.innerHTML = "";

  files.forEach((file, index) => {
    const li = document.createElement("li");
    const menuId = `menu-${index}`;
    // handle potential quotes in filenames
    const safeFile = file.replace(/'/g, "\\'");
    li.innerHTML = `
        <div class="file-item-header">
          <strong>${file}</strong>
          <div class="menu-container">
            <button class="three-dot-btn" onclick="toggleMenu('${menuId}', event)">⋮</button>
            <div class="dropdown-menu" id="${menuId}">
              <button class="dropdown-item rename" onclick="renameFile('${safeFile}')">Rename</button>
              <button class="dropdown-item delete" onclick="deleteFile('${safeFile}')">Delete</button>
            </div>
          </div>
        </div>
        <div class="file-actions">
            <a class="btn view" href="${API_BASE}uploads/${file}" target="_blank">View</a>
            <a class="btn download" href="${API_BASE}download.php?file=${file}">Download</a>
        </div>
        `;
    list.appendChild(li);
  });
}

function toggleMenu(menuId, event) {
  event.stopPropagation(); // prevent document click from closing it immediately
  const menus = document.querySelectorAll('.dropdown-menu');
  menus.forEach(menu => {
    if (menu.id !== menuId) {
      menu.classList.remove('show');
    }
  });
  const menu = document.getElementById(menuId);
  if(menu) menu.classList.toggle('show');
}

document.addEventListener('click', (e) => {
  if (!e.target.matches('.three-dot-btn')) {
    const menus = document.querySelectorAll('.dropdown-menu');
    menus.forEach(menu => menu.classList.remove('show'));
  }
});

function handleFile(file) {
  if (!file) return;

  // document.getElementById("fileInput").files = new DataTransfer().files;

  // store file reference
  fileRef = file;

  const content = document.getElementById("dropContent");
  content.innerHTML = `
        <p>📄 Selected:</p>
        <strong>${file.name}</strong>
        <p style="font-size:12px;">
            ${(file.size / (1024 * 1024)).toFixed(2)} MB
        </p>
    `;
  content.innerHTML += `
        <br><button class="btn" onclick="resetDropZone()">Change File</button>
    `;

  //   startUpload(); // 👈 reuse your existing function
}

function resetDropZone() {
  fileRef = null;

  document.getElementById("dropContent").innerHTML = `
        <p>Drag & Drop file here</p>
        <p>or click to select</p>
    `;

  fileInput.value = ""; // important
  currentChunk = 0;
}

async function renameFile(oldName) {
  const newName = await uiPrompt("Enter new file name:", oldName);

  if (!newName || newName === oldName) return;

  const res = await fetch(API_BASE + "rename.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      oldName,
      newName,
    }),
  });

  const data = await res.json();

  if (data.error) {
    uiToast(data.error, "error");
  } else {
    uiToast("Renamed successfully", "success");
    loadFiles(); // refresh list
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // initial load
  loadFiles();

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");

  ["dragenter", "dragover", "dragleave", "drop"].forEach((event) => {
    dropZone.addEventListener(event, (e) => e.preventDefault());
  });

  // click → open file picker
  // dropZone.addEventListener("click", () => fileInput.click());

  // file selected
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    try {
      handleFile(file);
    } catch (e) {
      uiToast("Error: " + e.message, "error");
    }
  });

  // drag over
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  // drag leave
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  // drop
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");

    const file = e.dataTransfer.files[0];
    try {
      handleFile(file);
    } catch (e) {
      uiToast("Error: " + e.message, "error");
    }
  });
});

// Custom UI Functions
document.body.insertAdjacentHTML('beforeend', `
  <div class="modal-overlay" id="customModal">
    <div class="modal-box">
      <h3 class="modal-title" id="modalTitle"></h3>
      <input type="text" class="modal-input" id="modalInput" style="display:none">
      <div class="modal-buttons">
        <button class="modal-btn cancel" id="modalCancel">Cancel</button>
        <button class="modal-btn confirm" id="modalConfirm">OK</button>
      </div>
    </div>
  </div>
  <div class="toast-container" id="toastContainer"></div>
`);

function uiToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease-out forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function uiConfirm(message, isDanger = false) {
  return new Promise((resolve) => {
    const modal = document.getElementById('customModal');
    const title = document.getElementById('modalTitle');
    const input = document.getElementById('modalInput');
    const btnCancel = document.getElementById('modalCancel');
    const btnConfirm = document.getElementById('modalConfirm');

    title.innerText = message;
    input.style.display = 'none';
    btnCancel.style.display = 'block';
    btnConfirm.className = `modal-btn ${isDanger ? 'danger' : 'confirm'}`;
    btnConfirm.innerText = isDanger ? 'Delete' : 'Confirm';
    
    modal.classList.add('active');

    const cleanup = () => {
      modal.classList.remove('active');
      btnCancel.onclick = null;
      btnConfirm.onclick = null;
    };

    btnCancel.onclick = () => { cleanup(); resolve(false); };
    btnConfirm.onclick = () => { cleanup(); resolve(true); };
  });
}

function uiPrompt(message, defaultValue = '') {
  return new Promise((resolve) => {
    const modal = document.getElementById('customModal');
    const title = document.getElementById('modalTitle');
    const input = document.getElementById('modalInput');
    const btnCancel = document.getElementById('modalCancel');
    const btnConfirm = document.getElementById('modalConfirm');

    title.innerText = message;
    input.style.display = 'block';
    input.value = defaultValue;
    btnCancel.style.display = 'block';
    btnConfirm.className = 'modal-btn confirm';
    btnConfirm.innerText = 'Save';
    
    modal.classList.add('active');
    input.focus();

    const cleanup = () => {
      modal.classList.remove('active');
      btnCancel.onclick = null;
      btnConfirm.onclick = null;
    };

    btnCancel.onclick = () => { cleanup(); resolve(null); };
    btnConfirm.onclick = () => { cleanup(); resolve(input.value); };
  });
}
