import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { api, mediaUrl } from '../../api/client';
import AdminCloseIcon from '../../components/admin/AdminCloseIcon';
import AdminSidebar from '../../components/admin/AdminSidebar';
import PasswordChangeModal from '../../components/PasswordChangeModal';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';

const TOGGLE_LANGS = [
  { code: 'en', label: '영어', key: 'En' },
  { code: 'ja', label: '일어', key: 'Ja' },
  { code: 'zh', label: '중국어', key: 'Zh' },
];

function emptyType() {
  return {
    id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    nameKo: '',
    nameEn: '',
    nameJa: '',
    nameZh: '',
    isNew: true,
  };
}

function snapshotOf(form, types, langs) {
  return JSON.stringify({ form, types, langs });
}

export default function SettingsPage() {
  const { facilityCode } = useParams();
  const { facilityUser, logoutFacility } = useAuth();
  const navigate = useNavigate();
  const { collapsed, toggle } = useSidebarCollapse('tb_admin_sidebar');
  const [form, setForm] = useState(null);
  const [types, setTypes] = useState([]);
  const [enabledLangs, setEnabledLangs] = useState(['ko']);
  const [kakaoAlimtalkMode, setKakaoAlimtalkMode] = useState(null);
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [toast, setToast] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const dirtyRef = useRef(false);
  const saveRef = useRef(async () => {});

  const dirty = useMemo(() => {
    if (!form || !savedSnapshot) return false;
    return snapshotOf(form, types, enabledLangs) !== savedSnapshot;
  }, [form, types, enabledLangs, savedSnapshot]);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const updated = await api(`/admin/${facilityCode}/settings`, {
        method: 'PUT',
        body: JSON.stringify({
          ...form,
          // 이미지는 업로드/삭제 API로만 관리 — 설정 저장 시 덮어쓰지 않음
          profileImageUrl: undefined,
          enabledLanguages: enabledLangs.includes('ko')
            ? enabledLangs
            : ['ko', ...enabledLangs],
          terms: form.termsKo,
          termsOfUse: form.termsKo,
          termsEn: form.termsEn,
          termsJa: form.termsJa,
          termsZh: form.termsZh,
          privacyKo: form.privacyKo || '',
          privacyEn: form.privacyEn || '',
          privacyJa: form.privacyJa || '',
          privacyZh: form.privacyZh || '',
          marketingKo: form.marketingKo || '',
          marketingEn: form.marketingEn || '',
          marketingJa: form.marketingJa || '',
          marketingZh: form.marketingZh || '',
          kakaoWarningThreshold: Number(form.kakaoWarningThreshold) || 0,
          entryWaitMinutes: Math.max(1, Number(form.entryWaitMinutes) || 5),
          avgWaitMinutesPerTeam: Math.max(
            1,
            Number(form.avgWaitMinutesPerTeam) || 5
          ),
          storeNotice: form.storeNotice || '',
          kioskNoticeKo: form.kioskNoticeKo || '',
          kioskNoticeEn: form.kioskNoticeEn || '',
          kioskNoticeJa: form.kioskNoticeJa || '',
          kioskNoticeZh: form.kioskNoticeZh || '',
          waitingNotificationOrder:
            form.waitingNotificationOrder === '' ||
            form.waitingNotificationOrder == null
              ? null
              : (() => {
                  const n = Number(form.waitingNotificationOrder);
                  if (!Number.isInteger(n) || n < 1) {
                    throw new Error('입장 대기 알림 순번은 1 이상 정수여야 합니다.');
                  }
                  return n;
                })(),
          brandDisplayMode: 'image_text',
          theme: form.theme,
        }),
      });

      const existing = await api(`/admin/${facilityCode}/waiting-types`);
      const savedTypes = [];
      for (const type of types) {
        const saved = await api(`/admin/${facilityCode}/waiting-types`, {
          method: 'POST',
          body: JSON.stringify({
            id: type.isNew ? undefined : type.id,
            nameKo: type.nameKo,
            nameEn: type.nameEn,
            nameJa: type.nameJa,
            nameZh: type.nameZh,
          }),
        });
        savedTypes.push({
          id: saved.id,
          nameKo: saved.nameKo || saved.name,
          nameEn: saved.nameEn || '',
          nameJa: saved.nameJa || '',
          nameZh: saved.nameZh || '',
          isNew: false,
        });
      }

      const keepIds = new Set(savedTypes.map((t) => String(t.id)));
      for (const old of existing) {
        if (!keepIds.has(String(old.id))) {
          try {
            await api(`/admin/${facilityCode}/waiting-types/${old.id}`, {
              method: 'DELETE',
            });
          } catch {
            /* minimum-one guard */
          }
        }
      }

      const ordered = await api(`/admin/${facilityCode}/waiting-types/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ orderedIds: savedTypes.map((t) => t.id) }),
      });
      const mapped = ordered.map((t) => ({
        id: t.id,
        nameKo: t.nameKo || t.name,
        nameEn: t.nameEn || '',
        nameJa: t.nameJa || '',
        nameZh: t.nameZh || '',
        isNew: false,
      }));
      setTypes(mapped);
      const nextForm = {
        ...form,
        name: updated.name,
        adminContact: updated.adminContact || form.adminContact,
        profileImageUrl: form.profileImageUrl || updated.profileImageUrl || '',
        kakaoWarningThreshold:
          updated.kakaoWarningThreshold ?? form.kakaoWarningThreshold,
        entryWaitMinutes: updated.entryWaitMinutes ?? form.entryWaitMinutes,
        waitingNotificationOrder:
          updated.waitingNotificationOrder == null
            ? ''
            : updated.waitingNotificationOrder,
        brandDisplayMode: 'image_text',
        theme: updated.theme || form.theme,
        storeNotice: updated.storeNotice ?? form.storeNotice ?? '',
        adAreaEnabled: updated.adAreaEnabled !== false,
        avgWaitMinutesPerTeam:
          updated.avgWaitMinutesPerTeam ?? form.avgWaitMinutesPerTeam ?? 5,
        kioskNoticeKo: updated.kioskNoticeKo ?? form.kioskNoticeKo ?? '',
        kioskNoticeEn: updated.kioskNoticeEn ?? form.kioskNoticeEn ?? '',
        kioskNoticeJa: updated.kioskNoticeJa ?? form.kioskNoticeJa ?? '',
        kioskNoticeZh: updated.kioskNoticeZh ?? form.kioskNoticeZh ?? '',
        termsKo: updated.termsKo ?? form.termsKo ?? '',
        termsEn: updated.termsEn ?? form.termsEn ?? '',
        termsJa: updated.termsJa ?? form.termsJa ?? '',
        termsZh: updated.termsZh ?? form.termsZh ?? '',
        privacyKo: updated.privacyKo ?? form.privacyKo ?? '',
        privacyEn: updated.privacyEn ?? form.privacyEn ?? '',
        privacyJa: updated.privacyJa ?? form.privacyJa ?? '',
        privacyZh: updated.privacyZh ?? form.privacyZh ?? '',
        marketingKo: updated.marketingKo ?? form.marketingKo ?? '',
        marketingEn: updated.marketingEn ?? form.marketingEn ?? '',
        marketingJa: updated.marketingJa ?? form.marketingJa ?? '',
        marketingZh: updated.marketingZh ?? form.marketingZh ?? '',
        links: updated.links,
      };
      const langs = Array.isArray(updated.enabledLanguages)
        ? updated.enabledLanguages
        : enabledLangs;
      setForm(nextForm);
      setEnabledLangs(langs);
      setSavedSnapshot(snapshotOf(nextForm, mapped, langs));
      showToast('설정이 저장되었습니다.');
    } catch (e) {
      showToast(e.message);
      throw e;
    } finally {
      setSaving(false);
    }
  };

  saveRef.current = save;

  useEffect(() => {
    const onClick = (e) => {
      if (!dirtyRef.current) return;
      const anchor = e.target.closest('a[href]');
      if (!anchor || anchor.target === '_blank') return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('http') || href.includes('/settings')) return;
      const ok = window.confirm('변경사항이 저장되지 않았습니다. 저장하시겠습니까?');
      if (ok) {
        e.preventDefault();
        e.stopPropagation();
        saveRef
          .current()
          .then(() => navigate(href))
          .catch(() => {});
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [navigate]);

  const load = useCallback(async () => {
    const [settings, waitingTypes] = await Promise.all([
      api(`/admin/${facilityCode}/settings`),
      api(`/admin/${facilityCode}/waiting-types`),
    ]);
    const nextForm = {
      name: settings.name || '',
      adminContact: settings.adminContact || '',
      profileImageUrl: settings.profileImageUrl || '',
      kakaoWarningThreshold: settings.kakaoWarningThreshold ?? 1000,
      entryWaitMinutes: settings.entryWaitMinutes ?? 5,
      waitingNotificationOrder:
        settings.waitingNotificationOrder == null
          ? ''
          : settings.waitingNotificationOrder,
      postponePolicy: settings.postponePolicy || 'none',
      postponeLimit: settings.postponeLimit || 3,
      brandDisplayMode: 'image_text',
      theme: settings.theme === 'dark' ? 'dark' : 'light',
      storeNotice: settings.storeNotice || '',
      adAreaEnabled: settings.adAreaEnabled !== false,
      avgWaitMinutesPerTeam: settings.avgWaitMinutesPerTeam ?? 5,
      kioskNoticeKo: settings.kioskNoticeKo || settings.kioskNotice || '',
      kioskNoticeEn: settings.kioskNoticeEn || '',
      kioskNoticeJa: settings.kioskNoticeJa || '',
      kioskNoticeZh: settings.kioskNoticeZh || '',
      termsKo: settings.termsKo || settings.termsOfUseKo || settings.terms || settings.termsOfUse || '',
      termsEn: settings.termsEn || settings.termsOfUseEn || '',
      termsJa: settings.termsJa || settings.termsOfUseJa || '',
      termsZh: settings.termsZh || settings.termsOfUseZh || '',
      privacyKo: settings.privacyKo || settings.privacyPolicyKo || settings.privacy || '',
      privacyEn: settings.privacyEn || settings.privacyPolicyEn || '',
      privacyJa: settings.privacyJa || settings.privacyPolicyJa || '',
      privacyZh: settings.privacyZh || settings.privacyPolicyZh || '',
      marketingKo: settings.marketingKo || settings.marketingPolicyKo || settings.marketing || '',
      marketingEn: settings.marketingEn || settings.marketingPolicyEn || '',
      marketingJa: settings.marketingJa || settings.marketingPolicyJa || '',
      marketingZh: settings.marketingZh || settings.marketingPolicyZh || '',
      links: settings.links,
    };
    const langs = Array.isArray(settings.enabledLanguages)
      ? settings.enabledLanguages.includes('ko')
        ? settings.enabledLanguages
        : ['ko', ...settings.enabledLanguages]
      : ['ko'];
    const nextTypes =
      waitingTypes.length > 0
        ? waitingTypes.map((t) => ({
            id: t.id,
            nameKo: t.nameKo || t.name || '',
            nameEn: t.nameEn || '',
            nameJa: t.nameJa || '',
            nameZh: t.nameZh || '',
            isNew: false,
          }))
        : [emptyType()];
    setForm(nextForm);
    setTypes(nextTypes);
    setEnabledLangs(langs);
    setKakaoAlimtalkMode(settings.kakaoAlimtalkMode || (settings.kakaoAlimtalkLive ? 'live' : 'mock'));
    setSavedSnapshot(snapshotOf(nextForm, nextTypes, langs));
  }, [facilityCode]);

  useEffect(() => {
    if (!facilityUser || facilityUser.facilityCode !== facilityCode) return;
    load().catch((e) => setToast(e.message));
  }, [facilityCode, facilityUser, load]);

  if (!facilityUser || facilityUser.facilityCode !== facilityCode) {
    return <Navigate to={`/admin/${facilityCode}/login`} replace />;
  }

  const toggleLang = (code) => {
    setEnabledLangs((prev) => {
      if (prev.includes(code)) return prev.filter((l) => l !== code);
      return [...prev, code];
    });
  };

  const activeLangFields = [
    { code: 'ko', label: '한국어', key: 'Ko' },
    ...TOGGLE_LANGS.filter((l) => enabledLangs.includes(l.code)),
  ];

  const uploadImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      showToast('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    if (/heic|heif|avif/i.test(file.type) || /\.(heic|heif|avif)$/i.test(file.name)) {
      showToast('HEIC/AVIF 형식은 지원하지 않습니다. JPG 또는 PNG로 변환해 주세요.');
      return;
    }
    try {
      const fd = new FormData();
      fd.append('image', file);
      const updated = await api(`/admin/${facilityCode}/settings/image`, {
        method: 'POST',
        body: fd,
      });
      const url = updated.profileImageUrl || '';
      if (!url) {
        showToast('이미지 URL을 받지 못했습니다. 다시 시도해 주세요.');
        return;
      }
      setForm((f) => {
        const next = { ...f, profileImageUrl: url };
        setSavedSnapshot((prev) => {
          if (!prev) return prev;
          try {
            const parsed = JSON.parse(prev);
            parsed.form = { ...parsed.form, profileImageUrl: url };
            return JSON.stringify(parsed);
          } catch {
            return prev;
          }
        });
        return next;
      });
      showToast('이미지가 업로드되었습니다.');
    } catch (err) {
      showToast(err.message);
    }
  };

  const clearImage = async () => {
    try {
      await api(`/admin/${facilityCode}/settings/image`, { method: 'DELETE' });
      setForm((f) => {
        const next = { ...f, profileImageUrl: '' };
        setSavedSnapshot((prev) => {
          if (!prev) return prev;
          try {
            const parsed = JSON.parse(prev);
            parsed.form = { ...parsed.form, profileImageUrl: '' };
            return JSON.stringify(parsed);
          } catch {
            return prev;
          }
        });
        return next;
      });
      showToast('이미지가 삭제되었습니다.');
    } catch (err) {
      showToast(err.message);
    }
  };

  const addType = () => setTypes((prev) => [...prev, emptyType()]);

  const removeType = (id) => {
    if (types.length <= 1) return;
    setTypes((prev) => prev.filter((t) => t.id !== id));
  };

  const onDrop = (toIndex) => {
    if (dragIndex == null || dragIndex === toIndex) return;
    const next = [...types];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(toIndex, 0, moved);
    setTypes(next);
    setDragIndex(null);
  };

  const canSave =
    dirty && form?.name?.trim() && types.every((t) => t.nameKo.trim()) && !saving;

  const changePassword = async ({ currentPassword, newPassword }) => {
    setPwSaving(true);
    try {
      await api(`/admin/${facilityCode}/password`, {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPwOpen(false);
      showToast('비밀번호가 변경되었습니다.');
    } catch (err) {
      throw err;
    } finally {
      setPwSaving(false);
    }
  };

  if (!form) return <div className="center-page">Loading...</div>;

  return (
    <div className={`admin-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <Toast message={toast} visible={!!toast} />
      <AdminSidebar
        facilityCode={facilityCode}
        collapsed={collapsed}
        onToggle={toggle}
        onLogout={() => {
          logoutFacility();
          navigate(`/admin/${facilityCode}/login`);
        }}
      />
      <main className="admin-main settings-main">
        <header className="settings-page-header">
          <h1>설정</h1>
          <p>시설 정보, 대기 운영 규칙, 안내 문구를 관리합니다</p>
        </header>

        {kakaoAlimtalkMode === 'mock' && (
          <div className="admin-alert admin-alert-warn" role="status">
            카카오 알림톡: 테스트(MOCK) 모드로 동작 중 — 실제 발송 안 됨
            <span className="admin-alert-sub">
              서버에 PPURIO_ACCOUNT / PPURIO_AUTH_KEY / PPURIO_SENDER_PROFILE 를 설정하면
              실발송으로 전환됩니다.
            </span>
          </div>
        )}

        <section className="settings-card">
          <div className="settings-card-head">
            <h2>시설 정보</h2>
          </div>
          <div className="settings-card-body">
            <div className="settings-field-row">
              <span className="settings-field-label">시설사명</span>
              <input
                placeholder="시설사명 입력"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="settings-field-row">
              <span className="settings-field-label">테마 선택</span>
              <div className="settings-choice-group">
                <button
                  type="button"
                  className={`settings-choice ${form.theme === 'light' ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, theme: 'light' })}
                >
                  라이트 테마
                </button>
                <button
                  type="button"
                  className={`settings-choice ${form.theme === 'dark' ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, theme: 'dark' })}
                >
                  다크 테마
                </button>
              </div>
            </div>

            <div className="settings-field-row settings-field-row-start">
              <span className="settings-field-label">
                시설사 표시
                <span className="settings-field-hint">키오스크 이미지 + 텍스트</span>
              </span>
              <div className="settings-brand-controls">
                {form.profileImageUrl ? (
                  <div className="settings-image-preview">
                    <img src={mediaUrl(form.profileImageUrl)} alt="시설사" />
                    <button
                      type="button"
                      className="img-remove"
                      onClick={() => clearImage().catch(() => {})}
                      aria-label="이미지 제거"
                    >
                      <AdminCloseIcon />
                    </button>
                  </div>
                ) : (
                  <div className="settings-image-placeholder">로고</div>
                )}
                <label className="btn-search file-btn settings-file-btn">
                  이미지 찾기
                  <input type="file" accept="image/*" hidden onChange={uploadImage} />
                </label>
                <input
                  className="settings-brand-text"
                  placeholder="텍스트 입력"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>

            <div className="settings-field-row">
              <span className="settings-field-label">관리자 연락처</span>
              <input
                placeholder="연락처 입력"
                value={form.adminContact}
                onChange={(e) => setForm({ ...form, adminContact: e.target.value })}
              />
            </div>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-head">
            <h2>대기 운영</h2>
          </div>
          <div className="settings-card-body">
            <div className="settings-op-row">
              <div className="settings-op-field">
                <label>충전 필요 알림 금액</label>
                <div className="inline-unit">
                  <input
                    type="number"
                    min="0"
                    placeholder="금액 입력"
                    value={form.kakaoWarningThreshold}
                    onChange={(e) =>
                      setForm({ ...form, kakaoWarningThreshold: e.target.value })
                    }
                  />
                  <span>원</span>
                </div>
              </div>
              <div className="settings-op-field">
                <label>입장 대기 알림 순번 설정</label>
                <div className="inline-unit">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.waitingNotificationOrder}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '') {
                        setForm({ ...form, waitingNotificationOrder: '' });
                        return;
                      }
                      const n = Number(v);
                      if (!Number.isFinite(n)) return;
                      setForm({
                        ...form,
                        waitingNotificationOrder: Math.max(1, Math.floor(n)),
                      });
                    }}
                  />
                  <span>번</span>
                </div>
              </div>
              <div className="settings-op-field">
                <label>입장 대기 시간 설정</label>
                <div className="inline-unit">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="분 입력"
                    value={form.entryWaitMinutes}
                    onChange={(e) =>
                      setForm({ ...form, entryWaitMinutes: e.target.value })
                    }
                  />
                  <span>분</span>
                </div>
              </div>
              <div className="settings-op-field">
                <label>1팀당 입장 예상 시간 설정</label>
                <div className="inline-unit">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="분 입력"
                    value={form.avgWaitMinutesPerTeam}
                    onChange={(e) =>
                      setForm({ ...form, avgWaitMinutesPerTeam: e.target.value })
                    }
                  />
                  <span>분</span>
                </div>
              </div>
            </div>

            <div className="settings-op-block">
              <label>웨이팅 관리 모바일 화면 안내사항</label>
              <textarea
                rows={4}
                placeholder="웨이팅 관리 모바일 화면 안내사항 입력"
                value={form.storeNotice || ''}
                onChange={(e) => setForm({ ...form, storeNotice: e.target.value })}
              />
            </div>

            <div className="settings-op-inline">
              <div className="settings-op-block">
                <label>미루기 처리 방법</label>
                <div className="settings-choice-group wrap">
                  {[
                    { key: 'none', label: '미루기 없음' },
                    { key: 'select_position', label: '선택한 순서로 미루기' },
                    { key: 'last_position', label: '마지막 순서로 미루기' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      className={`settings-choice ${form.postponePolicy === opt.key ? 'active' : ''}`}
                      onClick={() => setForm({ ...form, postponePolicy: opt.key })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.postponePolicy !== 'none' && (
                <div className="settings-op-block">
                  <label>미루기 허용 횟수</label>
                  <div className="settings-stepper">
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          postponeLimit: Math.max(1, Number(form.postponeLimit) - 1),
                        })
                      }
                    >
                      −
                    </button>
                    <span>{form.postponeLimit}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          postponeLimit: Number(form.postponeLimit) + 1,
                        })
                      }
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="settings-op-block">
              <label>다국어 선택</label>
              <div className="settings-choice-group wrap">
                {TOGGLE_LANGS.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    className={`settings-choice round ${enabledLangs.includes(lang.code) ? 'active' : ''}`}
                    onClick={() => toggleLang(lang.code)}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-head settings-card-head-row">
            <h2>대기 권종</h2>
            <button type="button" className="settings-add-btn" onClick={addType}>
              + 추가
            </button>
          </div>
          <div className="settings-card-body settings-type-body">
            {types.map((type, index) => (
              <div
                key={type.id}
                className="settings-type-item"
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(index)}
              >
                {activeLangFields.map((lang) => (
                  <label key={lang.key} className="settings-type-lang">
                    <span>{lang.label}</span>
                    <input
                      value={type[`name${lang.key}`] || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setTypes((prev) =>
                          prev.map((t) =>
                            t.id === type.id ? { ...t, [`name${lang.key}`]: value } : t
                          )
                        );
                      }}
                    />
                  </label>
                ))}
                <button type="button" className="drag-handle" title="순서 변경">
                  ↕
                </button>
                <button
                  type="button"
                  className="settings-type-delete"
                  disabled={types.length <= 1}
                  onClick={() => removeType(type.id)}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-head">
            <h2>공지사항 설정</h2>
          </div>
          <div className="settings-card-body">
            {activeLangFields.map((lang) => (
              <div key={`notice-${lang.key}`} className="settings-term-group">
                <div className="settings-term-title">
                  <span className="settings-lang-pill">{lang.label}</span>
                  <span>태블릿 웨이팅 화면 공지사항</span>
                </div>
                <textarea
                  rows={6}
                  placeholder="공지사항 본문을 입력해 주세요"
                  value={form[`kioskNotice${lang.key}`] || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [`kioskNotice${lang.key}`]: e.target.value,
                    })
                  }
                />
              </div>
            ))}
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-head">
            <h2>약관</h2>
          </div>
          <div className="settings-card-body">
            {activeLangFields.map((lang) => (
              <div key={lang.key} className="settings-term-group">
                <h3>{lang.label}</h3>
                <div className="settings-term-block">
                  <div className="settings-term-title">
                    <span>1. 이용약관 동의</span>
                    <span className="settings-badge required">필수</span>
                  </div>
                  <textarea
                    rows={5}
                    placeholder="이용약관 본문을 입력해 주세요"
                    value={form[`terms${lang.key}`] || ''}
                    onChange={(e) =>
                      setForm({ ...form, [`terms${lang.key}`]: e.target.value })
                    }
                  />
                </div>
                <div className="settings-term-block">
                  <div className="settings-term-title">
                    <span>2. 개인정보 수집·이용 동의</span>
                    <span className="settings-badge required">필수</span>
                  </div>
                  <textarea
                    rows={5}
                    placeholder="개인정보 수집·이용 동의 본문을 입력해 주세요"
                    value={form[`privacy${lang.key}`] || ''}
                    onChange={(e) =>
                      setForm({ ...form, [`privacy${lang.key}`]: e.target.value })
                    }
                  />
                </div>
                <div className="settings-term-block">
                  <div className="settings-term-title">
                    <span>3. 마케팅 정보 수신 동의</span>
                    <span className="settings-badge optional">선택</span>
                  </div>
                  <textarea
                    rows={5}
                    placeholder="마케팅 정보 수신 동의 본문을 입력해 주세요"
                    value={form[`marketing${lang.key}`] || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [`marketing${lang.key}`]: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="settings-card settings-password-card">
          <div>
            <span className="settings-password-title">비밀번호 변경</span>
            <span className="settings-password-desc">시설 관리자 로그인 비밀번호를 변경합니다</span>
          </div>
          <button
            type="button"
            className="settings-file-btn"
            onClick={() => setPwOpen(true)}
          >
            비밀번호 변경
          </button>
        </section>

        <div className="settings-save-bar">
          <button
            type="button"
            className="btn-primary settings-save-btn"
            disabled={!canSave}
            onClick={() => save().catch(() => {})}
          >
            저장
          </button>
        </div>
      </main>

      <PasswordChangeModal
        open={pwOpen}
        username={facilityUser?.username}
        saving={pwSaving}
        onClose={() => setPwOpen(false)}
        onSubmit={changePassword}
        onError={showToast}
      />
    </div>
  );
}
