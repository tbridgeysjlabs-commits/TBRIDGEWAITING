import { NavLink } from 'react-router-dom';

function SidebarBrand() {
  return (
    <div className="sidebar-logo" aria-label="T BRIDGE">
      <img src="/tbridge_logo.png" alt="T BRIDGE" />
    </div>
  );
}

function SidebarToggle({ onClick, title, expand }) {
  return (
    <button
      type="button"
      className="sidebar-toggle"
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {expand ? '»»' : '···'}
    </button>
  );
}

export default function SystemSidebar({ onLogout, collapsed, onToggle }) {
  if (collapsed) {
    return (
      <aside className="admin-sidebar collapsed">
        <SidebarToggle onClick={onToggle} title="메뉴 열기" expand />
      </aside>
    );
  }

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-top">
        <SidebarBrand />
        <SidebarToggle onClick={onToggle} title="메뉴 닫기" />
      </div>
      <nav>
        <NavLink
          to="/system-admin/facilities"
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          시설사 관리
        </NavLink>
        <NavLink
          to="/system-admin/notices"
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          공지사항 관리
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
        <NavLink
          to="/system-admin/settings"
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          설정
        </NavLink>
      </nav>
      <button type="button" className="logout-btn" onClick={onLogout}>
        로그아웃
      </button>
    </aside>
  );
}
