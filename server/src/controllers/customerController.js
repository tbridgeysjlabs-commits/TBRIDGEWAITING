import {
  customerService,
  parseCustomerListQuery,
} from '../services/customerService.js';

export const customerController = {
  async listFacility(req, res, next) {
    try {
      res.json(
        await customerService.listByFacility(
          req.params.facilityCode,
          parseCustomerListQuery(req.query)
        )
      );
    } catch (err) {
      next(err);
    }
  },

  async listSystem(req, res, next) {
    try {
      res.json(await customerService.listAll(parseCustomerListQuery(req.query)));
    } catch (err) {
      next(err);
    }
  },
};
