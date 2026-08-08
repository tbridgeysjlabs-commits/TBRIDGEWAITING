import { Outlet, useLocation, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useI18n } from '../../hooks/useI18n';
import { useWaitingFlow } from '../../context/WaitingFlowContext';
import LanguagePillSelector from './LanguagePillSelector';
import WaitingStatusRing from './WaitingStatusRing';
import TimeInfoCard from './TimeInfoCard';
import TBridgeLogo from './TBridgeLogo';

export default function CustomerShell() {
  const { facilityCode } = useParams();
  const location = useLocation();
  const { lang, setLang } = useWaitingFlow();
  const { t } = useI18n(lang);
  const [facility, setFacility] = useState(null);
  const [error, setError] = useState('');

  const isHome =
    location.pathname === `/w/${facilityCode}` ||
    location.pathname === `/w/${facilityCode}/`;

  const loadFacility = () =>
    api(`/facilities/${facilityCode}/public?lang=${lang}`).then(setFacility);

  useEffect(() => {
    loadFacility().catch((e) => setError(e.message));
  }, [facilityCode, lang]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f5ff] text-gray-500">
        {error}
      </div>
    );
  }
  if (!facility) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f5ff] text-gray-400">
        Loading...
      </div>
    );
  }

  const context = {
    facility,
    t,
    refreshFacility: () => loadFacility(),
  };

  if (!isHome) {
    return (
      <div className="min-h-screen min-w-[768px] bg-gradient-to-br from-[#f3f0ff] via-[#faf9ff] to-white font-['Pretendard','Noto_Sans_KR',sans-serif]">
        <Outlet context={context} />
      </div>
    );
  }

  return (
    <div className="min-h-screen min-w-[768px] bg-gradient-to-br from-[#f3f0ff] via-[#faf9ff] to-white font-['Pretendard','Noto_Sans_KR',sans-serif]">
      {/* 좌/우 50% 분할 — 높이는 우측 키패드 카드 기준으로 맞춤 */}
      <div className="flex min-h-screen w-full items-center px-6 py-8 md:px-10 md:py-10">
        <div className="mx-auto flex w-full max-w-[1600px] items-stretch">
          {/* 왼쪽 50% — 가로 중앙, 세로로 카드 높이에 맞춤 */}
          <aside className="flex flex-1 items-stretch justify-center pr-4 md:pr-8">
            <div className="flex h-full w-full max-w-[690px] flex-col">
              {/* 카드 상단 높이: 언어 선택 */}
              <div className="flex w-full justify-center">
                <LanguagePillSelector
                  lang={lang}
                  onChange={setLang}
                  enabled={[
                    'ko',
                    ...(facility.enabledLanguages || []).filter((l) => l !== 'ko'),
                  ]}
                />
              </div>

              {/* 언어 ↔ 대기원형 사이: 시설 정보 */}
              <div className="mt-8 flex w-full items-center justify-center gap-4">
                <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gray-100 text-sm text-gray-400">
                  {facility.profileImageUrl ? (
                    <img
                      src={facility.profileImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    'logo'
                  )}
                </div>
                <div className="truncate text-[40px] font-extrabold leading-tight text-[#1f1a33]">
                  {facility.name}
                </div>
              </div>

              {/* 카드 중간 높이: 대기 원형 */}
              <div className="my-12 flex w-full flex-1 items-center justify-center">
                <WaitingStatusRing
                  label={t('current_waiting')}
                  count={facility.pendingCount}
                  unit={t('teams')}
                />
              </div>

              {/* 대기원형 ↔ 로고 사이: 시간 카드 */}
              <TimeInfoCard />

              {/* 카드 하단 높이: 로고 */}
              <div className="mt-auto flex w-full flex-col items-center gap-2 pb-2 pt-8">
                <TBridgeLogo className="h-10 w-auto" />
                <div className="text-sm text-gray-400">{facility.systemVersion}</div>
              </div>
            </div>
          </aside>

          {/* 오른쪽 50% — 키패드 카드 가로 중앙 */}
          <main className="flex flex-1 items-center justify-center pl-4 md:py-2 md:pl-8">
            <Outlet context={context} />
          </main>
        </div>
      </div>
    </div>
  );
}
