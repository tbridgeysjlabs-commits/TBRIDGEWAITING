import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import Toast from '../../components/Toast';
import { themeStyle } from '../../theme/customerTheme';

/**
 * 카카오 알림톡 [취소] 딥링크.
 * `/w/:facilityCode/complete/:waitingId/cancel` 진입 시 대기등록을 즉시 취소한 뒤 완료 페이지로 이동.
 */
export default function CancelPage() {
  const { facilityCode, waitingId } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('대기 등록을 취소하는 중...');
  const [toast, setToast] = useState('');
  const [theme, setTheme] = useState('light');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const run = async () => {
      try {
        const data = await api(
          `/facilities/${facilityCode}/waitings/${waitingId}/complete`
        );
        setTheme(data.facility?.theme === 'dark' ? 'dark' : 'light');

        if (data.waiting?.status !== 'pending') {
          setMessage(data.waiting?.statusLabel || '이미 처리된 웨이팅입니다.');
          setTimeout(() => {
            navigate(`/w/${facilityCode}/complete/${waitingId}`, { replace: true });
          }, 800);
          return;
        }

        await api(`/facilities/${facilityCode}/waitings/${waitingId}/cancel`, {
          method: 'POST',
          body: JSON.stringify({ by: 'customer' }),
        });
        setMessage('대기 등록이 취소되었습니다.');
        setToast('대기 등록이 취소되었습니다.');
        setTimeout(() => {
          navigate(`/w/${facilityCode}/complete/${waitingId}`, { replace: true });
        }, 900);
      } catch (e) {
        setMessage(e.message || '취소에 실패했습니다.');
        setToast(e.message || '취소에 실패했습니다.');
      }
    };

    run();
  }, [facilityCode, waitingId, navigate]);

  const style = themeStyle(theme);

  return (
    <div
      className="flex min-h-dvh w-full max-w-[100vw] items-center justify-center overflow-x-hidden px-4 font-['Pretendard','Noto_Sans_KR',sans-serif]"
      style={{
        ...style,
        background: `linear-gradient(to bottom right, var(--cw-bg), var(--cw-bg-mid), var(--cw-bg-end))`,
      }}
    >
      <Toast message={toast} visible={!!toast} />
      <div className="w-full max-w-[420px] rounded-[28px] bg-[var(--cw-panel,#fff)] px-6 py-10 text-center shadow-[0_24px_60px_rgba(120,100,180,0.12)]">
        <p className="text-lg font-bold text-[var(--cw-text,#1f1a33)]">{message}</p>
        <button
          type="button"
          className="mt-8 w-full rounded-2xl bg-[var(--cw-button-bg,#5B21B6)] px-4 py-3.5 text-[15px] font-bold text-[var(--cw-button-fg,#fff)]"
          onClick={() =>
            navigate(`/w/${facilityCode}/complete/${waitingId}`, { replace: true })
          }
        >
          웨이팅 확인으로 이동
        </button>
      </div>
    </div>
  );
}
