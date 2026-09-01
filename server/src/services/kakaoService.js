import { query } from '../db/pool.js';
import { billingRepository } from '../repositories/billingRepository.js';
import { facilityRepository } from '../repositories/facilityRepository.js';
import { waitingRepository } from '../repositories/waitingRepository.js';
import { createError } from '../middleware/errorHandler.js';
import { isPpurioConfigured, sendAlimtalk } from './ppurioClient.js';
import {
  TEMPLATE,
  buildChangeWord,
  getTemplateCode,
  registrationTemplateKey,
  templateDisplayName,
} from './ppurioTemplates.js';

/** @typedef {'MOCK'|'INSUFFICIENT_BALANCE'|'API_ERROR'|'EXCEPTION'|'SUCCESS'} KakaoSendReason */

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
  return {
    facilityName: facility.name,
    facilityCode: facility.facility_code || facility.facilityCode || '',
    waitingId: waiting?.id || '',
    dailySeq: waiting?.daily_seq ?? waiting?.dailySeq,
    totalCount: waiting?.total_count ?? waiting?.totalCount,
    /** 현재 입장대기 순서(큐 순번) */
    waitOrder: waiting?.queue_order ?? waiting?.queueOrder ?? waiting?.daily_seq,
    entryWaitMinutes: Math.max(1, Number(facility.entry_wait_minutes || facility.entryWaitMinutes || 5)),
    postponeLimit: Math.max(1, Number(facility.postpone_limit || facility.postponeLimit || 3)),
    notificationOrder:
      facility.waiting_notification_order ?? facility.waitingNotificationOrder ?? null,
    cancelledAt: waiting?.cancelled_at || waiting?.cancelledAt || extra.cancelledAt || new Date(),
    eventAt: extra.eventAt || new Date(),
    ...extra,
  };
}

function isPpurioBalanceError(sendResult) {
  const blob = `${sendResult?.code || ''} ${sendResult?.message || ''} ${JSON.stringify(sendResult?.raw || {})}`;
  return /잔액|한도|insufficient|balance|credit/i.test(blob);
}

/**
 * @param {object} partial
 * @returns {{ ok: boolean, reason: KakaoSendReason, detail?: string, mock?: boolean }}
 */
function withReason(partial) {
  return {
    ok: Boolean(partial.ok),
    reason: partial.reason,
    detail: partial.detail,
    mock: partial.mock,
    ...partial,
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
        sendPayload: { templateKey, templateName, to: waiting.phone },
      });
      return withReason({
        ok: false,
        reason: 'INSUFFICIENT_BALANCE',
        detail: `balance=${balance}, unitCost=${unitCost}`,
        code: 'INSUFFICIENT_BALANCE',
        message: '충전금액이 소진되어 카카오 알림톡 발송이 불가합니다.',
        balance,
        unitCost,
      });
    }

    if (!templateCode) {
      console.warn('[ppurio] missing template code for', templateKey);
      return withReason({
        ok: false,
        reason: 'API_ERROR',
        detail: `MISSING_TEMPLATE templateKey=${templateKey}`,
        code: 'MISSING_TEMPLATE',
        message: `템플릿 코드가 없습니다: ${templateKey}`,
      });
    }

    const ctx = buildCtx(facility, waiting, extraCtx);
    const changeWord = buildChangeWord(templateKey, ctx);
    const refKey = `w_${String(waiting.id || '').replace(/-/g, '').slice(0, 24)}`;
    const useLive = isPpurioConfigured();

    console.log('[kakao changeWord]', {
      templateKey,
      templateCode,
      changeWord,
    });

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
        const detail = String(err?.message || err);
        console.error('[ppurio] send exception', detail);
        sendResult = {
          ok: false,
          exception: true,
          code: 'PPURIO_ERROR',
          message: detail,
        };
        payload.ppurio = sendResult;
      }
    } else {
      console.log('[Kakao Alimtalk MOCK] 테스트(MOCK) 모드 - 실제 미발송', payload);
    }

    if (!useLive) {
      // MOCK: 잔액 차감·이력은 기존과 동일하게 기록하되 reason=MOCK
      const sentAt = new Date();
      payload.mockNote = '테스트(MOCK) 모드 - 실제 미발송';
      await query(
        `INSERT INTO notification_logs (facility_id, waiting_id, channel, payload, status)
         VALUES ($1, $2, 'kakao', $3, 'sent')`,
        [facility.id, waiting.id, JSON.stringify(payload)]
      );
      await waitingRepository.setKakaoSentAt(waiting.id, sentAt);
      const after = await billingRepository.deductForSend(facility.id, waiting.id, unitCost, {
        templateName: `${templateName} (MOCK)`,
        recipientPhone: waiting.phone,
        sendStatus: 'success',
        sendPayload: payload,
      });
      const warningThreshold = Number(
        after?.kakao_warning_threshold ?? facility.kakao_warning_threshold ?? 1000
      );
      const newBalance = Number(after?.kakao_balance ?? balance - unitCost);
      return withReason({
        ok: true,
        reason: 'MOCK',
        detail: '테스트(MOCK) 모드 - 실제 미발송',
        mock: true,
        payload,
        sentAt,
        balance: newBalance,
        unitCost,
        lowBalanceWarning: newBalance <= warningThreshold,
      });
    }

    if (sendResult.exception) {
      await billingRepository.logFailedSend(facility.id, waiting.id, unitCost, {
        templateName,
        recipientPhone: waiting.phone,
        note: sendResult.message || '알림톡 발송 예외',
        sendPayload: payload,
      });
      await query(
        `INSERT INTO notification_logs (facility_id, waiting_id, channel, payload, status)
         VALUES ($1, $2, 'kakao', $3, 'failed')`,
        [facility.id, waiting.id, JSON.stringify(payload)]
      );
      return withReason({
        ok: false,
        reason: 'EXCEPTION',
        detail: sendResult.message,
        code: sendResult.code || 'EXCEPTION',
        message: sendResult.message || '알림톡 발송 중 예외가 발생했습니다.',
        balance,
        unitCost,
        payload,
      });
    }

    if (!sendResult.ok) {
      const balanceErr = isPpurioBalanceError(sendResult);
      const reason = balanceErr ? 'INSUFFICIENT_BALANCE' : 'API_ERROR';
      const detail = `code=${sendResult.code || ''} ${sendResult.message || ''}`.trim();
      await billingRepository.logFailedSend(facility.id, waiting.id, unitCost, {
        templateName,
        recipientPhone: waiting.phone,
        note: sendResult.message || '알림톡 발송 실패',
        sendPayload: payload,
      });
      await query(
        `INSERT INTO notification_logs (facility_id, waiting_id, channel, payload, status)
         VALUES ($1, $2, 'kakao', $3, 'failed')`,
        [facility.id, waiting.id, JSON.stringify(payload)]
      );
      return withReason({
        ok: false,
        reason,
        detail,
        code: sendResult.code || 'SEND_FAILED',
        message: sendResult.message || '알림톡 발송에 실패했습니다.',
        balance,
        unitCost,
        payload,
      });
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
      sendPayload: payload,
    });

    const warningThreshold = Number(
      after?.kakao_warning_threshold ?? facility.kakao_warning_threshold ?? 1000
    );
    const newBalance = Number(after?.kakao_balance ?? balance - unitCost);

    return withReason({
      ok: true,
      reason: 'SUCCESS',
      mock: false,
      payload,
      sentAt,
      balance: newBalance,
      unitCost,
      lowBalanceWarning: newBalance <= warningThreshold,
      messagekey: sendResult.messagekey,
    });
  },

  async sendWaitingRegistered({ facility, waiting }) {
    const key = registrationTemplateKey();
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
    // 4번: 미입장 자동 취소(no_show/timeout)만
    // 6번: 사용자/관리자 직접 취소(그 외 전부)
    const status = waiting?.status;
    const isNoShow =
      reason === 'no_show' ||
      reason === 'timeout' ||
      status === 'no_show';

    const templateKey = isNoShow ? TEMPLATE.TIMEOUT_CANCEL : TEMPLATE.CANCEL;

    console.log('[kakao sendCancel]', {
      waitingId: waiting?.id,
      status,
      reason,
      templateKey,
    });

    return this.dispatchTemplate({
      facility,
      waiting,
      templateKey,
      extraCtx: {
        cancelledAt: waiting?.cancelled_at || waiting?.cancelledAt || new Date(),
        entryWaitMinutes: Math.max(
          1,
          Number(facility.entry_wait_minutes || facility.entryWaitMinutes || 5)
        ),
      },
    });
  },

  async sendPostponeDone({ facility, waiting, newOrder }) {
    return this.dispatchTemplate({
      facility,
      waiting,
      templateKey: TEMPLATE.POSTPONE_DONE,
      extraCtx: {
        newOrder,
        postponeLimit: facility.postpone_limit || facility.postponeLimit,
      },
    });
  },

  async sendImminentEntry({ facility, waiting, remainingOrder, aheadCount }) {
    const notificationOrder = Number(
      remainingOrder ??
        facility.waiting_notification_order ??
        facility.waitingNotificationOrder
    );
    return this.dispatchTemplate({
      facility,
      waiting,
      templateKey: TEMPLATE.APPROACHING,
      extraCtx: {
        remainingOrder: notificationOrder,
        // 관리자 설정의 "입장 대기 알림 순번" (현재 큐 순번과 혼동 금지)
        notificationOrder,
        aheadCount,
        waitingId: waiting?.id || waiting?.waitingId || '',
      },
    });
  },

  /**
   * 시설 관리자 + 시스템 관리자 연락처로 충전/환불 안내 발송 (잔액 차감 없음)
   */
  async sendAdminBalanceNotice({
    facility,
    templateKey,
    amount,
    balanceAfter,
    eventAt = new Date(),
  }) {
    const { systemSettingsRepository } = await import(
      '../repositories/systemSettingsRepository.js'
    );
    const templateName = templateDisplayName(templateKey);
    const templateCode = getTemplateCode(templateKey);
    if (!templateCode) {
      return withReason({
        ok: false,
        reason: 'API_ERROR',
        detail: `MISSING_TEMPLATE templateKey=${templateKey}`,
      });
    }

    const systemContact = await systemSettingsRepository.getAdminContact();
    const phones = [
      facility.admin_contact || facility.adminContact,
      systemContact,
    ]
      .map((p) => String(p || '').replace(/\D/g, ''))
      .filter((p) => p.length >= 10);

    const uniquePhones = [...new Set(phones)];
    if (uniquePhones.length === 0) {
      console.warn('[ppurio] no admin recipients for', templateKey);
      return withReason({
        ok: false,
        reason: 'API_ERROR',
        detail: 'NO_ADMIN_RECIPIENTS',
        message: '시설/시스템 관리자 연락처가 없어 알림톡을 발송하지 못했습니다.',
      });
    }

    const changeWord = buildChangeWord(templateKey, {
      facilityName: facility.name,
      amount,
      balanceAfter,
      eventAt,
    });
    const useLive = isPpurioConfigured();
    const results = [];

    for (const to of uniquePhones) {
      const refKey = `a_${String(facility.id || '').replace(/-/g, '').slice(0, 12)}_${Date.now()
        .toString()
        .slice(-8)}`;
      const payload = {
        templateKey,
        templateName,
        templateCode,
        to,
        changeWord,
        refKey,
        live: useLive,
        adminNotice: true,
      };

      let sendResult = { ok: true, mock: !useLive };
      if (useLive) {
        try {
          sendResult = await sendAlimtalk({
            to,
            templateCode,
            changeWord,
            refKey,
            isResend: 'N',
          });
        } catch (err) {
          console.error('[ppurio] admin notice exception', err?.message || err);
          sendResult = { ok: false, message: String(err?.message || err) };
        }
      } else {
        console.log('[Kakao Alimtalk MOCK] admin notice', payload);
      }

      await query(
        `INSERT INTO notification_logs (facility_id, waiting_id, channel, payload, status)
         VALUES ($1, NULL, 'kakao', $2, $3)`,
        [
          facility.id,
          JSON.stringify({ ...payload, ppurio: sendResult }),
          sendResult.ok ? 'sent' : 'failed',
        ]
      );
      results.push({ to, ok: !!sendResult.ok, sendResult });
    }

    const ok = results.some((r) => r.ok);
    return withReason({
      ok,
      reason: useLive ? (ok ? 'SUCCESS' : 'API_ERROR') : 'MOCK',
      mock: !useLive,
      results,
    });
  },

  async sendChargeNotice({ facility, amount, balanceAfter, eventAt }) {
    return this.sendAdminBalanceNotice({
      facility,
      templateKey: TEMPLATE.CHARGE,
      amount,
      balanceAfter,
      eventAt,
    });
  },

  async sendRefundNotice({ facility, amount, balanceAfter, eventAt }) {
    return this.sendAdminBalanceNotice({
      facility,
      templateKey: TEMPLATE.REFUND,
      amount,
      balanceAfter,
      eventAt,
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
        console.warn(
          '[imminent notify] send failed',
          result.reason,
          result.detail || result.code || result.message
        );
      }
      return result;
    } catch (err) {
      console.error('[imminent notify] unexpected error', err);
      return withReason({
        ok: false,
        reason: 'EXCEPTION',
        detail: String(err?.message || err),
        error: String(err?.message || err),
      });
    }
  },

  /**
   * usage_history 원본 페이로드(동일 템플릿/변수)로 알림톡을 다시 발송한다.
   *
   * 주의: 뿌리오 `isResend=Y` 는 SMS 대체발송 옵션이며, 이 경우 `resend` 객체가 필수다.
   * UI [재발송]은 동일 알림톡을 다시 보내는 것이므로 isResend=N 으로 일반 발송한다.
   */
  async resendFromUsage(usageId, { facilityCode } = {}) {
    const usage = await billingRepository.findUsageById(usageId);
    if (!usage || usage.type !== 'send') {
      throw createError(404, '발송 내역을 찾을 수 없습니다.');
    }
    if (facilityCode && usage.facility_code !== facilityCode) {
      throw createError(403, '해당 시설사의 발송 내역이 아닙니다.');
    }

    const facility = await facilityRepository.findById(usage.facility_id);
    if (!facility) throw createError(404, '시설사를 찾을 수 없습니다.');

    let payload = usage.send_payload;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        payload = null;
      }
    }
    if (!payload || typeof payload !== 'object') {
      const { rows } = await query(
        `SELECT payload FROM notification_logs
         WHERE facility_id = $1 AND waiting_id = $2
         ORDER BY created_at DESC NULLS LAST
         LIMIT 1`,
        [usage.facility_id, usage.waiting_id]
      );
      payload = rows[0]?.payload || null;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          payload = null;
        }
      }
    }
    if (!payload?.templateCode && !payload?.templateKey) {
      await billingRepository.updateResendResult(usageId, {
        status: 'fail',
        error: '원본 발송 정보가 없어 재발송할 수 없습니다.',
      });
      throw createError(400, '원본 발송 정보가 없어 재발송할 수 없습니다.');
    }

    const templateKey = payload.templateKey || null;
    const templateName =
      payload.templateName || usage.template_name || templateDisplayName(templateKey) || '알림톡';
    const templateCode = payload.templateCode || getTemplateCode(templateKey);
    const to = payload.to || usage.recipient_phone;
    const changeWord = payload.changeWord || {};
    const refKey = `r_${String(usage.id || '').replace(/-/g, '').slice(0, 24)}`;
    const unitCost = Number(facility.kakao_unit_cost || 20);
    const balance = Number(facility.kakao_balance || 0);

    if (!to) {
      await billingRepository.updateResendResult(usageId, {
        status: 'fail',
        error: '수신번호가 없습니다.',
      });
      throw createError(400, '수신번호가 없습니다.');
    }
    if (!templateCode) {
      await billingRepository.updateResendResult(usageId, {
        status: 'fail',
        error: '템플릿 코드가 없습니다.',
      });
      throw createError(400, '템플릿 코드가 없습니다.');
    }
    if (balance < unitCost) {
      await billingRepository.updateResendResult(usageId, {
        status: 'fail',
        error: '충전금액이 소진되어 재발송할 수 없습니다.',
      });
      await billingRepository.logFailedSend(facility.id, usage.waiting_id, unitCost, {
        templateName: `${templateName} (재발송)`,
        recipientPhone: to,
        note: '충전금액 소진으로 재발송 실패',
        sendPayload: payload,
      });
      throw createError(400, '충전금액이 소진되어 재발송할 수 없습니다.');
    }

    const useLive = isPpurioConfigured();
    const resendPayload = {
      ...payload,
      templateKey,
      templateName,
      templateCode,
      to,
      changeWord,
      refKey,
      live: useLive,
      // 동일 알림톡 재전송(일반 발송). 뿌리오 isResend=Y 는 SMS 대체발송용.
      isResend: false,
    };

    let sendResult = { ok: true, mock: !useLive };
    if (useLive) {
      try {
        sendResult = await sendAlimtalk({
          to,
          templateCode,
          changeWord,
          refKey,
          isResend: 'N',
        });
        resendPayload.ppurio = {
          ok: sendResult.ok,
          code: sendResult.code,
          messagekey: sendResult.messagekey,
          error: sendResult.message,
        };
      } catch (err) {
        sendResult = {
          ok: false,
          exception: true,
          message: String(err?.message || err),
        };
        resendPayload.ppurio = sendResult;
      }
    }

    if (!useLive || sendResult.ok) {
      await billingRepository.deductForSend(facility.id, usage.waiting_id, unitCost, {
        templateName: `${templateName} (재발송${useLive ? '' : ' MOCK'})`,
        recipientPhone: to,
        sendStatus: 'success',
        note: '카카오 알림톡 재발송',
        sendPayload: resendPayload,
      });
      await query(
        `INSERT INTO notification_logs (facility_id, waiting_id, channel, payload, status)
         VALUES ($1, $2, 'kakao', $3, 'sent')`,
        [facility.id, usage.waiting_id, JSON.stringify(resendPayload)]
      );
      const updated = await billingRepository.updateResendResult(usageId, {
        status: 'success',
        error: null,
      });
      return {
        ok: true,
        mock: !useLive,
        item: updated,
        message: useLive ? '재발송에 성공했습니다.' : '재발송 완료 (MOCK)',
      };
    }

    const errMsg = sendResult.message || '재발송에 실패했습니다.';
    await billingRepository.logFailedSend(facility.id, usage.waiting_id, unitCost, {
      templateName: `${templateName} (재발송)`,
      recipientPhone: to,
      note: errMsg,
      sendPayload: resendPayload,
    });
    await query(
      `INSERT INTO notification_logs (facility_id, waiting_id, channel, payload, status)
       VALUES ($1, $2, 'kakao', $3, 'failed')`,
      [facility.id, usage.waiting_id, JSON.stringify(resendPayload)]
    );
    await billingRepository.updateResendResult(usageId, {
      status: 'fail',
      error: errMsg,
    });
    throw createError(400, errMsg);
  },
};
