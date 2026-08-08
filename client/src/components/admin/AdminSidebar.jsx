import { NavLink } from 'react-router-dom';

export default function AdminSidebar({ facilityCode, onLogout, collapsed, onToggle }) {
  const base = `/admin/${facilityCode}`;

  if (collapsed) {
    return (
      <aside className="admin-sidebar collapsed">
        <button type="button" className="sidebar-toggle" onClick={onToggle} title="메뉴 열기">
          »»
        </button>
      </aside>
    );
  }

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-top">
        <div className="sidebar-logo">
          <img src="/tbridge_logo.png" alt="T BRIDGE" />
        </div>
        <button type="button" className="sidebar-toggle" onClick={onToggle} title="메뉴 닫기">
          ««
        </button>
      </div>
      <nav>
        <NavLink to={`${base}/waiting`} className={({ isActive }) => (isActive ? 'active' : '')}>
          대기자 관리
        </NavLink>
        <NavLink to={`${base}/history`} className={({ isActive }) => (isActive ? 'active' : '')}>
          대기자 내역
        </NavLink>
        <NavLink to={`${base}/customers`} className={({ isActive }) => (isActive ? 'active' : '')}>
          고객 관리
        </NavLink>
        <NavLink to={`${base}/billing`} className={({ isActive }) => (isActive ? 'active' : '')}>
          알림톡
        </NavLink>
        <NavLink to={`${base}/settings`} className={({ isActive }) => (isActive ? 'active' : '')}>
          설정
        </NavLink>
      </nav>
      <button type="button" className="logout-btn" onClick={onLogout}>
        로그아웃
      </button>
    </aside>
  );
}
