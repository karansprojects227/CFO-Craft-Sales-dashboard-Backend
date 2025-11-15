const multer = require("multer");

// Store file in memory (buffer)
const storage = multer.memoryStorage();

// Allow only JPG/PNG
function fileFilter(req, file, cb) {
  const allowed = ["image/jpeg", "image/png"];

  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Only JPG and PNG images allowed"), false);
  }

  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

module.exports = { upload };
