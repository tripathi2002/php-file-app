# 📦 PHP Chunk File Upload System

A simple, scalable PHP application for uploading large files using **chunked uploads**, with support for file listing, viewing, and downloading.

---

## 🚀 Features

- ✅ Chunk-based file upload (handles large files)
- ✅ File merge after upload
- ✅ File listing API
- ✅ View & download files
- ✅ Lightweight (no framework)
- ✅ Works on shared hosting

---

## 📁 Project Structure
files-app/
│── uploads/ # final merged files
│── chunks/ # temporary chunk storage
│── upload-chunk.php # upload chunks API
│── merge.php # merge chunks API
│── list.php # list uploaded files
│── download.php # download file
│── config.php # config
│── index.html # UI
│── .htaccess # server config