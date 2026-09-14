// i18n tests: key parity, t() behavior, language switching.
import {t, setLang, getLang, supportedLangs, langKeys, strategyText, mapText} from '../src/i18n/index.js';
import zh from '../src/i18n/zh.js';
import en from '../src/i18n/en.js';

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', msg); }
}

// 1. Key parity: every zh key must exist in en and vice versa
const zhKeys = new Set(Object.keys(zh));
const enKeys = new Set(Object.keys(en));
for (const k of zhKeys) ok(enKeys.has(k), `missing in en: ${k}`);
for (const k of enKeys) ok(zhKeys.has(k), `missing in zh: ${k}`);

// 2. No empty values
for (const [k, v] of Object.entries(zh)) ok(v && v.trim().length > 0, `empty zh value: ${k}`);
for (const [k, v] of Object.entries(en)) ok(v && v.trim().length > 0, `empty en value: ${k}`);

// 3. t() basic lookup
setLang('zh');
ok(t('app.title') === '暗线战争', 't zh app.title');
setLang('en');
ok(t('app.title') === 'SHADOWLINE', 't en app.title');

// 4. t() with params
setLang('zh');
const withParam = t('lang.switch.label');
ok(typeof withParam === 'string', 't returns string');

// 5. t() fallback: unknown key returns key itself (never throws)
ok(t('nonexistent.key.xyz') === 'nonexistent.key.xyz', 't fallback to key');

// 6. Language switching
setLang('en');
ok(getLang() === 'en', 'getLang en');
setLang('zh');
ok(getLang() === 'zh', 'getLang zh');

// 7. Supported languages
ok(supportedLangs().includes('zh') && supportedLangs().includes('en'), 'supported langs');

// 8. Strategy text helper
setLang('zh');
const stZh = strategyText('conscription');
ok(stZh.name === '征召令', 'strategyText zh name');
setLang('en');
const stEn = strategyText('conscription');
ok(stEn.name === 'Conscription', 'strategyText en name');

// 9. Placeholder interpolation (if any key uses {param})
// Find a key with placeholder and test it
let placeholderTested = false;
for (const [k, v] of Object.entries(zh)) {
  const m = v.match(/\{(\w+)\}/);
  if (m) {
    const param = m[1];
    setLang('zh');
    const resultZh = t(k, {[param]: 'TEST'});
    ok(resultZh.includes('TEST'), `placeholder zh ${k}`);
    setLang('en');
    const resultEn = t(k, {[param]: 'TEST'});
    ok(resultEn.includes('TEST'), `placeholder en ${k}`);
    placeholderTested = true;
    break;
  }
}
if (!placeholderTested) console.log('(no placeholder keys found, skipping interpolation test)');

// Restore default
setLang('zh');

console.log(`\ni18n tests: ${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
