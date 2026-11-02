'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Link2, Share2 } from 'lucide-react'
import { SITE_URL } from '@/lib/site'
import { Sheet, useToast } from '@/components/ui'

// Verse cards for Instagram, TikTok, X and the rest: drawn on a canvas on the device,
// so it costs nothing and works offline. 1080x1350 (4:5) fits every major feed.

type Style = { id: string; name: string; bg: [string, string]; ink: string; accent: string }
const STYLES: Style[] = [
  { id: 'paper', name: 'Paper', bg: ['#fbf8f3', '#f0e7da'], ink: '#1d1b18', accent: '#85532a' },
  { id: 'night', name: 'Night', bg: ['#14110e', '#2c2116'], ink: '#f1ebe2', accent: '#dcab72' },
  { id: 'dawn', name: 'Dawn', bg: ['#f8dcb4', '#e39b78'], ink: '#2b1a10', accent: '#6b3a1c' },
  { id: 'sage', name: 'Sage', bg: ['#e4ebe0', '#a8bda3'], ink: '#1d2a1b', accent: '#3f5c3a' },
]

const W = 1080
const H = 1350

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = []
  for (const para of text.split('\n')) {
    let line = ''
    for (const word of para.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word
      if (ctx.measureText(test).width > width && line) {
        lines.push(line)
        line = word
      } else line = test
    }
    lines.push(line)
  }
  return lines
}

async function draw(canvas: HTMLCanvasElement, style: Style, text: string, reference: string, rtl: boolean) {
  const serif = rtl ? '"Amiri"' : '"Literata Variable"'
  await Promise.all([
    document.fonts.load(`500 60px ${serif}`, text.slice(0, 50)),
    document.fonts.load('600 32px "Inter Variable"'),
  ]).catch(() => {})
  const ctx = canvas.getContext('2d')!
  canvas.width = W
  canvas.height = H
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, style.bg[0])
  g.addColorStop(1, style.bg[1])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // Quote mark
  ctx.fillStyle = style.accent
  ctx.globalAlpha = 0.25
  ctx.font = `700 260px ${serif}, Georgia, serif`
  ctx.textAlign = rtl ? 'right' : 'left'
  ctx.fillText(rtl ? '”' : '“', rtl ? W - 90 : 90, 330)
  ctx.globalAlpha = 1

  // Verse: largest size that fits the box.
  const box = { x: 110, w: W - 220, top: 300, bottom: H - 300 }
  let size = 76
  let lines: string[] = []
  let lh = 0
  for (; size >= 30; size -= 2) {
    ctx.font = `500 ${size}px ${serif}, Georgia, serif`
    lh = size * (rtl ? 1.7 : 1.42)
    lines = wrap(ctx, text, box.w)
    if (lines.length * lh <= box.bottom - box.top) break
  }
  if (lines.length * lh > box.bottom - box.top) {
    const fit = Math.floor((box.bottom - box.top) / lh)
    lines = lines.slice(0, fit)
    lines[fit - 1] = `${lines[fit - 1].replace(/\s+\S*$/, '')} …`
  }
  ctx.fillStyle = style.ink
  ctx.textBaseline = 'alphabetic'
  ctx.direction = rtl ? 'rtl' : 'ltr'
  const startY = box.top + (box.bottom - box.top - lines.length * lh) / 2 + size
  lines.forEach((l, i) => ctx.fillText(l, rtl ? box.x + box.w : box.x, startY + i * lh))

  // Reference
  ctx.direction = 'ltr'
  ctx.textAlign = 'left'
  ctx.font = '600 38px "Inter Variable", system-ui, sans-serif'
  ctx.fillStyle = style.accent
  ctx.fillText(reference, box.x, H - 210)

  // Small Freely mark
  ctx.globalAlpha = 0.7
  ctx.font = '600 28px "Inter Variable", system-ui, sans-serif'
  ctx.fillStyle = style.ink
  ctx.fillText('Freely Scripture · free, no ads', box.x, H - 110)
  ctx.globalAlpha = 1
}

export default function ShareImageSheet({
  text,
  reference,
  rtl = false,
  link,
  onClose,
}: {
  text: string
  reference: string
  rtl?: boolean
  link: string
  onClose: () => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [style, setStyle] = useState(STYLES[0])
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const url = SITE_URL ? `${SITE_URL}${link}` : ''

  useEffect(() => {
    if (canvas.current) draw(canvas.current, style, text, reference, rtl)
  }, [style, text, reference, rtl])

  async function blob(): Promise<Blob | null> {
    return new Promise((resolve) => canvas.current?.toBlob(resolve, 'image/png'))
  }

  async function share() {
    setBusy(true)
    try {
      const b = await blob()
      if (!b) throw new Error('no image')
      const file = new File([b], 'freely-verse.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${reference}${url ? `\n${url}` : ''}` })
      } else {
        download(b)
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.show('Could not share. Try Download instead.')
    } finally {
      setBusy(false)
    }
  }

  function download(b?: Blob | null) {
    const go = (bl: Blob) => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(bl)
      a.download = 'freely-verse.png'
      a.click()
      URL.revokeObjectURL(a.href)
      toast.show('Image saved')
    }
    if (b) go(b)
    else blob().then((bl) => bl && go(bl))
  }

  return (
    <Sheet open onClose={onClose} title="Share">
      <canvas ref={canvas} className="mx-auto w-full max-w-[320px] rounded-xl border border-line shadow-md" style={{ aspectRatio: '4 / 5' }} aria-label={`Image of ${reference}`} />
      <div className="mt-4 flex justify-center gap-2" role="radiogroup" aria-label="Style">
        {STYLES.map((s) => (
          <button
            key={s.id}
            role="radio"
            aria-checked={style.id === s.id}
            onClick={() => setStyle(s)}
            className={`flex flex-col items-center gap-1 rounded-xl p-1.5 text-xs font-medium ${style.id === s.id ? 'bg-accent-soft text-accent' : 'text-ink-3'}`}
          >
            <span className="h-10 w-10 rounded-lg border border-line" style={{ background: `linear-gradient(135deg, ${s.bg[0]}, ${s.bg[1]})` }} />
            {s.name}
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={share} disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-accent-ink disabled:opacity-60">
          <Share2 className="h-4 w-4" /> Share image
        </button>
        <button onClick={() => download()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line font-semibold text-ink-2">
          <Download className="h-4 w-4" /> Download
        </button>
      </div>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(`${text}\n— ${reference}${url ? `\n${url}` : ''}`)
            toast.show('Copied')
          } catch {
            toast.show('Could not copy')
          }
        }}
        className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-ink-2 hover:bg-surface-2"
      >
        <Link2 className="h-4 w-4" /> Copy text{url ? ' and link' : ''}
      </button>
      {toast.node}
    </Sheet>
  )
}
