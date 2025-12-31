import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const referenceDir = path.join(rootDir, 'reference');
const refDir = path.join(referenceDir, '_pixelmatch', 'ref');
const diffDir = path.join(referenceDir, '_pixelmatch', 'diff');

const DEFAULT_PAGES = 12;

function pad2(value) {
  return String(value).padStart(2, '0');
}

async function readPngWithBuffer(filePath) {
  const buffer = await fs.readFile(filePath);
  return { buffer, png: PNG.sync.read(buffer) };
}

async function writePng(filePath, png) {
  await fs.writeFile(filePath, PNG.sync.write(png));
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function comparePage(pageNumber) {
  const refName = `page-${pad2(pageNumber)}.png`;
  const testName = `qual_test_page${pageNumber}.png`;
  const refPath = path.join(refDir, refName);
  const testPath = path.join(referenceDir, testName);
  const diffPath = path.join(diffDir, `diff-${pad2(pageNumber)}.png`);

  const [ref, test] = await Promise.all([readPngWithBuffer(refPath), readPngWithBuffer(testPath)]);
  const refPng = ref.png;
  let testPng = test.png;

  if (refPng.width !== testPng.width || refPng.height !== testPng.height) {
    const refRatio = refPng.width / refPng.height;
    const testRatio = testPng.width / testPng.height;
    const rotatedRatio = testPng.height / testPng.width;
    const shouldRotate = Math.abs(rotatedRatio - refRatio) < 0.02;

    let transformer = sharp(test.buffer);
    if (shouldRotate) {
      transformer = transformer.rotate(90);
    }

    const resizedBuffer = await transformer
      .resize(refPng.width, refPng.height, { fit: 'fill' })
      .png()
      .toBuffer();

    testPng = PNG.sync.read(resizedBuffer);

    const ratioNote = shouldRotate ? 'rotated+resized' : 'resized';
    console.log(
      `page-${pad2(pageNumber)}: size mismatch ref ${refPng.width}x${refPng.height} vs test ${testPng.width}x${testPng.height} -> ${ratioNote}`
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
  const pageArg = process.argv[2];
  const totalPages = pageArg ? Number(pageArg) : DEFAULT_PAGES;

  if (!Number.isInteger(totalPages) || totalPages <= 0) {
    console.error('Usage: node scripts/pixelmatch.mjs [totalPages]');
    process.exit(1);
  }

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
