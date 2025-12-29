import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { execFile } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const referenceDir = path.join(rootDir, 'reference');
const refDir = path.join(referenceDir, '_pixelmatch', 'ref');
const genDir = path.join(referenceDir, '_pixelmatch', 'gen');
const diffDir = path.join(referenceDir, '_pixelmatch', 'diff');

const REF_PDF = path.join(referenceDir, 'DP_Dossier_Complet.pdf');
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

async function rasterizePdf(pdfPath, outDir, totalPages) {
  await ensureDir(outDir);
  const prefix = path.join(outDir, 'page');

  await execFileAsync('pdftoppm', [
    '-r',
    String(DEFAULT_DPI),
    '-png',
    '-f',
    '1',
    '-l',
    String(totalPages),
    pdfPath,
    prefix,
  ]);

  await normalizePdftoppmOutput(outDir, totalPages);
}

async function comparePage(pageNumber) {
  const refName = `page-${pad2(pageNumber)}.png`;
  const refPath = path.join(refDir, refName);
  const testPath = path.join(genDir, refName);
  const diffPath = path.join(diffDir, `diff-${pad2(pageNumber)}.png`);

  const [refPng, testPng] = await Promise.all([readPng(refPath), readPng(testPath)]);

  if (refPng.width !== testPng.width || refPng.height !== testPng.height) {
    throw new Error(
      `Size mismatch for page-${pad2(pageNumber)}: ref ${refPng.width}x${refPng.height} vs gen ${testPng.width}x${testPng.height}`
    );
  }

  const diffPng = new PNG({ width: refPng.width, height: refPng.height });
  const diffPixels = pixelmatch(
    refPng.data,
    testPng.data,
    diffPng.data,
    refPng.width,
    refPng.height,
    {
      threshold: 0.1,
      includeAA: true,
    }
  );

  await writePng(diffPath, diffPng);

  const totalPixels = refPng.width * refPng.height;
  const percent = (diffPixels / totalPixels) * 100;

  return {
    page: pageNumber,
    diffPixels,
    totalPixels,
    percent,
    diffPath,
  };
}

async function main() {
  const genPdfArg = process.argv[2];
  const pageArg = process.argv[3];
  const totalPages = pageArg ? Number(pageArg) : DEFAULT_PAGES;

  if (!genPdfArg) {
    console.error('Usage: node scripts/pixelmatch.mjs <generatedPdfPath> [totalPages]');
    process.exit(1);
  }

  if (!Number.isInteger(totalPages) || totalPages <= 0) {
    console.error('totalPages must be a positive integer');
    process.exit(1);
  }

  const genPdfPath = path.isAbsolute(genPdfArg) ? genPdfArg : path.join(rootDir, genPdfArg);

  if (!(await fileExists(REF_PDF))) {
    console.error(`Missing reference PDF: ${REF_PDF}`);
    process.exit(1);
  }

  if (!(await fileExists(genPdfPath))) {
    console.error(`Missing generated PDF: ${genPdfPath}`);
    process.exit(1);
  }

  console.log(`Rasterizing reference PDF -> ${refDir}`);
  await rasterizePdf(REF_PDF, refDir, totalPages);

  console.log(`Rasterizing generated PDF -> ${genDir}`);
  await rasterizePdf(genPdfPath, genDir, totalPages);

  await ensureDir(diffDir);

  let totalDiff = 0;
  let totalPixels = 0;

  for (let page = 1; page <= totalPages; page += 1) {
    const result = await comparePage(page);
    totalDiff += result.diffPixels;
    totalPixels += result.totalPixels;

    console.log(
      `page-${pad2(result.page)}: diff=${result.diffPixels} (${result.percent.toFixed(2)}%) -> ${result.diffPath}`
    );
  }

  const totalPercent = totalPixels > 0 ? (totalDiff / totalPixels) * 100 : 0;
  console.log(`TOTAL: diff=${totalDiff} (${totalPercent.toFixed(2)}%)`);
}

main().catch((error) => {
  console.error('Pixelmatch failed:', error.message || error);
  process.exit(1);
});
