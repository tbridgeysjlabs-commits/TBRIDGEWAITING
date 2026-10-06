import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, formatDateTime } from '../../api/client';
import AdminCloseIcon from '../../components/admin/AdminCloseIcon';
import FacilitySearchInput from '../../components/admin/FacilitySearchInput';
import SystemSidebar from '../../components/system/SystemSidebar';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';
import { validatePassword } from '../../utils/passwordPolicy';

function toAbsoluteUrl(pathOrUrl) {
  const raw = String(pathOrUrl || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

async function copyToClipboard(text) {
  const value = String(text || '');
  if (!value) throw new Error('복사할 값이 없습니다.');
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      /* fallback below */
    }
  }
  const ta = document.createElement('textarea');
  ta.value = value;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '-9999px';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, value.length);
  const ok = document.execCommand('copy');
  document.body.removeChild(ta);
  if (!ok) throw new Error('클립보드 복사에 실패했습니다.');
}

const DEFAULT_MASTER_PASSWORD = 'tbridge1234!';

const emptyKakaoSettings = () => ({
  resellerName: '',
  resellerApiUrl: 'https://api.bizppurio.com',
  resellerId: '',
  resellerPw: '',
  resellerApiKey: '',
  hasResellerPw: false,
  hasResellerApiKey: false,
  resellerPwLen: 0,
  resellerApiKeyLen: 0,
  clearResellerPw: false,
  clearResellerApiKey: false,
  senderPhone: '',
  senderProfile: '',
  templateWaitingRegistered: '',
  templateEntryImminent: '',
  templateEntryGuide: '',
  templateNoShowCancelled: '',
  templateOrderChanged: '',
  templateWaitingCancelled: '',
});

const emptyForm = {
  name: '',
  facilityCode: '',
  masterPassword: DEFAULT_MASTER_PASSWORD,
  adAreaEnabled: true,
  kakaoAccountType: 'tbridge',
  kakaoUnitCost: '20',
  kakaoAlimtalkSettings: emptyKakaoSettings(),
  status: 'active',
};

function snapshotOf(form) {
  return JSON.stringify({
    name: form.name,
    facilityCode: form.facilityCode,
    masterPassword: form.masterPassword,
    adAreaEnabled: form.adAreaEnabled !== false,
    kakaoAccountType: form.kakaoAccountType === 'facility' ? 'facility' : 'tbridge',
    kakaoUnitCost: String(form.kakaoUnitCost ?? ''),
    kakaoAlimtalkSettings: form.kakaoAlimtalkSettings || emptyKakaoSettings(),
    status: form.status,
  });
}

const KAKAO_SETTINGS_FIELDS = [
  {
    key: 'resellerName',
    label: '카카오 알림톡 중계사(딜러사)명',
    placeholder: '카카오 알림톡 중계사(딜러사)명 입력',
  },
  {
    key: 'resellerApiUrl',
    label: '카카오 알림톡 중계사 API 링크',
    placeholder: '비즈뿌리오 https://api.bizppurio.com / 뿌리오 https://message.ppurio.com',
  },
  {
    key: 'resellerId',
    label: '카카오 알림톡 중계사(딜러사) ID',
    placeholder: '카카오 알림톡 중계사(딜러사) ID 입력',
  },
  {
    key: 'resellerPw',
    label: '카카오 알림톡 중계사(딜러사) PW',
    placeholder: '비즈뿌리오: 로그인 암호 (변경 시에만 입력)',
    secret: true,
    hasKey: 'hasResellerPw',
    clearKey: 'clearResellerPw',
  },
  {
    key: 'resellerApiKey',
    label: '카카오 알림톡 중계사 API 인증키',
    placeholder: '뿌리오: 연동인증키 (변경 시에만 입력)',
    secret: true,
    hasKey: 'hasResellerApiKey',
    clearKey: 'clearResellerApiKey',
  },
  { key: 'senderPhone', label: '발신번호', placeholder: '발신번호 입력' },
  {
    key: 'senderProfile',
    label: '카카오 알림톡 발신 프로필',
    placeholder: '카카오 알림톡 발신 프로필 입력',
  },
  {
    key: 'templateWaitingRegistered',
    label: '1. 웨이팅 등록 완료 안내 카카오 알림톡 템플릿 코드',
    placeholder: '카카오 알림톡 템플릿 코드 입력',
  },
  {
    key: 'templateEntryImminent',
    label: '2. 입장 임박 안내 카카오 알림톡 템플릿 코드',
    placeholder: '카카오 알림톡 템플릿 코드 입력',
  },
  {
    key: 'templateEntryGuide',
    label: '3. 입장 안내 카카오 알림톡 템플릿 코드',
    placeholder: '카카오 알림톡 템플릿 코드 입력',
  },
  {
    key: 'templateNoShowCancelled',
    label: '4. 미입장 웨이팅 취소 안내 카카오 알림톡 템플릿 코드',
    placeholder: '카카오 알림톡 템플릿 코드 입력',
  },
  {
    key: 'templateOrderChanged',
    label: '5. 웨이팅 순서 변경 완료 안내 카카오 알림톡 템플릿 코드',
    placeholder: '카카오 알림톡 템플릿 코드 입력',
  },
  {
    key: 'templateWaitingCancelled',
    label: '6. 웨이팅 취소 완료 안내 카카오 알림톡 템플릿 코드',
    placeholder: '카카오 알림톡 템플릿 코드 입력',
  },
];

export default function FacilitiesPage() {
  const { systemUser, logoutSystem } = useAuth();
  const navigate = useNavigate();
  const { collapsed, toggle } = useSidebarCollapse('tb_system_sidebar');
  const [facilities, setFacilities] = useState([]);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('create');
  const [form, setForm] = useState(emptyForm);
  const [initialSnapshot, setInitialSnapshot] = useState('');
  const [kakaoSettingsOpen, setKakaoSettingsOpen] = useState(false);
  const [kakaoSettingsDraft, setKakaoSettingsDraft] = useState(emptyKakaoSettings());
  const [kakaoTestResult, setKakaoTestResult] = useState('');
  const [toast, setToast] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [statusActive, setStatusActive] = useState(true);
  const [statusWithdraw, setStatusWithdraw] = useState(true);
  const [appliedQ, setAppliedQ] = useState('');
  const [appliedActive, setAppliedActive] = useState(true);
  const [appliedWithdraw, setAppliedWithdraw] = useState(true);

  const dirty = useMemo(() => {
    if (!open || mode !== 'edit') return false;
    return snapshotOf(form) !== initialSnapshot;
  }, [open, mode, form, initialSnapshot]);

  const statusesParam = useMemo(() => {
    const list = [];
    if (appliedActive) list.push('active');
    if (appliedWithdraw) list.push('withdraw');
    return list.join(',');
  }, [appliedActive, appliedWithdraw]);

  const queryString = useCallback(() => {
    const params = new URLSearchParams();
    if (appliedQ.trim()) params.set('q', appliedQ.trim());
    if (statusesParam) params.set('statuses', statusesParam);
    return params.toString();
  }, [appliedQ, statusesParam]);

  const load = useCallback(() => {
    const qs = queryString();
    return api(
      `/system-admin/facilities${qs ? `?${qs}` : ''}`,
      {},
      'system'
    ).then(setFacilities);
  }, [queryString]);

  useEffect(() => {
    if (!systemUser) return;
    load().catch((e) => setToast(e.message));
  }, [systemUser, load]);

  const runSearch = () => {
    setAppliedQ(searchQ);
    setAppliedActive(statusActive);
    setAppliedWithdraw(statusWithdraw);
  };

  const resetFilters = () => {
    setSearchQ('');
    setStatusActive(true);
    setStatusWithdraw(true);
    setAppliedQ('');
    setAppliedActive(true);
    setAppliedWithdraw(true);
  };

  const closeModal = () => {
    setOpen(false);
    setMode('create');
    setForm(emptyForm);
    setInitialSnapshot('');
    setKakaoSettingsOpen(false);
    setKakaoSettingsDraft(emptyKakaoSettings());
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
      if (kakaoSettingsOpen) {
        setKakaoSettingsOpen(false);
        return;
      }
      if (mode === 'edit' && dirty) {
        const ok = window.confirm('변경사항이 저장되지 않았습니다. 그래도 닫으시겠습니까?');
        if (!ok) return;
      }
      closeModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, mode, dirty, kakaoSettingsOpen]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  if (!systemUser) return <Navigate to="/system-admin/login" replace />;

  const copyLink = async (pathOrUrl) => {
    try {
      await copyToClipboard(toAbsoluteUrl(pathOrUrl));
      showToast('해당 값이 복사되었습니다');
    } catch (e) {
      showToast(e.message || '클립보드 복사에 실패했습니다.');
    }
  };

  const openCreate = () => {
    setMode('create');
    setForm({
      ...emptyForm,
      masterPassword: DEFAULT_MASTER_PASSWORD,
      kakaoAlimtalkSettings: emptyKakaoSettings(),
    });
    setInitialSnapshot('');
    setOpen(true);
  };

  const openEdit = async (facility) => {
    let settings = emptyKakaoSettings();
    if (facility.kakaoAccountType === 'facility') {
      try {
        settings = await api(
          `/system-admin/facilities/${encodeURIComponent(facility.facilityCode)}/kakao-alimtalk-settings`,
          {},
          'system'
        );
      } catch {
        settings = emptyKakaoSettings();
      }
    }
    const next = {
      name: facility.name || '',
      facilityCode: facility.facilityCode || '',
      masterPassword: facility.masterPassword || DEFAULT_MASTER_PASSWORD,
      adAreaEnabled: facility.adAreaEnabled !== false,
      kakaoAccountType:
        facility.kakaoAccountType === 'facility' ? 'facility' : 'tbridge',
      kakaoUnitCost: String(facility.kakaoUnitCost ?? 20),
      kakaoAlimtalkSettings: { ...emptyKakaoSettings(), ...settings },
      status:
        facility.status === 'withdraw' || facility.status === 'inactive'
          ? 'withdraw'
          : 'active',
    };
    setMode('edit');
    setForm(next);
    setInitialSnapshot(snapshotOf(next));
    setOpen(true);
  };

  const applyKakaoSettingsDraftToForm = () => {
    const prevSettings = form.kakaoAlimtalkSettings || emptyKakaoSettings();
    const draft = kakaoSettingsDraft || emptyKakaoSettings();

    const resellerPw = draft.clearResellerPw
      ? ''
      : String(draft.resellerPw || '').trim() || prevSettings.resellerPw || '';
    const resellerApiKey = draft.clearResellerApiKey
      ? ''
      : String(draft.resellerApiKey || '').trim() ||
        prevSettings.resellerApiKey ||
        '';

    const nextSettings = {
      ...emptyKakaoSettings(),
      ...prevSettings,
      ...draft,
      resellerPw,
      resellerApiKey,
      clearResellerPw: Boolean(draft.clearResellerPw),
      clearResellerApiKey: Boolean(draft.clearResellerApiKey),
      hasResellerPw: draft.clearResellerPw
        ? false
        : Boolean(resellerPw || prevSettings.hasResellerPw),
      hasResellerApiKey: draft.clearResellerApiKey
        ? false
        : Boolean(resellerApiKey || prevSettings.hasResellerApiKey),
      resellerPwLen: draft.clearResellerPw
        ? 0
        : resellerPw
          ? resellerPw.length
          : Number(prevSettings.resellerPwLen) || 0,
      resellerApiKeyLen: draft.clearResellerApiKey
        ? 0
        : resellerApiKey
          ? resellerApiKey.length
          : Number(prevSettings.resellerApiKeyLen) || 0,
    };
    setForm((prev) => ({ ...prev, kakaoAlimtalkSettings: nextSettings }));
    return nextSettings;
  };

  const testKakaoAuth = async () => {
    if (mode !== 'edit' || !form.facilityCode) {
      showToast('시설사를 먼저 등록·수정으로 저장한 뒤 연결 테스트하세요.');
      return;
    }
    setKakaoTestResult('연결 테스트 중…');
    try {
      const settingsToSave = kakaoSettingsOpen
        ? applyKakaoSettingsDraftToForm()
        : form.kakaoAlimtalkSettings || emptyKakaoSettings();

      const typedPwLen = String(settingsToSave.resellerPw || '').trim().length;
      if (typedPwLen > 0) {
        setKakaoTestResult(`입력한 PW ${typedPwLen}자로 저장 후 테스트 중…`);
      }

      if (form.kakaoAccountType === 'facility') {
        const saved = await api(
          `/system-admin/facilities/${encodeURIComponent(form.facilityCode)}/kakao-alimtalk-settings`,
          {
            method: 'PUT',
            body: JSON.stringify(settingsToSave),
          },
          'system'
        );
        setForm((prev) => ({
          ...prev,
          kakaoAlimtalkSettings: {
            ...emptyKakaoSettings(),
            ...(prev.kakaoAlimtalkSettings || {}),
            ...saved,
            resellerPw: '',
            resellerApiKey: '',
            hasResellerPw: Boolean(saved?.hasResellerPw ?? typedPwLen),
            resellerPwLen: Number(saved?.resellerPwLen) || typedPwLen || 0,
          },
        }));
        if (kakaoSettingsOpen) {
          setKakaoSettingsDraft((d) => ({
            ...d,
            resellerPw: '',
            resellerApiKey: '',
            hasResellerPw: Boolean(saved?.hasResellerPw ?? typedPwLen),
            hasResellerApiKey: Boolean(saved?.hasResellerApiKey),
            resellerPwLen: Number(saved?.resellerPwLen) || typedPwLen || 0,
            resellerApiKeyLen: Number(saved?.resellerApiKeyLen) || 0,
            clearResellerPw: false,
            clearResellerApiKey: false,
          }));
        }
      }
      const result = await api(
        `/system-admin/facilities/${encodeURIComponent(form.facilityCode)}/kakao-alimtalk-settings/test`,
        { method: 'POST', body: '{}' },
        'system'
      );
      const text = result?.ok
        ? `연결 성공 · ${result.provider} · PW ${result.pwLen}자 · 인증키 ${result.apiKeyLen}자`
        : `연결 실패 · 서버 저장 PW ${result?.pwLen ?? 0}자 · 인증키 ${result?.apiKeyLen ?? 0}자\n${result?.message || '인증 오류'}\n\n※ 웹 로그인 암호 글자 수와 같은지 확인하세요. (거절된 PW = ${result?.pwLen ?? 0}자)`;
      setKakaoTestResult(text);
      showToast(result?.ok ? '알림톡 계정 연결 성공' : '알림톡 계정 연결 실패');
      window.alert(text);
    } catch (err) {
      const text = err.message || '연결 테스트 실패';
      setKakaoTestResult(text);
      showToast(text);
      window.alert(text);
    }
  };

  const openKakaoSettings = () => {
    const current = form.kakaoAlimtalkSettings || emptyKakaoSettings();
    setKakaoSettingsDraft({
      ...emptyKakaoSettings(),
      ...current,
      resellerPw: '',
      resellerApiKey: '',
      clearResellerPw: false,
      clearResellerApiKey: false,
    });
    setKakaoTestResult('');
    setKakaoSettingsOpen(true);
  };

  const saveKakaoSettingsDraft = () => {
    applyKakaoSettingsDraftToForm();
    setKakaoSettingsOpen(false);
    showToast(
      '설정이 임시 저장되었습니다. PW 칸이 비어 보여도 정상입니다. «연결 테스트» 또는 시설사 «수정»으로 확인하세요.'
    );
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

    const kakaoAccountType =
      form.kakaoAccountType === 'facility' ? 'facility' : 'tbridge';
    if (kakaoAccountType === 'tbridge') {
      const unitCost = Number(form.kakaoUnitCost);
      if (!Number.isFinite(unitCost) || unitCost < 0) {
        showToast('카카오 알림톡 발송 비용을 입력해 주세요.');
        return;
      }
    }

    const payload = {
      name: form.name,
      masterPassword: masterPwd || DEFAULT_MASTER_PASSWORD,
      adAreaEnabled: form.adAreaEnabled !== false,
      kakaoAccountType,
      status: form.status,
      ...(kakaoAccountType === 'tbridge'
        ? { kakaoUnitCost: Number(form.kakaoUnitCost) }
        : {
            kakaoAlimtalkSettings:
              form.kakaoAlimtalkSettings || emptyKakaoSettings(),
          }),
    };

    try {
      if (mode === 'create') {
        const created = await api(
          '/system-admin/facilities',
          {
            method: 'POST',
            body: JSON.stringify({
              ...payload,
              facilityCode: form.facilityCode,
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
          body: JSON.stringify(payload),
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
            <h1>시설사 관리</h1>
            <p className="admin-page-desc">
              등록된 시설사 계정과 접속 주소, 알림톡 단가를 관리합니다
            </p>
          </div>
          <button type="button" className="btn-primary" onClick={openCreate}>
            시설사 등록
          </button>
        </div>

        <section className="filter-box">
          <div className="filter-row">
            <span className="filter-label">시설사명</span>
            <FacilitySearchInput
              placeholder="시설사명 또는 시설사 코드"
              value={searchQ}
              onChange={setSearchQ}
              valueMode="nameOrCode"
              style={{ minWidth: 280, flex: 1 }}
            />
          </div>
          <div className="filter-row">
            <span className="filter-label">상태</span>
            <label>
              <input
                type="checkbox"
                checked={statusActive}
                onChange={(e) => setStatusActive(e.target.checked)}
              />
              활성화
            </label>
            <label>
              <input
                type="checkbox"
                checked={statusWithdraw}
                onChange={(e) => setStatusWithdraw(e.target.checked)}
              />
              탈퇴
            </label>
          </div>
          <div className="filter-actions">
            <button type="button" className="btn-dark" onClick={runSearch}>
              검색
            </button>
            <button type="button" className="btn-ghost" onClick={resetFilters}>
              초기화
            </button>
          </div>
        </section>

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
              {facilities.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-list">
                    검색 조건에 해당하는 시설사가 없습니다.
                  </td>
                </tr>
              ) : (
                facilities.map((f) => {
                const customerPath = f.links?.customer || `/w/${f.facilityCode}`;
                const adminPath = f.links?.admin || `/admin/${f.facilityCode}/login`;
                const signagePath = f.links?.signage || `/signage/${f.facilityCode}`;
                const isActive = f.status !== 'withdraw' && f.status !== 'inactive';
                return (
                  <tr key={f.id || f.facilityCode}>
                    <td>{f.name}</td>
                    <td>
                      <button
                        type="button"
                        className="facility-code-btn"
                        onClick={() => openEdit(f)}
                        title="시설사 수정"
                      >
                        {f.facilityCode}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="facility-link-copy"
                        onClick={() => copyLink(customerPath)}
                        title="URL 복사"
                      >
                        {customerPath}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="facility-link-copy"
                        onClick={() => copyLink(adminPath)}
                        title="URL 복사"
                      >
                        {adminPath}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="facility-link-copy"
                        onClick={() => copyLink(signagePath)}
                        title="URL 복사"
                      >
                        {signagePath}
                      </button>
                    </td>
                    <td>
                      {f.kakaoAccountType === 'facility'
                        ? '시설사 계정'
                        : `${Number(f.kakaoUnitCost || 0).toLocaleString()}원`}
                    </td>
                    <td>{formatDateTime(f.createdAt)}</td>
                    <td>
                      <span
                        className={`facility-status-badge ${
                          isActive ? 'is-active' : 'is-withdraw'
                        }`}
                      >
                        {f.statusLabel || (isActive ? '활성' : '탈퇴')}
                      </span>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>

        {open && (
          <div className="modal-backdrop" onClick={requestClose}>
            <form
              className="modal-card facility-edit-modal"
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
                <p className="facility-password-hint">
                  비밀번호는 아이디와 다르게 영문 대소문자·숫자·특수문자를 조합하여 10자 이상으로 설정해야 합니다!
                </p>
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
              <div className="settings-radio-row" style={{ marginBottom: 12 }}>
                <span className="settings-radio-label">카카오 알림톡 계정</span>
                <label className="settings-radio">
                  <input
                    type="radio"
                    name="kakaoAccountType"
                    checked={form.kakaoAccountType !== 'facility'}
                    onChange={() => setForm({ ...form, kakaoAccountType: 'tbridge' })}
                  />
                  티브리지 계정
                </label>
                <label className="settings-radio">
                  <input
                    type="radio"
                    name="kakaoAccountType"
                    checked={form.kakaoAccountType === 'facility'}
                    onChange={() => setForm({ ...form, kakaoAccountType: 'facility' })}
                  />
                  시설사 계정
                </label>
              </div>
              {form.kakaoAccountType !== 'facility' ? (
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
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <button
                    type="button"
                    className="btn-dark facility-kakao-settings-btn"
                    onClick={openKakaoSettings}
                  >
                    시설사 계정 카카오 알림톡 설정
                  </button>
                  {mode === 'edit' ? (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={testKakaoAuth}
                    >
                      알림톡 계정 연결 테스트
                    </button>
                  ) : null}
                </div>
              )}
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

        {kakaoSettingsOpen && (
          <div
            className="modal-backdrop"
            style={{ zIndex: 1100 }}
            onClick={() => setKakaoSettingsOpen(false)}
          >
            <div
              className="modal-card facility-kakao-settings-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="close-btn abs"
                onClick={() => setKakaoSettingsOpen(false)}
                aria-label="닫기"
              >
                <AdminCloseIcon />
              </button>
              <h2>시설사 계정 카카오 알림톡</h2>
              <div
                className="muted"
                style={{
                  marginTop: 0,
                  marginBottom: 12,
                  fontSize: 13,
                  lineHeight: 1.5,
                  padding: '10px 12px',
                  background: 'rgba(0,0,0,0.04)',
                  borderRadius: 8,
                }}
              >
                <div>
                  딜러사 PW:{' '}
                  <strong>
                    {kakaoSettingsDraft.clearResellerPw
                      ? '삭제 예정'
                      : kakaoSettingsDraft.hasResellerPw ||
                          Number(kakaoSettingsDraft.resellerPwLen) > 0 ||
                          String(kakaoSettingsDraft.resellerPw || '').trim()
                        ? `저장됨 (${
                            String(kakaoSettingsDraft.resellerPw || '').trim()
                              .length ||
                            Number(kakaoSettingsDraft.resellerPwLen) ||
                            '?'
                          }자) — 칸이 비어 보이는 것이 정상`
                        : '없음'}
                  </strong>
                </div>
                <div>
                  API 인증키:{' '}
                  <strong>
                    {kakaoSettingsDraft.clearResellerApiKey
                      ? '삭제 예정'
                      : kakaoSettingsDraft.hasResellerApiKey ||
                          Number(kakaoSettingsDraft.resellerApiKeyLen) > 0 ||
                          String(kakaoSettingsDraft.resellerApiKey || '').trim()
                        ? `저장됨 (${
                            String(kakaoSettingsDraft.resellerApiKey || '').trim()
                              .length ||
                            Number(kakaoSettingsDraft.resellerApiKeyLen) ||
                            '?'
                          }자)`
                        : '없음 (정상)'}
                  </strong>
                </div>
              </div>
              {kakaoTestResult ? (
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontSize: 12,
                    margin: '0 0 12px',
                    padding: 10,
                    background: 'rgba(0,0,0,0.06)',
                    borderRadius: 8,
                  }}
                >
                  {kakaoTestResult}
                </pre>
              ) : null}
              {KAKAO_SETTINGS_FIELDS.map((field) => (
                <label key={field.key}>
                  {field.label}
                  {field.secret && kakaoSettingsDraft[field.hasKey] && !kakaoSettingsDraft[field.clearKey] ? (
                    <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
                      (저장됨
                      {field.hasKey === 'hasResellerPw' &&
                      Number(kakaoSettingsDraft.resellerPwLen) > 0
                        ? ` · ${kakaoSettingsDraft.resellerPwLen}자`
                        : ''}
                      {field.hasKey === 'hasResellerApiKey' &&
                      Number(kakaoSettingsDraft.resellerApiKeyLen) > 0
                        ? ` · ${kakaoSettingsDraft.resellerApiKeyLen}자`
                        : ''}
                      )
                    </span>
                  ) : null}
                  {field.secret && kakaoSettingsDraft[field.clearKey] ? (
                    <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
                      (삭제 예정)
                    </span>
                  ) : null}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type={field.secret ? 'password' : 'text'}
                      autoComplete="new-password"
                      style={{ flex: 1 }}
                      value={kakaoSettingsDraft[field.key] || ''}
                      placeholder={
                        field.secret && kakaoSettingsDraft[field.hasKey] && !kakaoSettingsDraft[field.clearKey]
                          ? '저장됨 — 변경 시에만 입력'
                          : field.placeholder
                      }
                      onChange={(e) =>
                        setKakaoSettingsDraft({
                          ...kakaoSettingsDraft,
                          [field.key]: e.target.value,
                          ...(field.secret
                            ? { [field.clearKey]: false }
                            : null),
                        })
                      }
                    />
                    {field.secret ? (
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ whiteSpace: 'nowrap' }}
                        onClick={() =>
                          setKakaoSettingsDraft({
                            ...kakaoSettingsDraft,
                            [field.key]: '',
                            [field.clearKey]: true,
                            [field.hasKey]: false,
                          })
                        }
                      >
                        삭제
                      </button>
                    ) : null}
                  </div>
                </label>
              ))}
              <div className="modal-actions" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setKakaoSettingsOpen(false)}
                >
                  닫기
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  {mode === 'edit' ? (
                    <button type="button" className="btn-ghost" onClick={testKakaoAuth}>
                      연결 테스트
                    </button>
                  ) : null}
                  <button type="button" className="btn-primary" onClick={saveKakaoSettingsDraft}>
                    저장
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
