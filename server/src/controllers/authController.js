import { authService } from '../services/authService.js';

export const authController = {
  async loginSystem(req, res, next) {
    try {
      const result = await authService.loginSystemAdmin(req.body.username, req.body.password);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async loginFacility(req, res, next) {
    try {
      const result = await authService.loginFacilityAdmin(
        req.params.facilityCode,
        req.body.username,
        req.body.password
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async changeSystemPassword(req, res, next) {
    try {
      const result = await authService.changeSystemPassword(
        req.user.id,
        req.body.currentPassword,
        req.body.newPassword
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async changeFacilityPassword(req, res, next) {
    try {
      const result = await authService.changeFacilityPassword(
        req.params.facilityCode,
        req.body.currentPassword,
        req.body.newPassword
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
