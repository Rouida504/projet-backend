# La Roulotte — API

API REST du projet La Roulotte, une application de commande de plats. Elle permet de consulter le menu, gérer les comptes utilisateurs et créer/suivre des commandes.

## Technologies

- Node.js 22 ou supérieur
- TypeScript et Express
- Prisma avec SQLite
- Zod pour la validation des données

## Installation et démarrage

Depuis le dossier `la-roulotte-API` :

```powershell
npm install
Copy-Item .env.example .env
```

Vérifier ensuite les paramètres dans `.env` :

```env
PORT=3000
DATABASE_URL="file:./dev.db"
CORS_ORIGIN="http://localhost:5173"
JWT_SECRET="une_cle_locale_de_32_caracteres_minimum"
```

`JWT_SECRET` doit contenir au moins 32 caractères. Adapter `CORS_ORIGIN` à l’adresse du frontend si nécessaire.

Créer/mettre à jour la base et charger les données de démonstration :

```powershell
npx prisma migrate deploy
npm run seed
```

Lancer l’API en développement :

```powershell
npm run dev
```

L’API écoute par défaut sur `http://localhost:3000`. Le frontend fourni par le kit utilise généralement `http://localhost:5173`.

## Vérifications

```powershell
npm run typecheck
npm test
```

Le typecheck vérifie les types TypeScript. Au moment de la rédaction, `npm test` ne trouve pas encore de fichiers de test Vitest.

## Routes principales

| Méthode | Route | Description |
| --- | --- | --- |
| `GET` | `/health` | Vérifie que l’API répond. |
| `GET` | `/categories` | Renvoie les catégories du menu. |
| `GET` | `/allergens` | Renvoie les allergènes. |
| `GET` | `/dishes` | Renvoie une liste paginée de plats. |
| `GET` | `/dishes/:id` | Renvoie un plat. |
| `POST` | `/auth/register` | Crée un compte client. |
| `POST` | `/auth/login` | Connecte un utilisateur et renvoie un jeton. |
| `GET` | `/auth/me` | Renvoie le profil associé au jeton. |
| `POST` | `/orders` | Crée une commande (authentification requise). |
| `GET` | `/orders` | Liste les commandes accessibles (authentification requise). |
| `GET` | `/orders/:id` | Consulte une commande (authentification requise). |
| `PATCH` | `/orders/:id/status` | Modifie le statut d’une commande (authentification requise). |

La liste des plats accepte notamment les paramètres `category`, `available`, `allergenFree`, `q`, `page` et `pageSize`. Les routes de commandes acceptent aussi des filtres de pagination et de statut.

Les erreurs de l’API sont renvoyées au format JSON, généralement sous la forme :

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Données invalides"
  }
}
```

## Organisation du code

```text
src/
├── menu/       # Routes et contrôleur liés au menu
├── orders/     # Routes, contrôleur, service et repository des commandes
├── auth/       # Authentification et autorisations
├── config/     # Configuration et validation des variables d’environnement
├── lib/        # Client Prisma
├── routes/     # Routes générales, dont le contrôle de santé
├── shared/     # Composants communs, dont les erreurs API
├── app.ts      # Assemblage de l’application Express
├── container.ts
└── server.ts   # Démarrage du serveur HTTP
```

Pour les commandes, le chemin de traitement est organisé ainsi :

```text
route → controller → service → repository → base de données
```

## État du projet et séparation des fichiers

### Avant la présentation

L’API était déjà fonctionnelle. La vérification affichée dans la page « Statut de l’API » du frontend indiquait **8 vérifications détectées sur 8** : santé, catégories, allergènes, plats paginés, connexion, profil, commandes et format des erreurs.

[Capture de la page Statut de l’API montrant 8 vérifications détectées sur 8](./docs/images/statut-api.png)

### Après la présentation

Les fichiers ont été réorganisés par fonctionnalité dans `src/menu/` et `src/orders/`. Pour les commandes, les responsabilités sont maintenant réparties entre routes, contrôleur, service et repository. Les chemins d’import ont été adaptés à cette organisation ; cette séparation ne visait pas à changer le comportement métier de l’API.

Après cette réorganisation, `npm run typecheck` passe. La suite `npm test` reste à compléter, car aucun fichier de test n’est actuellement détecté.
