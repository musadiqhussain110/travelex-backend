export const validate = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.sanitizedQuery || req.query,
      params: req.params
    });

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message
      }));

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors
      });
    }

    req.validated = result.data;
    next();
  };
};