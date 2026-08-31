import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { setUploadContentType, resolvePublicUploadUrl } from './utils/imageUpload.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;
const UPLOAD_DIR = path.join(__dirname, '../uploads');

/** CLIENT_ORIGIN / CLIENT_ORIGINS — 콤마로 여러 프론트 URL 허용 */
function parseAllowedOrigins() {
  const raw = [
    process.env.CLIENT_ORIGINS || '',
    process.env.CLIENT_ORIGIN || '',
  ]
    .join(',')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const defaults = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];
  return [...new Set([...raw, ...defaults])];
}

const allowedOrigins = parseAllowedOrigins();

app.use(
  cors({
    origin(origin, callback) {
      // same-origin / curl / 서버간 호출 (Origin 헤더 없음)
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/$/, '');
      if (allowedOrigins.includes(normalized)) return callback(null, true);
      // Render 미리보기·커스텀 도메인 누락 시 로그
      console.warn(`[cors] blocked origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.get('/uploads/:name', (req, res, next) => {
  const name = req.params.name;
  if (!name || name.includes('..')) return next();
  const requested = `/uploads/${name}`;
  const resolved = resolvePublicUploadUrl(requested, UPLOAD_DIR);
  if (resolved && resolved !== requested) {
    return res.redirect(302, resolved);
  }
  return next();
});
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    setHeaders: setUploadContentType,
    fallthrough: true,
  })
);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, version: process.env.SYSTEM_VERSION || 'v260901_01' });
});

app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`T-Bridge Waiting API listening on http://localhost:${PORT}`);
});
