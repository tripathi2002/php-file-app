const APP_UI_VERSION = "1.4.0";
const APP_API_VERSION = "v1";

function detectServerBase() {
  let path = window.location.pathname || "";
  path = path.replace(/\/+$/, "") || "";
  if (path.endsWith("/index.html")) {
    path = path.slice(0, -"/index.html".length);
  }
  if (/\/ui\/v\d+$/i.test(path)) {
    path = path.replace(/\/ui\/v\d+$/i, "");
  }
  return path || "";
}

const CONFIG = {
  SERVER: `${window.location.origin}${detectServerBase()}`,
};

const SERVER = CONFIG.SERVER;
let API_BASE = `${SERVER}/api/${APP_API_VERSION}`;

async function resolveApiBase() {
  try {
    const res = await fetch(`${API_BASE}/version.php`, { cache: "no-store" });
    if (res.ok) return;
  } catch (e) {}
  API_BASE = SERVER;
}

function bindUiEvents() {
  const accountBtn = document.getElementById("accountBtn");
  const fab = document.getElementById("fab");
  const overlay = document.getElementById("overlay");
  const uploadBox = document.getElementById("uploadBox");
  const startBtn = document.getElementById("startUploadBtn");
  const pauseBtn = document.getElementById("pauseUploadBtn");
  const resumeBtn = document.getElementById("resumeUploadBtn");
  const cancelBtn = document.getElementById("cancelUploadBtn");
  const newFolderBtn = document.getElementById("newFolderBtn");

  if (accountBtn) accountBtn.addEventListener("click", () => AuthGate.openSettings());
  if (newFolderBtn) newFolderBtn.addEventListener("click", () => FilesModule.createFolder());
  if (fab) fab.addEventListener("click", () => openUpload());
  if (overlay) overlay.addEventListener("click", () => closeUpload());
  if (uploadBox) uploadBox.addEventListener("click", (e) => e.stopPropagation());
  if (startBtn) startBtn.addEventListener("click", () => UploadModule.start());
  if (pauseBtn) pauseBtn.addEventListener("click", () => UploadModule.pause());
  if (resumeBtn) resumeBtn.addEventListener("click", () => UploadModule.resume());
  if (cancelBtn) cancelBtn.addEventListener("click", () => UploadModule.cancel());
}

async function bootApp() {
  await resolveApiBase();
  bindUiEvents();
  ToastModule.init();
  ModalModule.init();
  AuthGate.init();
  HealthBanner.init();
  FilesModule.init();
  UploadModule.init();
  DragDropModule.init();

  const ok = await AuthGate.check();
  if (ok) {
    AuthGate.onReady();
  }
}

function openUpload() {
  if (!Api.getAccessKey()) {
    AuthGate.prompt();
    return;
  }
  const fab = document.getElementById("fab");
  const overlay = document.getElementById("overlay");
  fab.classList.add("hide");
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
  UploadModule.syncControls();
}

function closeUpload() {
  const fab = document.getElementById("fab");
  const overlay = document.getElementById("overlay");
  fab.classList.remove("hide");
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden", "true");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => bootApp());
} else {
  bootApp();
}
