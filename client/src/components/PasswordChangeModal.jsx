import { useEffect, useState } from 'react';
import AdminCloseIcon from './admin/AdminCloseIcon';
import PasswordChecklist from './PasswordChecklist';
import { validatePassword } from '../utils/passwordPolicy';

const empty = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

/**
 * 비밀번호 변경 모달 (시설/시스템 관리자 공통)
 */
export default function PasswordChangeModal({
  open,
  username,
  saving = false,
  onClose,
  onSubmit,
  onError,
}) {
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (open) setForm(empty);
  }, [open]);

  if (!open) return null;

  const filled =
    !!form.currentPassword && !!form.newPassword && !!form.confirmPassword;
  const canSubmit = filled && !saving;

  const close = () => {
    setForm(empty);
    onClose();
  };

  const submit = async () => {
    if (!canSubmit) return;
    if (form.newPassword !== form.confirmPassword) {
      onError?.('새 비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    const check = validatePassword(form.newPassword, { username });
    if (!check.valid) {
      onError?.(check.reasons[0] || '비밀번호 규칙을 확인해 주세요.');
      return;
    }
    try {
      await onSubmit({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setForm(empty);
    } catch (err) {
      onError?.(err?.message || '비밀번호 변경에 실패했습니다.');
    }
  };

  return (
    <div className="modal-backdrop" onClick={close}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pw-change-title"
      >
        <button type="button" className="close-btn abs" onClick={close} aria-label="닫기">
          <AdminCloseIcon />
        </button>
        <h2 id="pw-change-title">비밀번호 변경</h2>
        <label>
          현재 비밀번호
          <input
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(e) =>
              setForm((f) => ({ ...f, currentPassword: e.target.value }))
            }
          />
        </label>
        <label>
          새 비밀번호
          <input
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(e) =>
              setForm((f) => ({ ...f, newPassword: e.target.value }))
            }
          />
          {form.newPassword ? (
            <PasswordChecklist password={form.newPassword} username={username} />
          ) : null}
        </label>
        <label>
          새 비밀번호 확인
          <input
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm((f) => ({ ...f, confirmPassword: e.target.value }))
            }
          />
        </label>
        <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
          <button type="button" className="btn-ghost" disabled={saving} onClick={close}>
            취소
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!canSubmit}
            onClick={() => submit()}
          >
            {saving ? '변경 중...' : '비밀번호 변경'}
          </button>
        </div>
      </div>
    </div>
  );
}
