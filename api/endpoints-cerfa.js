// ═══════════════════════════════════════════════════════════
// ENDPOINTS CERFA - A AJOUTER DANS server.js
// ═══════════════════════════════════════════════════════════

const CERFAService = require('./src/cerfa');
const fetch = require('node-fetch');

// ENDPOINT 1: Détecter les parcelles cadastrales depuis une adresse
app.post(['/cadastre/detect', '/api/cadastre/detect'], requireApiToken, async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'Adresse requise' });
    }
    
    const cerfaService = new CERFAService(GOOGLE_API_KEY);
    const result = await cerfaService.detectParcelles(address);
    
    res.json({
      ok: true,
      address: result.address,
      coords: result.coords,
      parcelles: result.parcelles
    });
    
  } catch (err) {
    console.error('Cadastre detect error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ENDPOINT 2: Générer CERFA depuis un projet
app.post(['/cerfa/generate', '/api/cerfa/generate'], requireApiToken, async (req, res) => {
  try {
    const { projectId } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ error: 'projectId requis' });
    }
    
    console.log('Generation CERFA pour projet:', projectId);
    
    const projectDoc = await db.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) {
      return res.status(404).json({ error: 'Projet non trouve' });
    }
    const project = { id: projectDoc.id, ...projectDoc.data() };
    
    const installerId = project.installerId || 'default';
    const installerDoc = await db.collection('installers').doc(installerId).get();
    if (!installerDoc.exists) {
      return res.status(404).json({ error: 'Installateur non trouve' });
    }
    const installer = { id: installerDoc.id, ...installerDoc.data() };
    
    const parcelle = project.cadastre || {
      section: 'NC',
      numero: '0000',
      superficie: 0
    };
    
    if (!parcelle.section || parcelle.section === 'NC') {
      return res.status(400).json({ 
        error: 'Parcelle cadastrale non definie',
        message: 'Utilisez /api/cadastre/detect pour detecter les parcelles puis sauvegardez dans project.cadastre'
      });
    }
    
    const cerfaService = new CERFAService(GOOGLE_API_KEY);
    const pdfBuffer = await cerfaService.generateCERFA(
      project,
      installer,
      parcelle,
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
    
    await db.collection('projects').doc(projectId).update({
      'workflow.cerfa.status': 'completed',
      'workflow.cerfa.completedAt': admin.firestore.FieldValue.serverTimestamp(),
      'workflow.cerfa.documentUrl': publicUrl
    });
    
    res.json({
      ok: true,
      message: 'CERFA 16702-01 genere',
      filename: fileName,
      url: publicUrl,
      parcelle: parcelle
    });
    
  } catch (err) {
    console.error('CERFA Generate error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ENDPOINT 3: Upload signature client
app.post(['/projects/:id/signature', '/api/projects/:id/signature'], requireApiToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { signatureDataUrl } = req.body;
    
    if (!signatureDataUrl) {
      return res.status(400).json({ error: 'signatureDataUrl requis' });
    }
    
    const base64Data = signatureDataUrl.replace(/^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    const fileName = `signature_${projectId}_${Date.now()}.png`;
    const filePath = `signatures/${projectId}/${fileName}`;
    
    const file = storage.bucket(BUCKET_NAME).file(filePath);
    await file.save(imageBuffer, { metadata: { contentType: 'image/png' } });
    await file.makePublic();
    
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filePath}`;
    
    await db.collection('projects').doc(projectId).update({
      signatureUrl: publicUrl,
      signatureUploadedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      ok: true,
      message: 'Signature uploadee',
      url: publicUrl
    });
    
  } catch (err) {
    console.error('Upload signature error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ENDPOINT 4: Upload tampon installateur
app.post(['/installers/:id/tampon', '/api/installers/:id/tampon'], requireApiToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { tamponDataUrl } = req.body;
    
    if (!tamponDataUrl) {
      return res.status(400).json({ error: 'tamponDataUrl requis' });
    }
    
    const base64Data = tamponDataUrl.replace(/^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    const fileName = `tampon_${id}_${Date.now()}.png`;
    const filePath = `tampons/${id}/${fileName}`;
    
    const file = storage.bucket(BUCKET_NAME).file(filePath);
    await file.save(imageBuffer, { metadata: { contentType: 'image/png' } });
    await file.makePublic();
    
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filePath}`;
    
    await db.collection('installers').doc(id).update({
      tamponUrl: publicUrl,
      tamponUploadedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      ok: true,
      message: 'Tampon uploade',
      url: publicUrl
    });
    
  } catch (err) {
    console.error('Upload tampon error:', err);
    res.status(500).json({ error: err.message });
  }
});
