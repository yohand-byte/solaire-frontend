import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

function escapeXml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export async function ensurePlaceholderImage(outPath: string, width: number, height: number, label: string): Promise<string> {
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  const text = escapeXml(label);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#F3F4F6"/>
  <rect x="18" y="18" width="${Math.max(1, width - 36)}" height="${Math.max(1, height - 36)}" fill="none" stroke="#9CA3AF" stroke-width="3"/>
  <text x="${Math.round(width / 2)}" y="${Math.round(height / 2) - 10}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="#111827">Image indisponible</text>
  <text x="${Math.round(width / 2)}" y="${Math.round(height / 2) + 34}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#374151">${text}</text>
</svg>`;

  const ext = path.extname(outPath).toLowerCase();
  const fmt = ext === '.jpg' || ext === '.jpeg' ? 'jpeg' : 'png';

  await sharp(Buffer.from(svg))
    .resize(width, height, { fit: 'fill' })
    .toFormat(fmt as any)
    .toFile(outPath);

  return outPath;
}
