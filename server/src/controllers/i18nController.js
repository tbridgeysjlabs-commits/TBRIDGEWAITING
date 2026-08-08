import { i18nService } from '../services/i18nService.js';

export const i18nController = {
  async getTranslations(req, res, next) {
    try {
      res.json(await i18nService.getTranslations(req.params.lang || 'ko'));
    } catch (err) {
      next(err);
    }
  },

  async getLanguages(req, res, next) {
    try {
      res.json(await i18nService.getAllLanguages());
    } catch (err) {
      next(err);
    }
  },
};
