// i18n manager: language state + t() lookup.
// Business code only imports {t, setLang, getLang, onLangChange} from here;
// it never touches the pack files directly, keeping language data decoupled.

import zh from './zh.js';
import en from './en.js';
import {GAME_CONFIG} from '../game-config.js';

const packs = {zh, en};
const FALLBACK = 'zh';
const STORE_KEY = 'shadowline-war-lang';

let lang = FALLBACK;
try {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORE_KEY) : null;
  if (saved && packs[saved]) lang = saved;
} catch {}

const listeners = new Set();

export function getLang() { return lang; }

export function setLang(next) {
  if (!packs[next] || next === lang) return;
  lang = next;
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(STORE_KEY, lang); } catch {}
  for (const fn of listeners) { try { fn(lang); } catch {} }
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// t('some.key', {name: 'x'}) -> pack string with {name} replaced.
// Falls back to zh, then to the key itself (never throws, never returns undefined).
export function t(key, params) {
  let s = packs[lang][key];
  if (s === undefined) s = packs[FALLBACK][key];
  if (s === undefined) return key;
  if (params) {
    for (const k of Object.keys(params)) {
      s = s.split('{' + k + '}').join(String(params[k]));
    }
  }
  return s;
}

// Test/support helper: list all registered keys per language.
export function langKeys(l) { return Object.keys(packs[l] || {}); }
export function supportedLangs() { return Object.keys(packs); }

// Localized text helpers for game data. These keep data.js (structure)
// decoupled from the language packs (text).
export function strategyText(id) {
  const params=GAME_CONFIG.strategies.find(card=>card.id===id)?.effect;
  return {
    name: t('strategy.' + id + '.name'),
    desc: t('strategy.' + id + '.desc',params),
    use: t('strategy.' + id + '.use'),
  };
}

export function mapText(id) {
  return {
    name: t('map.' + id + '.name'),
    subtitle: t('map.' + id + '.subtitle'),
    desc: t('map.' + id + '.desc'),
  };
}

export function mapFactions(id) {
  return [t('map.' + id + '.faction.0'), t('map.' + id + '.faction.1')];
}

export function fieldLabel(mapId, fieldId) {
  const key = 'map.' + mapId + '.field.' + fieldId;
  const v = t(key);
  return v === key ? fieldId : v;
}
