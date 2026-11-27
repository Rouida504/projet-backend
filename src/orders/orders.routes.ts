// Déclare les routes de commande et délègue leur traitement au contrôleur.
import { Router } from "express";
import type { Auth } from "../auth/index.js";
import { createOrdersController } from "./orders.controller.js";
import { prisma } from "../lib/prisma.js";
import { OrdersRepository } from "./orders.repository.js";
import { OrdersService } from "./orders.service.js";

// Construit les routes de commande avec leurs dépendances et applique l'authentification.
export function createOrdersRouter(auth: Auth) {
  const router = Router();
  const service = new OrdersService(new OrdersRepository(prisma));
  const controller = createOrdersController(service);

  router.post("/orders", auth.requireAuth, controller.create);
  router.get("/orders", auth.requireAuth, controller.list);
  router.get("/orders/:id", auth.requireAuth, controller.getById);
  router.patch("/orders/:id/status", auth.requireAuth, controller.updateStatus);

  return router;
}
