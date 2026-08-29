import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, formatTime, mediaUrl } from '../../api/client';
import { toKstClockParts } from '../../utils/datetime.js';
import styles from './SignagePage.module.css';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const RECENT_SLOTS = 5;
const WAITING_SLOTS = 7;

function useStageScale(baseW = 1920, baseH = 1080) {
  const [scale, setScale] = useState(() =>
    typeof window === 'undefined'
      ? 1
      : Math.min(window.innerWidth / baseW, window.innerHeight / baseH)
  );

  useEffect(() => {
    const update = () => {
      setScale(Math.min(window.innerWidth / baseW, window.innerHeight / baseH));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [baseW, baseH]);

  return scale;
}

function useSignageClock(intervalMs = 1000) {
  const [parts, setParts] = useState(() => buildClockParts(new Date()));
  useEffect(() => {
    const id = setInterval(() => setParts(buildClockParts(new Date())), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return parts;
}

function buildClockParts(now) {
  const p = toKstClockParts(now);
  if (!p) {
    return { date: '--.--.-- (-)', time: '--:--', sec: '--' };
  }
  return {
    date: `${p.yy}.${p.mm}.${p.dd} (${WEEKDAYS[p.weekday]})`,
    time: `${p.hh}:${p.mi}`,
    sec: p.ss,
  };
}

function padSlots(items, size) {
  const list = items.slice(0, size);
  while (list.length < size) list.push(null);
  return list;
}

function peopleLabel(count) {
  return `인원 ${count ?? 0}명`;
}

function registeredLabel(iso) {
  const t = formatTime(iso);
  return t ? `${t} 등록` : '--:-- 등록';
}

export default function SignagePage() {
  const { facilityCode } = useParams();
  const scale = useStageScale();
  const clock = useSignageClock();
  const [facility, setFacility] = useState(null);
  const [pending, setPending] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [activeCall, setActiveCall] = useState(null);
  const [entryWaitMinutes, setEntryWaitMinutes] = useState(3);
  const [callKey, setCallKey] = useState(0);
  const [error, setError] = useState('');
  const prevCalledId = useRef(null);
  const initialized = useRef(false);

  const load = async () => {
    const [f, board] = await Promise.all([
      api(`/facilities/${facilityCode}/public`),
      api(`/facilities/${facilityCode}/waitings/board`),
    ]);
    const nextPending = board.pending || [];
    const nextCompleted = board.completed || [];
    // 최근 입장 호출: 호출(calledAt) 이력이 있는 완료 건만 (입장하기만 한 건 제외)
    const nextRecent =
      board.recentCalled ||
      nextCompleted.filter((item) => item.calledAt);
    const nextActive =
      board.currentlyCalled ||
      nextPending
        .filter((item) => item.calledAt)
        .sort((a, b) => new Date(b.calledAt) - new Date(a.calledAt))[0] ||
      null;

    const nextCalledId = nextActive?.id || null;

    if (!initialized.current) {
      prevCalledId.current = nextCalledId;
      initialized.current = true;
    } else if (nextCalledId && nextCalledId !== prevCalledId.current) {
      prevCalledId.current = nextCalledId;
      setCallKey((k) => k + 1);
    } else if (!nextCalledId) {
      if (prevCalledId.current) setCallKey((k) => k + 1);
      prevCalledId.current = null;
    }

    setFacility(f);
    setPending(nextPending);
    setCompleted(nextRecent);
    setActiveCall(nextActive);
    setEntryWaitMinutes(
      Math.max(1, Number(board.entryWaitMinutes ?? f.entryWaitMinutes ?? 3))
    );
  };

  useEffect(() => {
    initialized.current = false;
    prevCalledId.current = null;
    load().catch((e) => setError(e.message));
    const id = setInterval(() => load().catch(() => {}), 3000);
    return () => clearInterval(id);
  }, [facilityCode]);

  const waitingForDisplay = useMemo(() => {
    if (!activeCall) return pending;
    return pending.filter((item) => item.id !== activeCall.id);
  }, [pending, activeCall]);

  const recentSlots = useMemo(
    () => padSlots(completed.slice(0, RECENT_SLOTS), RECENT_SLOTS),
    [completed]
  );
  const waitingSlots = useMemo(
    () => padSlots(waitingForDisplay, WAITING_SLOTS),
    [waitingForDisplay]
  );

  if (error) {
    return (
      <div className={styles.viewport}>
        <div className="center-page error-page">{error}</div>
      </div>
    );
  }
  if (!facility) {
    return (
      <div className={styles.viewport}>
        <div className="center-page">Loading...</div>
      </div>
    );
  }

  const waitingCount = Math.max(
    0,
    (facility.pendingCount ?? pending.length) - (activeCall ? 1 : 0)
  );
  const isCalling = Boolean(activeCall);
  const name = facility.name || '{ 시설사명 }';
  const logoUrl = mediaUrl(facility.profileImageUrl);
  const brandMode = 'image_text';

  return (
    <div className={styles.viewport}>
      <div
        className={styles.stage}
        style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        <header className={styles.header}>
          <div className={styles.brand} data-brand-mode={brandMode}>
            <>
              <div className={styles.logo}>
                {logoUrl ? (
                  <img className={styles.logoImg} src={logoUrl} alt="" />
                ) : (
                  <span className={styles.logoFallback}>LOGO</span>
                )}
              </div>
              <div className={styles.brandText}>
                <span className={styles.facilityLabel}>FACILITY</span>
                <span className={styles.facilityName}>{name}</span>
              </div>
            </>
          </div>
          <div className={styles.clock}>
            <span className={styles.clockDate}>{clock.date}</span>
            <span className={styles.clockTime}>{clock.time}</span>
            <span className={styles.clockSec}>{clock.sec}</span>
          </div>
        </header>

        <div className={styles.main}>
          <section className={`${styles.card} ${styles.callCard}`}>
            <div className={styles.callHead}>
              <h2 className={styles.callTitle}>입장 호출</h2>
              <p className={styles.callHint}>
                {`호출 후 ${entryWaitMinutes}분 내 미입장 시 순번이 조정됩니다`}
              </p>
            </div>

            <div className={styles.callStage} data-call-active={isCalling}>
              {isCalling ? (
                <div className={styles.callActive} key={`call-${callKey}`}>
                  <div className={styles.numBlock}>
                    <span className={styles.numValue}>{activeCall.dailySeq}</span>
                  </div>
                  <div className={styles.callCopy}>
                    <p className={styles.callTeam}>번 팀 입장해 주세요</p>
                    <div className={styles.callPills}>
                      <span className={styles.pill}>
                        {peopleLabel(activeCall.totalCount)}
                      </span>
                      <span className={styles.pill}>
                        {registeredLabel(activeCall.registeredAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.callIdle} key={`idle-${callKey}`}>
                  <span className={styles.idleDot} aria-hidden="true" />
                  <p className={styles.idleTitle}>입장 호출 대기 중</p>
                  <p className={styles.idleSub}>
                    호출 시 이 화면에 팀 번호가 크게 표시됩니다
                  </p>
                </div>
              )}
            </div>

            <div className={styles.recent}>
              <h3 className={styles.recentLabel}>최근 입장 호출 최신순</h3>
              <div className={styles.recentGrid}>
                {recentSlots.map((item, idx) =>
                  item ? (
                    <div key={item.id} className={styles.recentChip}>
                      <span className={styles.recentSeq}>{item.dailySeq}번</span>
                      <div className={styles.recentMeta}>
                        <span className={styles.recentMetaPeople}>
                          {peopleLabel(item.totalCount)}
                        </span>
                        <span className={styles.recentMetaTime}>
                          {registeredLabel(item.registeredAt)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={`recent-empty-${idx}`}
                      className={`${styles.recentChip} ${styles.recentChipEmpty}`}
                      aria-hidden="true"
                    />
                  )
                )}
              </div>
            </div>
          </section>

          <section className={`${styles.card} ${styles.rail}`}>
            <div className={styles.railHead}>
              <h2 className={styles.railTitle}>현재 대기</h2>
              <div className={styles.railCount}>
                <span className={styles.railCountNum}>{waitingCount}</span>
                <span className={styles.railCountUnit}>팀</span>
              </div>
            </div>
            <div className={styles.railList}>
              {waitingSlots.map((item, idx) =>
                item ? (
                  <div key={item.id} className={styles.railRow}>
                    <div className={styles.railLeft}>
                      <span className={styles.railSeq}>{item.dailySeq}번</span>
                      {idx === 0 ? (
                        <span className={styles.nextTag}>다음 호출</span>
                      ) : null}
                    </div>
                    <div className={styles.railRight}>
                      <span className={styles.railPeople}>
                        {peopleLabel(item.totalCount)}
                      </span>
                      <span className={styles.railTime}>
                        {registeredLabel(item.registeredAt)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    key={`wait-empty-${idx}`}
                    className={`${styles.railRow} ${styles.railRowEmpty}`}
                    aria-hidden="true"
                  />
                )
              )}
            </div>
          </section>
        </div>

        <footer className={styles.footer}>
          <span className={styles.footerBrand}>T BRIDGE</span>
        </footer>
      </div>
    </div>
  );
}
