# Tests manuels rapides (users, droits client/admin)

1) Connexion client (magic link)
- Se connecter avec un compte installateur.
- Vérifier dans Firestore `users/{uid}` : role="client", client_id=uid, last_login mis à jour.
- Vérifier que seuls les dossiers du client sont visibles et modifiables (ajout note/doc OK, rien d’autre).

2) Connexion admin
- Se connecter avec un compte admin (claims/whitelist).
- Vérifier `users/{uid}` : role="admin" (si absent, TODO pour promu manuel).
- Vérifier que tous les dossiers sont visibles et éditables.

3) Vérifier l’isolation
- Un client ne voit pas les dossiers d’un autre (lecture filtrée par client_id).
- Un client ne peut modifier que documents/notes sur ses dossiers (tests règles Firestore). 
