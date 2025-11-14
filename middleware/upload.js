const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

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
});

module.exports = { upload };
