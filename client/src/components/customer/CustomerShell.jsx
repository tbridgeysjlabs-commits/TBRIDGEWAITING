import { Outlet, useLocation, useParams } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api/client';
import { useI18n } from '../../hooks/useI18n';
import { useWaitingFlow } from '../../context/WaitingFlowContext';
import { useFullscreenToggle } from '../../hooks/useFullscreenToggle';
import { themeStyle } from '../../theme/customerTheme';
import LanguagePillSelector from './LanguagePillSelector';
import WaitingStatusRing from './WaitingStatusRing';
import TimeInfoCard from './TimeInfoCard';
import TBridgeLogo from './TBridgeLogo';

/** 좌·우 패널 공통 — 동일 높이·패딩으로 상/하단 수직 동기화 */
const PANEL =
  'flex h-full w-full max-w-[min(690px,100%)] flex-col justify-between px-[clamp(1rem,2.8vw,2.75rem)] py-[clamp(0.75rem,2.2vh,2.25rem)]';

function FacilityBrand({ facility }) {
  const mode = facility.brandDisplayMode === 'image' ? 'image' : 'image_text';
  const img = facility.profileImageUrl;

  if (mode === 'image') {
    // 큰 이미지(2.3:1) — 원형 아님, 작은 border-radius
    return (
      <div className="flex w-full shrink-0 items-center justify-center">
        <div className="w-full max-w-[min(100%,420px)] overflow-hidden rounded-[4px] bg-[var(--cw-panel-alt,#f3f3f3)] aspect-[2.3/1]">
          {img ? (
            <img src={img} alt={facility.name || ''} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-xs text-[var(--cw-text-muted,#9ca3af)]">
              logo
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full shrink-0 items-center justify-center gap-[clamp(0.5rem,1.2vw,1rem)]">
      <div className="flex aspect-square h-[clamp(2.5rem,5.5vh,4.5rem)] w-[clamp(2.5rem,5.5vh,4.5rem)] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--cw-panel-alt,#f3f3f3)] text-xs text-[var(--cw-text-muted,#9ca3af)]">
        {img ? (
          <img src={img} alt="" className="h-full w-full object-cover" />
        ) : (
          'logo'
        )}
      </div>
      <div className="truncate text-[clamp(1.25rem,3.2vh,2.5rem)] font-extrabold leading-tight text-[var(--cw-text,#1f1a33)]">
        {facility.name}
      </div>
    </div>
  );
}

export default function CustomerShell() {
  const { facilityCode } = useParams();
  const location = useLocation();
  const { lang, setLang } = useWaitingFlow();
  const { t } = useI18n(lang);
  const [facility, setFacility] = useState(null);
  const [error, setError] = useState('');
  const rootRef = useRef(null);
  const { onLogoPointerUp, onLogoClick } = useFullscreenToggle(rootRef);

  const isHome =
    location.pathname === `/w/${facilityCode}` ||
    location.pathname === `/w/${facilityCode}/`;

  const loadFacility = () =>
    api(`/facilities/${facilityCode}/public?lang=${lang}`).then(setFacility);

  useEffect(() => {
    loadFacility().catch((e) => setError(e.message));
  }, [facilityCode, lang]);

  const extraLangs = useMemo(
    () => (facility?.enabledLanguages || []).filter((l) => l !== 'ko'),
    [facility]
  );
  const showLangSelector = extraLangs.length > 0;
  const theme = facility?.theme === 'dark' ? 'dark' : 'light';
  const shellStyle = themeStyle(theme);

  if (error) {
    return (
      <div className="flex h-dvh items-center justify-center overflow-hidden bg-[#f7f5ff] text-gray-500">
        {error}
      </div>
    );
  }
  if (!facility) {
    return (
      <div className="flex h-dvh items-center justify-center overflow-hidden bg-[#f7f5ff] text-gray-400">
        Loading...
      </div>
    );
  }

  const context = {
    facility,
    t,
    refreshFacility: () => loadFacility(),
    homePanelClass: PANEL,
    theme,
  };

  const shellBg =
    'h-dvh min-w-[768px] overflow-hidden font-[\'Pretendard\',\'Noto_Sans_KR\',sans-serif]';

  if (!isHome) {
    return (
      <div
        ref={rootRef}
        className="h-dvh min-w-[768px] overflow-hidden font-['Pretendard','Noto_Sans_KR',sans-serif]"
        style={{
          ...shellStyle,
          background: `linear-gradient(to bottom right, var(--cw-bg), var(--cw-bg-mid), var(--cw-bg-end))`,
        }}
      >
        <Outlet context={context} />
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={shellBg}
      style={{
        ...shellStyle,
        background: `linear-gradient(to bottom right, var(--cw-bg), var(--cw-bg-mid), var(--cw-bg-end))`,
      }}
    >
      <div className="flex h-full w-full">
        <aside className="flex h-full w-1/2 min-w-0 justify-center px-[clamp(0.75rem,2vw,1.5rem)] py-[clamp(0.75rem,2vh,1.25rem)]">
          <div className={PANEL}>
            {/* 다국어 없으면 언어 영역 숨기고 그 자리에 시설사 표시 */}
            <div className="flex w-full shrink-0 justify-center">
              {showLangSelector ? (
                <LanguagePillSelector
                  lang={lang}
                  onChange={setLang}
                  enabled={['ko', ...extraLangs]}
                />
              ) : (
                <FacilityBrand facility={facility} />
              )}
            </div>

            {showLangSelector && <FacilityBrand facility={facility} />}

            <div className="flex w-full shrink-0 items-center justify-center">
              <WaitingStatusRing
                label={t('current_waiting')}
                count={facility.pendingCount}
                unit={t('teams')}
              />
            </div>

            <div className="w-full shrink-0">
              <TimeInfoCard label={t('now_time')} lang={lang} />
            </div>

            <div className="flex w-full shrink-0 flex-col items-center gap-1">
              <TBridgeLogo
                className="h-[clamp(1.5rem,3vh,2.5rem)] w-auto"
                enableFullscreenTap
                onPointerUp={onLogoPointerUp}
                onClick={onLogoClick}
              />
              <div className="text-[clamp(0.7rem,1.4vh,0.875rem)] text-[var(--cw-text-muted,#9ca3af)]">
                {facility.systemVersion}
              </div>
            </div>
          </div>
        </aside>

        <main className="flex h-full w-1/2 min-w-0 justify-center px-[clamp(0.75rem,2vw,1.5rem)] py-[clamp(0.75rem,2vh,1.25rem)]">
          <Outlet context={context} />
        </main>
      </div>
    </div>
  );
}
