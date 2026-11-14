const APP_UI_VERSION = "1.3.0";
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

async function bootApp() {
  await resolveApiBase();
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
  UploadModule.syncControls();
}

function closeUpload() {
  document.getElementById("fab").classList.remove("hide");
  document.getElementById("overlay").classList.remove("show");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => bootApp());
} else {
  bootApp();
}
