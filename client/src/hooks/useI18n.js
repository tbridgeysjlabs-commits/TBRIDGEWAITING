import { useEffect, useState } from 'react';
import { api } from '../api/client';

const fallback = {
  ko: {
    current_waiting: '현재 대기',
    teams: '팀',
    estimated_wait: '예상 대기시간',
    minutes: '분',
    notice: '공지사항',
    now_time: '현재 시간',
    phone_hint: '실시간 웨이팅 안내를 받을 수 있는 번호를 입력해 주세요',
    start_waiting: '웨이팅 시작',
    party_title: '총 입장 인원을 입력해 주세요',
    party_hint: '인원을 선택해 주세요',
    party_types_hint: '{types}를 각각 선택해 주세요',
    previous: '이전',
    confirm: '확인',
    total_party: '총 입장 인원 {n}명',
    agreement_title: '약관 동의',
    agreement_guide: '웨이팅 등록을 위해 약관에 동의해주세요.',
    agree_all: '전체 약관에 동의합니다.',
    terms_label_unified: '약관 동의',
    terms_label_service: '이용약관 동의',
    terms_label_privacy: '개인정보 수집·이용 동의',
    terms_label_marketing: '마케팅 정보 수신 동의',
    required_tag: '[필수]',
    optional_tag: '[선택]',
    agree_continue: '동의하고 계속하기',
    register_waiting: '웨이팅 등록하기',
    registering: '등록 중...',
    terms_required: '이용약관 동의 (필수)',
    privacy_required: '개인정보 수집·이용 동의 (필수)',
    marketing_optional: '마케팅 정보 수신 동의 (선택)',
    agree_optional_hint: '선택 항목에 동의하지 않아도 웨이팅 등록은 가능합니다.',
    agree: '동의',
    toast_registered: '웨이팅 등록 완료! 카카오 알림톡을 발송했어요.',
    registered_done_title: '웨이팅 등록이 완료되었습니다',
    registered_seq_label: '당일 등록 순번',
    registered_phone_label: '휴대폰 번호',
    registered_party_label: '등록 인원',
    registered_redirect_hint: '잠시 후 처음 화면으로 이동합니다',
  },
  en: {
    current_waiting: 'Waiting',
    teams: 'parties',
    estimated_wait: 'Est. wait',
    minutes: 'min',
    notice: 'Notice',
    now_time: 'Current time',
    phone_hint: 'Enter a number to receive real-time waiting updates',
    start_waiting: 'Start waiting',
    party_title: 'Enter the total number of guests',
    party_hint: 'Please select the number of guests',
    party_types_hint: 'Please select {types} respectively',
    previous: 'Back',
    confirm: 'Confirm',
    total_party: 'Total {n} guests',
    agreement_title: 'Agreements',
    agreement_guide: 'Please agree to the terms to register for waiting.',
    agree_all: 'I agree to all terms.',
    terms_label_unified: 'Terms agreement',
    terms_label_service: 'Terms of Use',
    terms_label_privacy: 'Collection and Use of Personal Information',
    terms_label_marketing: 'Marketing Information Consent',
    required_tag: '[Required]',
    optional_tag: '[Optional]',
    agree_continue: 'Agree and continue',
    register_waiting: 'Register waiting',
    registering: 'Registering...',
    terms_required: 'Terms of Use (Required)',
    privacy_required: 'Collection and Use of Personal Information (Required)',
    marketing_optional: 'Marketing Information Consent (Optional)',
    agree_optional_hint: 'You can still register without agreeing to optional items.',
    agree: 'Agree',
    toast_registered: 'Waiting registered! Kakao Alimtalk sent.',
    registered_done_title: 'Waiting registration complete',
    registered_seq_label: 'Today\'s queue number',
    registered_phone_label: 'Phone number',
    registered_party_label: 'Party size',
    registered_redirect_hint: 'Returning to the home screen shortly',
  },
  ja: {
    current_waiting: '現在の待ち',
    teams: '組',
    estimated_wait: '予想待ち時間',
    minutes: '分',
    notice: 'お知らせ',
    now_time: '現在時刻',
    phone_hint: 'リアルタイム案内を受け取る番号を入力してください',
    start_waiting: 'ウェイティング開始',
    party_title: '入場人数を入力してください',
    party_hint: '人数を選択してください',
    party_types_hint: '{types}をそれぞれ選択してください',
    previous: '戻る',
    confirm: '確認',
    total_party: '合計 {n}名',
    agreement_title: '規約同意',
    agreement_guide: 'ウェイティング登録のため、規約に同意してください。',
    agree_all: 'すべての規約に同意します。',
    terms_label_unified: '規約への同意',
    terms_label_service: '利用規約への同意',
    terms_label_privacy: '個人情報の収集・利用への同意',
    terms_label_marketing: 'マーケティング情報の受信への同意',
    required_tag: '[必須]',
    optional_tag: '[任意]',
    agree_continue: '同意して続ける',
    register_waiting: 'ウェイティング登録',
    registering: '登録中...',
    terms_required: '利用規約への同意（必須）',
    privacy_required: '個人情報の収集・利用への同意（必須）',
    marketing_optional: 'マーケティング情報の受信への同意（任意）',
    agree_optional_hint: '任意項目に同意しなくてもウェイティング登録は可能です。',
    agree: '同意',
    toast_registered: 'ウェイティング登録完了！カカオ通知を送信しました。',
    registered_done_title: 'ウェイティング登録が完了しました',
    registered_seq_label: '本日の登録番号',
    registered_phone_label: '携帯電話番号',
    registered_party_label: '登録人数',
    registered_redirect_hint: 'まもなく最初の画面に戻ります',
  },
  zh: {
    current_waiting: '当前等候',
    teams: '组',
    estimated_wait: '预计等候时间',
    minutes: '分',
    notice: '公告',
    now_time: '现在时间',
    phone_hint: '请输入可接收实时等候通知的手机号',
    start_waiting: '开始排队',
    party_title: '请输入总入场人数',
    party_hint: '请选择人数',
    party_types_hint: '请分别选择{types}',
    previous: '上一步',
    confirm: '确认',
    total_party: '共 {n} 人',
    agreement_title: '同意条款',
    agreement_guide: '请同意条款以完成排队登记。',
    agree_all: '同意全部条款。',
    terms_label_unified: '同意条款',
    terms_label_service: '同意使用条款',
    terms_label_privacy: '同意收集·使用个人信息',
    terms_label_marketing: '同意接收营销信息',
    required_tag: '[必填]',
    optional_tag: '[可选]',
    agree_continue: '同意并继续',
    register_waiting: '登记排队',
    registering: '登记中...',
    terms_required: '同意使用条款（必填）',
    privacy_required: '同意收集·使用个人信息（必填）',
    marketing_optional: '同意接收营销信息（可选）',
    agree_optional_hint: '即使不同意可选项，也可以完成排队登记。',
    agree: '同意',
    toast_registered: '排队登记完成！已发送Kakao通知。',
    registered_done_title: '排队登记已完成',
    registered_seq_label: '当日登记号码',
    registered_phone_label: '手机号码',
    registered_party_label: '登记人数',
    registered_redirect_hint: '即将返回首页',
  },
};

export function useI18n(lang = 'ko') {
  const [dict, setDict] = useState(fallback[lang] || fallback.ko);

  useEffect(() => {
    let alive = true;
    const base = fallback[lang] || fallback.ko;
    setDict(base);
    api(`/i18n/${lang}`)
      .then((data) => {
        if (alive) setDict({ ...base, ...data });
      })
      .catch(() => {
        if (alive) setDict(base);
      });
    return () => {
      alive = false;
    };
  }, [lang]);

  const t = (key, vars = {}) => {
    let text = dict[key] || fallback.ko[key] || key;
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
    return text;
  };

  return { t, dict };
}

export const WEEK_LABELS = {
  ko: ['일', '월', '화', '수', '목', '금', '토'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ja: ['日', '月', '火', '水', '木', '金', '土'],
  zh: ['日', '一', '二', '三', '四', '五', '六'],
};
