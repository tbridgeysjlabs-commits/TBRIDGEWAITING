import {
  customerService,
  parseCustomerListQuery,
} from '../services/customerService.js';

function parseIds(query) {
  if (!query?.ids) return [];
  if (Array.isArray(query.ids)) return query.ids.map(String).filter(Boolean);
  return String(query.ids)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

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

  async exportFacility(req, res, next) {
    try {
      const buffer = await customerService.exportExcel({
        facilityCode: req.params.facilityCode,
        ids: parseIds(req.query),
      });
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', 'attachment; filename="customers.xlsx"');
      res.send(Buffer.from(buffer));
    } catch (err) {
      next(err);
    }
  },

  async exportSystem(req, res, next) {
    try {
      const buffer = await customerService.exportExcel({
        ids: parseIds(req.query),
      });
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="system-customers.xlsx"'
      );
      res.send(Buffer.from(buffer));
    } catch (err) {
      next(err);
    }
  },
};
