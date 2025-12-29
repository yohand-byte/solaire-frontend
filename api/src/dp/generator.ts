import type PDFDocument from 'pdfkit';
import {
  drawFrame,
  drawFooterTriptych,
  drawKeyValueTable,
  drawLabelBox,
  drawTopTitle,
  setBodyFont,
} from './template';

export type Dp4Data = {
  address: string;
  parcelRef: string;
  powerKw: string;
  surfaceM2: string;
  panelType: string;
  roofType: string;
  orientation: string;
  slope: string;
};

export type Dp4Assets = {
  orthoPath?: string;
};

export function renderDp4Page(doc: PDFDocument, data: Dp4Data, assets: Dp4Assets = {}): void {
  drawFrame(doc);
  drawTopTitle(doc, 'DP4 - FICHE TECHNIQUE');
  drawFooterTriptych(doc, {
    left: 'QUALIWATT',
    center: 'Echelle: 1/250',
    right: 'DP4',
  });

  const contentX = 42;
  const contentY = 90;
  const tableWidth = 300;

  setBodyFont(doc, 10);
  doc.text('Caracteristiques du projet', contentX, contentY - 18);

  const rows = [
    { label: 'Adresse', value: data.address },
    { label: 'Parcelle', value: data.parcelRef },
    { label: 'Puissance', value: data.powerKw },
    { label: 'Surface panneaux', value: data.surfaceM2 },
    { label: 'Type panneaux', value: data.panelType },
    { label: 'Type toiture', value: data.roofType },
    { label: 'Orientation', value: data.orientation },
    { label: 'Pente', value: data.slope },
  ];

  drawKeyValueTable(doc, contentX, contentY, tableWidth, rows);

  const imageX = contentX + tableWidth + 30;
  const imageY = contentY;
  const imageWidth = 180;
  const imageHeight = 180;

  drawLabelBox(doc, 'Vue toiture', imageX, imageY - 22, imageWidth);

  if (assets.orthoPath) {
    doc
      .rect(imageX, imageY, imageWidth, imageHeight)
      .strokeColor('#D1D5DB')
      .lineWidth(0.6)
      .stroke();

    doc.image(assets.orthoPath, imageX, imageY, {
      fit: [imageWidth, imageHeight],
      align: 'center',
      valign: 'center',
    });
  } else {
    doc
      .rect(imageX, imageY, imageWidth, imageHeight)
      .strokeColor('#D1D5DB')
      .lineWidth(0.6)
      .stroke();
  }
}
