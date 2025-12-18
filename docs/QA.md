# Tests manuels (auth + isolation)

1) Login client (magic link)
- Se connecter avec un compte installateur.
- Vérifier Firestore `users/{uid}` : role="client", client_id résolu (email→client ou uid), last_login mis à jour.
- Vérifier que seuls les dossiers de ce client sont visibles.
- Vérifier qu'il ne peut modifier que documents/notes sur ses dossiers (autres champs refusés par rules).

2) Login admin
- Se connecter avec un compte admin (claims/whitelist).
- Vérifier `users/{uid}` : role="admin" (aucune auto-promo si absent).
- Vérifier que tous les dossiers sont visibles/éditables.

Comportement bootstrap : si aucun client trouvé par email, fallback sur uid et warning logué côté client.
