import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { promisify } from 'util';
import { execFile } from 'child_process';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);

function parseArgs(argv) {
  const args = { pdfPath: null, pages: null, dpi: 150, keep: false };
  for (const a of argv.slice(2)) {
    if (!args.pdfPath && !a.startsWith('--')) {
      args.pdfPath = a;
      continue;
    }
    if (a.startsWith('--pages=')) args.pages = Number(a.split('=')[1]);
    else if (a.startsWith('--dpi=')) args.dpi = Number(a.split('=')[1]);
    else if (a === '--keep') args.keep = true;
  }
  return args;
}

function nearly(a, b, tol = 1.0) {
  return Math.abs(a - b) <= tol;
}

async function getPdfInfo(pdfPath) {
  const { stdout } = await execFileAsync('pdfinfo', [pdfPath]);
  const lines = stdout.split('\n').map((l) => l.trim()).filter(Boolean);

  const pagesLine = lines.find((l) => l.startsWith('Pages:'));
  const pages = pagesLine ? Number(pagesLine.replace('Pages:', '').trim()) : null;

  return { pages, raw: stdout };
}

async function getPdfPageSize(pdfPath, pageNumber) {
  const { stdout } = await execFileAsync('pdfinfo', ['-f', String(pageNumber), '-l', String(pageNumber), pdfPath]);
  const lines = stdout.split('\n').map((l) => l.trim()).filter(Boolean);

  const m = lines
    .map((l) => l.match(/Page\s+\d+\s+size:\s+([0-9.]+)\s+x\s+([0-9.]+)\s+pts/i))
    .find(Boolean);

  if (!m) return null;
  return { w: Number(m[1]), h: Number(m[2]) };
}

async function rasterize(pdfPath, outDir, pages, dpi) {
  const prefix = path.join(outDir, 'page');
  await execFileAsync('pdftoppm', ['-png', '-r', String(dpi), '-f', '1', '-l', String(pages), pdfPath, prefix]);
  return prefix;
}

async function readPng(filePath) {
  const buf = await fs.readFile(filePath);
  const img = sharp(buf, { failOnError: true });
  const meta = await img.metadata();
  const stats = await img.stats();
  return { buf, meta, stats };
}

function channelSpanAndStdev(stats) {
  const ch = stats.channels.slice(0, 3);
  const span = ch.map((c) => (c.max ?? 0) - (c.min ?? 0));
  const stdev = ch.map((c) => c.stdev ?? 0);
  return { span, stdev };
}

async function edgeStdev(buffer) {
  const edged = await sharp(buffer)
    .greyscale()
    .convolve({
      width: 3,
      height: 3,
      kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
    })
    .png()
    .toBuffer();

  const s = await sharp(edged).stats();
  return s.channels[0]?.stdev ?? 0;
}

async function headerStats(buffer, width, height) {
  const headerH = Math.max(120, Math.min(220, Math.round(height * 0.13)));
  const cropped = await sharp(buffer).extract({ left: 0, top: 0, width, height: headerH }).png().toBuffer();
  const s = await sharp(cropped).stats();
  const { span, stdev } = channelSpanAndStdev(s);
  return { span, stdev };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.pdfPath) {
    console.error('Usage: node scripts/validate-dp.mjs /abs/path/file.pdf --pages=12 --dpi=150');
    process.exit(2);
  }

  const pdfPath = args.pdfPath;
  const info = await getPdfInfo(pdfPath);

  const failures = [];

  if (!info.pages || Number.isNaN(info.pages)) {
    failures.push('Impossible de lire le nombre de pages via pdfinfo');
  }

  const pages = args.pages ?? info.pages ?? 0;

  if (!pages || Number.isNaN(pages) || pages < 1) {
    failures.push('Nombre de pages invalide');
  }

  if (info.pages && pages !== info.pages) {
    failures.push(`Pages attendues=${pages} mais pdfinfo annonce=${info.pages}`);
  }

  const size1 = await getPdfPageSize(pdfPath, 1).catch(() => null);
  const sizeLast = await getPdfPageSize(pdfPath, pages).catch(() => null);

  const A4_L_W = 841.89;
  const A4_L_H = 595.28;

  if (!size1) failures.push('Page 1: size introuvable via pdfinfo');
  else if (!(nearly(size1.w, A4_L_W, 1.2) && nearly(size1.h, A4_L_H, 1.2))) {
    failures.push(`Page 1: size inattendue ${size1.w}x${size1.h} (attendu ~${A4_L_W}x${A4_L_H})`);
  }

  if (!sizeLast) failures.push(`Page ${pages}: size introuvable via pdfinfo`);
  else if (!(nearly(sizeLast.w, A4_L_W, 1.2) && nearly(sizeLast.h, A4_L_H, 1.2))) {
    failures.push(`Page ${pages}: size inattendue ${sizeLast.w}x${sizeLast.h} (attendu ~${A4_L_W}x${A4_L_H})`);
  }

  const tmp = path.join(os.tmpdir(), `dp-validate-${crypto.randomUUID()}`);
  await fs.mkdir(tmp, { recursive: true });

  let prefix;
  try {
    prefix = await rasterize(pdfPath, tmp, pages, args.dpi);
  } catch (e) {
    failures.push(`pdftoppm error: ${e?.message || e}`);
  }

  for (let i = 1; i <= pages; i++) {
    try {
      const pad = String(i).padStart(String(pages).length, "0");
      const pngPath = `${prefix}-${pad}.png`;
      const { buf, meta, stats } = await readPng(pngPath);

      const w = meta.width ?? 0;
      const h = meta.height ?? 0;
      if (!w || !h) {
        failures.push(`Page ${i}: PNG metadata invalide`);
        continue;
      }

      const ratio = w / h;
      if (Math.abs(ratio - 1.4142) > 0.02) {
        failures.push(`Page ${i}: ratio PNG inattendu ${w}x${h} (ratio=${ratio.toFixed(4)})`);
      }

      const { span, stdev } = channelSpanAndStdev(stats);
      const isFlat = span.every((v) => v < 18) || stdev.every((v) => v < 6);
      if (isFlat) {
        failures.push(`Page ${i}: rendu global suspect (plat) span=${span.join(',')} stdev=${stdev.map((v) => v.toFixed(1)).join(',')}`);
      }

      const eStd = await edgeStdev(buf);
      if (eStd < 7.5) {
        failures.push(`Page ${i}: densité de contours faible (edge-stdev=${eStd.toFixed(2)})`);
      }

      const hs = await headerStats(buf, w, h);
      const headerFlat = hs.span.every((v) => v < 12) || hs.stdev.every((v) => v < 3.2);
      if (headerFlat) {
        failures.push(`Page ${i}: bandeau haut suspect (vide/plat) span=${hs.span.join(',')} stdev=${hs.stdev.map((v) => v.toFixed(1)).join(',')}`);
      }
    } catch (e) {
      failures.push(`Page ${i}: raster/analyze error: ${e?.message || e}`);
    }
  }

  if (!args.keep) {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  } else {
    console.log(`TMP=${tmp}`);
  }

  if (failures.length) {
    console.log('FAIL');
    for (const f of failures) console.log(`- ${f}`);
    process.exit(1);
  }

  console.log('PASS');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
