import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { facilityService } from '../services/facilityService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const upload = multer({
  dest: path.join(__dirname, '../../uploads'),
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const uploadFacilityImage = upload.single('image');

export const facilityController = {
  async list(req, res, next) {
    try {
      res.json(await facilityService.listFacilities());
    } catch (err) {
      next(err);
    }
  },

  async getPublic(req, res, next) {
    try {
      res.json(
        await facilityService.getPublicFacility(
          req.params.facilityCode,
          req.query.lang || 'ko'
        )
      );
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const facility = await facilityService.createFacility({
        facilityCode: req.body.facilityCode,
        name: req.body.name,
        masterUsername: req.body.masterUsername,
        masterPassword: req.body.masterPassword,
        kakaoUnitCost: req.body.kakaoUnitCost,
        status: req.body.status,
      });
      res.status(201).json(facility);
    } catch (err) {
      next(err);
    }
  },

  async updateSettings(req, res, next) {
    try {
      res.json(await facilityService.updateSettings(req.params.facilityCode, req.body));
    } catch (err) {
      next(err);
    }
  },

  async uploadImage(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: '이미지 파일을 선택해 주세요.' });
      }
      const url = `/uploads/${req.file.filename}`;
      const updated = await facilityService.updateSettings(req.params.facilityCode, {
        profileImageUrl: url,
      });
      res.json({ ...updated, profileImageUrl: url });
    } catch (err) {
      next(err);
    }
  },

  async listWaitingTypes(req, res, next) {
    try {
      res.json(await facilityService.listWaitingTypes(req.params.facilityCode));
    } catch (err) {
      next(err);
    }
  },

  async saveWaitingType(req, res, next) {
    try {
      res.json(await facilityService.saveWaitingType(req.params.facilityCode, req.body));
    } catch (err) {
      next(err);
    }
  },

  async reorderWaitingTypes(req, res, next) {
    try {
      res.json(
        await facilityService.reorderWaitingTypes(req.params.facilityCode, req.body.orderedIds)
      );
    } catch (err) {
      next(err);
    }
  },

  async deleteWaitingType(req, res, next) {
    try {
      res.json(
        await facilityService.deleteWaitingType(req.params.facilityCode, req.params.typeId)
      );
    } catch (err) {
      next(err);
    }
  },

  async getBilling(req, res, next) {
    try {
      res.json(await facilityService.getBilling(req.params.facilityCode));
    } catch (err) {
      next(err);
    }
  },

  async charge(req, res, next) {
    try {
      res.json(
        await facilityService.charge(req.params.facilityCode, req.body.amount, {
          note: req.body.note,
          paymentMethod: req.body.paymentMethod,
          receiptUrl: req.body.receiptUrl,
        })
      );
    } catch (err) {
      next(err);
    }
  },

  async listSends(req, res, next) {
    try {
      res.json(
        await facilityService.listSends(
          req.params.facilityCode,
          { startDate: req.query.startDate, endDate: req.query.endDate },
          {
            page: Number(req.query.page || 1),
            pageSize: Number(req.query.pageSize || 50),
          }
        )
      );
    } catch (err) {
      next(err);
    }
  },

  async listCharges(req, res, next) {
    try {
      res.json(
        await facilityService.listCharges(
          req.params.facilityCode,
          { startDate: req.query.startDate, endDate: req.query.endDate },
          {
            page: Number(req.query.page || 1),
            pageSize: Number(req.query.pageSize || 50),
          }
        )
      );
    } catch (err) {
      next(err);
    }
  },

  async systemListSends(req, res, next) {
    try {
      res.json(
        await facilityService.systemListSends(
          {
            facilityName: req.query.facilityName,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
          },
          {
            page: Number(req.query.page || 1),
            pageSize: Number(req.query.pageSize || 50),
          }
        )
      );
    } catch (err) {
      next(err);
    }
  },

  async systemListCharges(req, res, next) {
    try {
      res.json(
        await facilityService.systemListCharges(
          {
            facilityName: req.query.facilityName,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
          },
          {
            page: Number(req.query.page || 1),
            pageSize: Number(req.query.pageSize || 50),
          }
        )
      );
    } catch (err) {
      next(err);
    }
  },
};
