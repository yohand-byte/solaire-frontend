PR #11 — titre et description à appliquer

Titre :
feat: shared Firestore schema + auth bootstrap (users doc) + rules/indexes

Body :
- Shared Firestore schema + helpers dans packages/shared/src/firestore (types + CRUD + counters + credits + convert lead→client+dossier) + wrappers apps (pas de nouvel init Firebase).
- Auth bootstrap : ensureUserDoc() branché sur login client/admin + restore session, update last_login à chaque login.
- Résolution client_id via findClientIdByEmail(email) (fallback uid si non trouvé).
- Firestore rules/indexes :
  - clients read autorisé temporairement par email match pour bootstrap,
  - users/{uid} create autorisé pour soi-même uniquement en role="client" (ou admin si claim/allowlist),
  - update user limité à name,email,last_login,updated_at (role/client_id immuables), pas d’auto-admin.
- QA doc ajoutée (tests manuels: login client/admin + isolation dossiers + limites update).
