import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, formatTime } from '../../api/client';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useClock } from '../../hooks/useClock';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';

export default function WaitingManagePage() {
  const { facilityCode } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') || 'pending';
  const { facilityUser, logoutFacility } = useAuth();
  const navigate = useNavigate();
  const now = useClock();
  const { collapsed, toggle } = useSidebarCollapse('tb_admin_sidebar');
  const [board, setBoard] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState('');

  const load = useCallback(() => {
    return api(`/admin/${facilityCode}/waitings/board`).then((data) => {
      setBoard(data);
      return data;
    });
  }, [facilityCode]);

  useEffect(() => {
    load().catch((e) => setToast(e.message));
    const id = setInterval(() => load().catch(() => {}), 10000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!facilityUser || facilityUser.facilityCode !== facilityCode) return;
    api(`/admin/${facilityCode}/billing`)
      .then((b) => {
        if (b.insufficientBalance) {
          if (window.confirm('충전금액이 소진되어 카카오 알림톡 발송이 불가합니다.')) {
            navigate(`/admin/${facilityCode}/billing`);
          }
        } else if (b.lowBalanceWarning) {
          if (
            window.confirm(
              `현재 충전금 잔액은 ${Number(b.balance).toLocaleString()}원 입니다. 충전하시겠습니까?`
            )
          ) {
            navigate(`/admin/${facilityCode}/billing`);
          }
        }
      })
      .catch(() => {});
  }, [facilityCode, facilityUser, navigate]);

  useEffect(() => {
    const current =
      status === 'completed'
        ? board?.completed || []
        : status === 'cancelled'
          ? board?.cancelled || []
          : board?.pending || [];

    if (!current.length) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) => {
      if (prev && current.some((item) => item.id === prev)) return prev;
      return current[0].id;
    });
  }, [status, board]);

  if (!facilityUser || facilityUser.facilityCode !== facilityCode) {
    return <Navigate to={`/admin/${facilityCode}/login`} replace />;
  }

  const list =
    status === 'completed'
      ? board?.completed || []
      : status === 'cancelled'
        ? board?.cancelled || []
        : board?.pending || [];

  const selected = list.find((item) => item.id === selectedId);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const complete = async () => {
    if (!selected) return;
    try {
      const result = await api(
        `/admin/${facilityCode}/waitings/${selected.id}/complete`,
        { method: 'POST', body: '{}' }
      );
      showToast(result.toast);
      await load();
    } catch (e) {
      showToast(e.message);
    }
  };

  const cancel = async (id) => {
    try {
      const result = await api(`/admin/${facilityCode}/waitings/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ by: 'admin', reason: 'admin_cancelled' }),
      });
      showToast(result.toast);
      await load();
    } catch (e) {
      showToast(e.message);
    }
  };

  return (
    <div className={`admin-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <Toast message={toast} visible={!!toast} />
      <AdminSidebar
        facilityCode={facilityCode}
        collapsed={collapsed}
        onToggle={toggle}
        onLogout={() => {
          logoutFacility();
          navigate(`/admin/${facilityCode}/login`);
        }}
      />
      <main className="admin-main">
        <header className="admin-header">
          <h1>대기자 관리</h1>
          <div className="admin-clock">{now}</div>
        </header>

        <div className="status-tabs">
          {[
            { key: 'pending', label: '대기 중', count: board?.counts?.pending || 0 },
            { key: 'completed', label: '대기 완료', count: board?.counts?.completed || 0 },
            { key: 'cancelled', label: '대기 취소', count: board?.counts?.cancelled || 0 },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`status-tab ${status === tab.key ? 'active' : ''}`}
              onClick={() => setSearchParams({ status: tab.key })}
            >
              {tab.label} ({tab.count}팀)
            </button>
          ))}
        </div>

        <div className="waiting-list-box">
          {list.map((item) => (
            <div
              key={item.id}
              className={`waiting-row ${selectedId === item.id ? 'selected' : ''}`}
              onClick={() => setSelectedId(item.id)}
            >
              <span className="order-circle">{item.order}</span>
              <span className="seq-badge">{item.dailySeq}번</span>
              <span className="party-text">인원 {item.totalCount}명</span>
              <span>{formatTime(item.registeredAt)} 대기 등록</span>
              <span>{item.waitMinutes}분 기다림</span>
              {status === 'pending' && (
                <button
                  type="button"
                  className="mini-cancel"
                  onClick={(e) => {
                    e.stopPropagation();
                    cancel(item.id);
                  }}
                >
                  대기 취소
                </button>
              )}
              {status === 'completed' && (
                <span>{formatTime(item.completedAt)} 대기 완료</span>
              )}
              {status === 'cancelled' && (
                <span>
                  {formatTime(item.cancelledAt)} {item.endLabel || '대기 취소'}
                </span>
              )}
            </div>
          ))}
          {!list.length && <div className="empty-list">데이터가 없습니다.</div>}
        </div>

        {status === 'pending' && selected && (
          <button type="button" className="btn-primary enter-btn" onClick={complete}>
            {selected.dailySeq}번 / 인원 {selected.totalCount}명 입장하기 &gt;
          </button>
        )}
      </main>
    </div>
  );
}
