import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import Toast from '../../components/Toast';
import CloseButton from '../../components/customer/CloseButton';

export default function PostponePage() {
  const { facilityCode, waitingId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api(`/facilities/${facilityCode}/waitings/${waitingId}/complete`)
      .then(setData)
      .catch((e) => setToast(e.message));
  }, [facilityCode, waitingId]);

  const submit = async () => {
    setLoading(true);
    try {
      await api(`/facilities/${facilityCode}/waitings/${waitingId}/postpone`, {
        method: 'POST',
        body: JSON.stringify({ mode: 'select', targetWaitingId: selectedId }),
      });
      navigate(`/w/${facilityCode}/complete/${waitingId}`, { replace: true });
    } catch (e) {
      setToast(e.message);
      setTimeout(() => setToast(''), 2500);
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  if (!data) return <div className="center-page">{toast || 'Loading...'}</div>;

  const limit = data.facility.postponeLimit;

  return (
    <div className="complete-page postpone-page">
      <Toast message={toast} visible={!!toast} />
      <header className="complete-header">
        <span />
        <CloseButton
          onClick={() => navigate(`/w/${facilityCode}/complete/${waitingId}`)}
          imgClassName="h-7 w-7"
        />
      </header>

      <p className="postpone-guide">
        제 시간에 도착이 어렵다면, 내 순서를 미뤄 보세요.
      </p>

      <div className="complete-order-card">
        <div className="complete-order-head">
          <span>현재 내 순서</span>
        </div>
        <div className="complete-order-main">{data.waiting.order}번째</div>
      </div>

      <div className="postpone-list">
        {(data.laterPositions || []).map((item) => (
          <label key={item.id} className="postpone-option">
            <input
              type="radio"
              name="target"
              value={item.id}
              checked={selectedId === item.id}
              onChange={() => setSelectedId(item.id)}
            />
            <span>
              {item.order}번째 · 대기번호 {item.dailySeq}번 · 인원 {item.totalCount}명
            </span>
          </label>
        ))}
        {!data.laterPositions?.length && (
          <div className="empty-list">미룰 수 있는 뒤 순서가 없습니다.</div>
        )}
      </div>

      <footer className="postpone-footer">
        <p>순서를 {limit}번 미룰 수 있는 매장이에요.</p>
        <button
          type="button"
          className="btn-primary full"
          disabled={!selectedId || loading}
          onClick={() => setConfirmOpen(true)}
        >
          순서 미루기
        </button>
      </footer>

      {confirmOpen && (
        <div className="modal-backdrop" onClick={() => setConfirmOpen(false)}>
          <div className="modal-card relative" onClick={(e) => e.stopPropagation()}>
            <CloseButton
              onClick={() => setConfirmOpen(false)}
              className="absolute right-4 top-4"
              imgClassName="h-6 w-6"
            />
            <h2>선택한 순서로 변경할까요?</h2>
            <p>
              순서는 최대 {limit}번까지 미룰 수 있으며 잦은 순서 변경은 매장에 피해가 갈 수
              있어요
            </p>
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setConfirmOpen(false)}>
                취소
              </button>
              <button type="button" className="btn-primary" disabled={loading} onClick={submit}>
                순서 미루기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
