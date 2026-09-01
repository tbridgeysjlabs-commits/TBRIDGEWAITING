import { NavLink } from 'react-router-dom';

const NAV = [
  { to: '/system-admin/facilities', label: '시설사 관리', short: '시설' },
  { to: '/system-admin/notices', label: '공지사항 관리', short: '공지' },
  { to: '/system-admin/history', label: '대기자 내역', short: '내역' },
  { to: '/system-admin/customers', label: '고객 관리', short: '고객' },
  { to: '/system-admin/billing', label: '알림톡', short: '알림' },
  { to: '/system-admin/settings', label: '설정', short: '설정' },
];

function SidebarBrand({ collapsed }) {
  return (
    <div className="sidebar-logo system-sidebar-brand" aria-label="T BRIDGE SYSTEM">
      <img src="/tbridge_logo.png" alt="T BRIDGE" />
      {!collapsed && <span className="system-badge">SYSTEM</span>}
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

export default function SystemSidebar({ onLogout, collapsed, onToggle }) {
  return (
    <aside className={`admin-sidebar system-admin-sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-top">
        <SidebarBrand collapsed={collapsed} />
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
            to={item.to}
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
