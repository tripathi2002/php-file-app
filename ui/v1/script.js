const APP_UI_VERSION = "1.2.0";
const APP_API_VERSION = "v1";

function detectServerBase() {
  const path = window.location.pathname.replace(/\/+$/, "");
  if (path.endsWith("/index.html")) {
    const without = path.slice(0, -"/index.html".length);
    if (/\/ui\/v\d+$/i.test(without)) {
      return without.replace(/\/ui\/v\d+$/i, "") || "";
    }
    return without || "";
  }
  if (/\/ui\/v\d+$/i.test(path)) {
    return path.replace(/\/ui\/v\d+$/i, "") || "";
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

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function init() {
  await resolveApiBase();
  const v = APP_UI_VERSION;

  // Snapshot loads its own modules/ so it never picks up latest root JS by accident.
  await loadScript(`modules/api.js?v=${v}`);
  await loadScript(`modules/toast.js?v=${v}`);
  await loadScript(`modules/modal.js?v=${v}`);
  await loadScript(`modules/auth-gate.js?v=${v}`);
  await loadScript(`modules/health-banner.js?v=${v}`);
  await loadScript(`modules/upload.js?v=${v}`);
  await loadScript(`modules/files.js?v=${v}`);
  await loadScript(`modules/dragdrop.js?v=${v}`);

  ToastModule.init();
  ModalModule.init();
  HealthBanner.init();
  FilesModule.init();
  UploadModule.init();
  DragDropModule.init();
}

function openUpload() {
  document.getElementById("fab").classList.add("hide");
  document.getElementById("overlay").classList.add("show");
}

function closeUpload() {
  document.getElementById("fab").classList.remove("hide");
  document.getElementById("overlay").classList.remove("show");
}

init();
