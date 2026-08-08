import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, formatTime } from '../../api/client';
import { useClock } from '../../hooks/useClock';

export default function SignagePage() {
  const { facilityCode } = useParams();
  const now = useClock();
  const [facility, setFacility] = useState(null);
  const [pending, setPending] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [calledSeq, setCalledSeq] = useState(null);
  const [callPulse, setCallPulse] = useState(false);
  const [error, setError] = useState('');
  const prevCompletedIds = useRef(new Set());
  const initialized = useRef(false);

  const load = async () => {
    const [f, board] = await Promise.all([
      api(`/facilities/${facilityCode}/public`),
      api(`/facilities/${facilityCode}/waitings/board`),
    ]);
    const nextPending = board.pending || [];
    const nextCompleted = board.completed || [];
    const nextIds = new Set(nextCompleted.map((item) => item.id));

    if (!initialized.current) {
      prevCompletedIds.current = nextIds;
      initialized.current = true;
      if (nextCompleted[0]) setCalledSeq(nextCompleted[0].dailySeq);
    } else {
      const newlyCompleted = nextCompleted.find(
        (item) => !prevCompletedIds.current.has(item.id)
      );
      if (newlyCompleted) {
        setCalledSeq(newlyCompleted.dailySeq);
        setCallPulse(true);
        setTimeout(() => setCallPulse(false), 1200);
      }
      prevCompletedIds.current = nextIds;
    }

    setFacility(f);
    setPending(nextPending);
    setCompleted(nextCompleted);
  };

  useEffect(() => {
    initialized.current = false;
    prevCompletedIds.current = new Set();
    load().catch((e) => setError(e.message));
    const id = setInterval(() => load().catch(() => {}), 3000);
    return () => clearInterval(id);
  }, [facilityCode]);

  if (error) return <div className="center-page error-page">{error}</div>;
  if (!facility) return <div className="center-page">Loading...</div>;

  const waitingList = pending.slice(0, 5);
  const calledList = completed.slice(0, 5);

  return (
    <div className="signage-page vertical">
      <header className="signage-header">
        <div>
          <h1>{facility.name}</h1>
          <p>현재 대기 {facility.pendingCount}팀</p>
        </div>
        <div className="signage-clock">{now}</div>
      </header>

      <section className="signage-band top">
        <h2>현재 대기</h2>
        <div className="signage-band-list">
          {waitingList.map((item) => (
            <div key={item.id} className="signage-card">
              <div className="signage-seq">{item.dailySeq}번</div>
              <div>인원 {item.totalCount}명</div>
              <div>{formatTime(item.registeredAt)} 등록</div>
            </div>
          ))}
          {!waitingList.length && <div className="signage-empty">현재 대기팀이 없습니다.</div>}
        </div>
      </section>

      <section className="signage-band middle">
        <div className={`signage-call ${callPulse ? 'pulse' : ''}`}>
          {calledSeq != null ? (
            <div className="signage-call-text">
              <span className="signage-call-seq">{calledSeq}</span>팀 입장해 주세요.
            </div>
          ) : (
            <div className="signage-call-idle">입장 호출을 기다리는 중</div>
          )}
        </div>
      </section>

      <section className="signage-band bottom">
        <h2>최근 입장 호출</h2>
        <div className="signage-band-list">
          {calledList.map((item) => (
            <div key={item.id} className="signage-card called">
              <div className="signage-seq">{item.dailySeq}번</div>
              <div>인원 {item.totalCount}명</div>
              <div>{formatTime(item.completedAt)} 입장</div>
            </div>
          ))}
          {!calledList.length && <div className="signage-empty">입장 호출된 팀이 없습니다.</div>}
        </div>
      </section>

      <footer className="signage-footer">
        <span className="tbridge-logo">
          <img src="/tbridge_logo.png" alt="T BRIDGE" />
        </span>
        <span>{facility.systemVersion}</span>
      </footer>
    </div>
  );
}
