import CloseButton from './CloseButton';

export default function PostponeLastModal({
  currentOrder,
  lastOrder,
  remaining,
  loading,
  onClose,
  onConfirm,
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card postpone-last-modal relative" onClick={(e) => e.stopPropagation()}>
        <CloseButton
          onClick={onClose}
          className="absolute right-4 top-4"
          imgClassName="h-6 w-6"
        />
        <h2>마지막 순서로 미룰까요?</h2>
        <p>맨 마지막 순서로만 미룰 수 있도록 설정한 매장입니다.</p>

        <div className="postpone-compare">
          <div>
            <strong>{currentOrder}번째 입장 예정</strong>
            <span className="badge">현재</span>
          </div>
          <div>
            <strong>{lastOrder}번째 입장 예정</strong>
            <span className="badge change">변경</span>
          </div>
        </div>

        <p className="remaining">이 매장에 남은 미루기 : {remaining}회</p>

        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>
            아니요
          </button>
          <button type="button" className="btn-primary" disabled={loading} onClick={onConfirm}>
            네, 미룰게요
          </button>
        </div>
      </div>
    </div>
  );
}
