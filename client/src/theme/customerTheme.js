/** 고객용 화면 테마 → CSS 변수 매핑 */

export const LIGHT_THEME_VARS = {
  '--cw-bg': '#f3f0ff',
  '--cw-bg-mid': '#faf9ff',
  '--cw-bg-end': '#ffffff',
  '--cw-panel': '#ffffff',
  '--cw-panel-alt': '#f0ebff',
  '--cw-card': '#ffffff',
  '--cw-ghost-bg': '#ffffff',
  '--cw-ghost-fg': '#1f1a33',
  '--cw-text': '#1f1a33',
  '--cw-text-muted': '#9ca3af',
  '--cw-text-soft': '#6b7280',
  '--cw-input-bg': '#ffffff',
  '--cw-input-fg': '#1f1a33',
  '--cw-button-bg': '#7C3AED',
  '--cw-button-fg': '#FFFFFF',
  '--cw-button-from': '#A78BFA',
  '--cw-button-to': '#7C3AED',
  '--cw-accent': '#7C3AED',
  '--cw-accent-deep': '#7C3AED',
  '--cw-keypad-bg': '#f3f0ff',
  '--cw-keypad-key': '#ffffff',
  '--cw-border': '#e9e5f5',
  '--cw-panel-border': '#e9e5f5',
  '--cw-ring': '#A78BFA',
  '--cw-selection': '#1a1a1a',
  '--cw-terms-body-bg': '#f7f7fb',
  '--cw-terms-body-fg': '#4b4560',
  '--cw-check-bg': 'transparent',
  '--cw-check-border': '#9ca3af',
  '--cw-disabled-bg': '#e5e7eb',
  '--cw-disabled-fg': '#9ca3af',
};

/** 다크 웨이팅 플로우 레퍼런스 */
export const DARK_THEME_VARS = {
  '--cw-bg': '#0A0A12',
  '--cw-bg-mid': '#0F0F1A',
  '--cw-bg-end': '#0A0A12',
  '--cw-panel': '#1A1A24',
  '--cw-panel-alt': '#22222E',
  '--cw-card': '#1A1A24',
  '--cw-ghost-bg': '#1A1A24',
  '--cw-ghost-fg': '#FFFFFF',
  '--cw-text': '#FFFFFF',
  '--cw-text-muted': '#9CA3AF',
  '--cw-text-soft': '#9CA3AF',
  '--cw-input-bg': '#1A1A24',
  '--cw-input-fg': '#FFFFFF',
  '--cw-button-bg': '#7C3AED',
  '--cw-button-fg': '#FFFFFF',
  '--cw-button-from': '#A78BFA',
  '--cw-button-to': '#7C3AED',
  '--cw-accent': '#A78BFA',
  '--cw-accent-deep': '#7C3AED',
  '--cw-keypad-bg': '#0A0A12',
  '--cw-keypad-key': '#22222E',
  '--cw-border': 'rgba(255,255,255,0.08)',
  '--cw-panel-border': 'rgba(255,255,255,0.08)',
  '--cw-ring': '#A78BFA',
  '--cw-selection': '#252538',
  '--cw-terms-body-bg': '#1A1A24',
  '--cw-terms-body-fg': '#E5E7EB',
  '--cw-check-bg': 'transparent',
  '--cw-check-border': 'rgba(255,255,255,0.35)',
  '--cw-disabled-bg': '#2A2A36',
  '--cw-disabled-fg': '#6B7280',
};

/** @deprecated */
export const WAITING_FLOW_THEME_VARS = DARK_THEME_VARS;

export function themeVars(theme) {
  return theme === 'dark' ? DARK_THEME_VARS : LIGHT_THEME_VARS;
}

export function themeStyle(theme) {
  return themeVars(theme);
}
