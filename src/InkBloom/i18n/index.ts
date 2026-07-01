type Lang = 'zh' | 'en';

function detectLocale(): Lang {
  const override = localStorage.getItem('game_locale');
  if (override === 'en' || override === 'zh') return override;
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

const DICT: Record<Lang, Record<string, string>> = {
  en: {
    brand: 'INK · BLOOM',
    hint_tap: 'TAP TO BLOOM',
    hint_drag: 'DRAG TO SWIRL',
    new: 'New sheet',
    hang: 'Hang it',
    hanging: 'Hanging…',
    line: 'Drying Line',
    back: 'Studio',
    sealed: 'Sealed',
    seal_cta: 'Press your seal',
    you: 'You',
    line_empty: 'The line is empty.',
    line_empty_sub: 'Swirl a sheet and hang the first one.',
    seal_count_one: '1 seal',
    seal_count_many: '{n} seals',
    no_seal_yet: 'No seals yet — be the first.',
    by: 'by',
    notify_seal: '{sender_name} sealed your marbling.',
    saved_hint: 'Hung on the line',
    notes: 'notes',
    no_notes: 'No notes yet — be the first.',
    note_placeholder: 'Leave a note…',
    note_send: 'Send',
    note_signed_out: 'Open in AlterU to leave a note.',
    download_alteru: 'Get AlterU on the App Store',
    note_someone: 'someone',
  },
  zh: {
    brand: 'INK · BLOOM',
    hint_tap: '点一下绽放',
    hint_drag: '拖动搅动',
    new: '新纸',
    hang: '晾起来',
    hanging: '晾纸中…',
    line: '晾纸绳',
    back: '工坊',
    sealed: '已盖印',
    seal_cta: '盖上你的印',
    you: '你',
    line_empty: '绳上还空着。',
    line_empty_sub: '搅一张纸，晾上第一幅。',
    seal_count_one: '1 枚印',
    seal_count_many: '{n} 枚印',
    no_seal_yet: '还没人盖印 —— 来当第一个。',
    by: '作者',
    notify_seal: '{sender_name} 在你的纹纸上盖了印。',
    saved_hint: '已晾上绳',
    notes: '留言',
    no_notes: '还没有留言 —— 来当第一个。',
    note_placeholder: '写句留言…',
    note_send: '发送',
    note_signed_out: '在 AlterU 中打开即可留言。',
    download_alteru: '下载 AlterU',
    note_someone: '某人',
  },
};

let lang = detectLocale();

export function t(key: string, vars?: { n?: number | string }): string {
  let s = DICT[lang][key] ?? DICT.en[key] ?? key;
  if (vars?.n !== undefined) s = s.replace('{n}', String(vars.n));
  return s;
}

export function sealCount(n: number): string {
  return n === 1 ? t('seal_count_one') : t('seal_count_many', { n });
}
