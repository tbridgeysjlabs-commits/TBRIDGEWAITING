import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api/client';

/**
 * 시설사 검색형 콤보박스.
 * valueMode: 'name' | 'code' | 'nameOrCode' (선택 시 필드에 넣을 값)
 */
export default function FacilitySearchInput({
  value = '',
  onChange,
  placeholder = '시설사명 검색',
  valueMode = 'name',
  disabled = false,
  className = '',
  style,
}) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api('/system-admin/facilities', {}, 'system')
      .then((list) => {
        if (cancelled) return;
        setOptions(Array.isArray(list) ? list : []);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setOptions([]);
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    const q = String(value || '').trim().toLowerCase();
    if (!q) return options;
    return options.filter((f) => {
      const name = String(f.name || '').toLowerCase();
      const code = String(f.facilityCode || '').toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [options, value]);

  const pickValue = (f) => {
    if (valueMode === 'code') return f.facilityCode || '';
    if (valueMode === 'nameOrCode') return f.name || f.facilityCode || '';
    return f.name || '';
  };

  return (
    <div
      ref={rootRef}
      className={`facility-search-input ${className}`.trim()}
      style={{ position: 'relative', ...style }}
    >
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          onChange?.(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        style={{ width: '100%' }}
      />
      {open && (
        <ul className="facility-search-dropdown" role="listbox">
          {!loaded && <li className="facility-search-empty">불러오는 중…</li>}
          {loaded && filtered.length === 0 && (
            <li className="facility-search-empty">검색 결과가 없습니다.</li>
          )}
          {filtered.slice(0, 100).map((f) => (
            <li key={f.id || f.facilityCode}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange?.(pickValue(f));
                  setOpen(false);
                }}
              >
                <span className="facility-search-name">{f.name}</span>
                <span className="facility-search-code">{f.facilityCode}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
