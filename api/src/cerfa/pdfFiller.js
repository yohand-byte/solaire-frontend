const { StandardFonts, rgb } = require('pdf-lib');

class PDFFiller {
  async fillCERFA(pdfDoc, project, installer, parcelle) {
    const form = pdfDoc.getForm();
    
    const addr = project.beneficiary.address;
    const streetMatch = addr.street.match(/^\d+[A-Z]?/);
    const streetNum = streetMatch ? streetMatch[0] : '';
    const streetName = addr.street.replace(/^\d+[A-Z]?\s*/, '');
    
    const installerStreetNum = installer.address.street.split(' ')[0];
    const installerStreetName = installer.address.street.replace(/^\d+\s*/, '');
    const emailParts = installer.contact.email.split('@');
    const dateStr = new Date().toLocaleDateString('fr-FR').replace(/\//g, '');
    
    const fields = {
      'D2D_denomination': installer.company,
      'D2R_raison': installer.legalName || installer.company,
      'D2S_siret': installer.siret,
      'D2J_type': installer.companyType || 'SASU',
      'D2N_nom': installer.contact.lastName,
      'D2P_prenom': installer.contact.firstName,
      'D3N_numero': installerStreetNum,
      'D3V_voie': installerStreetName,
      'D3L_localite': installer.address.city,
      'D3C_code': installer.address.postalCode,
      'D3T_telephone': installer.contact.phone,
      'D5GE1_email': emailParts[0],
      'D5GE2_email': emailParts[1],
      'T2Q_numero': streetNum,
      'T2V_voie': streetName,
      'T2L_localite': addr.city.toUpperCase(),
      'T2C_code': addr.postalCode,
      'T2F_prefixe': parcelle.prefix || '000',
      'T2S_section': parcelle.section,
      'T2N_numero': parcelle.numero,
      'T2T_superficie': parcelle.superficie.toString(),
      'D5T_total': parcelle.superficie.toString(),
      'C2ZD1_description': project.description || 'Installation de panneaux photovoltaiques sur toiture',
      'C2ZP1_crete': project.installation?.powerKwc?.toString() || '',
      'C2ZR1_destination': 'Autoconsommation avec revente surplus',
      'E1L_lieu': installer.address.city,
      'E1D_date': dateStr
    };
    
    const checkboxes = {
      'C2ZB1_existante': true,
      'C2ZI1_agrivoltaique': true,
      'D5A_acceptation': true,
      'T3B_CUnc': true,
      'T3S_lotnc': true,
      'T3T_ZACnc': true,
      'T3E_AFUnc': true,
      'T3F_PUPnc': true
    };
    
    for (const [name, value] of Object.entries(fields)) {
      try { form.getTextField(name).setText(String(value)); } catch (err) {}
    }
    
    for (const [name, value] of Object.entries(checkboxes)) {
      try {
        const field = form.getCheckBox(name);
        if (value) field.check(); else field.uncheck();
      } catch (err) {}
    }
    
    return pdfDoc;
  }
}

module.exports = PDFFiller;
