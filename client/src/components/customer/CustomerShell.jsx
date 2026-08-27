import { Outlet, useLocation, useParams } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api/client';
import { useI18n } from '../../hooks/useI18n';
import { useWaitingFlow } from '../../context/WaitingFlowContext';
import { useFullscreenToggle } from '../../hooks/useFullscreenToggle';
import { themeStyle } from '../../theme/customerTheme';
import LanguagePillSelector from './LanguagePillSelector';
import TimeInfoCard from './TimeInfoCard';
import TBridgeLogo from './TBridgeLogo';

/** 좌·우 패널 공통 — 동일 높이·패딩으로 상/하단 수직 동기화 */
const PANEL =
  'flex h-full w-full max-w-[min(690px,100%)] flex-col justify-between px-[clamp(1rem,2.8vw,2.75rem)] py-[clamp(0.75rem,2.2vh,2.25rem)]';

function FacilityBrand({ facility }) {
  const img = facility.profileImageUrl;
  return (
    <div className="flex w-full shrink-0 items-center gap-[clamp(0.75rem,1.5vw,1.25rem)] rounded-[clamp(0.9rem,1.8vh,1.5rem)] border border-[var(--cw-border,rgba(255,255,255,0.08))] bg-[var(--cw-panel,#1A1A24)] px-[clamp(0.9rem,2vw,1.5rem)] py-[clamp(0.7rem,1.6vh,1.15rem)]">
      <div className="flex aspect-square h-[clamp(3rem,6vh,4.5rem)] w-[clamp(3rem,6vh,4.5rem)] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--cw-panel-alt,#f3f3f3)] text-xs text-[var(--cw-text-muted,#9ca3af)]">
        {img ? (
          <img src={img} alt="" className="h-full w-full object-cover" />
        ) : (
          'logo'
        )}
      </div>
      <div className="min-w-0 truncate text-[clamp(1.35rem,3.2vh,2.25rem)] font-extrabold leading-tight text-[var(--cw-text,#1f1a33)]">
        {facility.name}
      </div>
    </div>
  );
}

function WaitingStatsCard({ facility, t, lang }) {
  const pending = Math.max(0, Number(facility.pendingCount) || 0);
  const perTeam = Math.max(1, Number(facility.avgWaitMinutesPerTeam) || 5);
  const estimated = pending * perTeam;

  return (
    <div className="w-full shrink-0 rounded-[clamp(0.9rem,1.8vh,1.5rem)] border border-[var(--cw-border,rgba(255,255,255,0.08))] bg-[var(--cw-panel,#1A1A24)] px-[clamp(0.9rem,2vw,1.5rem)] py-[clamp(0.75rem,1.8vh,1.25rem)]">
      <div className="mb-[clamp(0.55rem,1.4vh,1rem)]">
        <TimeInfoCard label={t('now_time')} lang={lang} compact />
      </div>
      <div className="grid grid-cols-2 gap-[clamp(0.75rem,2vw,1.5rem)]">
        <div>
          <div className="mb-1 text-[clamp(0.75rem,1.6vh,1rem)] text-[var(--cw-text-muted,#9CA3AF)]">
            {t('current_waiting')}
          </div>
          <div className="flex items-end gap-1 leading-none">
            <strong className="text-[clamp(2rem,5.5vh,3.5rem)] font-extrabold tracking-tight text-[var(--cw-text,#1f1a33)]">
              {pending}
            </strong>
            <span className="mb-1 text-[clamp(0.9rem,2vh,1.25rem)] font-bold text-[var(--cw-text,#1f1a33)]">
              {t('teams')}
            </span>
          </div>
        </div>
        <div>
          <div className="mb-1 text-[clamp(0.75rem,1.6vh,1rem)] text-[var(--cw-text-muted,#9CA3AF)]">
            {t('estimated_wait') || '예상 대기시간'}
          </div>
          <div className="flex items-end gap-1 leading-none">
            <strong className="text-[clamp(2rem,5.5vh,3.5rem)] font-extrabold tracking-tight text-[var(--cw-accent,#7C3AED)]">
              {estimated}
            </strong>
            <span className="mb-1 text-[clamp(0.9rem,2vh,1.25rem)] font-bold text-[var(--cw-accent,#7C3AED)]">
              {t('minutes') || '분'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function KioskNoticeCard({ html, title }) {
  const content = String(html || '').trim();
  if (!content) return null;
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[clamp(0.9rem,1.8vh,1.5rem)] border border-[var(--cw-border,rgba(255,255,255,0.08))] bg-[var(--cw-panel,#1A1A24)] px-[clamp(0.9rem,2vw,1.5rem)] py-[clamp(0.75rem,1.8vh,1.25rem)]">
      <h3 className="shrink-0 text-[clamp(0.95rem,2vh,1.2rem)] font-bold text-[var(--cw-text,#1f1a33)]">
        {title}
      </h3>
      <div className="my-2 h-px w-full shrink-0 bg-[var(--cw-border,rgba(0,0,0,0.08))]" />
      <div
        className="min-h-0 flex-1 overflow-y-auto text-[clamp(0.8rem,1.7vh,1rem)] leading-relaxed text-[var(--cw-text,#1f1a33)] opacity-90 [&_li]:mb-1 [&_p]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
        dangerouslySetInnerHTML={{ __html: content }}
      />
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

  // 홈: 대기팀 수 실시간 반영
  useEffect(() => {
    if (!isHome) return undefined;
    const id = setInterval(() => {
      loadFacility().catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, [isHome, facilityCode, lang]);

  const extraLangs = useMemo(
    () => (facility?.enabledLanguages || []).filter((l) => l !== 'ko'),
    [facility]
  );
  const showLangSelector = extraLangs.length > 0;
  const theme = facility?.theme === 'dark' ? 'dark' : 'light';
  const shellStyle = themeStyle(theme);

  if (error) {
    return (
      <div className="flex h-dvh items-center justify-center overflow-hidden bg-[#f7f7fa] text-gray-500">
        {error}
      </div>
    );
  }
  if (!facility) {
    return (
      <div className="flex h-dvh items-center justify-center overflow-hidden bg-[#f7f7fa] text-gray-400">
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
    "h-dvh min-w-[768px] overflow-hidden font-['Pretendard','Noto_Sans_KR',sans-serif]";

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
          <div className={`${PANEL} gap-[clamp(0.65rem,1.6vh,1.15rem)]`}>
            <div className="flex w-full shrink-0 items-center gap-[clamp(0.5rem,1.2vw,1rem)]">
              <TBridgeLogo
                className="h-[clamp(1.35rem,2.8vh,2.1rem)] w-auto shrink-0"
                enableFullscreenTap
                onPointerUp={onLogoPointerUp}
                onClick={onLogoClick}
              />
              {showLangSelector ? (
                <div className="min-w-0 flex-1">
                  <LanguagePillSelector
                    lang={lang}
                    onChange={setLang}
                    enabled={['ko', ...extraLangs]}
                    align="start"
                  />
                </div>
              ) : null}
            </div>

            <FacilityBrand facility={facility} />
            <WaitingStatsCard facility={facility} t={t} lang={lang} />
            <KioskNoticeCard
              html={facility.kioskNotice}
              title={t('notice') || '공지사항'}
            />
          </div>
        </aside>

        <main className="flex h-full w-1/2 min-w-0 justify-center px-[clamp(0.75rem,2vw,1.5rem)] py-[clamp(0.75rem,2vh,1.25rem)]">
          <Outlet context={context} />
        </main>
      </div>
    </div>
  );
}
