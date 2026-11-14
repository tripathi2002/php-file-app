const APP_UI_VERSION = "1.9.2";
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
  const tabPublic = document.getElementById("tabPublic");
  const tabPersonal = document.getElementById("tabPersonal");
  const backBtn = document.getElementById("backToChoicesBtn");

  if (accountBtn) accountBtn.addEventListener("click", () => AuthGate.openSettings());
  if (newFolderBtn) newFolderBtn.addEventListener("click", () => FilesModule.createFolder());
  if (tabPublic) tabPublic.addEventListener("click", () => AuthGate.switchToPublic());
  if (tabPersonal) tabPersonal.addEventListener("click", () => AuthGate.switchToPersonal());
  if (backBtn) backBtn.addEventListener("click", () => AuthGate.showChoices());
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
  ThemeModule.init();
  DensityModule.init();
  NotifyModule.init();
  IdleModule.init();
  ToastModule.init();
  ModalModule.init();
  PreviewModule.init();
  AuthGate.init();
  HealthBanner.init();
  FilesModule.init();
  UploadModule.init();
  DragDropModule.init();
  ShortcutsModule.init();
  ActivityModule.init();
  RecentModule.init();
  OfflineModule.init();
  PasteUploadModule.init();
  SearchModule.init();
  TrashModule.init();
  ExportModule.init();
  HelpModule.init();
  StorageInsightModule.init();
  ClipboardPathModule.init();
  FocusModeModule.init();
  ScrollTopModule.init();
  DuplicatesModule.init();
  ConfirmNavModule.init();
  SoundModule.init();
  SeedDemoModule.init();
  AutoRefreshModule.init();
  initMoreMenu();
  initFolderUpload();
  initZipFolder();
  initPullToRefresh();
  // ConflictModule is used on demand during upload merge

  const ok = await AuthGate.check();
  if (ok) {
    AuthGate.onReady();
  }
}

function canUseCurrentSpace() {
  if (Api.space === "public") return true;
  return !!Api.getAccessKey();
}

function openUpload() {
  if (!canUseCurrentSpace()) {
    AuthGate.prompt();
    return;
  }
  if (Api.readOnly) {
    ToastModule.show("Public space is read-only", "error");
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
  if (!Api.readOnly) fab.classList.remove("hide");
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden", "true");
}

function initMoreMenu() {
  const btn = document.getElementById("moreBtn");
  const panel = document.getElementById("morePanel");
  if (!btn || !panel) return;
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = panel.classList.toggle("hide") === false;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  panel.querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => {
      panel.classList.add("hide");
      btn.setAttribute("aria-expanded", "false");
    });
  });
  document.addEventListener("click", () => {
    panel.classList.add("hide");
    btn.setAttribute("aria-expanded", "false");
  });
}

function initZipFolder() {
  document.getElementById("zipFolderBtn")?.addEventListener("click", async () => {
    if (!canUseCurrentSpace()) {
      AuthGate.prompt();
      return;
    }
    const names = (FilesModule.files || []).map((f) => f.name);
    if (!names.length) {
      ToastModule.show("No files in this folder to zip", "error");
      return;
    }
    try {
      const res = await fetch(API_BASE + Api.withSpace("/zip.php"), {
        method: "POST",
        headers: Api.authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          folder: Api.currentFolder || "",
          names: names.slice(0, 30),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Zip failed");
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `folder-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      ToastModule.show(
        names.length > 30 ? "Zipped first 30 files" : "Folder zip downloaded",
        "success"
      );
      ActivityModule.log?.("Zipped folder", Api.currentFolder || "root");
    } catch (e) {
      ToastModule.show(e.message || "Zip failed", "error");
    }
  });
}

function initFolderUpload() {
  const btn = document.getElementById("folderUploadBtn");
  const input = document.getElementById("folderInput");
  if (!btn || !input) return;
  btn.addEventListener("click", () => {
    if (Api.readOnly) {
      ToastModule.show("Public space is read-only", "error");
      return;
    }
    if (!canUseCurrentSpace()) {
      AuthGate.prompt();
      return;
    }
    input.click();
  });
  input.addEventListener("change", async () => {
    const files = Array.from(input.files || []);
    input.value = "";
    if (!files.length) return;
    await UploadModule.uploadFolderTree(files);
  });
}

function initPullToRefresh() {
  let startY = 0;
  let pulling = false;
  const shell = document.getElementById("appShell");
  if (!shell) return;
  shell.addEventListener(
    "touchstart",
    (e) => {
      if (window.scrollY <= 0) {
        startY = e.touches[0].clientY;
        pulling = true;
      }
    },
    { passive: true }
  );
  shell.addEventListener(
    "touchend",
    (e) => {
      if (!pulling) return;
      pulling = false;
      const dy = e.changedTouches[0].clientY - startY;
      if (dy > 80 && canUseCurrentSpace()) {
        FilesModule.loadFiles();
        ToastModule.show("Refreshed", "info");
      }
    },
    { passive: true }
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => bootApp());
} else {
  bootApp();
}
