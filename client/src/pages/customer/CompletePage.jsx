import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import Toast from '../../components/Toast';
import PostponeLastModal from '../../components/customer/PostponeLastModal';
import CompleteCloseHeader from '../../components/customer/complete/CompleteCloseHeader';
import CompleteFacilityInfo from '../../components/customer/complete/CompleteFacilityInfo';
import CompleteWaitingStatus from '../../components/customer/complete/CompleteWaitingStatus';
import CompleteActionButtons from '../../components/customer/complete/CompleteActionButtons';
import CompleteAdArea from '../../components/customer/complete/CompleteAdArea';

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

  const load = useCallback(async () => {
    const result = await api(
      `/facilities/${facilityCode}/waitings/${waitingId}/complete`
    );
    setData(result);
    return result;
  }, [facilityCode, waitingId]);

  useEffect(() => {
    load().catch((e) => setToast(e.message));
  }, [load]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const cancelWaiting = async () => {
    if (!window.confirm('대기 등록을 취소할까요?')) return;
    setLoading(true);
    try {
      await api(`/facilities/${facilityCode}/waitings/${waitingId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ by: 'customer' }),
      });
      showToast('대기 등록이 취소되었습니다.');
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
      <div className="flex min-h-screen min-w-[768px] items-center justify-center bg-[#f7f5ff] text-gray-400">
        {toast || 'Loading...'}
      </div>
    );
  }

  const { facility, waiting } = data;
  const isPending = waiting.status === 'pending';
  const showPostpone = facility.postponePolicy !== 'none' && isPending;

  return (
    <div className="min-h-screen min-w-[768px] bg-gradient-to-br from-[#f3f0ff] via-[#faf9ff] to-white font-['Pretendard','Noto_Sans_KR',sans-serif]">
      <Toast message={toast} visible={!!toast} />
      <div className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col px-6 py-5 md:max-w-[640px] md:px-8 md:py-8">
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

        <CompleteAdArea />
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
