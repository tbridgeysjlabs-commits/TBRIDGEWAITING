import { query } from '../db/pool.js';
import { billingRepository } from '../repositories/billingRepository.js';
import { facilityRepository } from '../repositories/facilityRepository.js';
import { waitingRepository } from '../repositories/waitingRepository.js';
import { isPpurioConfigured, sendAlimtalk } from './ppurioClient.js';
import {
  TEMPLATE,
  buildChangeWord,
  getTemplateCode,
  registrationTemplateKey,
  templateDisplayName,
} from './ppurioTemplates.js';

function clientOrigin() {
  return (process.env.CLIENT_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
}

function toAbsoluteUrl(pathOrUrl) {
  if (!pathOrUrl) return clientOrigin();
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${clientOrigin()}${path}`;
}

function buildCtx(facility, waiting, extra = {}) {
  const completePath = waiting.complete_page_link || '';
  const completeLink = toAbsoluteUrl(completePath);
  const cancelLink = completePath ? toAbsoluteUrl(`${completePath}/cancel`) : completeLink;
  const postponeLink = completePath
    ? toAbsoluteUrl(`${completePath}/postpone`)
    : completeLink;

  return {
    facilityName: facility.name,
    dailySeq: waiting.daily_seq,
    totalCount: waiting.total_count,
    completeLink,
    cancelLink,
    postponeLink,
    entryWaitMinutes: Math.max(1, Number(facility.entry_wait_minutes || 5)),
    ...extra,
  };
}

export const kakaoService = {
  buildLinks(waiting) {
    const completePath = waiting.complete_page_link || '';
    const complete = toAbsoluteUrl(completePath);
    return {
      complete,
      cancel: completePath ? toAbsoluteUrl(`${completePath}/cancel`) : complete,
      postpone: completePath ? toAbsoluteUrl(`${completePath}/postpone`) : complete,
      complete_link: complete,
    };
  },

  async dispatchTemplate({ facility, waiting, templateKey, extraCtx = {} }) {
    const templateName = templateDisplayName(templateKey);
    const templateCode = getTemplateCode(templateKey);
    const unitCost = Number(facility.kakao_unit_cost || 20);
    const balance = Number(facility.kakao_balance || 0);

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

    if (!templateCode) {
      console.warn('[ppurio] missing template code for', templateKey);
      return {
        ok: false,
        code: 'MISSING_TEMPLATE',
        message: `템플릿 코드가 없습니다: ${templateKey}`,
      };
    }

    const ctx = buildCtx(facility, waiting, extraCtx);
    const changeWord = buildChangeWord(templateKey, ctx);
    const refKey = `w_${String(waiting.id || '').replace(/-/g, '').slice(0, 24)}`;
    const useLive = isPpurioConfigured();

    const payload = {
      templateKey,
      templateName,
      templateCode,
      to: waiting.phone,
      changeWord,
      refKey,
      live: useLive,
    };

    let sendResult = { ok: true, mock: !useLive };

    if (useLive) {
      try {
        sendResult = await sendAlimtalk({
          to: waiting.phone,
          templateCode,
          changeWord,
          refKey,
          isResend: 'N',
        });
        payload.ppurio = {
          ok: sendResult.ok,
          code: sendResult.code,
          messagekey: sendResult.messagekey,
          error: sendResult.message,
        };
      } catch (err) {
        sendResult = {
          ok: false,
          code: 'PPURIO_ERROR',
          message: String(err?.message || err),
        };
        payload.ppurio = sendResult;
      }
    } else {
      console.log('[Kakao Alimtalk MOCK]', payload);
    }

    if (!sendResult.ok) {
      await billingRepository.logFailedSend(facility.id, waiting.id, unitCost, {
        templateName,
        recipientPhone: waiting.phone,
        note: sendResult.message || '알림톡 발송 실패',
      });
      await query(
        `INSERT INTO notification_logs (facility_id, waiting_id, channel, payload, status)
         VALUES ($1, $2, 'kakao', $3, 'failed')`,
        [facility.id, waiting.id, JSON.stringify(payload)]
      );
      return {
        ok: false,
        code: sendResult.code || 'SEND_FAILED',
        message: sendResult.message || '알림톡 발송에 실패했습니다.',
        balance,
        unitCost,
        payload,
      };
    }

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
      mock: !useLive,
      payload,
      sentAt,
      balance: newBalance,
      unitCost,
      lowBalanceWarning: newBalance <= warningThreshold,
      messagekey: sendResult.messagekey,
    };
  },

  async sendWaitingRegistered({ facility, waiting }) {
    const key = registrationTemplateKey(facility.postpone_policy || 'none');
    return this.dispatchTemplate({ facility, waiting, templateKey: key });
  },

  async sendCallEntry({ facility, waiting }) {
    return this.dispatchTemplate({
      facility,
      waiting,
      templateKey: TEMPLATE.CALL_ENTRY,
    });
  },

  async sendCancel({ facility, waiting, reason } = {}) {
    const key =
      reason === 'no_show' || reason === 'timeout'
        ? TEMPLATE.TIMEOUT_CANCEL
        : TEMPLATE.CANCEL;
    return this.dispatchTemplate({ facility, waiting, templateKey: key });
  },

  async sendPostponeDone({ facility, waiting, newOrder }) {
    return this.dispatchTemplate({
      facility,
      waiting,
      templateKey: TEMPLATE.POSTPONE_DONE,
      extraCtx: { newOrder },
    });
  },

  async sendImminentEntry({ facility, waiting, remainingOrder, aheadCount }) {
    return this.dispatchTemplate({
      facility,
      waiting,
      templateKey: TEMPLATE.APPROACHING,
      extraCtx: { remainingOrder, aheadCount },
    });
  },

  async notifyImminentEntries(facility) {
    try {
      const threshold = Number(facility.waiting_notification_order);
      if (!Number.isInteger(threshold) || threshold < 1) return { skipped: true };

      const pending = await waitingRepository.listPending(facility.id);
      const target = pending[threshold - 1];
      if (!target) return { skipped: true, reason: 'no_match' };
      if (target.notified_imminent_entry) {
        return { skipped: true, reason: 'already_notified' };
      }

      const claimed = await waitingRepository.markImminentNotified(target.id);
      if (!claimed) return { skipped: true, reason: 'already_notified' };

      const remainingOrder = threshold;
      const aheadCount = Math.max(threshold - 1, 0);

      const fresh =
        (await facilityRepository.findByCode(facility.facility_code)) || facility;

      const result = await this.sendImminentEntry({
        facility: fresh,
        waiting: claimed,
        remainingOrder,
        aheadCount,
      });

      if (!result.ok) {
        await waitingRepository.clearImminentNotified(claimed.id);
        console.warn('[imminent notify] send failed', result.code || result.message);
      }
      return result;
    } catch (err) {
      console.error('[imminent notify] unexpected error', err);
      return { ok: false, error: String(err?.message || err) };
    }
  },
};
