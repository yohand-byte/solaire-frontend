// ═══════════════════════════════════════════════════════════
// CERFA ENDPOINTS
// ═══════════════════════════════════════════════════════════
const CERFAService = require('./cerfa-service');

app.post(['/cadastre/detect', '/api/cadastre/detect'], requireApiToken, async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) return res.status(400).json({ error: 'Adresse requise' });
    
    const cerfaService = new CERFAService(GOOGLE_API_KEY);
    const result = await cerfaService.detectParcelles(address);
    
    res.json({ ok: true, parcelles: result.parcelles, coords: result.coords });
  } catch (err) {
    console.error('Cadastre detect error:', err);
    res.status(500).json({ error: err.message });
  }
});