import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import PasswordChangeModal from '../../components/PasswordChangeModal';
import SystemSidebar from '../../components/system/SystemSidebar';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';

export default function SystemSettingsPage() {
  const { systemUser, logoutSystem } = useAuth();
  const navigate = useNavigate();
  const { collapsed, toggle } = useSidebarCollapse('tb_system_sidebar');
  const [adminContact, setAdminContact] = useState('');
  const [saved, setSaved] = useState('');
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (!systemUser) return;
    api('/system-admin/settings', {}, 'system')
      .then((data) => {
        const v = data.adminContact || '';
        setAdminContact(v);
        setSaved(v);
      })
      .catch((e) => setToast(e.message));
  }, [systemUser]);

  if (!systemUser) return <Navigate to="/system-admin/login" replace />;

  const dirty = adminContact !== saved;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api(
        '/system-admin/settings',
        { method: 'PUT', body: JSON.stringify({ adminContact }) },
        'system'
      );
      const v = data.adminContact || '';
      setAdminContact(v);
      setSaved(v);
      showToast('저장되었습니다.');
    } catch (err) {
      showToast(err.message);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async ({ currentPassword, newPassword }) => {
    setPwSaving(true);
    try {
      await api(
        '/system-admin/password',
        {
          method: 'PUT',
          body: JSON.stringify({ currentPassword, newPassword }),
        },
        'system'
      );
      setPwOpen(false);
      showToast('비밀번호가 변경되었습니다.');
    } catch (err) {
      throw err;
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className={`admin-layout system-admin ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <Toast message={toast} visible={!!toast} />
      <SystemSidebar
        collapsed={collapsed}
        onToggle={toggle}
        onLogout={() => {
          logoutSystem();
          navigate('/system-admin/login');
        }}
      />
      <main className="admin-main settings-main">
        <header className="admin-header-text">
          <h1>설정</h1>
          <p className="admin-page-desc">시스템 관리자 계정 정보를 관리합니다</p>
        </header>
        <form className="settings-section" onSubmit={save}>
          <label>
            관리자 연락처
            <input
              type="tel"
              inputMode="numeric"
              placeholder="- 빼고 숫자만 입력"
              value={adminContact}
              onChange={(e) => setAdminContact(e.target.value.replace(/\D/g, ''))}
            />
          </label>
          <p style={{ color: '#888', fontSize: 13, marginTop: -4 }}>
            시스템 관리자 계정 전체에 적용되는 공통 연락처입니다. (시설사별 연락처와 별개)
          </p>
          <button type="submit" className="btn-primary" disabled={!dirty || saving}>
            저장
          </button>
        </form>

        <section className="settings-section" style={{ marginTop: 28 }}>
          <h2>비밀번호 변경</h2>
          <button type="button" className="btn-primary" onClick={() => setPwOpen(true)}>
            비밀번호 변경
          </button>
        </section>
      </main>

      <PasswordChangeModal
        open={pwOpen}
        username={systemUser?.username}
        saving={pwSaving}
        onClose={() => setPwOpen(false)}
        onSubmit={changePassword}
        onError={showToast}
      />
    </div>
  );
}
