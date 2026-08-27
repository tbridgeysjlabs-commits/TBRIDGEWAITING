import { systemSettingsService } from '../services/systemSettingsService.js';

export const systemSettingsController = {
  async get(req, res, next) {
    try {
      res.json(await systemSettingsService.getAdminContact());
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      res.json(
        await systemSettingsService.setAdminContact(req.body?.adminContact)
      );
    } catch (err) {
      next(err);
    }
  },
};
