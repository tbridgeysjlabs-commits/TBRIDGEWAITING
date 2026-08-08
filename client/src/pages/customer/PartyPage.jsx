import { useEffect } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useWaitingFlow } from '../../context/WaitingFlowContext';
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
    <div className="mx-auto flex min-h-screen w-full flex-col px-10 py-10 xl:px-16 xl:py-12">
      <StepPageHeader
        title={t('party_title')}
        onBack={() => navigate(`/w/${facilityCode}`)}
      />

      <div className="flex w-full flex-1 flex-col justify-center gap-6">
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
        <p className="mt-3 text-center text-[21px] text-gray-400">
          {typeHint
            ? `${typeHint}를 각각 선택해 주세요`
            : t('party_hint') || '인원을 선택해 주세요'}
        </p>
      </div>

      <div className="mt-12 flex w-full gap-4 pb-6">
        <GhostButton
          className="flex-1 py-5 text-[20px]"
          onClick={() => navigate(`/w/${facilityCode}`)}
        >
          {t('previous')}
        </GhostButton>
        <PrimaryButton
          className="flex-[2] py-5 text-[20px]"
          disabled={total < 1}
          onClick={() => navigate(`/w/${facilityCode}/agreement`)}
        >
          {t('confirm')} ({t('total_party', { n: total })})
        </PrimaryButton>
      </div>
    </div>
  );
}
