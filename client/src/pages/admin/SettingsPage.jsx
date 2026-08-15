import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import AdminSidebar from '../../components/admin/AdminSidebar';
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
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [toast, setToast] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const [saving, setSaving] = useState(false);
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
          enabledLanguages: enabledLangs.includes('ko')
            ? enabledLangs
            : ['ko', ...enabledLangs],
          terms: form.termsKo,
          termsOfUse: form.termsKo,
          termsEn: form.termsEn,
          termsJa: form.termsJa,
          termsZh: form.termsZh,
          kakaoWarningThreshold: Number(form.kakaoWarningThreshold) || 0,
          entryWaitMinutes: Math.max(1, Number(form.entryWaitMinutes) || 5),
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
          brandDisplayMode: form.brandDisplayMode,
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
        profileImageUrl: updated.profileImageUrl || '',
        kakaoWarningThreshold:
          updated.kakaoWarningThreshold ?? form.kakaoWarningThreshold,
        entryWaitMinutes: updated.entryWaitMinutes ?? form.entryWaitMinutes,
        waitingNotificationOrder:
          updated.waitingNotificationOrder == null
            ? ''
            : updated.waitingNotificationOrder,
        brandDisplayMode: updated.brandDisplayMode || form.brandDisplayMode,
        theme: updated.theme || form.theme,
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
      brandDisplayMode:
        settings.brandDisplayMode === 'image' ? 'image' : 'image_text',
      theme: settings.theme === 'dark' ? 'dark' : 'light',
      termsKo: settings.termsKo || settings.termsOfUseKo || settings.terms || settings.termsOfUse || '',
      termsEn: settings.termsEn || settings.termsOfUseEn || '',
      termsJa: settings.termsJa || settings.termsOfUseJa || '',
      termsZh: settings.termsZh || settings.termsOfUseZh || '',
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
    try {
      const fd = new FormData();
      fd.append('image', file);
      const updated = await api(`/admin/${facilityCode}/settings/image`, {
        method: 'POST',
        body: fd,
      });
      setForm((f) => ({ ...f, profileImageUrl: updated.profileImageUrl || '' }));
    } catch (err) {
      showToast(err.message);
    }
  };

  const clearImage = () => setForm((f) => ({ ...f, profileImageUrl: '' }));

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

  if (!form) return <div className="center-page">Loading...</div>;

  const isWideBrand = form.brandDisplayMode === 'image';
  const imageRatioLabel = isWideBrand ? '2.3 : 1' : '1:1';

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
        <h1>설정</h1>

        <section className="settings-section">
          <label>
            시설사명
            <input
              placeholder="시설사명 입력"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>

          <div className="settings-radio-row">
            <span className="settings-radio-label">테마 선택</span>
            <label className="settings-radio">
              <input
                type="radio"
                name="theme"
                checked={form.theme === 'light'}
                onChange={() => setForm({ ...form, theme: 'light' })}
              />
              라이트 테마
            </label>
            <label className="settings-radio">
              <input
                type="radio"
                name="theme"
                checked={form.theme === 'dark'}
                onChange={() => setForm({ ...form, theme: 'dark' })}
              />
              다크 테마
            </label>
          </div>

          <div className="settings-radio-row">
            <span className="settings-radio-label">시설사 표시 영역</span>
            <label className="settings-radio">
              <input
                type="radio"
                name="brandDisplayMode"
                checked={form.brandDisplayMode === 'image_text'}
                onChange={() =>
                  setForm({ ...form, brandDisplayMode: 'image_text' })
                }
              />
              작은 이미지 + 텍스트
            </label>
            <label className="settings-radio">
              <input
                type="radio"
                name="brandDisplayMode"
                checked={form.brandDisplayMode === 'image'}
                onChange={() => setForm({ ...form, brandDisplayMode: 'image' })}
              />
              이미지 단독
            </label>
          </div>

          <div className="settings-image-row">
            <span>시설사 이미지 ({imageRatioLabel})</span>
            <label className="btn-search file-btn">
              이미지 찾기
              <input type="file" accept="image/*" hidden onChange={uploadImage} />
            </label>
            {form.profileImageUrl ? (
              <div
                className={`settings-image-preview ${isWideBrand ? 'wide' : ''}`}
              >
                <img src={form.profileImageUrl} alt="시설사" />
                <button type="button" className="img-remove" onClick={clearImage}>
                  X
                </button>
              </div>
            ) : (
              <div
                className={`settings-image-placeholder ${isWideBrand ? 'wide' : ''}`}
              >
                IMG
              </div>
            )}
            {!isWideBrand && (
              <input
                className="settings-brand-text"
                placeholder="텍스트 입력"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            )}
          </div>

          <label>
            관리자 연락처
            <input
              placeholder="연락처 입력"
              value={form.adminContact}
              onChange={(e) => setForm({ ...form, adminContact: e.target.value })}
            />
          </label>

          <div className="settings-dual-row settings-triple-row">
            <label>
              충전 필요 알림 금액
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
            </label>
            <label>
              입장 대기 알림 순번 설정
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
            </label>
            <label>
              입장 대기 시간 설정
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
            </label>
          </div>
        </section>

        <section className="settings-section">
          <h2>미루기 처리 방법</h2>
          <div className="postpone-policy-group">
            {[
              { key: 'none', label: '미루기 없음' },
              { key: 'select_position', label: '선택한 순서로 미루기' },
              { key: 'last_position', label: '마지막 순서로 미루기' },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={`chip ${form.postponePolicy === opt.key ? 'active' : ''}`}
                onClick={() => setForm({ ...form, postponePolicy: opt.key })}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {form.postponePolicy !== 'none' && (
            <div className="postpone-limit-box">
              <span>미루기 허용 횟수</span>
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
              <input
                type="number"
                min="1"
                value={form.postponeLimit}
                onChange={(e) =>
                  setForm({
                    ...form,
                    postponeLimit: Math.max(1, Number(e.target.value) || 1),
                  })
                }
              />
              <button
                type="button"
                onClick={() =>
                  setForm({ ...form, postponeLimit: Number(form.postponeLimit) + 1 })
                }
              >
                +
              </button>
            </div>
          )}

          <h2 style={{ marginTop: 20 }}>다국어 선택</h2>
          <div className="postpone-policy-group">
            {TOGGLE_LANGS.map((lang) => (
              <button
                key={lang.code}
                type="button"
                className={`chip round ${enabledLangs.includes(lang.code) ? 'active' : ''}`}
                onClick={() => toggleLang(lang.code)}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <div className="section-head">
            <h2>대기 권종</h2>
            <button type="button" className="btn-search" onClick={addType}>
              + 추가
            </button>
          </div>
          <div className="type-list">
            {types.map((type, index) => (
              <div
                key={type.id}
                className="type-item multi"
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(index)}
              >
                {activeLangFields.map((lang) => (
                  <label key={lang.key}>
                    {lang.label}
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
                  ⇅
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={types.length <= 1}
                  onClick={() => removeType(type.id)}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <h2>약관</h2>
          <div className="term-lang-block">
            <h3>약관 작성</h3>
            {activeLangFields.map((lang) => (
              <label key={lang.key}>
                약관 ({lang.label})
                <textarea
                  rows={10}
                  placeholder="약관 본문을 입력해 주세요"
                  value={form[`terms${lang.key}`] || ''}
                  onChange={(e) =>
                    setForm({ ...form, [`terms${lang.key}`]: e.target.value })
                  }
                />
              </label>
            ))}
          </div>
        </section>

        <button
          type="button"
          className="btn-primary full-save"
          disabled={!canSave}
          onClick={() => save().catch(() => {})}
        >
          저장
        </button>
      </main>
    </div>
  );
}
