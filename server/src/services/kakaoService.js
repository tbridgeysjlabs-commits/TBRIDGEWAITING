import { query } from '../db/pool.js';
import { billingRepository } from '../repositories/billingRepository.js';
import { waitingRepository } from '../repositories/waitingRepository.js';

const SHARED_SENDER_KEY = process.env.KAKAO_SHARED_SENDER_KEY || 'TBRIDGE_SHARED_SENDER';
const TEMPLATE_NAME = '웨이팅 등록 완료';
const SHARED_TEMPLATE =
  '[{facility_name}] {daily_seq}번 웨이팅이 등록되었습니다. 인원: {total_count}명 / 확인: {complete_link}';

export const kakaoService = {
  renderTemplate(content, vars) {
    return content.replace(/\{(\w+)\}/g, (_, key) =>
      vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : `{${key}}`
    );
  },

  async sendWaitingRegistered({ facility, waiting }) {
    const unitCost = Number(facility.kakao_unit_cost || 20);
    const balance = Number(facility.kakao_balance || 0);
    const templateName = TEMPLATE_NAME;

    if (balance < unitCost) {
      await billingRepository.logFailedSend(facility.id, waiting.id, unitCost, {
        templateName,
        recipientPhone: waiting.phone,
        note: '충전금액 소진으로 발송 실패',
      });
      return {
        ok: false,
        code: 'INSUFFICIENT_BALANCE',
        message: '충전금액이 소진되어 카카오 알림톡 발송이 불가합니다.',
        balance,
        unitCost,
      };
    }

    const message = this.renderTemplate(SHARED_TEMPLATE, {
      facility_name: facility.name,
      daily_seq: waiting.daily_seq,
      total_count: waiting.total_count,
      phone: waiting.phone,
      complete_link: waiting.complete_page_link || '',
    });

    const payload = {
      to: waiting.phone,
      senderKey: SHARED_SENDER_KEY,
      templateCode: 'TBRIDGE_WAITING_REGISTERED',
      templateName,
      message,
    };

    console.log('[Kakao Alimtalk SHARED MOCK]', payload);

    const sentAt = new Date();
    await query(
      `INSERT INTO notification_logs (facility_id, waiting_id, channel, payload, status)
       VALUES ($1, $2, 'kakao', $3, 'sent')`,
      [facility.id, waiting.id, JSON.stringify(payload)]
    );
    await waitingRepository.setKakaoSentAt(waiting.id, sentAt);

    const after = await billingRepository.deductForSend(facility.id, waiting.id, unitCost, {
      templateName,
      recipientPhone: waiting.phone,
      sendStatus: 'success',
    });

    const warningThreshold = Number(
      after?.kakao_warning_threshold ?? facility.kakao_warning_threshold ?? 1000
    );
    const newBalance = Number(after?.kakao_balance ?? balance - unitCost);

    return {
      ok: true,
      mock: true,
      payload,
      sentAt,
      balance: newBalance,
      unitCost,
      lowBalanceWarning: newBalance <= warningThreshold,
    };
  },
};
