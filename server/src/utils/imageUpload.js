import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';

const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

/** @param {Buffer} buf */
export function sniffImageExt(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return '.png';
  }
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return '.gif';
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return '.webp';
  }
  return null;
}

export function contentTypeForExt(ext) {
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    default:
      return null;
  }
}

/**
 * Create multer middleware that stores images with a real extension.
 * @param {string} uploadDir
 */
export function createImageUpload(uploadDir) {
  fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const fromMime = MIME_EXT[String(file.mimetype || '').toLowerCase()];
      const fromName = path.extname(file.originalname || '').toLowerCase();
      const ext =
        fromMime ||
        (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(fromName)
          ? fromName === '.jpeg'
            ? '.jpg'
            : fromName
          : '.png');
      cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const mime = String(file.mimetype || '').toLowerCase();
      if (
        mime.includes('heic') ||
        mime.includes('heif') ||
        mime.includes('avif')
      ) {
        cb(new Error('HEIC/AVIF 형식은 지원하지 않습니다. JPG 또는 PNG로 변환해 주세요.'));
        return;
      }
      if (MIME_EXT[mime] || mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/gif' || mime === 'image/webp') {
        cb(null, true);
        return;
      }
      cb(new Error('JPG, PNG, GIF, WEBP 이미지만 업로드할 수 있습니다.'));
    },
  });
}

/**
 * Validate magic bytes and normalize extension. Returns public URL path.
 * @param {Express.Multer.File} file
 * @param {string} uploadDir
 */
export function finalizeUploadedImage(file, uploadDir) {
  if (!file?.path) {
    throw Object.assign(new Error('이미지 파일을 선택해 주세요.'), { status: 400 });
  }

  const fd = fs.openSync(file.path, 'r');
  const header = Buffer.alloc(12);
  try {
    fs.readSync(fd, header, 0, 12, 0);
  } finally {
    fs.closeSync(fd);
  }

  const sniffed = sniffImageExt(header);
  if (!sniffed) {
    fs.unlinkSync(file.path);
    throw Object.assign(new Error('올바른 이미지 파일이 아닙니다.'), { status: 400 });
  }

  const base = path.basename(file.path, path.extname(file.path));
  const finalName = `${base}${sniffed}`;
  const finalPath = path.join(uploadDir, finalName);
  if (finalPath !== file.path) {
    fs.renameSync(file.path, finalPath);
  }

  return `/uploads/${finalName}`;
}

/**
 * Resolve legacy extensionless `/uploads/<hash>` to a file that exists on disk.
 * @param {string|null|undefined} url
 * @param {string} uploadDir
 */
export function resolvePublicUploadUrl(url, uploadDir) {
  if (!url) return url || '';
  const raw = String(url).trim();
  if (!raw.startsWith('/uploads/')) return raw;

  const name = path.basename(raw.split('?')[0]);
  const direct = path.join(uploadDir, name);
  if (fs.existsSync(direct)) return `/uploads/${name}`;

  const base = path.basename(name, path.extname(name));
  for (const ext of ['.png', '.jpg', '.jpeg', '.gif', '.webp']) {
    const candidate = `${base}${ext}`;
    if (fs.existsSync(path.join(uploadDir, candidate))) {
      return `/uploads/${candidate}`;
    }
  }
  return raw;
}

/**
 * express.static setHeaders — fixes extensionless legacy uploads.
 * @param {import('http').ServerResponse} res
 * @param {string} filePath
 */
export function setUploadContentType(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext && contentTypeForExt(ext)) {
    res.setHeader('Content-Type', contentTypeForExt(ext));
    return;
  }
  try {
    const fd = fs.openSync(filePath, 'r');
    const header = Buffer.alloc(12);
    try {
      fs.readSync(fd, header, 0, 12, 0);
    } finally {
      fs.closeSync(fd);
    }
    const sniffed = sniffImageExt(header);
    const type = contentTypeForExt(sniffed);
    if (type) res.setHeader('Content-Type', type);
  } catch {
    /* ignore */
  }
}
