const CONFIG = {
  SERVER: "https://vibhu.pro/file-app",
};

// const CONFIG = {
//   SERVER: "http://localhost/file-app",
// };

const APP_UI_VERSION = "1.1.1";
const APP_API_VERSION = "v1";
const SERVER = CONFIG.SERVER;
let API_BASE = `${SERVER}/api/${APP_API_VERSION}`;

async function resolveApiBase() {
  try {
    const res = await fetch(`${API_BASE}/list.php`, { cache: "no-store" });
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
  await loadScript(`modules/upload.js?v=${APP_UI_VERSION}`);
  await loadScript(`modules/files.js?v=${APP_UI_VERSION}`);
  await loadScript(`modules/modal.js?v=${APP_UI_VERSION}`);
  await loadScript(`modules/dragdrop.js?v=${APP_UI_VERSION}`);

  FilesModule.init();
  ModalModule.init();
  UploadModule.init();
  DragDropModule.init();
}

function openUpload() {
  document.getElementById("fab").classList.add("hide");
  document.getElementById("overlay").classList.add("show");
}

function closeUpload() {
  document.getElementById("fab").classList.remove("hide");
  // document.getElementById("uploadBox").classList.remove("show");
  document.getElementById("overlay").classList.remove("show");
}

init();
