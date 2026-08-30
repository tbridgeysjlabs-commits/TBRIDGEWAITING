import path from 'path';
import { fileURLToPath } from 'url';
import { facilityService } from '../services/facilityService.js';
import {
  createImageUpload,
  finalizeUploadedImage,
} from '../utils/imageUpload.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const upload = createImageUpload(UPLOAD_DIR);
const uploadSingle = upload.single('image');

/** multer 에러를 JSON 응답으로 변환 */
export function uploadFacilityImage(req, res, next) {
  uploadSingle(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? '이미지 크기는 5MB 이하여야 합니다.'
        : err.message || '이미지 업로드에 실패했습니다.';
    return res.status(400).json({ message });
  });
}

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

  async update(req, res, next) {
    try {
      res.json(
        await facilityService.updateFacilityBySystem(req.params.facilityCode, req.body)
      );
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
      let url;
      try {
        url = finalizeUploadedImage(req.file, UPLOAD_DIR);
      } catch (err) {
        const status = err.status || 400;
        return res.status(status).json({ message: err.message || '업로드 실패' });
      }
      const updated = await facilityService.updateSettings(req.params.facilityCode, {
        profileImageUrl: url,
      });
      res.json({ ...updated, profileImageUrl: url });
    } catch (err) {
      next(err);
    }
  },

  async deleteImage(req, res, next) {
    try {
      const updated = await facilityService.updateSettings(req.params.facilityCode, {
        profileImageUrl: '',
      });
      res.json({ ...updated, profileImageUrl: '' });
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

  async prepareCharge(req, res, next) {
    try {
      res.json(
        await facilityService.prepareNicepayCharge(
          req.params.facilityCode,
          req.body.amount
        )
      );
    } catch (err) {
      next(err);
    }
  },

  async nicepayReturn(req, res) {
    try {
      const body = { ...req.body, ...req.query };
      const result = await facilityService.handleNicepayReturn(body);
      res.redirect(303, result.redirectUrl);
    } catch (err) {
      const facilityCode = req.body?.ReqReserved || req.query?.ReqReserved || 'demo-park';
      const { nicepayService } = await import('../services/nicepayService.js');
      const url = nicepayService.clientResultUrl(facilityCode, {
        status: 'fail',
        message: err.message || '결제 처리 중 오류가 발생했습니다.',
        moid: req.body?.Moid || req.query?.Moid,
      });
      res.redirect(303, url);
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

  async cancelCharge(req, res, next) {
    try {
      res.json(
        await facilityService.cancelCharge(req.params.id, req.body?.amount)
      );
    } catch (err) {
      next(err);
    }
  },

  async systemCharge(req, res, next) {
    try {
      res.json(
        await facilityService.chargeBySystem(
          req.body.facilityCode,
          req.body.amount
        )
      );
    } catch (err) {
      next(err);
    }
  },
};
