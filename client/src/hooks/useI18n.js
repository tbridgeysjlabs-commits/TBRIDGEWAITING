import { useEffect, useState } from 'react';
import { api } from '../api/client';

const fallback = {
  ko: {
    current_waiting: '현재 대기',
    teams: '팀',
    phone_hint: '실시간 웨이팅 안내를 받을 수 있는 번호를 입력해 주세요',
    start_waiting: '웨이팅 시작',
    party_title: '총 입장 인원을 입력해 주세요',
    previous: '이전',
    confirm: '확인',
    total_party: '총 입장 인원 {n}명',
    agreement_title: '약관 동의',
    terms_required: '이용 약관 동의 (필수)',
    privacy_required: '개인정보 수집 및 이용 동의 (필수)',
    marketing_optional: '마케팅 관련 개인정보 수집 이용 동의 (선택)',
    agree: '동의',
    toast_registered: '웨이팅 등록 완료! 카카오 알림톡을 발송했어요.',
  },
};

export function useI18n(lang = 'ko') {
  const [dict, setDict] = useState(fallback.ko);

  useEffect(() => {
    let alive = true;
    api(`/i18n/${lang}`)
      .then((data) => {
        if (alive) setDict({ ...fallback.ko, ...data });
      })
      .catch(() => {
        if (alive) setDict(fallback[lang] || fallback.ko);
      });
    return () => {
      alive = false;
    };
  }, [lang]);

  const t = (key, vars = {}) => {
    let text = dict[key] || key;
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
    return text;
  };

  return { t, dict };
}
