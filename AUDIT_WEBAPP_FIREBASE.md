# Audit Firebase (web.app admin/client)

## Constat immédiat
- **Routes**: SPA unique avec rewrite `** -> /index.html` (firebase.json). `/admin/login` et `/client/login` sont gérées côté React Router.
- **Config Firebase (prod)**: tirée de `.env.production`  
  - apiKey: `AIzaSyC1S2-…` (nouvelle clé restreinte)  
  - authDomain: `solaire-frontend.firebaseapp.com`  
  - projectId: `solaire-frontend`  
  - storageBucket: `solaire-frontend.firebasestorage.app`  
  - messagingSenderId: `29459740400`  
  - appId: `1:29459740400:web:2fa88c891fece254c8f435`
- **Auth attendue**:  
  - Client (`/client/login`): **magic link** (signInWithEmailLink).  
  - Admin (`/admin/login` via `src/admin/LoginAdmin.tsx`): **email + mot de passe** (signInWithEmailAndPassword), pas de magic link.
- **API consommée par le front**: `https://solaire-api-828508661560.europe-west1.run.app` (VITE_API_URL).

## Preuves (commandes exécutées)
- `firebase projects:list` (quota project solaire-frontend, token gcloud)  
  - Projets visibles: `solaire-frontend` (ID 29459740400), `solaire-admin` (294963767896).
- `firebase hosting:sites:list`  
  - Site unique: `solaire-frontend` → `https://solaire-frontend.web.app`.
- `firebase hosting:channel:list`  
  - Channel `live`, last release 2025-12-17 21:34:56, URL `https://solaire-frontend.web.app`.
- `firebase.json`  
  - Rewrites SPA, public `dist`, pas de multi-site.
- `gcloud services api-keys list --project solaire-frontend`  
  - Clés actives (restreintes referrers):  
    - `frontend-browser-rotation` (2025-12-17T20:33Z) referrers: web.app, firebaseapp.com, cloud-run master, webhook, localhost:5173.  
    - `frontend-browser-restricted` (2025-12-17T10:30Z) referrers identiques.  
    - Clé auto Firebase `solaire-frontend-web` (sans referrers, multi-services).
- `firebase hosting:channel:list` confirme live only, pas de preview configuré actuellement.

## Hypothèses / causes possibles des erreurs “api-key-expired”
1) **Mauvaise clé dans le bundle live** (ancienne clé invalidée/remplacée).  
2) **Restriction referrer manquante** (web.app / firebaseapp.com non autorisés) → rejet côté IdentityToolkit.  
3) **Mauvais projet Auth** (clé d’un autre projet) → invalid_api_key.  
4) **Magic link mal configuré** (continueUrl / domaines autorisés) côté console.

## Actions réalisées
1) **Rotation clé navigateur** (restreinte referrers) et mise à jour `.env.production`.  
2) **Déploiement Firebase Hosting prod** (2025-12-17 ~21:34 UTC) avec la nouvelle clé.  
3) **Vérification routes/auth** dans le code : client = magic link, admin = email+password.

## Actions restantes / vérifications console
- **Auth Email link** (console Firebase du projet `solaire-frontend`) :  
  - Activer “Email link (passwordless)” pour le provider Email/Password.  
  - Whitelist des domaines: `solaire-frontend.web.app`, `solaire-frontend.firebaseapp.com`.  
  - Vérifier l’URL de redirection (continueUrl) utilisée par l’app (ici l’app lit `window.location.origin`, donc web.app doit être autorisé).  
  - Pas de dynamic links explicitement utilisés dans le code.
- **Admin login** : s’assurer que les comptes admin existent (Email/Password) et ne sont pas désactivés.
- **Hosting rollback** (au besoin) :  
  - `firebase hosting:clone solaire-frontend:live solaire-frontend:rollback-<tag>` (si activé)  
  - ou redéployer une version précédente (garder l’artefact dist correspondant).
- **FireStore rules** : non auditées en détail ici; admin/client utilisent `auth` + rôles (claims) → vérifier la console / firestore.rules si blocages.

## Risques / divergences identifiés
- Plusieurs clés coexistent : s’assurer que le bundle live utilise la clé restreinte (`frontend-browser-rotation`). Toute reconstruction avec l’ancienne clé réintroduirait l’erreur.  
- Pas de channels preview configurés : tout déploiement hosting va directement en live → prévoir un channel `fix-auth` pour tests si nécessaire.
- Admin login n’est pas magic link : un mauvais mot de passe renvoie l’erreur auth classique, pas liée à la clé. Ne pas confondre.

## Quick Fix (ordre de probabilité)
1) **Mauvaise config env / mauvaise clé dans le bundle** → reconstruire avec la clé `frontend-browser-rotation` et déployer.  
2) **API key restreinte sans referrer web.app/firebaseapp.com** → ajouter referrers et regénérer la clé.  
3) **Email link non autorisé / domaines non whitelistés / continueUrl hors domaine** → activer Email Link et whitelist `https://solaire-frontend.web.app`.

## Plan de validation (admin + client)
1) `/admin/login` : login Email+Password → redirection dashboard.  
2) `/client/login` : saisir email, recevoir magic link, ouvrir sur même browser → connexion OK.  
3) Vérifier absence d’erreur `auth/api-key-expired` dans la console.  
4) Vérifier accès Firestore (lectures client) selon règles/claims.

## Commandes utiles (avec quota project)
- Listing projets :  
  `GOOGLE_CLOUD_QUOTA_PROJECT=solaire-frontend firebase projects:list --token "$(gcloud auth print-access-token)"`
- Sites / channels :  
  `GOOGLE_CLOUD_QUOTA_PROJECT=solaire-frontend firebase hosting:sites:list --token "$(gcloud auth print-access-token)"`  
  `GOOGLE_CLOUD_QUOTA_PROJECT=solaire-frontend firebase hosting:channel:list --token "$(gcloud auth print-access-token)"`
- API keys :  
  `gcloud services api-keys list --project solaire-frontend`  
  `gcloud services api-keys describe <KEY_ID> --project solaire-frontend`
- Rollback hosting (si activé) :  
  `firebase hosting:clone solaire-frontend:live solaire-frontend:rollback-<tag>`  
  ou redeploiement d’un build précédent.

## État actuel (à la date du présent audit)
- Bundle web.app construit avec `.env.production` ci-dessus.  
- Clé utilisée : `frontend-browser-rotation` (referrers OK).  
- Un seul site hosting (`solaire-frontend`). Pas de channel preview actif.  
- API cible : Cloud Run `solaire-api-828508661560…`.
