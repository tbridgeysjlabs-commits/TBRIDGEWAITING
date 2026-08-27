import { noticeRepository } from '../repositories/noticeRepository.js';
import { createError } from '../middleware/errorHandler.js';

function mapNotice(row) {
  if (!row) return null;
  return {
    id: row.id,
    version: row.version || '',
    title: row.title,
    contentHtml: row.content_html || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const noticeService = {
  async list() {
    const rows = await noticeRepository.list();
    return rows.map(mapNotice);
  },

  async get(id) {
    const row = await noticeRepository.findById(id);
    if (!row) throw createError(404, '공지사항을 찾을 수 없습니다.');
    return mapNotice(row);
  },

  async create(data) {
    const title = String(data.title || '').trim();
    if (!title) throw createError(400, '제목을 입력해 주세요.');
    const row = await noticeRepository.create({
      version: data.version ?? '',
      title,
      contentHtml: data.contentHtml ?? '',
    });
    return mapNotice(row);
  },

  async update(id, data) {
    const existing = await noticeRepository.findById(id);
    if (!existing) throw createError(404, '공지사항을 찾을 수 없습니다.');

    const patch = {};
    if (Object.prototype.hasOwnProperty.call(data, 'version')) {
      patch.version = data.version ?? '';
    }
    if (Object.prototype.hasOwnProperty.call(data, 'title')) {
      const title = String(data.title || '').trim();
      if (!title) throw createError(400, '제목을 입력해 주세요.');
      patch.title = title;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'contentHtml')) {
      patch.contentHtml = data.contentHtml ?? '';
    }

    const row = await noticeRepository.update(id, patch);
    return mapNotice(row);
  },

  async remove(id) {
    const row = await noticeRepository.remove(id);
    if (!row) throw createError(404, '공지사항을 찾을 수 없습니다.');
    return mapNotice(row);
  },
};
