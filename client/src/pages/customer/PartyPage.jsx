import { useEffect } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useWaitingFlow } from '../../context/WaitingFlowContext';
import CustomerStepLayout from '../../components/customer/CustomerStepLayout';
import StepPageHeader from '../../components/customer/StepPageHeader';
import PartyCounterCard from '../../components/customer/PartyCounterCard';
import { GhostButton, PrimaryButton } from '../../components/customer/ActionButtons';

export default function PartyPage() {
  const { facilityCode } = useParams();
  const navigate = useNavigate();
  const { facility, t } = useOutletContext();
  const { phone, partyCounts, setPartyCounts } = useWaitingFlow();

  useEffect(() => {
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      navigate(`/w/${facilityCode}`, { replace: true });
    }
  }, [phone, facilityCode, navigate]);

  useEffect(() => {
    if (!facility?.waitingTypes) return;
    setPartyCounts((prev) => {
      const next = { ...prev };
      facility.waitingTypes.forEach((type) => {
        if (next[type.name] == null) next[type.name] = 0;
      });
      return next;
    });
  }, [facility, setPartyCounts]);

  const total = Object.values(partyCounts).reduce((s, n) => s + Number(n || 0), 0);
  const typeHint = (facility.waitingTypes || []).map((x) => x.name).join(' · ');

  return (
    <CustomerStepLayout
      header={
        <>
          <StepPageHeader
            title={t('party_title')}
            onBack={() => navigate(`/w/${facilityCode}`)}
            step={2}
          />
          <p className="mb-[clamp(0.5rem,1.5vh,1rem)] mt-[30px] text-center text-[clamp(0.9rem,2vh,1.25rem)] text-[var(--cw-text-muted,#9CA3AF)]">
            {typeHint
              ? t('party_types_hint', { types: typeHint })
              : t('party_hint')}
          </p>
        </>
      }
      footer={
        <div className="flex w-full gap-[clamp(0.5rem,1.2vw,1rem)]">
          <GhostButton
            className="flex-1 py-[clamp(0.7rem,1.8vh,1.15rem)] text-[clamp(0.95rem,2vh,1.2rem)]"
            onClick={() => navigate(`/w/${facilityCode}`)}
          >
            {t('previous')}
          </GhostButton>
          <PrimaryButton
            className="flex-[2] py-[clamp(0.7rem,1.8vh,1.15rem)] text-[clamp(0.95rem,2vh,1.2rem)]"
            disabled={total < 1}
            onClick={() => navigate(`/w/${facilityCode}/agreement`)}
          >
            {t('confirm')} ({t('total_party', { n: total })})
          </PrimaryButton>
        </div>
      }
    >
      <div className="mx-auto flex w-full max-w-[640px] flex-col justify-start gap-[clamp(0.65rem,1.8vh,1.25rem)] pt-[clamp(2.5rem,12vh,6rem)] pb-[clamp(0.25rem,1vh,0.75rem)]">
        {(facility.waitingTypes || []).map((type) => (
          <PartyCounterCard
            key={type.id}
            name={type.name}
            value={partyCounts[type.name] || 0}
            onChange={(delta) =>
              setPartyCounts((prev) => ({
                ...prev,
                [type.name]: Math.max(
                  0,
                  Math.min(999, Number(prev[type.name] || 0) + delta)
                ),
              }))
            }
          />
        ))}

        <div className="mt-2 flex items-center justify-between border-t border-[var(--cw-border,rgba(255,255,255,0.08))] px-1 pt-4">
          <span className="text-[clamp(0.9rem,1.9vh,1.05rem)] text-[var(--cw-text-muted,#9CA3AF)]">
            {t('total_party_label')}
          </span>
          <span className="text-[clamp(1rem,2.2vh,1.2rem)] font-bold text-[var(--cw-text,#fff)]">
            <span className="text-[clamp(1.25rem,2.8vh,1.55rem)] text-[var(--cw-accent,#A78BFA)]">
              {total}
            </span>{' '}
            {t('people_unit')}
          </span>
        </div>
      </div>
    </CustomerStepLayout>
  );
}
