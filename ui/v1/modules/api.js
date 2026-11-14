window.Api = {
  getAccessKey() {
    return localStorage.getItem("fileAppAccessKey") || "";
  },

  setAccessKey(key) {
    const value = (key || "").trim();
    if (value) {
      localStorage.setItem("fileAppAccessKey", value);
    } else {
      localStorage.removeItem("fileAppAccessKey");
    }
  },

  authHeaders(extra = {}) {
    const headers = { ...extra };
    const key = this.getAccessKey();
    if (key) {
      headers.Authorization = `Bearer ${key}`;
    }
    return headers;
  },

  withKey(url) {
    const key = this.getAccessKey();
    if (!key) return url;
    const join = url.includes("?") ? "&" : "?";
    return `${url}${join}accessKey=${encodeURIComponent(key)}`;
  },

  async request(path, options = {}) {
    const headers = this.authHeaders(options.headers || {});
    const res = await fetch(API_BASE + path, {
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

    if (res.status === 401 || (data && data.authRequired)) {
      const err = new Error(data?.error || "Unauthorized");
      err.code = 401;
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
