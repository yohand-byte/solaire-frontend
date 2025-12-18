# Provisioning admin (sans auto-promo UI)

Option A (allowlist UID + doc user)
1) Ajouter l’UID admin dans la allowlist des règles (isAdminAllowlistUid). Garder cette liste minimale.
2) Créer/mettre à jour `users/{uid}` avec `role: "admin"` (console Firestore ou script).
3) Relancer la session admin (logout/login) pour rafraîchir les droits.

Option B (custom claim admin)
1) Utiliser un compte service ou CLI déjà authentifié.
2) Appliquer le claim :
```
node -e "const admin=require('firebase-admin');admin.initializeApp();admin.auth().setCustomUserClaims('UID_ADMIN',{admin:true});"
```
3) Rafraîchir la session (logout/login).

Notes
- Aucune auto-promotion côté front.
- La lecture clients par email est temporaire pour bootstrap ; une fois chaque installateur lié à un client_id (ou claim), retirer ce fallback et redéployer les règles.
