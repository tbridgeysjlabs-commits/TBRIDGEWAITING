import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, formatDateTime } from '../../api/client';
import AdminCloseIcon from '../../components/admin/AdminCloseIcon';
import PasswordChecklist from '../../components/PasswordChecklist';
import SystemSidebar from '../../components/system/SystemSidebar';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';
import { validatePassword } from '../../utils/passwordPolicy';

const DEFAULT_MASTER_PASSWORD = 'tbridge1234!';

const emptyForm = {
  name: '',
  facilityCode: '',
  masterPassword: DEFAULT_MASTER_PASSWORD,
  adAreaEnabled: true,
  kakaoUnitCost: '20',
  status: 'active',
};

function snapshotOf(form) {
  return JSON.stringify({
    name: form.name,
    facilityCode: form.facilityCode,
    masterPassword: form.masterPassword,
    adAreaEnabled: form.adAreaEnabled !== false,
    kakaoUnitCost: String(form.kakaoUnitCost ?? ''),
    status: form.status,
  });
}

export default function FacilitiesPage() {
  const { systemUser, logoutSystem } = useAuth();
  const navigate = useNavigate();
  const { collapsed, toggle } = useSidebarCollapse('tb_system_sidebar');
  const [facilities, setFacilities] = useState([]);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('create');
  const [form, setForm] = useState(emptyForm);
  const [initialSnapshot, setInitialSnapshot] = useState('');
  const [toast, setToast] = useState('');

  const dirty = useMemo(() => {
    if (!open || mode !== 'edit') return false;
    return snapshotOf(form) !== initialSnapshot;
  }, [open, mode, form, initialSnapshot]);

  const load = () => api('/system-admin/facilities', {}, 'system').then(setFacilities);

  useEffect(() => {
    if (!systemUser) return;
    load().catch((e) => setToast(e.message));
  }, [systemUser]);

  const closeModal = () => {
    setOpen(false);
    setMode('create');
    setForm(emptyForm);
    setInitialSnapshot('');
  };

  const requestClose = () => {
    if (mode === 'edit' && dirty) {
      const ok = window.confirm('변경사항이 저장되지 않았습니다. 그래도 닫으시겠습니까?');
      if (!ok) return;
    }
    closeModal();
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      if (mode === 'edit' && dirty) {
        const ok = window.confirm('변경사항이 저장되지 않았습니다. 그래도 닫으시겠습니까?');
        if (!ok) return;
      }
      closeModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, mode, dirty]);

  if (!systemUser) return <Navigate to="/system-admin/login" replace />;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const openCreate = () => {
    setMode('create');
    setForm({ ...emptyForm, masterPassword: DEFAULT_MASTER_PASSWORD });
    setInitialSnapshot('');
    setOpen(true);
  };

  const openEdit = (facility) => {
    const next = {
      name: facility.name || '',
      facilityCode: facility.facilityCode || '',
      masterPassword: facility.masterPassword || DEFAULT_MASTER_PASSWORD,
      adAreaEnabled: facility.adAreaEnabled !== false,
      kakaoUnitCost: String(facility.kakaoUnitCost ?? 20),
      status: facility.status === 'withdraw' || facility.status === 'inactive' ? 'withdraw' : 'active',
    };
    setMode('edit');
    setForm(next);
    setInitialSnapshot(snapshotOf(next));
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (mode === 'edit' && !dirty) return;

    const masterPwd = String(form.masterPassword || '').trim();
    if (masterPwd) {
      const check = validatePassword(masterPwd, {
        username: form.facilityCode,
      });
      if (!check.valid) {
        showToast(check.reasons[0] || '비밀번호 규칙을 확인해 주세요.');
        return;
      }
    } else if (mode === 'create') {
      showToast('마스터계정 비밀번호를 입력해 주세요.');
      return;
    }

    try {
      if (mode === 'create') {
        const created = await api(
          '/system-admin/facilities',
          {
            method: 'POST',
            body: JSON.stringify({
              name: form.name,
              facilityCode: form.facilityCode,
              masterPassword: masterPwd || DEFAULT_MASTER_PASSWORD,
              adAreaEnabled: form.adAreaEnabled !== false,
              kakaoUnitCost: Number(form.kakaoUnitCost),
              status: form.status,
            }),
          },
          'system'
        );
        closeModal();
        await load();
        showToast(`등록 완료: ${created.facilityCode}`);
        return;
      }

      await api(
        `/system-admin/facilities/${encodeURIComponent(form.facilityCode)}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: form.name,
            masterPassword: masterPwd,
            adAreaEnabled: form.adAreaEnabled !== false,
            kakaoUnitCost: Number(form.kakaoUnitCost),
            status: form.status,
          }),
        },
        'system'
      );
      closeModal();
      await load();
      showToast('수정 완료');
    } catch (err) {
      showToast(err.message);
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
          <button type="button" className="btn-primary" onClick={openCreate}>
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
                <th>알림톡 단가</th>
                <th>등록일</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {facilities.map((f) => (
                <tr key={f.id || f.facilityCode} onClick={() => openEdit(f)}>
                  <td>{f.name}</td>
                  <td>{f.facilityCode}</td>
                  <td>{f.links?.customer || `/w/${f.facilityCode}`}</td>
                  <td>{f.links?.admin || `/admin/${f.facilityCode}/login`}</td>
                  <td>{f.links?.signage || `/signage/${f.facilityCode}`}</td>
                  <td>{Number(f.kakaoUnitCost || 0).toLocaleString()}원</td>
                  <td>{formatDateTime(f.createdAt)}</td>
                  <td>{f.statusLabel || f.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {open && (
          <div className="modal-backdrop" onClick={requestClose}>
            <form
              className="modal-card"
              onClick={(e) => e.stopPropagation()}
              onSubmit={submit}
            >
              <button type="button" className="close-btn abs" onClick={requestClose} aria-label="닫기">
                <AdminCloseIcon />
              </button>
              <h2>{mode === 'edit' ? '시설사 수정' : '시설사 등록'}</h2>
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
                  readOnly={mode === 'edit'}
                />
              </label>
              <label>
                마스터계정 비밀번호
                <input
                  type="text"
                  value={form.masterPassword}
                  onChange={(e) => setForm({ ...form, masterPassword: e.target.value })}
                  required={mode === 'create'}
                  autoComplete="off"
                />
                <PasswordChecklist
                  password={form.masterPassword}
                  username={form.facilityCode}
                />
                {mode === 'create' && (
                  <p className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                    시설사용 비밀번호 초기값: admin1234! (시설 설정에서 변경)
                  </p>
                )}
              </label>
              <div className="settings-radio-row" style={{ marginBottom: 12 }}>
                <span className="settings-radio-label">웨이팅 등록 완료 페이지 광고 노출</span>
                <label className="settings-radio">
                  <input
                    type="radio"
                    name="adAreaEnabled"
                    checked={form.adAreaEnabled !== false}
                    onChange={() => setForm({ ...form, adAreaEnabled: true })}
                  />
                  활성화
                </label>
                <label className="settings-radio">
                  <input
                    type="radio"
                    name="adAreaEnabled"
                    checked={form.adAreaEnabled === false}
                    onChange={() => setForm({ ...form, adAreaEnabled: false })}
                  />
                  비활성화
                </label>
              </div>
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
              <div
                className="modal-actions"
                style={mode === 'edit' ? { justifyContent: 'space-between' } : undefined}
              >
                {mode === 'edit' ? (
                  <>
                    <button type="button" className="btn-ghost" onClick={closeModal}>
                      닫기
                    </button>
                    <button type="submit" className="btn-primary" disabled={!dirty}>
                      수정
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn-ghost" onClick={closeModal}>
                      취소
                    </button>
                    <button type="submit" className="btn-primary">
                      등록
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
