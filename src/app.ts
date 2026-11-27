import express from "express";
import { installSecurity } from "./auth/security.js";
import { env } from "./config/env.js";
import healthRouter from "./routes/health.js";
import categoriesRouter from "./routes/categories.js";
import allergensRouter from "./routes/allergens.js";
import dishesRouter from "./routes/dishes.js";

// Définition du type pour les services reçus par l'application
export interface AppServices {
  auth: {
    router: express.Router;
  };
}

export function createApp(services: AppServices) {
  const app = express();

  // 1. Installation de la sécurité (Helmet, CORS, limites de taille)
  installSecurity(app, { corsOrigin: env.CORS_ORIGIN });

  // 2. Routes d'authentification fournies (/auth/register, /auth/login, /auth/me)
  app.use("/auth", services.auth.router);

  // 3. Routes de l'API
  app.use(healthRouter);
  app.use(categoriesRouter);
  app.use(allergensRouter);
  app.use(dishesRouter);

  // 4. Gestion des routes 404
  app.use((req, res) =>
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: `Route ${req.method} ${req.path} introuvable`,
      },
    }),
  );

  return app;
}