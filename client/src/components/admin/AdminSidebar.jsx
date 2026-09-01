import { NavLink } from 'react-router-dom';

const NAV = [
  { to: 'waiting', label: '대기자 관리', short: '대기' },
  { to: 'history', label: '대기자 내역', short: '내역' },
  { to: 'customers', label: '고객 관리', short: '고객' },
  { to: 'billing', label: '알림톡', short: '알림' },
  { to: 'notices', label: '공지사항', short: '공지' },
  { to: 'settings', label: '설정', short: '설정' },
];

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
      data-side-toggle=""
    >
      {expand ? '›' : '‹'}
    </button>
  );
}

export default function AdminSidebar({ facilityCode, onLogout, collapsed, onToggle }) {
  const base = `/admin/${facilityCode}`;

  return (
    <aside className={`admin-sidebar facility-admin-sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-top">
        <SidebarBrand />
        <SidebarToggle
          onClick={onToggle}
          title={collapsed ? '메뉴 열기' : '메뉴 닫기'}
          expand={collapsed}
        />
      </div>
      <nav>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={`${base}/${item.to}`}
            className={({ isActive }) => (isActive ? 'active' : '')}
            title={item.label}
          >
            <span className="nav-label-full">{item.label}</span>
            <span className="nav-label-short">{item.short}</span>
          </NavLink>
        ))}
      </nav>
      <div className="admin-sidebar-foot">
        <button type="button" className="logout-btn" onClick={onLogout}>
          {collapsed ? 'OUT' : '로그아웃'}
        </button>
      </div>
    </aside>
  );
}
