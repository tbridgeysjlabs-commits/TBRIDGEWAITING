import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import Toast from '../../components/Toast';
import { useWaitingFlow } from '../../context/WaitingFlowContext';
import CustomerStepLayout from '../../components/customer/CustomerStepLayout';
import StepPageHeader from '../../components/customer/StepPageHeader';
import AgreementCheckbox from '../../components/customer/AgreementCheckbox';
import { GhostButton, PrimaryButton } from '../../components/customer/ActionButtons';

/** 관리자 미입력 시 빈 문자열 — 하드코딩 기본 문구 사용하지 않음 */
function pickFacilityText(...candidates) {
  for (const c of candidates) {
    const v = String(c || '').trim();
    if (v) return v;
  }
  return '';
}

function resolveTermsBody(facility) {
  return pickFacilityText(
    facility?.terms,
    facility?.termsOfUse,
    facility?.termsKo,
    facility?.termsOfUseKo
  );
}

function resolvePrivacyBody(facility) {
  return pickFacilityText(
    facility?.privacy,
    facility?.privacyPolicy,
    facility?.privacyKo,
    facility?.privacyPolicyKo
  );
}

function resolveMarketingBody(facility) {
  return pickFacilityText(
    facility?.marketing,
    facility?.marketingPolicy,
    facility?.marketingKo,
    facility?.marketingPolicyKo
  );
}

function looksLikeHtml(html) {
  return /<\/?[a-z][\s\S]*>/i.test(String(html || ''));
}

function TermsBody({ html }) {
  const body = String(html || '').trim();
  if (!body) return null;
  if (looksLikeHtml(body)) {
    return (
      <div
        className="terms-html break-words text-[var(--cw-text,#fff)] opacity-90 [&_p]:mb-2 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5"
        dangerouslySetInnerHTML={{ __html: body }}
      />
    );
  }
  return (
    <pre className="m-0 whitespace-pre-wrap break-words font-[inherit] text-[var(--cw-text,#fff)] opacity-90">
      {body}
    </pre>
  );
}

export default function AgreementPage() {
  const { facilityCode } = useParams();
  const navigate = useNavigate();
  const { facility, t, refreshFacility } = useOutletContext();
  const { phone, partyCounts, reset } = useWaitingFlow();
  const [termsOfUse, setTermsOfUse] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);

  const total = Object.values(partyCounts).reduce((s, n) => s + Number(n || 0), 0);
  const allChecked = termsOfUse && privacy && marketing;
  const canSubmit = termsOfUse && privacy && !loading;
  const termsBody = useMemo(() => resolveTermsBody(facility), [facility]);
  const privacyBody = useMemo(() => resolvePrivacyBody(facility), [facility]);
  const marketingBody = useMemo(() => resolveMarketingBody(facility), [facility]);

  useEffect(() => {
    if (!phone || total < 1) {
      navigate(`/w/${facilityCode}`, { replace: true });
    }
  }, [phone, total, facilityCode, navigate]);

  const setAll = (checked) => {
    setTermsOfUse(checked);
    setPrivacy(checked);
    setMarketing(checked);
  };

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const result = await api(`/facilities/${facilityCode}/waitings`, {
        method: 'POST',
        body: JSON.stringify({
          phone,
          partyCounts,
          termsOfUseAgreed: true,
          privacyAgreed: true,
          marketingAgreed: marketing,
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
              step={3}
            />
            <p className="mb-[clamp(0.5rem,1.5vh,1rem)] mt-[30px] text-center text-[clamp(0.9rem,2vh,1.25rem)] text-[var(--cw-text-muted,#9CA3AF)]">
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
          <div
            className="flex flex-col justify-center rounded-2xl border border-[var(--cw-border,rgba(255,255,255,0.08))] bg-[var(--cw-card,#1A1A24)] px-[clamp(1rem,2vw,1.35rem)] py-[clamp(1rem,2.2vh,1.5rem)]"
            style={{
              background: 'none',
              border: 'none',
              justifyContent: 'flex-start',
            }}
          >
            <label className="flex cursor-pointer items-center gap-3 border-b border-[var(--cw-border,rgba(255,255,255,0.08))] pb-4">
              <AgreementCheckbox
                checked={allChecked}
                onChange={setAll}
                ariaLabel="전체 약관에 동의합니다."
              />
              <span className="text-[clamp(0.95rem,2vh,1.15rem)] font-semibold text-[var(--cw-text,#fff)]">
                전체 약관에 동의합니다.
              </span>
            </label>

            <div className="mt-4 flex flex-col gap-[clamp(0.85rem,2vh,1.2rem)]">
              <label className="flex cursor-pointer items-center gap-3">
                <AgreementCheckbox
                  checked={termsOfUse}
                  onChange={setTermsOfUse}
                  ariaLabel="이용약관 동의"
                />
                <span className="text-[clamp(0.9rem,1.9vh,1.1rem)] text-[var(--cw-text,#fff)]">
                  <span className="mr-1 text-[var(--cw-accent,#A78BFA)]">[필수]</span>
                  이용약관 동의
                </span>
              </label>

              <label className="flex cursor-pointer items-center gap-3">
                <AgreementCheckbox
                  checked={privacy}
                  onChange={setPrivacy}
                  ariaLabel="개인정보 수집 및 이용 동의"
                />
                <span className="text-[clamp(0.9rem,1.9vh,1.1rem)] text-[var(--cw-text,#fff)]">
                  <span className="mr-1 text-[var(--cw-accent,#A78BFA)]">[필수]</span>
                  개인정보 수집·이용 동의
                </span>
              </label>

              <label className="flex cursor-pointer items-center gap-3">
                <AgreementCheckbox
                  checked={marketing}
                  onChange={setMarketing}
                  ariaLabel="마케팅 정보 수신 동의"
                />
                <span className="text-[clamp(0.9rem,1.9vh,1.1rem)] text-[var(--cw-text,#fff)]">
                  <span className="mr-1 text-[var(--cw-accent,#A78BFA)]">[선택]</span>
                  마케팅 정보 수신 동의
                </span>
              </label>
            </div>

            <p className="mt-5 text-[clamp(0.75rem,1.5vh,0.85rem)] leading-relaxed text-[var(--cw-text-muted,#9CA3AF)]">
              선택 항목에 동의하지 않아도 웨이팅 등록은 가능합니다.
            </p>
          </div>

          <div className="min-h-[clamp(14rem,42vh,28rem)] overflow-y-auto rounded-2xl border border-[var(--cw-border,rgba(255,255,255,0.08))] bg-[var(--cw-terms-body-bg,#1A1A24)] px-[clamp(1rem,2vw,1.5rem)] py-[clamp(0.9rem,2vh,1.25rem)] text-[clamp(0.85rem,1.7vh,1rem)] leading-relaxed text-[var(--cw-terms-body-fg,#E5E7EB)] [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.25)_transparent]">
            <section className="mb-5">
              <h3 className="mb-2 text-[1.05em] font-bold text-[var(--cw-accent,#A78BFA)]">
                이용약관 동의 (필수)
              </h3>
              <TermsBody html={termsBody} />
            </section>
            <section className="mb-5">
              <h3 className="mb-2 text-[1.05em] font-bold text-[var(--cw-accent,#A78BFA)]">
                개인정보 수집·이용 동의 (필수)
              </h3>
              <TermsBody html={privacyBody} />
            </section>
            <section>
              <h3 className="mb-2 text-[1.05em] font-bold text-[var(--cw-accent,#A78BFA)]">
                마케팅 정보 수신 동의 (선택)
              </h3>
              <TermsBody html={marketingBody} />
            </section>
          </div>
        </div>
      </CustomerStepLayout>
    </>
  );
}
