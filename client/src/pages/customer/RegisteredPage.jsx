import { useEffect } from 'react';
import { useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useWaitingFlow } from '../../context/WaitingFlowContext';
import CustomerStepLayout from '../../components/customer/CustomerStepLayout';

export default function RegisteredPage() {
  const { facilityCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useOutletContext();
  const { reset } = useWaitingFlow();
  const state = location.state || {};

  const dailySeq = state.dailySeq;
  const phone = state.phone;
  const totalCount = state.totalCount;

  useEffect(() => {
    if (dailySeq == null || !phone) {
      navigate(`/w/${facilityCode}`, { replace: true });
      return undefined;
    }
    const id = setTimeout(() => {
      reset();
      navigate(`/w/${facilityCode}`, { replace: true });
    }, 3000);
    return () => clearTimeout(id);
  }, [dailySeq, phone, facilityCode, navigate, reset]);

  if (dailySeq == null || !phone) return null;

  return (
    <CustomerStepLayout>
      <div className="mx-auto flex h-full w-full max-w-[640px] flex-col items-center justify-center gap-[clamp(1.25rem,3vh,2rem)] px-4 text-center">
        <p className="text-[clamp(1.1rem,2.4vh,1.4rem)] font-semibold text-[var(--cw-accent,#7c3aed)]">
          {t('registered_done_title')}
        </p>
        <div className="flex flex-col items-center gap-2">
          <strong className="text-[clamp(3.5rem,10vh,6rem)] font-extrabold leading-none tracking-tight text-[var(--cw-text,#1f1a33)]">
            {dailySeq}
            <span className="ml-1 text-[clamp(1.5rem,4vh,2.5rem)] font-bold">번</span>
          </strong>
          <p className="text-[clamp(1rem,2.2vh,1.25rem)] text-[var(--cw-text-muted,#6b7280)]">
            {t('registered_seq_label')}
          </p>
        </div>
        <div className="mt-2 flex w-full max-w-[420px] flex-col gap-3 rounded-3xl bg-[var(--cw-panel,#fff)] px-8 py-6 shadow-[0_10px_30px_rgba(80,60,140,0.08)]">
          <div className="flex items-center justify-between gap-4 text-[clamp(0.95rem,2vh,1.15rem)]">
            <span className="text-[var(--cw-text-muted,#9ca3af)]">
              {t('registered_phone_label')}
            </span>
            <span className="font-semibold tabular-nums text-[var(--cw-text,#1f1a33)]">
              {phone}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[clamp(0.95rem,2vh,1.15rem)]">
            <span className="text-[var(--cw-text-muted,#9ca3af)]">
              {t('registered_party_label')}
            </span>
            <span className="font-semibold text-[var(--cw-text,#1f1a33)]">
              {t('total_party', { n: totalCount ?? 0 })}
            </span>
          </div>
        </div>
        <p className="text-[clamp(0.85rem,1.8vh,1rem)] text-[var(--cw-text-muted,#9ca3af)]">
          {t('registered_redirect_hint')}
        </p>
      </div>
    </CustomerStepLayout>
  );
}
