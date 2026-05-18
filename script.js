let controller = null;
let isCancelled = false;
let isPaused = false;

let currentChunk = 0; // important
let totalChunks = 0;
let fileRef = null;

async function startUpload() {
  const file = fileRef || document.getElementById("fileInput").files[0];
  //   const file = document.getElementById("fileInput").files[0];
  if (!file) return alert("Select file");

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
    await fetch("merge.php", {
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
  if (!confirm(`Delete ${fileName}?`)) return;

  const res = await fetch("delete.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fileName }),
  });

  const data = await res.json();

  if (data.error) {
    alert(data.error);
  } else {
    alert("Deleted successfully");
    loadFiles(); // refresh list
  }
}

async function cancelUpload() {
  if (!controller || !fileRef) return; // Use fileRef

  isCancelled = true;
  controller.abort(); // stop request

  const file = document.getElementById("fileInput").files[0];

  // 🧹 cleanup backend chunks
  await fetch("cancel.php", {
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
  if (!fileRef) return alert("No file to resume");

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
    const res = await fetch("upload-chunk.php", {
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
  const res = await fetch("list.php");
  const files = await res.json();

  const list = document.getElementById("fileList");
  list.innerHTML = "";

  files.forEach((file) => {
    const li = document.createElement("li");
    li.innerHTML = `
        <strong>${file}</strong>
        <div class="file-actions">
            <a class="btn view" href="uploads/${file}" target="_blank">View</a>
            <a class="btn download" href="download.php?file=${file}">Download</a>
            <button class="btn rename" onclick="renameFile('${file}')">Rename</button>
            <button class="btn delete" onclick="deleteFile('${file}')">Delete</button>
        </div>
        `;
    list.appendChild(li);
  });
}

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
  const newName = prompt("Enter new file name:", oldName);

  if (!newName || newName === oldName) return;

  const res = await fetch("rename.php", {
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
    alert(data.error);
  } else {
    alert("Renamed successfully");
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
      alert("Error: " + e.message);
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
      alert("Error: " + e.message);
    }
  });
});
