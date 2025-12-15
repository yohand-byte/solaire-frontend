#!/usr/bin/env bash
set -euo pipefail

GREEN="\033[32m"; RED="\033[31m"; YELLOW="\033[33m"; NC="\033[0m"

log(){ printf "${GREEN}✅ %s${NC}\n" "$1"; }
warn(){ printf "${YELLOW}⚠️  %s${NC}\n" "$1"; }
err(){ printf "${RED}❌ %s${NC}\n" "$1"; }

read_input(){
  local prompt var
  prompt="$1"; var="$2"
  read -rp "$prompt" "$var"
}

need_install_msg(){
  warn "Installe l’outil manquant avec Homebrew :"
  warn "  brew install $1"
}

echo "=== SPRINT 1 SETUP – SOLAIRE FACILE ==="

# 1) Vérifier outils
missing=0
for cmd in node npm firebase gcloud git; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    err "$cmd manquant"
    need_install_msg "$cmd"
    missing=1
  else
    ver="$($cmd --version 2>/dev/null || true)"
    log "$cmd: ${ver:-OK}"
  fi
done
if [ "$missing" -ne 0 ]; then
  err "Installe les outils manquants puis relance."
  exit 1
fi

# 4) Auth GitHub
read_input "? GitHub username: " GH_USER
read_input "? GitHub token (ghp_...): " GH_TOKEN

# 2) Firebase login
warn "Ouverture login Firebase (--no-localhost)..."
if ! firebase login --no-localhost; then
  err "Firebase login échoué. Relance la commande ci-dessus puis relance le script."
  exit 1
fi
if firebase projects:list >/dev/null 2>&1; then
  log "Firebase: projects list OK"
else
  err "Impossible de lister les projets Firebase."
  exit 1
fi

# 3) GCP login + project
warn "Ouverture login gcloud..."
if ! gcloud auth login; then
  err "gcloud auth login échoué."
  exit 1
fi
read_input "? GCP Project ID (ex: solaire-frontend): " GCP_PROJECT
if ! gcloud config set project "$GCP_PROJECT"; then
  err "Impossible de set le projet gcloud."
  exit 1
fi
if gcloud projects list >/dev/null 2>&1; then
  log "GCP: projects list OK (project set: $GCP_PROJECT)"
else
  err "Impossible de lister les projets GCP."
  exit 1
fi

# 5) Tester Firestore
if firebase firestore:inspect >/dev/null 2>&1; then
  log "Firestore access OK"
else
  err "Firestore inaccessible (firebase firestore:inspect)."
  exit 1
fi

# 6) Tester GCP access
if gcloud run list >/dev/null 2>&1; then
  log "Cloud Run access OK"
else
  err "Cloud Run inaccessible (gcloud run list)."
  exit 1
fi
if gcloud iam service-accounts list >/dev/null 2>&1; then
  log "IAM service accounts list OK"
else
  warn "IAM SA list a échoué (peut dépendre des permissions)."
fi

# 7) Cloner les repos
for repo in solaire-api solaire-frontend; do
  target="$repo"
  if [ -d "$target" ]; then
    warn "Repo $target existe déjà, skip clone."
  else
    url="https://$GH_USER:$GH_TOKEN@github.com/$GH_USER/$repo.git"
    if git ls-remote "$url" >/dev/null 2>&1; then
      log "Accès GitHub OK pour $repo"
      git clone "$url" "$target"
      log "Cloné: $target"
    else
      err "Accès GitHub KO pour $repo. Vérifie username/token ou URL."
      exit 1
    fi
  fi
done

# 8) Tester Cloud Run service describe
read_input "? Cloud Run service name (default: solaire-api): " CR_SERVICE
CR_SERVICE=${CR_SERVICE:-solaire-api}
read_input "? Region (default: europe-west1): " CR_REGION
CR_REGION=${CR_REGION:-europe-west1}

if gcloud run services describe "$CR_SERVICE" --region "$CR_REGION" >/dev/null 2>&1; then
  log "Cloud Run service $CR_SERVICE ($CR_REGION) accessible"
else
  warn "Impossible de décrire le service $CR_SERVICE ($CR_REGION). Vérifie nom/région/permissions."
fi

# 9) Résumé final
cat <<EOF

=========================================
✅ Node/npm/firebase/gcloud/git: OK
✅ Firebase: Logged in (projects list OK)
✅ Google Cloud: Logged in (project: $GCP_PROJECT)
✅ GitHub: Authenticated (username: $GH_USER)
✅ Firestore: Accessible
✅ Cloud Run: Accessible (services list OK)
✅ Repos clonés: solaire-api, solaire-frontend

🎉 ALL SYSTEMS GO! READY FOR SPRINT 1! 🚀

Next steps:
1. cd solaire-api
2. npm install
3. Implémente Sprint 1 (voir BRIEF-POUR-CODEX.md / CODEX-SOLAIRE-FACILE.md)
4. Firestore Rules (section 4.2)
5. API /convert + routes installateurs
6. Tests sécurité (installer ne voit que ses données)
=========================================
EOF
