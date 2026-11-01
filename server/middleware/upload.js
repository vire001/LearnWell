/**
 * middleware/upload.js — In-memory Multer configuration for formula image uploads.
 *
 * Restricts uploads to PNG, JPEG, and WebP up to 5 MB.
 * Buffers files in memory without saving to disk.
 */

const multer = require('multer');

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const storage = multer.memoryStorage();

function fileFilter(_req, file, cb) {
  if (ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only PNG, JPEG, and WebP images are allowed.');
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
}

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter,
});

module.exports = upload;
