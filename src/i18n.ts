export type Lang = 'ja' | 'en'
export const dict = {
  ja: {
    app: 'くっきり写真', lead: '小さい・ぼやけた写真を、2倍・4倍にくっきり拡大。', toggle: 'English', big: '大きい文字',
    pick: '写真を選ぶ', hint: '倍率を選んで「くっきりにする」を押します。',
    x2: '2倍', x4: '4倍', go: '✨ くっきりにする', other: '別の写真',
    before: '前', after: '後', save: '保存', share: '共有', slide: '左右にずらして比べる',
    dl: 'AIモデルを準備中（初回のみ・約5MB）', dlNote: 'Wi-Fiでどうぞ。一度ダウンロードすれば、次からはオフラインで使えます。',
    loading: 'AIを起動中…', working: 'くっきりにしています…', fail: 'うまくいきませんでした。もう一度お試しください。',
    saved: '保存しました', big4: '大きい写真は縮めてから処理します（メモリ節約）。',
    foot: '無料・広告なし・ログイン不要。写真はこの端末から出ません。AI: Real-ESRGAN realesr-general-x4v3（BSD-3-Clause）。',
  },
  en: {
    app: 'Photo Sharpener', lead: 'Enlarge small or blurry photos 2x or 4x, sharper.', toggle: '日本語', big: 'Large text',
    pick: 'Choose a photo', hint: 'Pick a size, then tap “Sharpen”.',
    x2: '2x', x4: '4x', go: '✨ Sharpen', other: 'Another photo',
    before: 'Before', after: 'After', save: 'Save', share: 'Share', slide: 'Drag left and right to compare',
    dl: 'Getting the AI model ready (first time only, ~5 MB)', dlNote: 'Wi-Fi recommended. After this one download it works offline.',
    loading: 'Starting the AI…', working: 'Sharpening…', fail: 'That didn’t work. Please try again.',
    saved: 'Saved', big4: 'Large photos are shrunk first to save memory.',
    foot: 'Free, no ads, no login. Your photos never leave this device. AI: Real-ESRGAN realesr-general-x4v3 (BSD-3-Clause).',
  },
} as const
export type Dict = Record<keyof (typeof dict)["ja"], string>
