const CONFIG = {
  SERVER: "https://vibhu.pro/file-app",
};

// const CONFIG = {
//   SERVER: "http://localhost/file-app",
// };

const API_BASE = `${CONFIG.SERVER}`;

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
  await loadScript(`${CONFIG.SERVER}/modules/upload.js`);
  await loadScript(`${CONFIG.SERVER}/modules/files.js`);
  await loadScript(`${CONFIG.SERVER}/modules/modal.js`);
  await loadScript(`${CONFIG.SERVER}/modules/dragdrop.js`);

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
