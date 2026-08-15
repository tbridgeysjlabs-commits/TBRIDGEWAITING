import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { facilityController, uploadFacilityImage } from '../controllers/facilityController.js';
import { waitingController } from '../controllers/waitingController.js';
import { i18nController } from '../controllers/i18nController.js';
import { customerController } from '../controllers/customerController.js';
import { requireAuth, requireFacilityMatch } from '../middleware/auth.js';

const router = Router();

// i18n
router.get('/i18n/languages', i18nController.getLanguages);
router.get('/i18n/:lang', i18nController.getTranslations);

// auth
router.post('/system-admin/login', authController.loginSystem);
router.post('/admin/:facilityCode/login', authController.loginFacility);

// public facility / customer
router.get('/facilities/:facilityCode/public', facilityController.getPublic);
router.post('/facilities/:facilityCode/waitings', waitingController.register);
router.get('/facilities/:facilityCode/waitings/board', waitingController.board);
router.get(
  '/facilities/:facilityCode/waitings/:waitingId/complete',
  waitingController.completePage
);
router.post(
  '/facilities/:facilityCode/waitings/:waitingId/cancel',
  waitingController.cancel
);
router.post(
  '/facilities/:facilityCode/waitings/:waitingId/postpone',
  waitingController.postpone
);

// facility admin
router.get(
  '/admin/:facilityCode/waitings/board',
  requireAuth(['facility_admin', 'system_admin']),
  requireFacilityMatch(),
  waitingController.board
);
router.post(
  '/admin/:facilityCode/waitings/:waitingId/complete',
  requireAuth(['facility_admin', 'system_admin']),
  requireFacilityMatch(),
  waitingController.complete
);
router.post(
  '/admin/:facilityCode/waitings/:waitingId/call',
  requireAuth(['facility_admin', 'system_admin']),
  requireFacilityMatch(),
  waitingController.call
);
router.post(
  '/admin/:facilityCode/waitings/:waitingId/cancel',
  requireAuth(['facility_admin', 'system_admin']),
  requireFacilityMatch(),
  waitingController.cancel
);
router.get(
  '/admin/:facilityCode/history',
  requireAuth(['facility_admin', 'system_admin']),
  requireFacilityMatch(),
  waitingController.history
);
router.get(
  '/admin/:facilityCode/history/export',
  requireAuth(['facility_admin', 'system_admin']),
  requireFacilityMatch(),
  waitingController.exportHistory
);
router.get(
  '/admin/:facilityCode/settings',
  requireAuth(['facility_admin', 'system_admin']),
  requireFacilityMatch(),
  facilityController.getPublic
);
router.put(
  '/admin/:facilityCode/settings',
  requireAuth(['facility_admin', 'system_admin']),
  requireFacilityMatch(),
  facilityController.updateSettings
);
router.get(
  '/admin/:facilityCode/waiting-types',
  requireAuth(['facility_admin', 'system_admin']),
  requireFacilityMatch(),
  facilityController.listWaitingTypes
);
router.post(
  '/admin/:facilityCode/waiting-types',
  requireAuth(['facility_admin', 'system_admin']),
  requireFacilityMatch(),
  facilityController.saveWaitingType
);
router.put(
  '/admin/:facilityCode/waiting-types/reorder',
  requireAuth(['facility_admin', 'system_admin']),
  requireFacilityMatch(),
  facilityController.reorderWaitingTypes
);
router.delete(
  '/admin/:facilityCode/waiting-types/:typeId',
  requireAuth(['facility_admin', 'system_admin']),
  requireFacilityMatch(),
  facilityController.deleteWaitingType
);
router.post(
  '/admin/:facilityCode/settings/image',
  requireAuth(['facility_admin', 'system_admin']),
  requireFacilityMatch(),
  uploadFacilityImage,
  facilityController.uploadImage
);
router.get(
  '/admin/:facilityCode/customers',
  requireAuth(['facility_admin', 'system_admin']),
  requireFacilityMatch(),
  customerController.listFacility
);
router.get(
  '/admin/:facilityCode/billing',
  requireAuth(['facility_admin', 'system_admin']),
  requireFacilityMatch(),
  facilityController.getBilling
);
router.post(
  '/admin/:facilityCode/billing/charge',
  requireAuth(['facility_admin', 'system_admin']),
  requireFacilityMatch(),
  facilityController.charge
);
router.post(
  '/admin/:facilityCode/billing/charge/prepare',
  requireAuth(['facility_admin', 'system_admin']),
  requireFacilityMatch(),
  facilityController.prepareCharge
);
// NicePay 인증결과 수신 (브라우저 form POST, JWT 없음)
router.post('/billing/nicepay/return', facilityController.nicepayReturn);
router.get('/billing/nicepay/return', facilityController.nicepayReturn);
router.get(
  '/admin/:facilityCode/billing/sends',
  requireAuth(['facility_admin', 'system_admin']),
  requireFacilityMatch(),
  facilityController.listSends
);
router.get(
  '/admin/:facilityCode/billing/charges',
  requireAuth(['facility_admin', 'system_admin']),
  requireFacilityMatch(),
  facilityController.listCharges
);

// system admin
router.get(
  '/system-admin/facilities',
  requireAuth(['system_admin']),
  facilityController.list
);
router.post(
  '/system-admin/facilities',
  requireAuth(['system_admin']),
  facilityController.create
);
router.get(
  '/system-admin/history',
  requireAuth(['system_admin']),
  waitingController.systemHistory
);
router.get(
  '/system-admin/history/export',
  requireAuth(['system_admin']),
  waitingController.exportSystemHistory
);
router.get(
  '/system-admin/customers',
  requireAuth(['system_admin']),
  customerController.listSystem
);
router.get(
  '/system-admin/billing/sends',
  requireAuth(['system_admin']),
  facilityController.systemListSends
);
router.get(
  '/system-admin/billing/charges',
  requireAuth(['system_admin']),
  facilityController.systemListCharges
);
router.post(
  '/system-admin/billing/charges/:id/cancel',
  requireAuth(['system_admin']),
  facilityController.cancelCharge
);

export default router;
