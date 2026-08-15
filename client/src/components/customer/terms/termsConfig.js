/** 약관 메타 — 본문은 시설사 설정/기본값에서 주입 */
export const TERMS_ITEMS = [
  {
    id: 'service',
    required: true,
    titleKey: 'terms_label_service',
    bodyField: 'termsOfUse',
    bodyKoField: 'termsOfUseKo',
    defaultKey: 'terms',
  },
  {
    id: 'privacy',
    required: true,
    titleKey: 'terms_label_privacy',
    bodyField: 'privacyPolicy',
    bodyKoField: 'privacyPolicyKo',
    defaultKey: 'privacy',
  },
  {
    id: 'marketing',
    required: false,
    titleKey: 'terms_label_marketing',
    bodyField: 'marketingPolicy',
    bodyKoField: 'marketingPolicyKo',
    defaultKey: 'marketing',
  },
];

export function resolveTermBody(facility, item, defaults) {
  const localized = (facility?.[item.bodyField] || '').trim();
  if (localized) return localized;
  const ko = (facility?.[item.bodyKoField] || '').trim();
  if (ko) return ko;
  return defaults[item.defaultKey] || '';
}
