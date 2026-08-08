import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import Toast from '../../components/Toast';
import { useWaitingFlow } from '../../context/WaitingFlowContext';
import StepPageHeader from '../../components/customer/StepPageHeader';
import AgreementCard from '../../components/customer/AgreementCard';
import { GhostButton, PrimaryButton } from '../../components/customer/ActionButtons';

export default function AgreementPage() {
  const { facilityCode } = useParams();
  const navigate = useNavigate();
  const { facility, t, refreshFacility } = useOutletContext();
  const { phone, partyCounts, reset } = useWaitingFlow();
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);

  const total = Object.values(partyCounts).reduce((s, n) => s + Number(n || 0), 0);

  useEffect(() => {
    if (!phone || total < 1) {
      navigate(`/w/${facilityCode}`, { replace: true });
    }
  }, [phone, total, facilityCode, navigate]);

  const canSubmit = terms && privacy && !loading;

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const result = await api(`/facilities/${facilityCode}/waitings`, {
        method: 'POST',
        body: JSON.stringify({
          phone,
          partyCounts,
          termsAgreed: terms,
          privacyAgreed: privacy,
          marketingAgreed: marketing,
        }),
      });
      setToast(result.toast || t('toast_registered'));
      await refreshFacility?.();
      const completeLink =
        result.completePageLink ||
        result.waiting?.completePageLink ||
        `/w/${facilityCode}/complete/${result.waiting?.id}`;
      setTimeout(() => {
        reset();
        navigate(completeLink, { replace: true });
      }, 2500);
    } catch (e) {
      setToast(e.message);
      setTimeout(() => setToast(''), 2500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full flex-col px-10 py-10 xl:px-16 xl:py-12">
      <Toast message={toast} visible={!!toast} />
      <StepPageHeader
        title={t('agreement_title')}
        onBack={() => navigate(`/w/${facilityCode}/party`)}
      />

      <div className="flex w-full flex-1 flex-col justify-center gap-6">
        <AgreementCard
          title="이용 약관 동의"
          required
          checked={terms}
          onChange={setTerms}
          body={facility.termsOfUse}
        />
        <AgreementCard
          title="개인정보 수집 및 이용 동의"
          required
          checked={privacy}
          onChange={setPrivacy}
          body={facility.privacyPolicy}
        />
        <AgreementCard
          title="마케팅 관련 개인정보 수집 이용 동의"
          required={false}
          checked={marketing}
          onChange={setMarketing}
          body={facility.marketingPolicy}
        />
      </div>

      <div className="mt-12 flex w-full gap-4 pb-6">
        <GhostButton
          className="flex-1 py-5 text-[20px]"
          onClick={() => navigate(`/w/${facilityCode}/party`)}
        >
          {t('previous')}
        </GhostButton>
        <PrimaryButton
          className="flex-[2] py-5 text-[20px]"
          disabled={!canSubmit}
          onClick={submit}
        >
          {t('agree')}
        </PrimaryButton>
      </div>
    </div>
  );
}
