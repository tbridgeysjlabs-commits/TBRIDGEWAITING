import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, formatDateTime } from '../../api/client';
import SystemSidebar from '../../components/system/SystemSidebar';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';

const emptyForm = {
  name: '',
  facilityCode: '',
  masterUsername: '',
  masterPassword: '',
  kakaoUnitCost: '20',
  status: 'active',
};

export default function FacilitiesPage() {
  const { systemUser, logoutSystem } = useAuth();
  const navigate = useNavigate();
  const { collapsed, toggle } = useSidebarCollapse('tb_system_sidebar');
  const [facilities, setFacilities] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState('');

  const load = () => api('/system-admin/facilities', {}, 'system').then(setFacilities);

  useEffect(() => {
    if (!systemUser) return;
    load().catch((e) => setToast(e.message));
  }, [systemUser]);

  if (!systemUser) return <Navigate to="/system-admin/login" replace />;

  const create = async (e) => {
    e.preventDefault();
    try {
      const created = await api(
        '/system-admin/facilities',
        {
          method: 'POST',
          body: JSON.stringify({
            ...form,
            kakaoUnitCost: Number(form.kakaoUnitCost),
          }),
        },
        'system'
      );
      setOpen(false);
      setForm(emptyForm);
      await load();
      setToast(`등록 완료: ${created.facilityCode}`);
      setTimeout(() => setToast(''), 2500);
    } catch (err) {
      setToast(err.message);
      setTimeout(() => setToast(''), 2500);
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
      <main className="admin-main">
        <div className="page-title-row">
          <h1>시설사 관리</h1>
          <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
            시설사 등록
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>시설사명</th>
                <th>시설사 코드</th>
                <th>사용자 화면</th>
                <th>관리자 화면</th>
                <th>사이니지</th>
                <th>카카오 알림톡 발송 비용</th>
                <th>등록일시</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {facilities.map((f) => (
                <tr key={f.id}>
                  <td>{f.name}</td>
                  <td>{f.facilityCode}</td>
                  <td>
                    <a href={f.links.customer} target="_blank" rel="noreferrer">
                      {f.links.customer}
                    </a>
                  </td>
                  <td>
                    <a href={f.links.admin} target="_blank" rel="noreferrer">
                      {f.links.admin}
                    </a>
                  </td>
                  <td>
                    <a href={f.links.signage} target="_blank" rel="noreferrer">
                      {f.links.signage}
                    </a>
                  </td>
                  <td>{Number(f.kakaoUnitCost || 0).toLocaleString()}원</td>
                  <td>{formatDateTime(f.createdAt)}</td>
                  <td>{f.statusLabel || (f.status === 'withdraw' ? '탈퇴' : '활성')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {open && (
          <div className="modal-backdrop" onClick={() => setOpen(false)}>
            <form
              className="modal-card"
              onClick={(e) => e.stopPropagation()}
              onSubmit={create}
            >
              <h2>시설사 등록</h2>
              <label>
                시설사명
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </label>
              <label>
                시설사 코드
                <input
                  value={form.facilityCode}
                  onChange={(e) => setForm({ ...form, facilityCode: e.target.value })}
                  required
                />
              </label>
              <label>
                마스터계정 ID
                <input
                  value={form.masterUsername}
                  onChange={(e) => setForm({ ...form, masterUsername: e.target.value })}
                  required
                />
              </label>
              <label>
                마스터계정 비밀번호
                <input
                  type="password"
                  value={form.masterPassword}
                  onChange={(e) => setForm({ ...form, masterPassword: e.target.value })}
                  required
                />
              </label>
              <label>
                카카오 알림톡 발송 비용
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.kakaoUnitCost}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d]/g, '');
                    setForm({ ...form, kakaoUnitCost: v });
                  }}
                  required
                />
              </label>
              <label>
                상태
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="active">활성(ACTIVE)</option>
                  <option value="withdraw">탈퇴(WITHDRAW)</option>
                </select>
              </label>
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
                  취소
                </button>
                <button type="submit" className="btn-primary">
                  등록
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
