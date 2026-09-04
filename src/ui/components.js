import { UI, text } from '../data/ui.js';

const paths = {
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/>',
  anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M7 10h10M3 14c0 9 18 9 18 0M1 16l2-2 3 2m12 0 3-2 2 2"/>',
  ship: '<path d="M3 16h18l-3 5H6Zm9-14v14M10 4 4 13h6m4-8 5 8h-5M2 23q3-2 5 0t5 0 5 0 5 0"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  crew: '<circle cx="10" cy="7" r="4"/><path d="M2 21v-3a8 8 0 0 1 16 0v3M17 3a4 4 0 0 1 0 8m3 3a7 7 0 0 1 2 7"/>',
  book: '<path d="M12 5v16M12 5C8 2 4 3 2 4v15c3-1 6-1 10 2 4-3 7-3 10-2V4c-2-1-6-2-10 1Z"/>',
  coin: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6"/><path d="M14 8h-3a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4h-3m2-10v12"/>',
  star: '<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  wind: '<path d="M2 8h13a3 3 0 1 0-3-3M2 12h18a3 3 0 1 1-3 3M2 16h7a3 3 0 1 1-3 3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-11v1"/>',
  save: '<path d="M4 3h13l4 4v14H3V3Zm3 0v6h10V3M7 21v-8h10v8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  play: '<path d="m8 4 12 8-12 8Z"/>', pause: '<path d="M8 4v16M16 4v16"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  shield: '<path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6Z"/>',
  pin: '<path d="M19 9c0 6-7 13-7 13S5 15 5 9a7 7 0 0 1 14 0Z"/><circle cx="12" cy="9" r="2"/>',
};

export const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const number = n => Math.round(n).toLocaleString('zh-CN');
export const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
export const art = (path, name, cls = '') => `<img class="art ${cls}" src="./${path}" alt="${escape(name)}" draggable="false">`;
export const asset = (group, id, name, cls = '') => art(`assets/${group}/${id}.svg`, name, cls);
export const button = (label, action, data = {}, style = '', disabled = false) => `<button class="button ${style}" data-action="${action}" ${Object.entries(data).map(([key, value]) => `data-${key}="${escape(value)}"`).join(' ')} ${disabled ? 'disabled' : ''}>${label}</button>`;
export const meter = (value, max, cls = '') => `<div class="meter ${cls}" role="meter" aria-valuenow="${Math.round(value)}" aria-valuemin="0" aria-valuemax="${max}"><i style="width:${Math.min(100, Math.max(0, value / max * 100))}%"></i></div>`;
export const stat = (label, value, small = '') => `<div class="stat"><span>${label}</span><strong>${value}</strong>${small ? `<small>${small}</small>` : ''}</div>`;
export const heading = (title, sub, eyebrow = '') => `<header class="page-heading"><div>${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}<h1>${title}</h1><p>${sub}</p></div></header>`;
export const sectionTitle = (title, right = '') => `<div class="section-title"><h3>${title}</h3>${right}</div>`;
export const price = n => `${icon('coin')}${number(n)}`;
export const empty = message => `<div class="empty">${icon('compass')}<p>${message}</p></div>`;
export const locked = () => `<section class="locked-scene">${asset('ships', 'caravel', UI.sailing)}<h2>${UI.seaLocked}</h2><p>${UI.seaLockedSub}</p>${button(UI.backChart, 'view', { view: 'chart' }, 'primary')}</section>`;
export const dayLabel = n => text('day', { day: n });
