import path from 'path';
import type PDFDocument from 'pdfkit';

export const PAGE_WIDTH_PT = 841.89;
export const PAGE_HEIGHT_PT = 595.28;

export const FRAME_MARGIN_PT = 18;
export const TITLE_COLOR = '#1E3A8A';
export const TEXT_COLOR = '#111827';
export const BORDER_COLOR = '#D1D5DB';
export const FOOTER_TEXT = '#6B7280';

const FONT_REGULAR = path.resolve(process.cwd(), 'src/dp/assets/fonts/NotoSans-Regular.ttf');
const FONT_BOLD = path.resolve(process.cwd(), 'src/dp/assets/fonts/NotoSans-Bold.ttf');

export type FooterTriptych = {
  left: string;
  center: string;
  right: string;
};

export function registerFonts(doc: PDFDocument): void {
  doc.registerFont('NotoSans', FONT_REGULAR);
  doc.registerFont('NotoSansBold', FONT_BOLD);
}

export function setBodyFont(doc: PDFDocument, size = 10): void {
  doc.font('NotoSans').fontSize(size).fillColor(TEXT_COLOR);
}

export function setBoldFont(doc: PDFDocument, size = 12): void {
  doc.font('NotoSansBold').fontSize(size).fillColor(TEXT_COLOR);
}

export function drawFrame(doc: PDFDocument): void {
  doc
    .lineWidth(0.7)
    .strokeColor(BORDER_COLOR)
    .rect(
      FRAME_MARGIN_PT,
      FRAME_MARGIN_PT,
      PAGE_WIDTH_PT - FRAME_MARGIN_PT * 2,
      PAGE_HEIGHT_PT - FRAME_MARGIN_PT * 2
    )
    .stroke();
}

export function drawTopTitle(doc: PDFDocument, text: string): void {
  const titleY = FRAME_MARGIN_PT + 10;
  doc.font('NotoSansBold').fontSize(16).fillColor(TITLE_COLOR);
  doc.text(text, 0, titleY, { align: 'center', width: PAGE_WIDTH_PT });

  const lineY = titleY + 18;
  doc
    .lineWidth(1)
    .strokeColor(TITLE_COLOR)
    .moveTo(FRAME_MARGIN_PT + 14, lineY)
    .lineTo(PAGE_WIDTH_PT - FRAME_MARGIN_PT - 14, lineY)
    .stroke();
}

export function drawFooterTriptych(doc: PDFDocument, content: FooterTriptych): void {
  const boxHeight = 20;
  const boxWidth = 140;
  const gap = 10;
  const totalWidth = boxWidth * 3 + gap * 2;
  const startX = (PAGE_WIDTH_PT - totalWidth) / 2;
  const y = PAGE_HEIGHT_PT - FRAME_MARGIN_PT - boxHeight - 6;

  const boxes = [
    { text: content.left, x: startX },
    { text: content.center, x: startX + boxWidth + gap },
    { text: content.right, x: startX + (boxWidth + gap) * 2 },
  ];

  boxes.forEach((box) => {
    doc
      .lineWidth(0.6)
      .strokeColor(BORDER_COLOR)
      .rect(box.x, y, boxWidth, boxHeight)
      .stroke();

    doc.font('NotoSans').fontSize(8).fillColor(FOOTER_TEXT);
    doc.text(box.text, box.x, y + 5, { width: boxWidth, align: 'center' });
  });
}

export function drawLabelBox(doc: PDFDocument, text: string, x: number, y: number, width: number): void {
  const height = 18;
  doc
    .lineWidth(0.6)
    .strokeColor(BORDER_COLOR)
    .fillColor('#FFFFFF')
    .rect(x, y, width, height)
    .fillAndStroke();

  doc.font('NotoSans').fontSize(8.5).fillColor(TEXT_COLOR);
  doc.text(text, x + 6, y + 4, { width: width - 12, align: 'left' });
}

export function drawKeyValueTable(
  doc: PDFDocument,
  x: number,
  y: number,
  width: number,
  rows: Array<{ label: string; value: string }>
): void {
  const rowHeight = 20;
  const labelWidth = Math.round(width * 0.45);
  const valueWidth = width - labelWidth;

  rows.forEach((row, index) => {
    const rowY = y + index * rowHeight;
    doc
      .lineWidth(0.6)
      .strokeColor(BORDER_COLOR)
      .rect(x, rowY, labelWidth, rowHeight)
      .stroke();

    doc
      .lineWidth(0.6)
      .strokeColor(BORDER_COLOR)
      .rect(x + labelWidth, rowY, valueWidth, rowHeight)
      .stroke();

    doc.font('NotoSansBold').fontSize(9).fillColor(TEXT_COLOR);
    doc.text(row.label, x + 6, rowY + 5, { width: labelWidth - 12 });

    doc.font('NotoSans').fontSize(9).fillColor(TEXT_COLOR);
    doc.text(row.value, x + labelWidth + 6, rowY + 5, { width: valueWidth - 12 });
  });
}

export function mmToPt(mm: number): number {
  return (mm / 25.4) * 72;
}

export function ptToMm(pt: number): number {
  return (pt / 72) * 25.4;
}
