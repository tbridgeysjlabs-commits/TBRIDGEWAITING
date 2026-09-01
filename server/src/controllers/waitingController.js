import { waitingService } from '../services/waitingService.js';

function parseStatuses(query) {
  if (!query.statuses) return ['completed', 'cancelled'];
  if (Array.isArray(query.statuses)) return query.statuses;
  return String(query.statuses).split(',').filter(Boolean);
}

function parseIds(query) {
  if (!query?.ids) return [];
  if (Array.isArray(query.ids)) return query.ids.map(String).filter(Boolean);
  return String(query.ids)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const waitingController = {
  async board(req, res, next) {
    try {
      res.json(await waitingService.getBoard(req.params.facilityCode));
    } catch (err) {
      next(err);
    }
  },

  async register(req, res, next) {
    try {
      res.status(201).json(await waitingService.register(req.params.facilityCode, req.body));
    } catch (err) {
      next(err);
    }
  },

  async completePage(req, res, next) {
    try {
      res.json(
        await waitingService.getCompletePage(req.params.facilityCode, req.params.waitingId)
      );
    } catch (err) {
      next(err);
    }
  },

  async complete(req, res, next) {
    try {
      res.json(await waitingService.complete(req.params.facilityCode, req.params.waitingId));
    } catch (err) {
      next(err);
    }
  },

  async call(req, res, next) {
    try {
      res.json(await waitingService.call(req.params.facilityCode, req.params.waitingId));
    } catch (err) {
      next(err);
    }
  },

  async cancel(req, res, next) {
    try {
      res.json(
        await waitingService.cancel(req.params.facilityCode, req.params.waitingId, {
          by: req.body.by || 'admin',
          reason: req.body.reason,
        })
      );
    } catch (err) {
      next(err);
    }
  },

  async postpone(req, res, next) {
    try {
      res.json(
        await waitingService.postpone(req.params.facilityCode, req.params.waitingId, req.body)
      );
    } catch (err) {
      next(err);
    }
  },

  async history(req, res, next) {
    try {
      const page = Number(req.query.page || 1);
      const pageSize = Number(req.query.pageSize || 10);
      res.json(
        await waitingService.searchHistory(
          {
            facilityCode: req.params.facilityCode,
            facilityName: req.query.facilityName,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            phone: req.query.phone,
            totalCount: req.query.totalCount,
            dailySeq: req.query.dailySeq,
            statuses: parseStatuses(req.query),
          },
          { page, pageSize }
        )
      );
    } catch (err) {
      next(err);
    }
  },

  async systemHistory(req, res, next) {
    try {
      const page = Number(req.query.page || 1);
      const pageSize = Number(req.query.pageSize || 10);
      res.json(
        await waitingService.searchHistory(
          {
            facilityName: req.query.facilityName,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            phone: req.query.phone,
            totalCount: req.query.totalCount,
            dailySeq: req.query.dailySeq,
            statuses: parseStatuses(req.query),
          },
          { page, pageSize }
        )
      );
    } catch (err) {
      next(err);
    }
  },

  async exportHistory(req, res, next) {
    try {
      const buffer = await waitingService.exportExcel({
        facilityCode: req.params.facilityCode,
        facilityName: req.query.facilityName,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        phone: req.query.phone,
        totalCount: req.query.totalCount,
        dailySeq: req.query.dailySeq,
        statuses: parseStatuses(req.query),
        ids: parseIds(req.query),
      });
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', 'attachment; filename="waiting-history.xlsx"');
      res.send(Buffer.from(buffer));
    } catch (err) {
      next(err);
    }
  },

  async exportSystemHistory(req, res, next) {
    try {
      const buffer = await waitingService.exportExcel({
        facilityName: req.query.facilityName,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        phone: req.query.phone,
        totalCount: req.query.totalCount,
        dailySeq: req.query.dailySeq,
        statuses: parseStatuses(req.query),
        ids: parseIds(req.query),
      });
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', 'attachment; filename="system-waiting-history.xlsx"');
      res.send(Buffer.from(buffer));
    } catch (err) {
      next(err);
    }
  },
};
