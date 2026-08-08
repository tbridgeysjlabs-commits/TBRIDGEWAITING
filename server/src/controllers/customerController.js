import { customerService } from '../services/customerService.js';

export const customerController = {
  async listFacility(req, res, next) {
    try {
      res.json(
        await customerService.listByFacility(req.params.facilityCode, {
          page: Number(req.query.page || 1),
          pageSize: Number(req.query.pageSize || 20),
        })
      );
    } catch (err) {
      next(err);
    }
  },

  async listSystem(req, res, next) {
    try {
      res.json(
        await customerService.listAll(
          { facilityName: req.query.facilityName },
          {
            page: Number(req.query.page || 1),
            pageSize: Number(req.query.pageSize || 20),
          }
        )
      );
    } catch (err) {
      next(err);
    }
  },
};
