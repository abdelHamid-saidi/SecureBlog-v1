# SecureBlog v1

Blog simple avec inscription, connexion par session et publication d’articles.

Les comptes et les articles sont stockés dans un fichier JSON (`data/db.json`). Les mots de passe sont hachés avec bcrypt.

## Prérequis

- Node.js 20 ou plus

## Lancer en local

```bash
npm install
npm start
```

Ouvrir [http://localhost:3000](http://localhost:3000).

En production, définir `SESSION_SECRET` avant de démarrer.

## Lancer avec Docker

```bash
docker compose up --build
```

Ouvrir [http://localhost:3000](http://localhost:3000). Les données sont conservées dans le volume `secureblog-data`.
