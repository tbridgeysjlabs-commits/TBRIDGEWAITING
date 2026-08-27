import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useWaitingFlow } from '../../context/WaitingFlowContext';
import CustomerStepLayout from '../../components/customer/CustomerStepLayout';

const REDIRECT_SECONDS = 3;

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3 w-3 text-white"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3.5 8.2 6.4 11.1 12.5 4.5" />
    </svg>
  );
}

export default function RegisteredPage() {
  const { facilityCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useOutletContext();
  const { reset } = useWaitingFlow();
  const state = location.state || {};
  const [remain, setRemain] = useState(REDIRECT_SECONDS);

  const dailySeq = state.dailySeq;
  const phone = state.phone;
  const totalCount = state.totalCount;

  useEffect(() => {
    if (dailySeq == null || !phone) {
      navigate(`/w/${facilityCode}`, { replace: true });
      return undefined;
    }
    setRemain(REDIRECT_SECONDS);
    const tick = setInterval(() => {
      setRemain((n) => Math.max(0, n - 1));
    }, 1000);
    const id = setTimeout(() => {
      reset();
      navigate(`/w/${facilityCode}`, { replace: true });
    }, REDIRECT_SECONDS * 1000);
    return () => {
      clearTimeout(id);
      clearInterval(tick);
    };
  }, [dailySeq, phone, facilityCode, navigate, reset]);

  if (dailySeq == null || !phone) return null;

  return (
    <CustomerStepLayout>
      <div className="mx-auto flex h-full w-full max-w-[640px] flex-col items-center justify-center gap-[clamp(1rem,2.5vh,1.75rem)] px-4 text-center">
        <div className="flex flex-col items-center gap-3">
          <div
            className="inline-flex items-center gap-2 rounded-full border border-[var(--cw-accent,#A78BFA)] px-4 py-2"
            style={{ marginTop: 30 }}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--cw-accent-deep,#7C3AED)]">
              <CheckIcon />
            </span>
            <span className="text-[clamp(0.95rem,2vh,1.15rem)] font-semibold text-[var(--cw-text,#fff)]">
              {t('registered_done_title')}
            </span>
          </div>
          <p
            className="max-w-[28rem] text-[clamp(0.9rem,1.9vh,1.1rem)] text-[var(--cw-text-muted,#9CA3AF)]"
            style={{ marginTop: 20, marginBottom: 30 }}
          >
            카카오 알림톡을 통해 실시간 웨이팅 현황을 확인하실 수 있습니다.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <strong className="text-[clamp(3.5rem,10vh,6rem)] font-extrabold leading-none tracking-tight text-[var(--cw-text,#fff)]">
            {dailySeq}
            <span className="ml-1 text-[clamp(1.5rem,4vh,2.5rem)] font-bold">번</span>
          </strong>
          <p className="text-[clamp(1rem,2.2vh,1.25rem)] text-[var(--cw-accent,#A78BFA)]">
            {t('registered_seq_label')}
          </p>
        </div>

        <div className="mt-2 flex w-full max-w-[420px] flex-col divide-y divide-[var(--cw-border,rgba(255,255,255,0.08))] rounded-2xl border border-[var(--cw-border,rgba(255,255,255,0.08))] bg-[var(--cw-card,#1A1A24)] px-8 py-2">
          <div className="flex items-center justify-between gap-4 py-4 text-[clamp(0.95rem,2vh,1.15rem)]">
            <span className="text-[var(--cw-text-muted,#9CA3AF)]">
              {t('registered_phone_label')}
            </span>
            <span className="font-semibold tabular-nums text-[var(--cw-text,#fff)]">
              {phone}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 py-4 text-[clamp(0.95rem,2vh,1.15rem)]">
            <span className="text-[var(--cw-text-muted,#9CA3AF)]">
              {t('registered_party_label')}
            </span>
            <span className="font-semibold text-[var(--cw-text,#fff)]">
              {t('total_party', { n: totalCount ?? 0 })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[clamp(0.85rem,1.8vh,1rem)] text-[var(--cw-text-muted,#9CA3AF)]">
          <span
            className="flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-[var(--cw-accent,#A78BFA)] px-1 text-sm font-bold tabular-nums text-[var(--cw-accent,#A78BFA)]"
            aria-hidden
          >
            {remain}
          </span>
          <span>{t('registered_redirect_hint')}</span>
        </div>

        <img
          src="/tbridge_logo.png"
          alt="T BRIDGE"
          className="mt-auto h-auto w-[min(160px,42vw)] opacity-90"
          style={{ marginBottom: 30 }}
        />
      </div>
    </CustomerStepLayout>
  );
}
