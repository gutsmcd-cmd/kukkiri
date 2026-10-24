import './style.css'
import { dict, type Dict, type Lang } from './i18n'
import { bigTextButton } from './bigtext'

const TILE = 128, PAD = 10
let lang: Lang = (localStorage.getItem('kukkiri-lang') as Lang) || 'ja'
let t: Dict = dict[lang]
let scale: 2 | 4 = Number(localStorage.getItem('kukkiri-scale')) === 4 ? 4 : 2
navigator.storage?.persist?.().catch(() => {})

const app = document.getElementById('app')!
let src: HTMLCanvasElement | null = null // original (maybe shrunk)
let out: HTMLCanvasElement | null = null // result
let shrunk = false, busy = false, split = 50
let worker: Worker | null = null

const $ = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e
}
const button = (cls: string, text: string, fn: () => void) => { const b = $('button', cls, text); b.onclick = fn; return b }
function toast(msg: string) { const d = $('div', 'toast', msg); document.body.append(d); setTimeout(() => d.remove(), 2400) }

const status = $('div', 'status'); status.hidden = true
const stText = $('div'); const stBar = $('progress'); const stNote = $('div', 'small')
status.append(stText, stBar, stNote)
function setStatus(text: string | null, p?: number, note = '') {
  status.hidden = text === null; if (text === null) return
  stText.textContent = text; stNote.textContent = note
  if (p === undefined) stBar.removeAttribute('value'); else stBar.value = p
}

function render() {
  document.documentElement.lang = lang
  app.replaceChildren()
  const top = $('div', 'top'); const right = $('div', 'right')
  right.append(bigTextButton(t.big), button('ghost', t.toggle, () => { lang = lang === 'ja' ? 'en' : 'ja'; localStorage.setItem('kukkiri-lang', lang); t = dict[lang]; render() }))
  top.append($('h1', '', t.app), right)
  app.append(top, $('p', 'lead', t.lead))
  const file = $('input'); file.type = 'file'; file.accept = 'image/*'; file.hidden = true
  file.onchange = () => { const f = file.files?.[0]; if (f) void openPhoto(f); file.value = '' }
  app.append(file)
  if (!src) {
    const home = $('div', 'home')
    home.append(button('primary big', '📷 ' + t.pick, () => file.click()), $('p', 'small', t.hint), $('p', 'note', '📶 ' + t.dlNote))
    app.append(home, $('p', 'foot', t.foot)); return
  }
  const bar = $('div', 'ebar')
  const seg = $('div', 'seg')
  for (const s of [2, 4] as const) {
    const b = button(scale === s ? 'on' : '', s === 2 ? t.x2 : t.x4, () => { scale = s; localStorage.setItem('kukkiri-scale', String(s)); out = null; render() })
    b.disabled = busy; seg.append(b)
  }
  const go = button('primary', t.go, () => void sharpen()); go.disabled = busy
  bar.append(button('ghost', '← ' + t.other, () => file.click()), seg, go)
  const wrap = $('div', 'stagewrap')
  const cmp = $('div', 'cmp')
  const a = out ?? src
  const afterC = $('canvas', 'stage'); afterC.width = a.width; afterC.height = a.height; afterC.getContext('2d')!.drawImage(a, 0, 0)
  cmp.append(afterC)
  if (out) {
    // "before" = original enlarged with plain smoothing, clipped to the left part
    const beforeC = $('canvas', 'stage before'); beforeC.width = out.width; beforeC.height = out.height
    const c = beforeC.getContext('2d')!; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'low'; c.drawImage(src, 0, 0, out.width, out.height)
    const line = $('div', 'line'); const lb = $('span', 'tag l', t.before), rb = $('span', 'tag r', t.after)
    const apply = () => { beforeC.style.clipPath = `inset(0 ${100 - split}% 0 0)`; line.style.left = split + '%' }
    apply(); cmp.append(beforeC, line, lb, rb)
    const move = (e: PointerEvent) => { const r = cmp.getBoundingClientRect(); split = Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)); apply() }
    cmp.onpointerdown = (e) => { cmp.setPointerCapture(e.pointerId); move(e) }
    cmp.onpointermove = (e) => { if (cmp.hasPointerCapture(e.pointerId)) move(e) }
  }
  wrap.append(cmp, status)
  app.append(bar, wrap)
  if (out) {
    const tools = $('div', 'tools')
    tools.append($('span', 'small', `${src.width}×${src.height} → ${out.width}×${out.height} · ${t.slide}`), button('', '💾 ' + t.save, () => void save(false)))
    if ('share' in navigator) tools.append(button('', '📤 ' + t.share, () => void save(true)))
    app.append(tools)
  } else app.append($('p', 'small tip', t.hint))
  if (shrunk) app.append($('p', 'small tip', t.big4))
  app.append($('p', 'foot', t.foot))
}

async function openPhoto(f: File) {
  const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' } as ImageBitmapOptions)
  const MAX = 1600 // memory guard (4x mode shrinks further at run time)
  const s = Math.min(1, MAX / Math.max(bmp.width, bmp.height)); shrunk = s < 1
  const c = $('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  src = c; out = null; split = 50; render()
}

function getWorker() { if (!worker) worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }); return worker }
function runTile(rgba: Uint8ClampedArray, w: number, h: number): Promise<Uint8ClampedArray> {
  return new Promise((resolve, reject) => {
    const wk = getWorker()
    wk.onmessage = (e) => {
      const d = e.data
      if (d.type === 'progress') setStatus(t.dl, d.got / d.total, `${(d.got / 1048576).toFixed(1)} / ${(d.total / 1048576).toFixed(1)} MB · ${t.dlNote}`)
      else if (d.type === 'loading') setStatus(t.loading)
      else if (d.type === 'done') resolve(d.rgba)
      else if (d.type === 'error') reject(new Error(d.msg))
    }
    wk.postMessage({ rgba, w, h }, [rgba.buffer])
  })
}

async function sharpen() {
  if (!src || busy) return
  busy = true; render(); setStatus(t.loading)
  try {
    // 4x keeps the result ≤ 4096 px on the long side; 2x ≤ 3200 px.
    let base = src
    const lim = scale === 4 ? 1024 : 1600
    if (Math.max(src.width, src.height) > lim) {
      const k = lim / Math.max(src.width, src.height); base = $('canvas'); base.width = Math.round(src.width * k); base.height = Math.round(src.height * k)
      base.getContext('2d')!.drawImage(src, 0, 0, base.width, base.height); shrunk = true
    }
    const W = base.width, H = base.height
    const o = $('canvas'); o.width = W * scale; o.height = H * scale
    const oc = o.getContext('2d')!; oc.imageSmoothingQuality = 'high'
    const bc = base.getContext('2d', { willReadFrequently: true })!
    const nx = Math.ceil(W / TILE), ny = Math.ceil(H / TILE); let done = 0
    for (let ty = 0; ty < ny; ty++) for (let tx = 0; tx < nx; tx++) {
      const x0 = tx * TILE, y0 = ty * TILE, x1 = Math.min(x0 + TILE, W), y1 = Math.min(y0 + TILE, H)
      const px0 = Math.max(0, x0 - PAD), py0 = Math.max(0, y0 - PAD), px1 = Math.min(W, x1 + PAD), py1 = Math.min(H, y1 + PAD)
      const tw = px1 - px0, th = py1 - py0
      const res = await runTile(bc.getImageData(px0, py0, tw, th).data, tw, th)
      const tc = new OffscreenCanvas(tw * 4, th * 4); tc.getContext('2d')!.putImageData(new ImageData(res as unknown as Uint8ClampedArray<ArrayBuffer>, tw * 4, th * 4), 0, 0)
      const k = scale / 4
      oc.drawImage(tc, (x0 - px0) * 4, (y0 - py0) * 4, (x1 - x0) * 4, (y1 - y0) * 4, x0 * scale, y0 * scale, (x1 - x0) * scale, (y1 - y0) * scale)
      void k; done++
      setStatus(t.working, done / (nx * ny), `${Math.round(done / (nx * ny) * 100)}%`)
    }
    if (base !== src) src = base
    out = o; split = 50
  } catch (err) { console.error(err); toast(t.fail) }
  busy = false; setStatus(null); render()
}

async function save(share: boolean) {
  if (!out) return
  const blob: Blob = await new Promise((r) => out!.toBlob((b) => r(b!), 'image/jpeg', 0.95))
  const name = `kukkiri-${scale}x-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.jpg`
  const file = new File([blob], name, { type: 'image/jpeg' })
  if (share && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }).catch(() => {}); return }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast(t.saved)
}

render()
