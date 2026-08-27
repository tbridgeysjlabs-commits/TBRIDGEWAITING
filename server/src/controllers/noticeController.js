import { noticeService } from '../services/noticeService.js';

export const noticeController = {
  async list(req, res, next) {
    try {
      res.json(await noticeService.list());
    } catch (err) {
      next(err);
    }
  },

  async get(req, res, next) {
    try {
      res.json(await noticeService.get(req.params.id));
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      res.status(201).json(await noticeService.create(req.body));
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      res.json(await noticeService.update(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      res.json(await noticeService.remove(req.params.id));
    } catch (err) {
      next(err);
    }
  },
};
