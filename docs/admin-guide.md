# Guide administrateur

1. **Dashboard** (`/dashboard`) : cockpit complet avec KPI (leads 30 j, dossiers en cours/finalisés), actions du jour et dossiers en retard. Utilise les filtres pack/statut/recherche pour explorer les dossiers, clique sur une ligne pour ouvrir la fiche détaillée.
2. **Planning** (`/planning`) : agenda en trois colonnes (Aujourd’hui, Cette semaine, En retard) basé sur `nextActionDate`. Chaque ligne clique sur `/dossiers/:id`.
3. **Fiche dossier** (`/dossiers/:id`) : header référence + badges, suivi administratif, bloc actions éditable (nextAction/nextActionDate/statut). Upload de documents réel via Firebase Storage (liste cliquable). Historique et documents affichés.
4. **Recherche Spotlight** : Cmd+K / Ctrl+K ou loupe en header pour chercher leads/clients/dossiers (navigation contextuelle).
5. **Seed & reset** : `/dev/seed` propose “Vider les collections” puis “Seed de démo” (leads + clients + files). Idéal avant des tests.
