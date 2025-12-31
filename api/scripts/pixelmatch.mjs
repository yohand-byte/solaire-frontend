#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const OUT_DIR = path.join(process.cwd(), 'tmp/_pixelmatch');
const refDir = path.join(OUT_DIR, 'ref');
const genDir = path.join(OUT_DIR, 'gen');
const diffDir = path.join(OUT_DIR, 'diff');

const DEFAULT_REF_PDF = path.join(process.cwd(), 'fixtures/dp-demo/reference.pdf');
const DEFAULT_DPI = 200;
const DEFAULT_PAGES = 12;

const execFileAsync = promisify(execFile);

function pad2(value) {
  return String(value).padStart(2, '0');
}

async function readPng(filePath) {
  const buffer = await fs.readFile(filePath);
  return PNG.sync.read(buffer);
}

async function writePng(filePath, png) {
  await fs.writeFile(filePath, PNG.sync.write(png));
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function normalizePdftoppmOutput(outDir, totalPages) {
  for (let page = 1; page <= totalPages; page += 1) {
    const padded = pad2(page);
    const target = path.join(outDir, `page-${padded}.png`);
    const legacy = path.join(outDir, `page-${page}.png`);
    const paddedPath = path.join(outDir, `page-${padded}.png`);

    let source = null;
    if (await fileExists(legacy)) {
      source = legacy;
    } else if (await fileExists(paddedPath)) {
      source = paddedPath;
    }

    if (!source) {
      throw new Error(`Missing rasterized page-${padded}.png in ${outDir}`);
    }

    if (source !== target) {
      await fs.rm(target, { force: true });
      await fs.rename(source, target);
    }
  }
}

async function pdfInfo(pdfPath, debugMode) {
  try {
    const { stdout } = await execFileAsync('pdfinfo', [pdfPath]);
    if (debugMode) {
      const lines = stdout.split('\n').filter(Boolean);
      const tail = lines.slice(-18).join('\n');
      console.log(`pdfinfo (tail) for ${pdfPath}:\n${tail}`);
    }
  } catch (err) {
    if (debugMode) {
      console.warn(`pdfinfo failed for ${pdfPath}:`, err?.message || String(err));
    }
  }
}

async function rasterizePdf(pdfPath, outDir, totalPages, debugMode) {
  await ensureDir(outDir);

  // Clean previous files to avoid stale comparisons
  const existing = await fs.readdir(outDir).catch(() => []);
  await Promise.all(
    existing
      .filter((f) => f.endsWith('.png'))
      .map((f) => fs.rm(path.join(outDir, f), { force: true }))
  );

  const prefix = path.join(outDir, 'page');

  // pdftoppm writes page-1.png or page-01.png depending on version/options
  await execFileAsync('pdftoppm', [
    '-png',
    '-r',
    String(DEFAULT_DPI),
    '-f',
    '1',
    '-l',
    String(totalPages),
    pdfPath,
    prefix,
  ]);

  await normalizePdftoppmOutput(outDir, totalPages);

  // Basic guardrail: ensure first page exists
  const first = path.join(outDir, 'page-01.png');
  if (!(await fileExists(first))) {
    throw new Error(`Rasterization failed: missing ${first}`);
  }

  if (debugMode) {
    await pdfInfo(pdfPath, true);
  }
}

function parseArgs(argv) {
  // Accepted:
  // node scripts/pixelmatch.mjs <generatedPdf> [totalPages] [referencePdf] [--debug]
  const args = argv.slice(2);
  let debugMode = false;

  const positional = [];
  for (const a of args) {
    if (a === '--debug') debugMode = true;
    else positional.push(a);
  }

  const genPdfPath = positional[0];
  const maybePages = positional[1];
  const maybeRef = positional[2];

  const totalPages =
    maybePages && /^[0-9]+$/.test(maybePages) ? Number(maybePages) : DEFAULT_PAGES;

  const refPdfPath = maybeRef || DEFAULT_REF_PDF;

  return { genPdfPath, refPdfPath, totalPages, debugMode };
}

async function main() {
  const { genPdfPath, refPdfPath, totalPages, debugMode } = parseArgs(process.argv);

  if (!genPdfPath) {
    console.error(
      'Usage: node scripts/pixelmatch.mjs <generatedPdfPath> [totalPages] [referencePdfPath] [--debug]'
    );
    process.exit(1);
  }

  if (!Number.isInteger(totalPages) || totalPages <= 0) {
    console.error('totalPages must be a positive integer');
    process.exit(1);
  }

  const absGen = path.resolve(process.cwd(), genPdfPath);
  const absRef = path.resolve(process.cwd(), refPdfPath);

  if (debugMode) {
    console.log('Using:');
    console.log('  reference:', absRef);
    console.log('  generated :', absGen);
    console.log('  pages     :', totalPages);
    console.log('  dpi       :', DEFAULT_DPI);
    console.log('  out       :', OUT_DIR);
  }

  if (!(await fileExists(absRef))) {
    throw new Error(`Reference PDF not found: ${absRef}`);
  }
  if (!(await fileExists(absGen))) {
    throw new Error(`Generated PDF not found: ${absGen}`);
  }

  await ensureDir(OUT_DIR);
  await ensureDir(refDir);
  await ensureDir(genDir);
  await ensureDir(diffDir);

  console.log(`Rasterizing reference PDF -> ${refDir}`);
  await rasterizePdf(absRef, refDir, totalPages, debugMode);

  console.log(`Rasterizing generated PDF -> ${genDir}`);
  await rasterizePdf(absGen, genDir, totalPages, debugMode);

  let totalDiffPixels = 0;
  let totalPixels = 0;

  for (let page = 1; page <= totalPages; page += 1) {
    const padded = pad2(page);
    const refPngPath = path.join(refDir, `page-${padded}.png`);
    const genPngPath = path.join(genDir, `page-${padded}.png`);
    const outDiffPath = path.join(diffDir, `diff-${padded}.png`);

    const refPng = await readPng(refPngPath);
    const genPng = await readPng(genPngPath);

    if (refPng.width !== genPng.width || refPng.height !== genPng.height) {
      throw new Error(
        `Size mismatch on page-${padded}: ref=${refPng.width}x${refPng.height} vs gen=${genPng.width}x${genPng.height}`
      );
    }

    const diffPng = new PNG({ width: refPng.width, height: refPng.height });

    const diff = pixelmatch(
      refPng.data,
      genPng.data,
      diffPng.data,
      refPng.width,
      refPng.height,
      { threshold: 0.1 }
    );

    totalDiffPixels += diff;
    totalPixels += refPng.width * refPng.height;

    const pct = (diff / (refPng.width * refPng.height)) * 100;
    console.log(`page-${padded}: diff=${diff} (${pct.toFixed(2)}%) -> ${outDiffPath}`);

    await writePng(outDiffPath, diffPng);
  }

  const totalPct = (totalDiffPixels / totalPixels) * 100;
  console.log(`TOTAL: diff=${totalDiffPixels} (${totalPct.toFixed(2)}%)`);
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
