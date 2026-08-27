import ExcelJS from 'exceljs';
import { facilityRepository } from '../repositories/facilityRepository.js';
import { waitingRepository } from '../repositories/waitingRepository.js';
import { customerRepository } from '../repositories/customerRepository.js';
import { kakaoService } from './kakaoService.js';
import { createError } from '../middleware/errorHandler.js';

function toastForRegisterKakao(kakaoResult) {
  switch (kakaoResult?.reason) {
    case 'SUCCESS':
      return '웨이팅 등록 완료! 카카오 알림톡을 발송했어요.';
    case 'MOCK':
      return '웨이팅 등록 완료!';
    case 'INSUFFICIENT_BALANCE':
      return '웨이팅 등록 완료! (알림톡 잔액 부족으로 발송되지 않았습니다.)';
    case 'API_ERROR':
    case 'EXCEPTION':
      return '웨이팅 등록 완료! (알림톡 발송 중 오류가 발생했습니다. 관리자에게 문의해주세요.)';
    default:
      if (kakaoResult?.ok && kakaoResult?.mock) return '웨이팅 등록 완료!';
      if (kakaoResult?.ok) return '웨이팅 등록 완료! 카카오 알림톡을 발송했어요.';
      return '웨이팅 등록 완료! (알림톡 발송 중 오류가 발생했습니다. 관리자에게 문의해주세요.)';
  }
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function isValidPhone(phone) {
  return /^01[016789]\d{7,8}$/.test(phone);
}

function formatPhone(phone) {
  const p = normalizePhone(phone);
  if (p.length === 11) return `${p.slice(0, 3)}-${p.slice(3, 7)}-${p.slice(7)}`;
  if (p.length === 10) return `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}`;
  return phone;
}

function statusLabel(status) {
  switch (status) {
    case 'pending':
      return '대기 중';
    case 'completed':
      return '대기완료';
    case 'cancelled':
      return '대기 취소';
    case 'admin_cancelled':
      return '관리자 취소';
    case 'no_show':
      return '미입장';
    default:
      return status;
  }
}

function endLabel(row) {
  if (row.status === 'completed' && row.completed_at) return '대기완료';
  if (row.status === 'no_show') return '미입장';
  if (row.cancelled_by === 'admin' || row.status === 'admin_cancelled') return '관리자 취소';
  if (row.cancelled_by === 'customer' || row.status === 'cancelled') return '대기 취소';
  if (row.status === 'admin_cancelled') return '관리자 취소';
  if (row.status === 'cancelled') return '대기 취소';
  return null;
}

function mapWaiting(row, index = 0) {
  const endAt = row.completed_at || row.cancelled_at;
  const waitMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(row.registered_at).getTime()) / 60000)
  );
  const totalWaitSeconds =
    row.wait_seconds != null
      ? Number(row.wait_seconds)
      : endAt
        ? Math.max(0, Math.floor((new Date(endAt) - new Date(row.registered_at)) / 1000))
        : Math.max(0, Math.floor((Date.now() - new Date(row.registered_at)) / 1000));

  const facilityCode = row.facility_code;
  const completePageLink =
    row.complete_page_link ||
    (facilityCode ? `/w/${facilityCode}/complete/${row.id}` : null);
  const cancelPageLink = completePageLink ? `${completePageLink}/cancel` : null;
  const postponePageLink = completePageLink ? `${completePageLink}/postpone` : null;

  return {
    id: row.id,
    facilityId: row.facility_id,
    facilityName: row.facility_name,
    facilityCode,
    dailySeq: row.daily_seq,
    phone: row.phone,
    phoneDisplay: formatPhone(row.phone),
    partyCounts: row.party_counts,
    totalCount: row.total_count,
    status: row.status,
    statusLabel: statusLabel(row.status),
    marketingAgreed: row.marketing_agreed,
    marketingAgreedAt: row.marketing_agreed_at || null,
    termsAgreed: row.terms_agreed ?? row.marketing_agreed,
    termsOfUseAgreed: row.terms_of_use_agreed ?? row.terms_agreed ?? false,
    termsOfUseAgreedAt: row.terms_of_use_agreed_at || null,
    privacyAgreed: row.privacy_agreed ?? row.terms_agreed ?? false,
    privacyAgreedAt: row.privacy_agreed_at || null,
    registeredAt: row.registered_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    cancelReason: row.cancel_reason,
    cancelledBy: row.cancelled_by,
    entryDate: row.entry_date,
    order: index + 1,
    waitMinutes,
    totalWaitSeconds,
    endLabel: endLabel(row),
    completePageLink,
    cancelPageLink,
    postponePageLink,
    postponeCount: row.postpone_count || 0,
    queueOrder: row.queue_order,
    kakaoSentAt: row.kakao_sent_at,
    calledAt: row.called_at || null,
    callDeadlineAt: row.call_deadline_at || null,
    isCalling: Boolean(row.called_at && row.call_deadline_at),
    isCallMissed:
      Boolean(row.called_at && row.call_deadline_at) &&
      new Date(row.call_deadline_at).getTime() <= Date.now(),
  };
}

function resolveFacility(facilityCode) {
  return facilityRepository.findByCode(facilityCode);
}

async function getQueuePosition(facilityId, waitingId) {
  const pending = await waitingRepository.listPending(facilityId);
  const index = pending.findIndex((w) => w.id === waitingId);
  return { pending, position: index >= 0 ? index + 1 : null };
}

export const waitingService = {
  async getBoard(facilityCode) {
    const facility = await resolveFacility(facilityCode);
    if (!facility) throw createError(404, '시설사를 찾을 수 없습니다.');

    const counts = await waitingRepository.getStatusCounts(facility.id);
    const [pending, completed, cancelled] = await Promise.all([
      waitingRepository.listByStatus(facility.id, 'pending'),
      waitingRepository.listByStatus(facility.id, 'completed'),
      waitingRepository.listByStatus(facility.id, 'cancelled'),
    ]);

    const mappedPending = pending.map((r, i) => mapWaiting(r, i));
    const mappedCompleted = completed.map((r, i) => mapWaiting(r, i));
    const entryWaitMinutes = Math.max(1, Number(facility.entry_wait_minutes || 5));

    // 호출 중(pending + calledAt) 우선, 없으면 최근 입장완료(입장하기) 팀을 표시
    let currentlyCalled =
      mappedPending
        .filter((w) => w.calledAt)
        .sort((a, b) => new Date(b.calledAt) - new Date(a.calledAt))[0] || null;

    if (!currentlyCalled && mappedCompleted[0]?.completedAt) {
      const ageMs =
        Date.now() - new Date(mappedCompleted[0].completedAt).getTime();
      if (ageMs <= entryWaitMinutes * 60 * 1000) {
        currentlyCalled = mappedCompleted[0];
      }
    }

    return {
      counts,
      entryWaitMinutes,
      currentlyCalled,
      pending: mappedPending,
      completed: mappedCompleted,
      cancelled: cancelled.map((r, i) => mapWaiting(r, i)),
    };
  },

  async call(facilityCode, waitingId) {
    const facility = await resolveFacility(facilityCode);
    if (!facility) throw createError(404, '시설사를 찾을 수 없습니다.');
    const existing = await waitingRepository.findById(waitingId);
    if (!existing || existing.facility_id !== facility.id) {
      throw createError(404, '대기 정보를 찾을 수 없습니다.');
    }
    if (existing.status !== 'pending') {
      throw createError(400, '대기 중인 항목만 호출할 수 있습니다.');
    }

    const minutes = Math.max(1, Number(facility.entry_wait_minutes || 5));
    const deadlineAt = new Date(Date.now() + minutes * 60 * 1000);
    const updated = await waitingRepository.call(waitingId, deadlineAt);
    if (!updated) throw createError(400, '대기 중인 항목만 호출할 수 있습니다.');

    void kakaoService.sendCallEntry({ facility, waiting: updated });
    void kakaoService.notifyImminentEntries(facility);

    return {
      waiting: mapWaiting(updated),
      entryWaitMinutes: minutes,
      toast: `${updated.daily_seq}번 팀을 호출했습니다.`,
    };
  },

  async register(facilityCode, payload) {
    const facility = await resolveFacility(facilityCode);
    if (!facility) throw createError(404, '시설사를 찾을 수 없습니다.');

    const phone = normalizePhone(payload.phone);
    if (!isValidPhone(phone)) {
      throw createError(400, '올바른 휴대폰 번호를 입력해 주세요.');
    }

    // 하위 호환: termsAgreed 단일 플래그면 이용약관+개인정보 둘 다 동의로 매핑
    const legacyTerms = payload.termsAgreed === true;
    const termsOfUseAgreed = !!(payload.termsOfUseAgreed ?? legacyTerms);
    const privacyAgreed = !!(payload.privacyAgreed ?? legacyTerms);
    if (!termsOfUseAgreed || !privacyAgreed) {
      throw createError(400, '필수 약관에 동의해 주세요.');
    }
    const marketingAgreed = !!payload.marketingAgreed;

    const partyCounts = payload.partyCounts || {};
    const totalCount = Object.values(partyCounts).reduce((sum, n) => sum + Number(n || 0), 0);
    if (totalCount < 1) throw createError(400, '입장 인원을 1명 이상 선택해 주세요.');

    const dailySeq = await waitingRepository.getNextDailySeq(facility.id);
    const queueOrder = await waitingRepository.getNextQueueOrder(facility.id);
    let waiting = await waitingRepository.create({
      facilityId: facility.id,
      dailySeq,
      phone,
      partyCounts,
      totalCount,
      termsAgreed: true,
      termsOfUseAgreed: true,
      privacyAgreed: true,
      marketingAgreed,
      queueOrder,
      completePageLink: null,
    });

    const completePageLink = `/w/${facilityCode}/complete/${waiting.id}`;
    waiting = await waitingRepository.updateCompleteLink(waiting.id, completePageLink);

    await customerRepository.upsert({
      facilityId: facility.id,
      phone,
      marketingAgreed,
      registeredAt: waiting.registered_at,
    });

    const kakaoResult = await kakaoService.sendWaitingRegistered({ facility, waiting });
    waiting = await waitingRepository.findById(waiting.id);

    const { position } = await getQueuePosition(facility.id, waiting.id);

    return {
      waiting: { ...mapWaiting(waiting), order: position },
      completePageLink,
      kakao: kakaoResult,
      toast: toastForRegisterKakao(kakaoResult),
    };
  },

  async getCompletePage(facilityCode, waitingId) {
    const facility = await resolveFacility(facilityCode);
    if (!facility) throw createError(404, '시설사를 찾을 수 없습니다.');
    const waiting = await waitingRepository.findById(waitingId);
    if (!waiting || waiting.facility_id !== facility.id) {
      throw createError(404, '웨이팅 정보를 찾을 수 없습니다.');
    }

    const { pending, position } = await getQueuePosition(facility.id, waitingId);
    const postponePolicy = facility.postpone_policy || 'none';
    const postponeLimit = Number(facility.postpone_limit || 3);
    const postponeCount = Number(waiting.postpone_count || 0);

    return {
      facility: {
        name: facility.name,
        profileImageUrl: facility.profile_image_url,
        facilityCode: facility.facility_code,
        brandDisplayMode: 'image_text',
        theme: facility.theme === 'dark' ? 'dark' : 'light',
        postponePolicy,
        postponeLimit,
        storeNotice: facility.store_notice || '',
        adAreaEnabled: facility.ad_area_enabled !== false,
      },
      waiting: {
        ...mapWaiting(waiting, Math.max((position || 1) - 1, 0)),
        order: position,
      },
      canPostpone:
        waiting.status === 'pending' &&
        postponePolicy !== 'none' &&
        postponeCount < postponeLimit,
      remainingPostpone: Math.max(postponeLimit - postponeCount, 0),
      laterPositions:
        waiting.status === 'pending'
          ? pending
              .map((r, i) => mapWaiting(r, i))
              .filter((item) => item.order > (position || 0))
          : [],
      lastPosition: pending.length,
    };
  },

  async complete(facilityCode, waitingId) {
    const facility = await resolveFacility(facilityCode);
    if (!facility) throw createError(404, '시설사를 찾을 수 없습니다.');
    const existing = await waitingRepository.findById(waitingId);
    if (!existing || existing.facility_id !== facility.id) {
      throw createError(404, '대기 정보를 찾을 수 없습니다.');
    }
    const updated = await waitingRepository.complete(waitingId);
    if (!updated) throw createError(400, '대기 중인 항목만 완료 처리할 수 있습니다.');
    await waitingRepository.renumberPendingQueue(facility.id);
    void kakaoService.notifyImminentEntries(facility);
    return {
      waiting: mapWaiting(updated),
      toast: '대기완료 리스트로 이동하였습니다.',
    };
  },

  async cancel(facilityCode, waitingId, { by = 'admin', reason } = {}) {
    const facility = await resolveFacility(facilityCode);
    if (!facility) throw createError(404, '시설사를 찾을 수 없습니다.');
    const existing = await waitingRepository.findById(waitingId);
    if (!existing || existing.facility_id !== facility.id) {
      throw createError(404, '대기 정보를 찾을 수 없습니다.');
    }

    const cancelledBy = by === 'customer' ? 'customer' : 'admin';
    const status =
      reason === 'no_show'
        ? 'no_show'
        : cancelledBy === 'admin'
          ? 'admin_cancelled'
          : 'cancelled';

    const updated = await waitingRepository.cancel(waitingId, { status, cancelledBy });
    if (!updated) throw createError(400, '대기 중인 항목만 취소할 수 있습니다.');
    await waitingRepository.clearImminentNotified(waitingId);
    await waitingRepository.renumberPendingQueue(facility.id);
    void kakaoService.sendCancel({ facility, waiting: updated, reason });
    void kakaoService.notifyImminentEntries(facility);
    return {
      waiting: mapWaiting(updated),
      toast: '대기취소 리스트로 이동하였습니다.',
    };
  },

  async postpone(facilityCode, waitingId, { mode, targetWaitingId } = {}) {
    const facility = await resolveFacility(facilityCode);
    if (!facility) throw createError(404, '시설사를 찾을 수 없습니다.');
    const waiting = await waitingRepository.findById(waitingId);
    if (!waiting || waiting.facility_id !== facility.id) {
      throw createError(404, '웨이팅 정보를 찾을 수 없습니다.');
    }
    if (waiting.status !== 'pending') {
      throw createError(400, '대기 중인 웨이팅만 미룰 수 있습니다.');
    }

    const policy = facility.postpone_policy || 'none';
    const limit = Number(facility.postpone_limit || 3);
    if (policy === 'none') throw createError(400, '미루기가 허용되지 않은 매장입니다.');
    if (Number(waiting.postpone_count || 0) >= limit) {
      throw createError(400, '미루기 허용 횟수를 모두 사용했습니다.');
    }

    let pending = await waitingRepository.listPending(facility.id);
    const currentIndex = pending.findIndex((w) => w.id === waitingId);
    if (currentIndex < 0) throw createError(400, '대기열에서 찾을 수 없습니다.');

    if (mode === 'last' || policy === 'last_position') {
      const [moved] = pending.splice(currentIndex, 1);
      pending.push(moved);
    } else if (mode === 'select' || policy === 'select_position') {
      if (!targetWaitingId) throw createError(400, '미룰 순서를 선택해 주세요.');
      const targetIndex = pending.findIndex((w) => w.id === targetWaitingId);
      if (targetIndex < 0 || targetIndex <= currentIndex) {
        throw createError(400, '현재 순서보다 뒤의 순서를 선택해 주세요.');
      }
      const [moved] = pending.splice(currentIndex, 1);
      // after removal, target index shifts left by 1 if target was after current
      const insertAt = pending.findIndex((w) => w.id === targetWaitingId);
      pending.splice(insertAt + 1, 0, moved);
    } else {
      throw createError(400, '잘못된 미루기 요청입니다.');
    }

    for (let i = 0; i < pending.length; i += 1) {
      await waitingRepository.updateQueueOrder(pending[i].id, i + 1);
    }
    await waitingRepository.incrementPostpone(waitingId);

    const newIndex = pending.findIndex((w) => w.id === waitingId);
    const newOrder = newIndex >= 0 ? newIndex + 1 : pending.length;
    const postponed = await waitingRepository.findById(waitingId);
    if (postponed) {
      void kakaoService.sendPostponeDone({
        facility,
        waiting: postponed,
        newOrder,
      });
    }
    void kakaoService.notifyImminentEntries(facility);
    return this.getCompletePage(facilityCode, waitingId);
  },

  async searchHistory(filters, pagination) {
    if (filters.facilityCode) {
      const facility = await resolveFacility(filters.facilityCode);
      if (!facility) throw createError(404, '시설사를 찾을 수 없습니다.');
      filters.facilityId = facility.id;
    }
    const { rows, total } = await waitingRepository.searchHistory(filters, pagination);
    return {
      items: rows.map((r, i) => mapWaiting(r, i)),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  },

  async exportExcel(filters) {
    if (filters.facilityCode) {
      const facility = await resolveFacility(filters.facilityCode);
      if (!facility) throw createError(404, '시설사를 찾을 수 없습니다.');
      filters.facilityId = facility.id;
    }
    const rows = await waitingRepository.listHistoryForExport(filters);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('대기자 내역');
    sheet.columns = [
      { header: '시설사명', key: 'facilityName', width: 20 },
      { header: '입장일', key: 'entryDate', width: 12 },
      { header: '연락처', key: 'phone', width: 16 },
      { header: '인원 수', key: 'totalCount', width: 10 },
      { header: '등록번호', key: 'dailySeq', width: 10 },
      { header: '링크', key: 'completePageLink', width: 40 },
      { header: '상태', key: 'status', width: 14 },
      { header: '대기 시작', key: 'registeredAt', width: 22 },
      { header: '대기 종료', key: 'endedAt', width: 22 },
      { header: '총 대기시간(초)', key: 'waitSeconds', width: 14 },
      { header: '카카오알림톡 발송시간', key: 'kakaoSentAt', width: 22 },
    ];

    for (const r of rows) {
      const mapped = mapWaiting(r);
      sheet.addRow({
        facilityName: mapped.facilityName,
        entryDate: mapped.entryDate,
        phone: mapped.phoneDisplay,
        totalCount: mapped.totalCount,
        dailySeq: mapped.dailySeq,
        completePageLink: mapped.completePageLink,
        status: mapped.statusLabel,
        registeredAt: mapped.registeredAt,
        endedAt: mapped.completedAt || mapped.cancelledAt || '',
        waitSeconds: mapped.totalWaitSeconds,
        kakaoSentAt: mapped.kakaoSentAt || '',
      });
    }

    return workbook.xlsx.writeBuffer();
  },
};
