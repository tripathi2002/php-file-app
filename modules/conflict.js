window.ConflictModule = {
  async resolve(fileName) {
    return new Promise((resolve) => {
      ModalModule.show({
        title: "File exists",
        message: `"${fileName}" already exists. What should we do?`,
        confirmText: "Overwrite",
        cancelText: "Keep both",
        danger: true,
        onConfirm: () => resolve("overwrite"),
        onCancel: () => resolve("rename"),
      });
    });
  },

  suggestedName(name) {
    const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
    const base = ext ? name.slice(0, -ext.length) : name;
    return `${base} (copy)${ext}`;
  },
};
