import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import mammoth from 'mammoth'
import JSZip from 'jszip'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

async function pdfToText(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let out = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const strings = content.items.map(it => it.str).join(' ')
    out += `--- Page ${i} ---\n${strings}\n\n`
  }
  return out
}

async function docxToText(arrayBuffer) {
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

async function pptxToText(arrayBuffer) {
  const zip = await JSZip.loadAsync(arrayBuffer)
  const slideFiles = Object.keys(zip.files)
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)\.xml/)[1])
      const nb = Number(b.match(/slide(\d+)\.xml/)[1])
      return na - nb
    })

  let out = ''
  for (const name of slideFiles) {
    const xml = await zip.files[name].async('string')
    const texts = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m => m[1])
    if (texts.length) {
      out += `--- ${name.replace('ppt/slides/', '')} ---\n${texts.join(' ')}\n\n`
    }
  }
  return out
}

async function plainToText(arrayBuffer) {
  return new TextDecoder('utf-8').decode(arrayBuffer)
}

export async function extractText(file) {
  const arrayBuffer = await file.arrayBuffer()
  const name = (file.name || '').toLowerCase()

  if (name.endsWith('.pdf')) return pdfToText(arrayBuffer)
  if (name.endsWith('.docx')) return docxToText(arrayBuffer)
  if (name.endsWith('.pptx')) return pptxToText(arrayBuffer)
  if (name.endsWith('.txt') || name.endsWith('.csv') || name.endsWith('.md')) {
    return plainToText(arrayBuffer)
  }

  if (file.type.startsWith('image/')) return null

  throw new Error(`Unsupported file type: ${file.name}`)
}

export function resizeImage(file, maxDim = 1600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img
      const scale = Math.min(1, maxDim / Math.max(width, height))
      width = Math.round(width * scale)
      height = Math.round(height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('resize failed'))),
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => reject(new Error('image load failed'))
    img.src = url
  })
}