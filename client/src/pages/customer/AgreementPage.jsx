import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import Toast from '../../components/Toast';
import { useWaitingFlow } from '../../context/WaitingFlowContext';
import CustomerStepLayout from '../../components/customer/CustomerStepLayout';
import StepPageHeader from '../../components/customer/StepPageHeader';
import AgreementCheckbox from '../../components/customer/AgreementCheckbox';
import { DEFAULT_TERMS } from '../../components/customer/agreementDefaults';
import { GhostButton, PrimaryButton } from '../../components/customer/ActionButtons';

function resolveTermsBody(facility) {
  const localized = (facility?.terms || facility?.termsOfUse || '').trim();
  if (localized) return localized;
  const ko = (facility?.termsKo || facility?.termsOfUseKo || '').trim();
  if (ko) return ko;
  return DEFAULT_TERMS;
}

export default function AgreementPage() {
  const { facilityCode } = useParams();
  const navigate = useNavigate();
  const { facility, t, refreshFacility } = useOutletContext();
  const { phone, partyCounts, reset } = useWaitingFlow();
  const [agreed, setAgreed] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);

  const total = Object.values(partyCounts).reduce((s, n) => s + Number(n || 0), 0);
  const canSubmit = agreed && !loading;
  const termsBody = useMemo(() => resolveTermsBody(facility), [facility]);

  useEffect(() => {
    if (!phone || total < 1) {
      navigate(`/w/${facilityCode}`, { replace: true });
    }
  }, [phone, total, facilityCode, navigate]);

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const result = await api(`/facilities/${facilityCode}/waitings`, {
        method: 'POST',
        body: JSON.stringify({
          phone,
          partyCounts,
          termsAgreed: true,
        }),
      });
      await refreshFacility?.();
      const waiting = result.waiting || {};
      reset();
      navigate(`/w/${facilityCode}/registered`, {
        replace: true,
        state: {
          dailySeq: waiting.dailySeq,
          phone: waiting.phoneDisplay || waiting.phone || phone,
          totalCount: waiting.totalCount ?? total,
        },
      });
    } catch (e) {
      setToast(e.message);
      setTimeout(() => setToast(''), 2500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toast message={toast} visible={!!toast} />
      <CustomerStepLayout
        header={
          <>
            <StepPageHeader
              title={t('agreement_title')}
              onBack={() => navigate(`/w/${facilityCode}/party`)}
            />
            <p className="mb-[clamp(0.5rem,1.5vh,1rem)] text-center text-[clamp(0.9rem,2vh,1.25rem)] text-[var(--cw-text-muted,#9ca3af)]">
              {t('agreement_guide')}
            </p>
          </>
        }
        footer={
          <div className="flex w-full gap-[clamp(0.5rem,1.2vw,1rem)]">
            <GhostButton
              className="flex-1 py-[clamp(0.7rem,1.8vh,1.15rem)] text-[clamp(0.95rem,2vh,1.2rem)]"
              onClick={() => navigate(`/w/${facilityCode}/party`)}
            >
              {t('previous')}
            </GhostButton>
            <PrimaryButton
              className="flex-[2] py-[clamp(0.7rem,1.8vh,1.15rem)] text-[clamp(0.95rem,2vh,1.2rem)]"
              disabled={!canSubmit}
              onClick={submit}
            >
              {loading ? t('registering') : t('register_waiting')}
            </PrimaryButton>
          </div>
        }
      >
        <div className="mx-auto grid h-full min-h-0 w-full max-w-[1100px] grid-cols-1 gap-[clamp(1rem,2.5vw,2rem)] pt-[clamp(1rem,4vh,2.5rem)] pb-[clamp(0.25rem,1vh,0.75rem)] md:grid-cols-[minmax(240px,0.9fr)_minmax(0,1.4fr)]">
          <div className="flex flex-col justify-center gap-[clamp(1rem,2.5vh,1.75rem)] px-1">
            <label className="flex cursor-pointer items-center gap-3">
              <AgreementCheckbox
                checked={agreed}
                onChange={setAgreed}
                ariaLabel={t('agree_all')}
              />
              <span className="text-[clamp(0.95rem,2vh,1.15rem)] font-semibold text-[var(--cw-text,#1f1a33)]">
                {t('agree_all')}
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 pl-1">
              <AgreementCheckbox
                checked={agreed}
                onChange={setAgreed}
                ariaLabel={t('terms_label_unified')}
              />
              <span className="text-[clamp(0.9rem,1.9vh,1.1rem)] text-[var(--cw-text,#1f1a33)]">
                <span className="mr-1 text-[var(--cw-accent,#7c3aed)]">
                  {t('required_tag')}
                </span>
                {t('terms_label_unified')}
              </span>
            </label>
          </div>

          <div
            className="min-h-[clamp(14rem,42vh,28rem)] overflow-y-auto rounded-2xl border border-[var(--cw-border,#d9d5e3)] bg-[var(--cw-panel,#fff)] px-[clamp(1rem,2vw,1.5rem)] py-[clamp(0.9rem,2vh,1.25rem)] text-[clamp(0.85rem,1.7vh,1rem)] leading-relaxed text-[var(--cw-text,#2b2340)] shadow-[0_8px_24px_rgba(80,60,140,0.06)] [scrollbar-gutter:stable] [scrollbar-width:thin]"
          >
            <pre className="m-0 whitespace-pre-wrap break-words font-[inherit]">
              {termsBody}
            </pre>
          </div>
        </div>
      </CustomerStepLayout>
    </>
  );
}
