// Configuration workflow détaillé Solaire Facile

const WORKFLOW_CONFIG = {
  dp: {
    label: "DP Mairie",
    steps: [
      { code: "draft", label: "En préparation" },
      { code: "sent", label: "Dossier envoyé" },
      { code: "receipt", label: "Récépissé reçu" },
      { code: "instruction", label: "En instruction" },
      { code: "approved", label: "Validé", final: true, success: true },
      { code: "rejected", label: "Refusé", final: true, success: false },
    ]
  },
  consuel: {
    label: "Consuel",
    steps: [
      { code: "preparing", label: "Préparation dossier" },
      { code: "submitted", label: "Déposé" },
      { code: "waiting", label: "En attente retour" },
      { code: "visit_scheduled", label: "Visite programmée" },
      { code: "visit_done", label: "Visite effectuée" },
      { code: "attestation_approved", label: "Attestation visée", final: true, success: true },
      { code: "attestation_rejected", label: "Attestation non visée", final: true, success: false },
    ]
  },
  enedis: {
    label: "Enedis",
    steps: [
      { code: "request_sent", label: "Demande de raccordement envoyée" },
      { code: "request_approved", label: "Demande de raccordement validée" },
      { code: "mes_scheduled", label: "MES programmée" },
      { code: "mes_done", label: "MES effectuée", final: true, success: true },
    ]
  },
  edfOa: {
    label: "EDF OA",
    steps: [
      { code: "account_created", label: "Compte producteur créé" },
      { code: "bta_received", label: "Numéro BTA reçu" },
      { code: "s21_sent", label: "Attestation S21 envoyée" },
      { code: "s21_signed", label: "Contrat S21 rempli et signé" },
      { code: "contract_received", label: "Contrat EDF OA reçu" },
      { code: "contract_signed", label: "Contrat EDF OA signé", final: true, success: true },
    ]
  }
};

// Calculer la progression en %
function calculateDetailedProgress(workflow) {
  const stages = ['dp', 'consuel', 'enedis', 'edfOa'];
  let totalSteps = 0;
  let completedSteps = 0;

  stages.forEach(stage => {
    const config = WORKFLOW_CONFIG[stage];
    const stageData = workflow?.[stage] || {};
    const currentStep = stageData.currentStep || 'pending';
    
    const stepIndex = config.steps.findIndex(s => s.code === currentStep);
    const successStep = config.steps.find(s => s.final && s.success);
    const successIndex = config.steps.findIndex(s => s.code === successStep?.code);
    
    totalSteps += successIndex + 1;
    if (stepIndex >= 0) {
      completedSteps += Math.min(stepIndex + 1, successIndex + 1);
    }
  });

  return Math.round((completedSteps / totalSteps) * 100);
}

// Vérifier si une étape est complète (atteint final success)
function isStageComplete(workflow, stage) {
  const config = WORKFLOW_CONFIG[stage];
  const stageData = workflow?.[stage] || {};
  const currentStep = stageData.currentStep;
  const stepConfig = config.steps.find(s => s.code === currentStep);
  return stepConfig?.final && stepConfig?.success;
}

module.exports = { WORKFLOW_CONFIG, calculateDetailedProgress, isStageComplete };
