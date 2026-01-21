const express = require('express');
const app = express();
const { requireApiToken, storage, BUCKET_NAME, db, admin } = require('./middleware');

// Existing cerfa/generate endpoint
app.post(['/cerfa/generate', '/api/cerfa/generate'], requireApiToken, async (req, res) => {
  // ... existing code ...
});

// New signature upload endpoint added AFTER cerfa/generate endpoint
app.post(['/projects/:id/signature', '/api/projects/:id/signature'], requireApiToken, async (req, res) => {
  try {
    const { signatureDataUrl } = req.body;
    if (!signatureDataUrl) return res.status(400).json({ error: 'signatureDataUrl requis' });
    
    const base64Data = signatureDataUrl.replace(/^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    const fileName = `signature_${req.params.id}_${Date.now()}.png`;
    const filePath = `signatures/${req.params.id}/${fileName}`;
    
    const file = storage.bucket(BUCKET_NAME).file(filePath);
    await file.save(imageBuffer, { metadata: { contentType: 'image/png' } });
    await file.makePublic();
    
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filePath}`;
    
    await db.collection('projects').doc(req.params.id).update({
      signatureUrl: publicUrl,
      signatureUploadedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ ok: true, message: 'Signature uploadee', url: publicUrl });
    
  } catch (err) {
    console.error('Upload signature error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;
