const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const PDFFiller = require('./pdfFiller');
const fetch = require('node-fetch');

class CERFAGenerator {
  constructor(templatePath) {
    this.templatePath = templatePath;
    this.pdfFiller = new PDFFiller();
  }

  async generate(project, installer, parcelle, signatureUrl = null, tamponUrl = null) {
    const templateBytes = await fs.readFile(this.templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    
    await this.pdfFiller.fillCERFA(pdfDoc, project, installer, parcelle);
    
    if (signatureUrl) {
      await this.addImage(pdfDoc, signatureUrl, 400, 120, 150, 50);
    }
    
    if (tamponUrl) {
      await this.addImage(pdfDoc, tamponUrl, 100, 120, 100, 100);
    }
    
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  async addImage(pdfDoc, imageUrl, x, y, width, height) {
    try {
      const response = await fetch(imageUrl);
      const imageBuffer = await response.buffer();
      const image = await pdfDoc.embedPng(imageBuffer);
      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];
      lastPage.drawImage(image, { x, y, width, height });
    } catch (error) {
      console.error('Erreur addImage:', error);
    }
  }
}

module.exports = CERFAGenerator;
