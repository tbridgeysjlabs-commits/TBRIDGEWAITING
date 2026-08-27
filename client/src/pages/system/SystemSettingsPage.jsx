import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import PasswordChecklist from '../../components/PasswordChecklist';
import SystemSidebar from '../../components/system/SystemSidebar';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';
import { validatePassword } from '../../utils/passwordPolicy';

export default function SystemSettingsPage() {
  const { systemUser, logoutSystem } = useAuth();
  const navigate = useNavigate();
  const { collapsed, toggle } = useSidebarCollapse('tb_system_sidebar');
  const [adminContact, setAdminContact] = useState('');
  const [saved, setSaved] = useState('');
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
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

  const changePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) {
      showToast('현재 비밀번호와 새 비밀번호를 입력해 주세요.');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      showToast('새 비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    const check = validatePassword(pwForm.newPassword, {
      username: systemUser?.username,
    });
    if (!check.valid) {
      showToast(check.reasons[0] || '비밀번호 규칙을 확인해 주세요.');
      return;
    }
    setPwSaving(true);
    try {
      await api(
        '/system-admin/password',
        {
          method: 'PUT',
          body: JSON.stringify({
            currentPassword: pwForm.currentPassword,
            newPassword: pwForm.newPassword,
          }),
        },
        'system'
      );
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast('비밀번호가 변경되었습니다.');
    } catch (err) {
      showToast(err.message);
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className={`admin-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
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
        <h1>설정</h1>
        <form className="settings-section" onSubmit={save}>
          <label>
            관리자 연락처
            <input
              placeholder="연락처 입력 (예: 02-1234-5678)"
              value={adminContact}
              onChange={(e) => setAdminContact(e.target.value)}
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
          <label>
            현재 비밀번호
            <input
              type="password"
              autoComplete="current-password"
              value={pwForm.currentPassword}
              onChange={(e) =>
                setPwForm({ ...pwForm, currentPassword: e.target.value })
              }
            />
          </label>
          <label>
            새 비밀번호
            <input
              type="password"
              autoComplete="new-password"
              value={pwForm.newPassword}
              onChange={(e) =>
                setPwForm({ ...pwForm, newPassword: e.target.value })
              }
            />
            {pwForm.newPassword ? (
              <PasswordChecklist
                password={pwForm.newPassword}
                username={systemUser?.username}
              />
            ) : null}
          </label>
          <label>
            새 비밀번호 확인
            <input
              type="password"
              autoComplete="new-password"
              value={pwForm.confirmPassword}
              onChange={(e) =>
                setPwForm({ ...pwForm, confirmPassword: e.target.value })
              }
            />
          </label>
          <button
            type="button"
            className="btn-primary"
            disabled={pwSaving}
            onClick={() => changePassword().catch(() => {})}
          >
            비밀번호 변경
          </button>
        </section>
      </main>
    </div>
  );
}
