import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import Toast from '../../components/Toast';
import PostponeLastModal from '../../components/customer/PostponeLastModal';
import CompleteCloseHeader from '../../components/customer/complete/CompleteCloseHeader';
import CompleteFacilityInfo from '../../components/customer/complete/CompleteFacilityInfo';
import CompleteWaitingStatus from '../../components/customer/complete/CompleteWaitingStatus';
import CompleteActionButtons from '../../components/customer/complete/CompleteActionButtons';
import CompleteCallNotice from '../../components/customer/complete/CompleteCallNotice';
import CompleteCancelledAlert from '../../components/customer/complete/CompleteCancelledAlert';
import CompleteAdArea from '../../components/customer/complete/CompleteAdArea';
import CompleteStoreNotice from '../../components/customer/complete/CompleteStoreNotice';
import { themeStyle } from '../../theme/customerTheme';

const CANCELLED_STATUSES = new Set(['cancelled', 'admin_cancelled', 'no_show']);

function formatRegisteredAt(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hour = d.getHours();
  const ampm = hour < 12 ? '오전' : '오후';
  const h12 = hour % 12 || 12;
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `대기 등록 ${yyyy}.${mm}.${dd} ${ampm} ${String(h12).padStart(2, '0')}:${mi}`;
}

export default function CompletePage() {
  const { facilityCode, waitingId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [toast, setToast] = useState('');
  const [lastModal, setLastModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancelledAlert, setCancelledAlert] = useState(false);

  const leavePage = useCallback(() => {
    setCancelledAlert(false);
    navigate(`/w/${facilityCode}`, { replace: true });
  }, [facilityCode, navigate]);

  const load = useCallback(async () => {
    const result = await api(
      `/facilities/${facilityCode}/waitings/${waitingId}/complete`
    );
    setData(result);
    if (CANCELLED_STATUSES.has(result?.waiting?.status)) {
      setCancelledAlert(true);
    }
    return result;
  }, [facilityCode, waitingId]);

  useEffect(() => {
    load().catch((e) => setToast(e.message));
  }, [load]);

  // 호출 상태 반영을 위해 pending 동안 주기적으로 최신 상태 조회
  useEffect(() => {
    if (!data || data.waiting?.status !== 'pending') return undefined;
    const id = setInterval(() => {
      load().catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, [data?.waiting?.status, load]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const cancelWaiting = async () => {
    setLoading(true);
    try {
      await api(`/facilities/${facilityCode}/waitings/${waitingId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ by: 'customer' }),
      });
      await load();
    } catch (e) {
      showToast(e.message);
    } finally {
      setLoading(false);
    }
  };

  const onPostponeClick = () => {
    if (!data?.canPostpone) {
      showToast('미루기 허용 횟수를 모두 사용했습니다.');
      return;
    }
    if (data.facility.postponePolicy === 'select_position') {
      navigate(`/w/${facilityCode}/complete/${waitingId}/postpone`);
      return;
    }
    if (data.facility.postponePolicy === 'last_position') {
      setLastModal(true);
    }
  };

  const confirmLastPostpone = async () => {
    setLoading(true);
    try {
      const result = await api(
        `/facilities/${facilityCode}/waitings/${waitingId}/postpone`,
        { method: 'POST', body: JSON.stringify({ mode: 'last' }) }
      );
      setData(result);
      setLastModal(false);
      showToast('마지막 순서로 미뤘습니다.');
    } catch (e) {
      showToast(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!data) {
    return (
      <div className="flex min-h-dvh w-full max-w-[100vw] items-center justify-center overflow-x-hidden bg-[#f7f5ff] px-4 text-gray-400">
        {toast || 'Loading...'}
      </div>
    );
  }

  const { facility, waiting } = data;
  const isCancelled = CANCELLED_STATUSES.has(waiting.status);
  const isPending = waiting.status === 'pending';
  const showPostpone = facility.postponePolicy !== 'none' && isPending;
  const showCallNotice =
    isPending && Boolean(waiting.calledAt && waiting.entryDeadlineLabel);
  const theme = facility.theme === 'dark' ? 'dark' : 'light';
  const style = themeStyle(theme);

  // 취소된 건: 본문 숨기고 알럿만
  if (isCancelled || cancelledAlert) {
    return (
      <div
        className="min-h-dvh w-full max-w-[100vw] overflow-x-hidden font-['Pretendard','Noto_Sans_KR',sans-serif]"
        style={{
          ...style,
          background: `linear-gradient(to bottom right, var(--cw-bg), var(--cw-bg-mid), var(--cw-bg-end))`,
        }}
      >
        <CompleteCancelledAlert open onConfirm={leavePage} />
      </div>
    );
  }

  return (
    <div
      className="min-h-dvh w-full max-w-[100vw] overflow-x-hidden font-['Pretendard','Noto_Sans_KR',sans-serif]"
      style={{
        ...style,
        background: `linear-gradient(to bottom right, var(--cw-bg), var(--cw-bg-mid), var(--cw-bg-end))`,
      }}
    >
      <Toast message={toast} visible={!!toast} />
      <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 py-4 box-border sm:px-6 sm:py-5 md:max-w-[640px] md:px-8 md:py-8">
        <CompleteCloseHeader
          onClose={() => {
            if (window.history.length > 1) navigate(-1);
            else navigate(`/w/${facilityCode}`);
          }}
        />

        <CompleteFacilityInfo
          name={facility.name}
          imageUrl={facility.profileImageUrl}
          registeredLabel={formatRegisteredAt(waiting.registeredAt)}
        />

        <CompleteWaitingStatus
          order={waiting.order}
          dailySeq={waiting.dailySeq}
          totalCount={waiting.totalCount}
          statusLabel={waiting.statusLabel}
          isPending={isPending}
          onRefresh={() => load().catch((e) => showToast(e.message))}
        >
          {showCallNotice && (
            <CompleteCallNotice deadlineLabel={waiting.entryDeadlineLabel} />
          )}
          {isPending && (
            <CompleteActionButtons
              showPostpone={showPostpone}
              loading={loading}
              canPostpone={data.canPostpone}
              onCancel={cancelWaiting}
              onPostpone={onPostponeClick}
            />
          )}
        </CompleteWaitingStatus>

        <CompleteStoreNotice text={facility.storeNotice} />
        <CompleteAdArea visible={facility.adAreaEnabled !== false} />

        <div className="mt-auto flex justify-center pb-2 pt-8">
          <img
            src="/tbridge_logo.png"
            alt="T BRIDGE"
            className="h-auto w-[min(140px,40vw)] opacity-90"
          />
        </div>
      </div>

      {lastModal && (
        <PostponeLastModal
          currentOrder={waiting.order}
          lastOrder={data.lastPosition}
          remaining={data.remainingPostpone}
          loading={loading}
          onClose={() => setLastModal(false)}
          onConfirm={confirmLastPostpone}
        />
      )}
    </div>
  );
}
