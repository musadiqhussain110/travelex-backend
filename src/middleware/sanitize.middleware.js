const sanitizeValue = (value) => {
  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === "object") {
    const sanitizedObject = {};

    for (const [key, val] of Object.entries(value)) {
      const cleanKey = key.replace(/\$/g, "").replace(/\./g, "");

      if (
        cleanKey === "__proto__" ||
        cleanKey === "constructor" ||
        cleanKey === "prototype"
      ) {
        continue;
      }

      sanitizedObject[cleanKey] = sanitizeValue(val);
    }

    return sanitizedObject;
  }

  return value;
};

export const sanitizeRequest = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }

  if (req.params) {
    req.params = sanitizeValue(req.params);
  }

  // Do not assign back to req.query because in newer Express it can be read-only.
  req.sanitizedQuery = sanitizeValue(req.query || {});

  next();
};