export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  // Multer errors
  if (err.name === "MulterError") {
    statusCode = 400;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "Image is too large (maximum 5MB)";
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = "Too many files uploaded (maximum 8 images)";
    }
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((item) => item.message)
      .join(", ");
  }

  // Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "Field";
    message = `${field.toUpperCase()} already exists`;
  }

  // Mongoose invalid ObjectId (CastError)
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid format for field: ${err.path}`;
  }

  if (statusCode === 500) {
    console.error(err);
    message = "Internal server error";
  }

  res.status(statusCode).json({ success: false, message });
};