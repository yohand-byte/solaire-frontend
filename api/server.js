const express = require('express');
const app = express();
// ... other imports and middleware

// cadastre/detect endpoint
app.post('/cadastre/detect', (req, res) => {
  // existing code
});

// CERFA generate endpoint
app.post(['/cerfa/generate', '/api/cerfa/generate'], requireApiToken, async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId requis' });
    
    const projectDoc = await db.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) return res.status(404).json({ error: 'Projet non trouve' });
    const project = { id: projectDoc.id, ...projectDoc.data() };
    
    const installerDoc = await db.collection('installers').doc(project.installerId).get();
    if (!installerDoc.exists) return res.status(404).json({ error: 'Installateur non trouve' });
    const installer = { id: installerDoc.id, ...installerDoc.data() };
    
    if (!project.cadastre || !project.cadastre.section) {
      return res.status(400).json({ error: 'Parcelle cadastrale non definie. Utilisez /api/cadastre/detect' });
    }
    
    const CERFAGenerator = require('./src/cerfa/cerfaGenerator');
    const templatePath = require('path').join(__dirname, 'src/cerfa/templates/cerfa_16702-01.pdf');
    const generator = new CERFAGenerator(templatePath);
    
    const pdfBuffer = await generator.generate(
      project, 
      installer, 
      project.cadastre,
      project.signatureUrl,
      installer.tamponUrl
    );
    
    const clientName = project.beneficiary?.lastName || 'client';
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `CERFA-16702-01_${clientName}_${project.reference}_${dateStr}.pdf`;
    const filePath = `documents/${projectId}/cerfa/${fileName}`;
    
    const file = storage.bucket(BUCKET_NAME).file(filePath);
    await file.save(pdfBuffer, { metadata: { contentType: 'application/pdf' } });
    await file.makePublic();
    
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filePath}`;
    
    await db.collection('documents').add({
      projectId: projectId,
      stage: 'cerfa',
      category: 'cerfa-declaration',
      filename: fileName,
      url: publicUrl,
      mimeType: 'application/pdf',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      ok: true,
      message: 'CERFA 16702-01 genere',
      filename: fileName,
      url: publicUrl
    });
    
  } catch (err) {
    console.error('CERFA Generate error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ... other routes and app.listen
