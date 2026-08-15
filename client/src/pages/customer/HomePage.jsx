import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useWaitingFlow } from '../../context/WaitingFlowContext';
import NumericKeypad from '../../components/customer/NumericKeypad';
import { PrimaryButton } from '../../components/customer/ActionButtons';

const DEFAULT_PANEL =
  'flex h-full w-full max-w-[min(690px,100%)] flex-col justify-between px-[clamp(1rem,2.8vw,2.75rem)] py-[clamp(0.75rem,2.2vh,2.25rem)]';

/** 접두사 3자리 제외 나머지 7자리 → 3-3-4 / 8자리 → 3-4-4 */
function displayPhone(digits) {
  const raw = (digits || '').replace(/\D/g, '').slice(0, 11);
  if (!raw) return '';
  if (raw.length <= 3) return raw;

  const prefix = raw.slice(0, 3);
  const rest = raw.slice(3);

  if (rest.length === 8) {
    return `${prefix}-${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  if (rest.length === 7) {
    return `${prefix}-${rest.slice(0, 3)}-${rest.slice(3)}`;
  }

  // 입력 중: 010 계열은 4-4, 그 외는 3-4 쪽으로 점진 표시
  if (prefix === '010') {
    if (rest.length <= 4) return `${prefix}-${rest}`;
    return `${prefix}-${rest.slice(0, 4)}-${rest.slice(4)}`;
  }

  if (rest.length <= 3) return `${prefix}-${rest}`;
  return `${prefix}-${rest.slice(0, 3)}-${rest.slice(3)}`;
}

export default function HomePage() {
  const { facilityCode } = useParams();
  const navigate = useNavigate();
  const { t, homePanelClass } = useOutletContext();
  const { phone, setPhone } = useWaitingFlow();

  const digits = phone.replace(/\D/g, '').slice(0, 11);
  const valid = /^01[016789]\d{7,8}$/.test(digits);

  const onKey = (key) => {
    if (key === 'reset') {
      setPhone('');
      return;
    }
    if (key === 'back') {
      setPhone(digits.slice(0, -1));
      return;
    }
    if (digits.length >= 11) return;
    setPhone(digits + key);
  };

  return (
    <div
      className={`${homePanelClass || DEFAULT_PANEL} rounded-[clamp(1.5rem,3vh,3.375rem)] border border-[var(--cw-panel-border,#e9e5f5)] bg-[var(--cw-panel,#ffffff)] shadow-[0_24px_60px_rgba(120,100,180,0.12)]`}
    >
      <div className="w-full shrink-0 py-[clamp(0.35rem,1.1vh,0.95rem)]">
        <div className="w-full text-center text-[clamp(1.65rem,4.6vh,3.55rem)] font-extrabold leading-tight tracking-wide text-[var(--cw-text,#3a3550)]">
          {displayPhone(digits) || '\u00A0'}
        </div>
        <p className="mt-[clamp(0.3rem,1vh,0.9rem)] w-full text-center text-[clamp(0.8rem,1.95vh,1.35rem)] text-[var(--cw-text-muted,#9ca3af)]">
          {t('phone_hint')}
        </p>
      </div>

      <div className="flex min-h-0 w-full max-h-[65%] flex-1 items-stretch py-[clamp(0.25rem,0.85vh,0.7rem)]">
        <NumericKeypad onKey={onKey} />
      </div>

      <PrimaryButton
        className="w-full shrink-0 rounded-2xl bg-[var(--cw-button-bg,#5B21B6)] py-[clamp(0.65rem,1.8vh,1.25rem)] text-[clamp(0.9rem,2vh,1.25rem)] text-[var(--cw-button-fg,#fff)] shadow-[0_8px_20px_rgba(91,33,182,0.35)]"
        disabled={!valid}
        onClick={() => navigate(`/w/${facilityCode}/party`)}
      >
        {t('start_waiting')}
      </PrimaryButton>
    </div>
  );
}
