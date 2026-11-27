// Configure Express, branche ses routes et normalise les erreurs renvoyées.
import express from "express";
import { installSecurity, authErrorHandler, type Auth } from "./auth/index.js";
import { env } from "./config/env.js";
import healthRouter from "./routes/health.js";
import categoriesRouter from "./menu/categories.routes.js";
import allergensRouter from "./menu/allergens.routes.js";
import dishesRouter from "./menu/dishes.routes.js";
import { createOrdersRouter } from "./orders/orders.routes.js";
import { AppError } from "./shared/errors.js";

export interface AppServices {
  auth: Auth;
}

// Construit l'application Express et branche ses protections, routes et erreurs.
export function createApp(services: AppServices) {
  const app = express();

  installSecurity(app, { corsOrigin: env.CORS_ORIGIN });
  app.use("/auth", services.auth.router);
  app.use(healthRouter);
  app.use(categoriesRouter);
  app.use(allergensRouter);
  app.use(dishesRouter);
  app.use(createOrdersRouter(services.auth));

  app.use(authErrorHandler);
  // Convertit les erreurs métier en réponses JSON au format attendu par l'API.
  app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (error instanceof AppError) {
      res.status(error.status).json({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details }),
        },
      });
      return;
    }
    next(error);
  });
  // Retourne une erreur JSON 404 quand aucune route ne correspond à la requête.
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