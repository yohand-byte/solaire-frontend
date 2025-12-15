# Release Notes - Admin Cockpit

Version : cockpit+planning+spotlight

## Nouvelles fonctionnalités
- Dashboard totalement repensé : KPI, actions du jour, retards, tableau filtrable.
- Planning / agenda (Aujourd’hui/Semaine/En retard) depuis `AdminPlanning`.
- Fiche dossier admin complète avec édition d’action, upload Firebase Storage, suivi administratif, historique.
- Gestion des rôles étendue (admin/manager/viewer/installateur) avec helpers `canAccessAdmin`, `canEditFiles`.
- Spotlight (Cmd+K / Ctrl+K) pour chercher leads/clients/dossiers.

## Changements
- `useAuth` expose davantage d’infos (role/installerId) et l’on filtre `files` selon l’installerId pour les clients.
- Upload Storage + documents gérés côté client.
- Navette vers `/planning` + `/dossiers/:id` depuis le dashboard.

## Impacts
- La landing GitHub continue d’appeler `/files` via Cloud Run (existant).
- Le portail installateur (`/client/*`) reste inchangé (lecture seule).
