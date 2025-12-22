# AI Assistant Feature Flags

## Frontend
- Key: `VITE_FEATURE_AI_ASSISTANT`
- Default: `false` (`.env.example`, `.env.local.example`)
- Location: parsed in `src/lib/flags.ts` and guards all AI UI/components.
- Behavior: when `false`, aucun composant IA n’est rendu ni appelé; les appels Functions ne sont pas déclenchés.

## Cloud Functions
- Key: `FEATURE_AI_ASSISTANT`
- Default: `false` (process env)
- Location: lue dans les fonctions IA (callable/scheduled/storage). Si `false`, les handlers retournent `{ ok: false, disabled: true }` et n’appellent pas OpenAI.

## Notes
- Les deux flags doivent être `true` pour activer l’expérience IA complète (UI + backend).
- Garder les clés OpenAI hors frontend : seules les Functions consomment la clé via l’Admin SDK/variables d’environnement sécurisées.
