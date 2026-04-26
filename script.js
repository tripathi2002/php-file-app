let controller = null;
let isCancelled = false;
let isPaused = false;

let currentChunk = 0; // 👈 important
let totalChunks = 0;
let fileRef = null;

async function startUpload() {
  const file = document.getElementById("fileInput").files[0];
  if (!file) return alert("Select file");

  fileRef = file;
  isPaused = false;
  isCancelled = false;

  controller = new AbortController(); // 👈 init

  const chunkSize = 5 * 1024 * 1024;
  const totalChunks = Math.ceil(file.size / chunkSize);

  const progressBar = document.getElementById("progressBar");
  const status = document.getElementById("status");

  const REQUEST_DELAY = 200; // match backend throttle

  for (let i = currentChunk; i < totalChunks; i++) {
    // 🛑 stop loop if cancelled
    if (isCancelled) {
      status.innerText = "❌ Upload Cancelled";
      return;
    }

    if (isPaused) {
      status.innerText = "⏸️ Upload Paused";
      currentChunk = i; // 👈 save progress
      return;
    }

    const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);

    const formData = new FormData();
    formData.append("file", chunk);
    formData.append("chunkIndex", i);
    formData.append("totalChunks", totalChunks);
    formData.append("fileName", file.name);

    // 👇 pass controller signal
    await uploadChunkWithControl(formData, controller.signal);

    // await fetch("upload-chunk.php", {
    //     method: "POST",
    //     body: formData
    // });

    // ✅ Respect throttle (important)
    await sleep(REQUEST_DELAY);

    const percent = Math.floor(((i + 1) / totalChunks) * 100);
    progressBar.style.width = percent + "%";
    status.innerText = `Uploading... ${percent}%`;
    status.innerText = `Uploading chunk ${i + 1}/${totalChunks}`;

    currentChunk = i + 1; // 👈 update progress
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

    status.innerText = "✅ Upload Complete";
    // reset
    currentChunk = 0;
  }

  // merge request
  // await fetch("merge.php", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({
  //         fileName: file.name,
  //         totalChunks
  //     })
  // });

  // status.innerText = "✅ Upload Complete";
  // progressBar.style.width = "100%";

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
  if (!controller) return;

  isCancelled = true;
  controller.abort(); // 🛑 stop request

  const file = document.getElementById("fileInput").files[0];

  // 🧹 cleanup backend chunks
  await fetch("cancel.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: file.name,
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
      status.innerText = "⚠️ Rate limited, retrying...";

      console.warn(`⚠️ Rate limited, retrying in ${delay}ms`);
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
      status.innerText = "⏳ Network issue, retrying...";

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
            <a class="view" href="uploads/${file}" target="_blank">View</a>
            <a class="download" href="download.php?file=${file}">Download</a>
            <button class="delete" onclick="deleteFile('${file}')">Delete</button>
        </div>
        `;
    list.appendChild(li);
  });
}

// initial load
loadFiles();
