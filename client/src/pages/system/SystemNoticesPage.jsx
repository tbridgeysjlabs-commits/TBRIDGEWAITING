import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { api, formatDateTime } from '../../api/client';
import HtmlEditor from '../../components/HtmlEditor';
import SystemSidebar from '../../components/system/SystemSidebar';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';

const emptyForm = { version: '', title: '', contentHtml: '' };

export default function SystemNoticesPage() {
  const { systemUser, logoutSystem } = useAuth();
  const navigate = useNavigate();
  const { collapsed, toggle } = useSidebarCollapse('tb_system_sidebar');
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState('');

  const load = () => api('/system-admin/notices', {}, 'system').then(setItems);

  useEffect(() => {
    if (!systemUser) return;
    load().catch((e) => setToast(e.message));
  }, [systemUser]);

  if (!systemUser) return <Navigate to="/system-admin/login" replace />;

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      version: row.version || '',
      title: row.title || '',
      contentHtml: row.contentHtml || '',
    });
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api(
          `/system-admin/notices/${editingId}`,
          { method: 'PUT', body: JSON.stringify(form) },
          'system'
        );
      } else {
        await api(
          '/system-admin/notices',
          { method: 'POST', body: JSON.stringify(form) },
          'system'
        );
      }
      setOpen(false);
      await load();
      setToast('저장되었습니다.');
      setTimeout(() => setToast(''), 2000);
    } catch (err) {
      setToast(err.message);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('이 공지사항을 삭제할까요?')) return;
    try {
      await api(`/system-admin/notices/${id}`, { method: 'DELETE' }, 'system');
      await load();
    } catch (err) {
      setToast(err.message);
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
      <main className="admin-main">
        <div className="page-title-row">
          <div className="admin-header-text">
            <h1>공지사항 관리</h1>
            <p className="admin-page-desc">
              전체 시설사에 노출되는 업데이트 공지를 관리합니다
            </p>
          </div>
          <button type="button" className="btn-primary" onClick={openCreate}>
            공지 등록
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>제목</th>
                <th>등록일</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td>
                    <button type="button" className="linkish" onClick={() => openEdit(row)}>
                      {row.title}
                    </button>
                  </td>
                  <td>{formatDateTime(row.createdAt)}</td>
                  <td>
                    <button type="button" className="btn-ghost" onClick={() => remove(row.id)}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', color: '#888' }}>
                    등록된 공지사항이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {open && (
          <div className="modal-backdrop" onClick={() => setOpen(false)}>
            <form
              className="modal-card modal-card-wide"
              onClick={(e) => e.stopPropagation()}
              onSubmit={save}
            >
              <h2>{editingId ? '공지 수정' : '공지 등록'}</h2>
              <label>
                버전
                <input
                  placeholder="예: v1.2.0"
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                />
              </label>
              <label>
                제목
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>
              <label>
                업데이트 내용
                <HtmlEditor
                  value={form.contentHtml}
                  onChange={(html) => setForm({ ...form, contentHtml: html })}
                  placeholder="업데이트 내용을 입력하세요"
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
                  취소
                </button>
                <button type="submit" className="btn-primary">
                  저장
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
