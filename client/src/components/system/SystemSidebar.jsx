import { NavLink } from 'react-router-dom';

export default function SystemSidebar({ onLogout, collapsed, onToggle }) {
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
        <NavLink
          to="/system-admin/facilities"
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          시설사 관리
        </NavLink>
        <NavLink
          to="/system-admin/history"
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          대기자 내역
        </NavLink>
        <NavLink
          to="/system-admin/customers"
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          고객 관리
        </NavLink>
        <NavLink
          to="/system-admin/billing"
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          알림톡
        </NavLink>
      </nav>
      <button type="button" className="logout-btn" onClick={onLogout}>
        로그아웃
      </button>
    </aside>
  );
}
