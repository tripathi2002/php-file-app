window.Api = {
  limits: null,
  allowedExtensions: null,
  currentFolder: "",
  mobileMasked: "",
  space: localStorage.getItem("fileAppSpace") || "",

  getAccessKey() {
    return (
      localStorage.getItem("fileAppSession") ||
      localStorage.getItem("fileAppAccessKey") ||
      ""
    );
  },

  setAccessKey(key) {
    const value = (key || "").trim();
    if (value) {
      localStorage.setItem("fileAppSession", value);
    } else {
      localStorage.removeItem("fileAppSession");
      localStorage.removeItem("fileAppAccessKey");
    }
  },

  setSpace(space) {
    this.space = space === "public" ? "public" : "personal";
    localStorage.setItem("fileAppSpace", this.space);
    this.currentFolder = "";
  },

  clearSession() {
    this.setAccessKey("");
    this.mobileMasked = "";
    this.currentFolder = "";
  },

  authHeaders(extra = {}) {
    const headers = { ...extra };
    const key = this.getAccessKey();
    if (key) {
      headers.Authorization = `Bearer ${key}`;
      headers["X-Access-Key"] = key;
    }
    if (this.space) {
      headers["X-Space"] = this.space;
    }
    return headers;
  },

  withSpace(path) {
    if (!this.space) return path;
    const join = path.includes("?") ? "&" : "?";
    return `${path}${join}space=${encodeURIComponent(this.space)}`;
  },

  absoluteUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    const base = SERVER.replace(/\/+$/, "");
    const rel = String(path).replace(/^\/+/, "");
    return `${base}/${rel}`;
  },

  async request(path, options = {}) {
    const headers = this.authHeaders(options.headers || {});
    const res = await fetch(API_BASE + this.withSpace(path), {
      ...options,
      headers,
    });

    let data = null;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = { error: text || "Invalid server response" };
    }

    if (res.status === 401 || data?.authRequired) {
      const err = new Error(data?.error || "Unauthorized");
      err.code = res.status;
      err.authRequired = true;
      throw err;
    }

    if (!res.ok) {
      const err = new Error(data?.error || `Request failed (${res.status})`);
      err.code = res.status;
      err.data = data;
      throw err;
    }

    return data;
  },
};
