import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

function getKey() {
  const raw =
    process.env.FACILITY_SECRET_KEY ||
    process.env.JWT_SECRET ||
    'tbridge-waiting-dev-secret-change-me';
  return crypto.createHash('sha256').update(String(raw), 'utf8').digest();
}

/** 평문 → 암호문 (빈 값은 그대로 '') */
export function encryptSecret(plain) {
  const text = plain == null ? '' : String(plain);
  if (!text) return '';
  if (text.startsWith(PREFIX)) return text;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;
}

/** 암호문 → 평문 (비암호문이면 원문 반환) */
export function decryptSecret(stored) {
  const text = stored == null ? '' : String(stored);
  if (!text) return '';
  if (!text.startsWith(PREFIX)) return text;
  try {
    const body = text.slice(PREFIX.length);
    const [ivB64, tagB64, dataB64] = body.split('.');
    if (!ivB64 || !tagB64 || !dataB64) return '';
    const iv = Buffer.from(ivB64, 'base64url');
    const tag = Buffer.from(tagB64, 'base64url');
    const data = Buffer.from(dataB64, 'base64url');
    const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    console.warn('[secretBox] decrypt failed');
    return '';
  }
}
