export const themes = [
  ['forest', 'Forest'],
  ['midnight', 'Midnight'],
  ['amethyst', 'Amethyst'],
  ['ember', 'Ember'],
  ['daylight', 'Daylight'],
];
const allowed = new Set(themes.map(([id]) => id));
export function applyTheme(theme) {
  const selected = allowed.has(theme) ? theme : 'forest';
  document.documentElement.dataset.theme = selected;
  try { localStorage.setItem('halo-theme', selected); } catch { /* Storage can be disabled. */ }
  return selected;
}
export function restoreTheme() {
  let stored;
  try { stored = localStorage.getItem('halo-theme'); } catch { /* Use the default. */ }
  return applyTheme(stored);
}
