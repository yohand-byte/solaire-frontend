/**
 * DP Mairie Generator - Module d'intégration Frontend
 * 
 * Ce fichier s'intègre avec le formulaire existant sur:
 * https://solaire-dp-generator-29459740400.europe-west1.run.app/dp/
 * 
 * Usage:
 * 1. Inclure ce script dans votre page HTML
 * 2. Appeler DPGenerator.init() au chargement
 * 3. Le formulaire existant sera automatiquement connecté à l'API
 */

const DPGenerator = {
    // Configuration
    config: {
        // Surcharge possible via window.DP_API_URL (plein host)
        // Sinon reste sur /dp pour le proxy same-origin
        apiBaseUrl: (typeof window !== 'undefined' && window.DP_API_URL)
            ? window.DP_API_URL
            : '/dp',
        googleApiKey: 'AIzaSyBzJcyMPtHONndrh5EalTIH2ToD_nwBjMQ',
        timeout: 120000, // 2 minutes pour la génération
        panelPowerOptions: [375, 410, 425, 500, 550, 600],
        panelSurfaceUnit: 1.8, // m² par panneau (fixe, non API)
    },

    // État
    state: {
        isGenerating: false,
        currentStep: 0,
        previewData: null,
        lastDerived: null,
    },

    /**
     * Initialise le générateur et connecte le formulaire
     */
    init() {
        console.log('🚀 DP Generator initialized');
        this.bindFormEvents();
        this.bindPreviewEvents();
        this.setupPanelPowerDropdown();
        this.setupDerivedFields();
    },

    /**
     * Retourne l'URL base des endpoints /dp (gère DP_API_URL ou chemin relatif)
     */
    resolveApiBase() {
        const base = this.config.apiBaseUrl || '';
        const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
        if (normalized.toLowerCase().endsWith('/dp')) {
            return normalized;
        }
        // Pas de suffixe /dp -> on l'ajoute pour conserver la compatibilité proxy same-origin
        return `${normalized || ''}/dp`;
    },

    /**
     * Connecte les événements du formulaire
     */
    bindFormEvents() {
        // Bouton de génération principal
        const generateBtn = document.querySelector('[data-action="generate"]') 
            || document.querySelector('button[type="submit"]')
            || document.getElementById('generateBtn');
        
        if (generateBtn) {
            generateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleGenerate();
            });
        }

        // Logo drag & drop
        const logoDropzone = document.querySelector('[data-dropzone="logo"]')
            || document.querySelector('.logo-dropzone');
        
        if (logoDropzone) {
            this.setupLogoDropzone(logoDropzone);
        }
    },

    /**
     * Normalise le champ de puissance par panneau en dropdown borné
     */
    setupPanelPowerDropdown() {
        const candidates = [
            document.querySelector('[name="puissance_panneau"]'),
            document.querySelector('[name="puissance_panneaux"]'),
            document.querySelector('#puissance_panneau'),
            document.querySelector('#puissance_panneaux'),
            document.querySelector('#puissancePanneau')
        ].filter(Boolean);
        let existing = candidates[0];

        // Si le champ n'existe pas, on le crée (frontend only)
        if (!existing) {
            const installedPowerEl = document.querySelector('[name="puissance_kwc"]') 
                || document.querySelector('#puissance')
                || document.querySelector('#puissance_kwc');
            const wrapper = document.createElement('div');
            wrapper.style.marginTop = '8px';
            const label = document.createElement('label');
            label.textContent = 'Puissance par panneau (Wc)';
            label.style.display = 'block';
            label.style.fontWeight = '600';
            label.style.marginBottom = '4px';
            const select = document.createElement('select');
            select.name = 'puissance_panneau';
            select.id = 'puissance_panneau';
            select.style.width = installedPowerEl && installedPowerEl.style.width ? installedPowerEl.style.width : '100%';
            wrapper.appendChild(label);
            wrapper.appendChild(select);
            if (installedPowerEl && installedPowerEl.parentNode) {
                installedPowerEl.parentNode.insertBefore(wrapper, installedPowerEl.nextSibling);
            } else {
                document.body.appendChild(wrapper);
            }
            existing = select;
        }

        let selectEl = existing;
        if (existing.tagName.toLowerCase() !== 'select') {
            // Remplace l'input par un select en conservant name/id/classes/placeholder
            selectEl = document.createElement('select');
            selectEl.name = existing.name;
            selectEl.id = existing.id || existing.name || '';
            selectEl.className = existing.className;
            if (existing.placeholder) selectEl.setAttribute('placeholder', existing.placeholder);
            existing.parentNode.replaceChild(selectEl, existing);
        }

        // Populate options (on vide pour forcer les valeurs autorisées)
        selectEl.innerHTML = '';
        this.config.panelPowerOptions.forEach((value, idx) => {
            const opt = document.createElement('option');
            opt.value = String(value);
            opt.textContent = `${value} Wc`;
            if (idx === 0) opt.selected = true;
            selectEl.appendChild(opt);
        });
    },

    /**
     * Met en place les calculs automatiques (nombre de panneaux + surface)
     */
    setupDerivedFields() {
        const installedPowerEl = document.querySelector('[name="puissance_kwc"]') 
            || document.querySelector('#puissance')
            || document.querySelector('#puissance_kwc');
        const panelPowerEl = document.querySelector('[name="puissance_panneau"]')
            || document.querySelector('[name="puissance_panneaux"]')
            || document.querySelector('#puissance_panneau')
            || document.querySelector('#puissance_panneaux')
            || document.querySelector('#puissancePanneau');
        const nbPanelsEl = document.querySelector('[name="nombre_panneaux"]') 
            || document.querySelector('#nombrePanneaux');
        const surfacePanelsEl = document.querySelector('[name="surface_panneaux"]') 
            || document.querySelector('#surfacePanneaux');

        // Rend lecture seule les champs calculés si présents
        if (nbPanelsEl) nbPanelsEl.readOnly = true;
        if (surfacePanelsEl) surfacePanelsEl.readOnly = true;

        const recalc = () => {
            this.computeDerivedValues({
                installedPowerEl,
                panelPowerEl,
                nbPanelsEl,
                surfacePanelsEl,
                updateFields: true,
            });
        };

        if (installedPowerEl) {
            installedPowerEl.addEventListener('input', recalc);
            installedPowerEl.addEventListener('change', recalc);
        }
        if (panelPowerEl) {
            panelPowerEl.addEventListener('change', recalc);
            panelPowerEl.addEventListener('input', recalc);
        }

        // Calcul initial
        recalc();
    },

    /**
     * Calcule les champs dérivés (nombre/surface) avec sauvegarde en état
     * @param {Object} opts 
     * @returns {Object|null} {kw, panelPower, nb, surface}
     */
    computeDerivedValues(opts = {}) {
        const {
            installedPowerEl,
            panelPowerEl,
            nbPanelsEl,
            surfacePanelsEl,
            updateFields = true,
        } = opts;

        const installedEl = installedPowerEl || document.querySelector('[name="puissance_kwc"]') 
            || document.querySelector('#puissance')
            || document.querySelector('#puissance_kwc');
        const panelEl = panelPowerEl || document.querySelector('[name="puissance_panneau"]')
            || document.querySelector('[name="puissance_panneaux"]')
            || document.querySelector('#puissance_panneau')
            || document.querySelector('#puissance_panneaux')
            || document.querySelector('#puissancePanneau');
        const nbEl = nbPanelsEl || document.querySelector('[name="nombre_panneaux"]') 
            || document.querySelector('#nombrePanneaux');
        const surfaceEl = surfacePanelsEl || document.querySelector('[name="surface_panneaux"]') 
            || document.querySelector('#surfacePanneaux');

        const kw = parseFloat(installedEl?.value || '0');
        const panelPower = panelEl
            ? parseFloat(panelEl.value || '0')
            : (this.config.panelPowerOptions?.[0] || 0);

        if (!kw || kw <= 0 || !panelPower || panelPower <= 0) {
            if (updateFields) {
                if (nbEl) nbEl.value = '';
                if (surfaceEl) surfaceEl.value = '';
            }
            this.state.lastDerived = null;
            return null;
        }

        const nb = Math.ceil((kw * 1000) / panelPower);
        const surface = nb * this.config.panelSurfaceUnit;

        if (updateFields) {
            if (nbEl) nbEl.value = isFinite(nb) ? nb : '';
            if (surfaceEl) surfaceEl.value = isFinite(surface) ? surface.toFixed(2) : '';
        }

        this.state.lastDerived = {
            kw,
            panelPower,
            nb,
            surface,
        };
        return this.state.lastDerived;
    },

    /**
     * Configure la zone de drag & drop pour le logo
     */
    setupLogoDropzone(dropzone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
            dropzone.addEventListener(event, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(event => {
            dropzone.addEventListener(event, () => {
                dropzone.classList.add('drag-active');
            });
        });

        ['dragleave', 'drop'].forEach(event => {
            dropzone.addEventListener(event, () => {
                dropzone.classList.remove('drag-active');
            });
        });

        dropzone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleLogoUpload(files[0]);
            }
        });

        // Input file classique
        const fileInput = dropzone.querySelector('input[type="file"]');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleLogoUpload(e.target.files[0]);
                }
            });
        }
    },

    /**
     * Gère l'upload du logo
     */
    handleLogoUpload(file) {
        if (!file.type.match(/image\/(png|jpeg|jpg|svg)/)) {
            this.showNotification('Format invalide. Utilisez PNG, JPG ou SVG.', 'error');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            this.showNotification('Fichier trop volumineux (max 2 Mo)', 'error');
            return;
        }

        // Stocker le fichier
        this.state.logoFile = file;

        // Prévisualisation
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.querySelector('.logo-preview img')
                || document.getElementById('logoPreview');
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);

        this.showNotification('Logo chargé avec succès', 'success');
    },

    /**
     * Prévisualise les données pour une adresse
     */
    async previewAddress(address, codePostal, ville) {
        try {
            const formData = new FormData();
            formData.append('adresse', address);
            formData.append('code_postal', codePostal);
            formData.append('ville', ville);

            const apiBase = this.resolveApiBase();
            const response = await fetch(`${apiBase}/preview`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            this.state.previewData = data;
            this.updatePreviewUI(data);
            
            return data;
        } catch (error) {
            console.error('Erreur prévisualisation:', error);
            this.showNotification('Impossible de prévisualiser l\'adresse', 'error');
            throw error;
        }
    },

    /**
     * Met à jour l'UI avec les données prévisualisées
     */
    updatePreviewUI(data) {
        // Cadastre
        if (data.cadastre) {
            const parcelleInput = document.querySelector('[name="parcelle"]');
            const sectionInput = document.querySelector('[name="section"]');
            
            if (parcelleInput && !parcelleInput.value) {
                parcelleInput.value = data.cadastre.numero || '';
            }
            if (sectionInput && !sectionInput.value) {
                sectionInput.value = data.cadastre.section || '';
            }

            // Afficher info cadastrale
            const cadastreInfo = document.querySelector('.cadastre-info');
            if (cadastreInfo) {
                cadastreInfo.innerHTML = `
                    <span>Parcelle: ${data.cadastre.numero || 'N/A'}</span> - 
                    <span>Section: ${data.cadastre.section || 'N/A'}</span> - 
                    <span>Commune: ${data.geocoding?.city || ''}</span>
                `;
            }
        }

        // Surface terrain
        if (data.cadastre?.contenance) {
            const surfaceInput = document.querySelector('[name="surface_terrain"]');
            if (surfaceInput && !surfaceInput.value) {
                surfaceInput.value = data.cadastre.contenance;
            }
        }

        // Potentiel solaire
        if (data.solar) {
            const solarInfo = document.querySelector('.solar-info');
            if (solarInfo) {
                solarInfo.innerHTML = `
                    <span>Potentiel: ${data.solar.max_panels || 'N/A'} panneaux max</span>
                    <span>Surface toit: ${Math.round(data.solar.whole_roof_area_m2 || 0)} m²</span>
                `;
            }
        }

        // Street View disponible
        const svIndicator = document.querySelector('.streetview-indicator');
        if (svIndicator) {
            svIndicator.classList.toggle('available', data.streetview_available);
            svIndicator.textContent = data.streetview_available 
                ? '✓ Street View disponible' 
                : '⚠ Street View non disponible';
        }
    },

    /**
     * Collecte les données du formulaire
     */
    collectFormData() {
        const getValue = (selector) => {
            const el = document.querySelector(selector);
            return el ? el.value : '';
        };

        const derived = this.state.lastDerived || {};

        return {
            // Adresse
            adresse: getValue('[name="adresse"]') || getValue('#adresse'),
            codePostal: getValue('[name="code_postal"]') || getValue('#codePostal'),
            ville: getValue('[name="ville"]') || getValue('#ville'),
            
            // Société
            societe: getValue('[name="societe"]') || getValue('#societe'),
            maitreOuvrage: getValue('[name="maitre_ouvrage"]') || getValue('#maitreOuvrage'),
            
            // Technique
            puissance: parseFloat(getValue('[name="puissance_kwc"]') || getValue('#puissance')) || 0,
            surfacePanneaux: parseFloat(getValue('[name="surface_panneaux"]') || getValue('#surfacePanneaux')) 
                || derived.surface 
                || 0,
            nombrePanneaux: parseInt(getValue('[name="nombre_panneaux"]') || getValue('#nombrePanneaux')) 
                || derived.nb 
                || 0,
            orientation: getValue('[name="orientation"]') || getValue('#orientation') || 'SUD',
            typeCouverture: getValue('[name="type_couverture"]') || getValue('#typeCouverture') || 'Tuiles',
            
            // Surfaces
            surfaceTerrain: parseFloat(getValue('[name="surface_terrain"]') || getValue('#surfaceTerrain')) || 0,
            surfacePlancher: parseFloat(getValue('[name="surface_plancher"]') || getValue('#surfacePlancher')) || 0,
            
            // Cadastre
            parcelle: getValue('[name="parcelle"]') || getValue('#parcelle'),
            section: getValue('[name="section"]') || getValue('#section'),
            
            // Logo
            logo: this.state.logoFile || null,
        };
    },

    /**
     * Valide les données du formulaire
     */
    validateFormData(data) {
        const errors = [];

        if (!data.adresse) errors.push('Adresse requise');
        if (!data.codePostal) errors.push('Code postal requis');
        if (!data.ville) errors.push('Ville requise');
        if (!data.societe) errors.push('Nom de société requis');
        if (!data.maitreOuvrage) errors.push('Maître d\'ouvrage requis');
        if (!data.puissance || data.puissance <= 0) errors.push('Puissance invalide');
        const nombreFieldExists = Boolean(
            document.querySelector('[name="nombre_panneaux"]') 
            || document.querySelector('#nombrePanneaux')
        );
        if (nombreFieldExists && (!data.nombrePanneaux || data.nombrePanneaux <= 0)) {
            errors.push('Nombre de panneaux invalide');
        }

        return errors;
    },

    /**
     * Gère la génération du DP
     */
    async handleGenerate() {
        if (this.state.isGenerating) {
            this.showNotification('Génération déjà en cours...', 'warning');
            return;
        }

        // Force une mise à jour des champs dérivés avant collecte/validation
        this.computeDerivedValues({ updateFields: true });

        // Collecter les données
        const formData = this.collectFormData();
        
        // Valider
        const errors = this.validateFormData(formData);
        if (errors.length > 0) {
            this.showNotification(errors.join(', '), 'error');
            return;
        }

        // Démarrer la génération
        this.state.isGenerating = true;
        this.showProgress(true);
        this.updateProgress(0, 'Initialisation...');

        try {
            // Construire le FormData pour l'API
            const apiFormData = new FormData();
            apiFormData.append('adresse', formData.adresse);
            apiFormData.append('code_postal', formData.codePostal);
            apiFormData.append('ville', formData.ville);
            apiFormData.append('societe', formData.societe);
            apiFormData.append('maitre_ouvrage', formData.maitreOuvrage);
            apiFormData.append('puissance_kwc', formData.puissance.toString());
            apiFormData.append('surface_panneaux', formData.surfacePanneaux.toString());
            apiFormData.append('nombre_panneaux', formData.nombrePanneaux.toString());
            apiFormData.append('orientation', formData.orientation);
            apiFormData.append('type_couverture', formData.typeCouverture);
            
            if (formData.surfaceTerrain) {
                apiFormData.append('surface_terrain', formData.surfaceTerrain.toString());
            }
            if (formData.surfacePlancher) {
                apiFormData.append('surface_plancher', formData.surfacePlancher.toString());
            }
            if (formData.parcelle) {
                apiFormData.append('parcelle', formData.parcelle);
            }
            if (formData.section) {
                apiFormData.append('section', formData.section);
            }
            if (formData.logo) {
                apiFormData.append('logo', formData.logo);
            }

            this.updateProgress(10, 'Envoi des données...');

            // Appeler l'API
            const apiBase = this.resolveApiBase();
            const response = await fetch(`${apiBase}/generate`, {
                method: 'POST',
                body: apiFormData,
            });

            this.updateProgress(50, 'Génération du PDF...');

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Erreur de génération');
            }

            this.updateProgress(90, 'Finalisation...');

            // Succès !
            this.updateProgress(100, 'Terminé !');
            
            setTimeout(() => {
                this.showProgress(false);
                this.showNotification('Dossier DP généré avec succès !', 'success');
                
                // Ouvrir le PDF
                if (result.pdf_url) {
                    window.open(result.pdf_url, '_blank');
                }
                
                // Afficher le lien de téléchargement
                this.showDownloadLink(result.pdf_url, result.pdf_id);
            }, 500);

        } catch (error) {
            console.error('Erreur génération:', error);
            this.showProgress(false);
            this.showNotification(`Erreur: ${error.message}`, 'error');
        } finally {
            this.state.isGenerating = false;
        }
    },

    /**
     * Affiche/masque la barre de progression
     */
    showProgress(show) {
        const progressContainer = document.querySelector('.progress-container')
            || document.getElementById('progressContainer');
        
        if (progressContainer) {
            progressContainer.style.display = show ? 'block' : 'none';
        }

        const generateBtn = document.querySelector('[data-action="generate"]')
            || document.querySelector('button[type="submit"]');
        
        if (generateBtn) {
            generateBtn.disabled = show;
            generateBtn.textContent = show ? 'Génération en cours...' : 'Générer la DP Mairie';
        }
    },

    /**
     * Met à jour la progression
     */
    updateProgress(percent, message) {
        const progressBar = document.querySelector('.progress-bar')
            || document.getElementById('progressBar');
        const progressText = document.querySelector('.progress-text')
            || document.getElementById('progressText');

        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        }
        if (progressText) {
            progressText.textContent = message;
        }
    },

    /**
     * Affiche le lien de téléchargement
     */
    showDownloadLink(url, id) {
        const container = document.querySelector('.download-container')
            || document.getElementById('downloadContainer');
        
        if (container) {
            container.innerHTML = `
                <div class="download-success">
                    <h3>✅ Dossier DP généré</h3>
                    <a href="${url}" target="_blank" class="download-btn">
                        📥 Télécharger le PDF
                    </a>
                    <p class="download-id">ID: ${id}</p>
                </div>
            `;
            container.style.display = 'block';
        }
    },

    /**
     * Affiche une notification
     */
    showNotification(message, type = 'info') {
        // Chercher un conteneur de notifications existant ou en créer un
        let container = document.querySelector('.notifications');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notifications';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
            `;
            document.body.appendChild(container);
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            padding: 12px 20px;
            margin-bottom: 10px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
        `;
        notification.textContent = message;

        container.appendChild(notification);

        // Auto-dismiss après 5 secondes
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    },

    /**
     * Événements de prévisualisation
     */
    bindPreviewEvents() {
        // Déclencher la prévisualisation quand l'adresse change
        const addressInputs = ['[name="adresse"]', '[name="code_postal"]', '[name="ville"]'];
        
        addressInputs.forEach(selector => {
            const input = document.querySelector(selector);
            if (input) {
                input.addEventListener('blur', () => this.triggerPreview());
            }
        });
    },

    /**
     * Déclenche la prévisualisation
     */
    async triggerPreview() {
        const adresse = document.querySelector('[name="adresse"]')?.value;
        const cp = document.querySelector('[name="code_postal"]')?.value;
        const ville = document.querySelector('[name="ville"]')?.value;

        if (adresse && cp && ville) {
            try {
                await this.previewAddress(adresse, cp, ville);
            } catch (e) {
                // Erreur silencieuse pour la preview
            }
        }
    }
};

// CSS pour les animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    .drag-active {
        border-color: #007bff !important;
        background-color: rgba(0, 123, 255, 0.1) !important;
    }
`;
document.head.appendChild(style);

// Auto-init au chargement
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window !== 'undefined' && window.DP_GENERATOR_SKIP) {
        console.info('DPGenerator auto-init désactivé (DP_GENERATOR_SKIP=true)');
        return;
    }
    DPGenerator.init();
});

// Export pour usage module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DPGenerator;
}
