/** 고객용 화면 테마 → CSS 변수 매핑 */

export const LIGHT_THEME_VARS = {
  '--cw-bg': '#f3f0ff',
  '--cw-bg-mid': '#faf9ff',
  '--cw-bg-end': '#ffffff',
  '--cw-panel': '#ffffff',
  '--cw-panel-alt': '#f7f5ff',
  '--cw-card': '#ffffff',
  '--cw-ghost-bg': '#ffffff',
  '--cw-ghost-fg': '#222222',
  '--cw-text': '#1f1a33',
  '--cw-text-muted': '#9ca3af',
  '--cw-text-soft': '#6b7280',
  '--cw-input-bg': '#ffffff',
  '--cw-input-fg': '#1f1a33',
  '--cw-button-bg': '#5B21B6',
  '--cw-button-fg': '#FFFFFF',
  '--cw-accent': '#A78BFA',
  '--cw-keypad-bg': '#f3f0ff',
  '--cw-keypad-key': '#F4F2FC',
  '--cw-border': '#e9e5f5',
  '--cw-panel-border': '#e9e5f5',
  '--cw-ring': '#7c3aed',
  '--cw-selection': '#252538',
  '--cw-terms-body-bg': '#f7f7fb',
  '--cw-terms-body-fg': '#6b7280',
  '--cw-check-bg': '#ffffff',
};

/** ThemePark-Dark-Concept → 웹 CSS 변수 */
export const DARK_THEME_VARS = {
  '--cw-bg': '#1E1E2E',
  '--cw-bg-mid': '#1A1A26',
  '--cw-bg-end': '#1E1E2E',
  '--cw-panel': '#1A1A26',
  '--cw-panel-alt': '#252538',
  '--cw-card': '#282A36',
  '--cw-ghost-bg': '#2C2C34',
  '--cw-ghost-fg': '#E9E8ED',
  '--cw-text': '#E9E8ED',
  '--cw-text-muted': '#888888',
  '--cw-text-soft': '#E9E8ED',
  '--cw-input-bg': '#252538',
  '--cw-input-fg': '#E9E8ED',
  '--cw-button-bg': '#5B21B6',
  '--cw-button-fg': '#FFFFFF',
  '--cw-accent': '#A78BFA',
  '--cw-keypad-bg': '#1A1A26',
  '--cw-keypad-key': '#252538',
  '--cw-border': 'transparent',
  '--cw-panel-border': 'transparent',
  '--cw-ring': '#A78BFA',
  '--cw-selection': '#252538',
  '--cw-terms-body-bg': '#1E1E1E',
  '--cw-terms-body-fg': '#E9E8ED',
  '--cw-check-bg': 'transparent',
};

export function themeVars(theme) {
  return theme === 'dark' ? DARK_THEME_VARS : LIGHT_THEME_VARS;
}

export function themeStyle(theme) {
  return themeVars(theme);
}
