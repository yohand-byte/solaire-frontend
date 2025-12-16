# Vérification rapide (routing/claims)

1. Démarrer en local : `npm ci && npm run dev` (API à `VITE_API_URL` doit être lancée avec les mêmes claims).
2. Navigation privée : ouvrir `/client/login` et `/admin/login` → aucune redirection auto ; se connecter installateur → `/client/dashboard`, admin → `/admin/dashboard`.
3. Page debug : `/debug/auth?debug=1` doit afficher `firebaseProjectId`, `uid`, `role` et le `pathname` sans forcer de navigation.
