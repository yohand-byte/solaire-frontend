import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { execFile } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const referenceDir = path.join(rootDir, 'reference');
const refDir = path.join(referenceDir, '_pixelmatch', 'ref');
const genDir = path.join(referenceDir, '_pixelmatch', 'gen');
const genNormDir = path.join(referenceDir, '_pixelmatch', 'gen_norm');
const diffDir = path.join(referenceDir, '_pixelmatch', 'diff');

const REF_PDF = path.join(referenceDir, 'DP_Dossier_Complet.pdf');
const DEFAULT_DPI = 200;
const DEFAULT_PAGES = 12;
const execFileAsync = promisify(execFile);
let debugMode = false;

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

async function logPdfPageSize(pdfPath, pageNumber) {
  try {
    const { stdout } = await execFileAsync('pdfinfo', [
      '-f',
      String(pageNumber),
      '-l',
      String(pageNumber),
      pdfPath,
    ]);
    const pageLine = stdout
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.startsWith('Page size'));

    if (pageLine) {
      console.log(`pdf page-${pageNumber} size: ${pageLine}`);
    } else if (stdout.trim()) {
      console.log(`pdf page-${pageNumber} info:\n${stdout.trim()}`);
    }
  } catch (err) {
    console.warn(`pdfinfo failed for page-${pageNumber}:`, err.message);
  }
}

async function normalizeToPortrait(filePath, outPath) {
  const buffer = await fs.readFile(filePath);
  let png = PNG.sync.read(buffer);
  let outBuffer = buffer;
  let rotated = false;

  if (png.width > png.height) {
    outBuffer = await sharp(buffer).rotate(90).png().toBuffer();
    png = PNG.sync.read(outBuffer);
    rotated = true;
  }

  if (outPath) {
    await fs.writeFile(outPath, outBuffer);
  }

  return { png, rotated };
}

async function comparePage(pageNumber) {
  const refName = `page-${pad2(pageNumber)}.png`;
  const refPath = path.join(refDir, refName);
  const testPath = path.join(genDir, refName);
  const diffPath = path.join(diffDir, `diff-${pad2(pageNumber)}.png`);
  const genNormPath = path.join(genNormDir, refName);

  const [refNormalized, genNormalized] = await Promise.all([
    normalizeToPortrait(refPath),
    normalizeToPortrait(testPath, genNormPath),
  ]);
  const refPng = refNormalized.png;
  const testPng = genNormalized.png;

  if (debugMode) {
    console.log(
      `page-${pad2(pageNumber)}: ref=${refPng.width}x${refPng.height} (rotated=${refNormalized.rotated ? 'yes' : 'no'}) vs gen=${testPng.width}x${testPng.height} (rotated=${genNormalized.rotated ? 'yes' : 'no'})`
    );
  }

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
  const args = process.argv.slice(2);
  debugMode = args.includes('--debug');
  if (debugMode) {
    args.splice(args.indexOf('--debug'), 1);
  }

  const genPdfArg = args[0];
  const pageArg = args[1];
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

  if (debugMode) {
    console.log(`Rasterizing reference PDF -> ${refDir}`);
  }
  await rasterizePdf(REF_PDF, refDir, totalPages);

  if (debugMode) {
    console.log(`Rasterizing generated PDF -> ${genDir}`);
  }
  await rasterizePdf(genPdfPath, genDir, totalPages);

  await logPdfPageSize(genPdfPath, 12);

  await ensureDir(genNormDir);
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
