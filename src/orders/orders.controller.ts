// Traduit les requêtes HTTP de commande en appels au service et formate les réponses.
import type { Request, Response } from "express";
import { z } from "zod";
import { currentUser } from "../auth/index.js";
import { AppError } from "../shared/errors.js";
import { orderStatuses, type OrdersService } from "./orders.service.js";
import type { OrderWithRelations } from "./orders.repository.js";

const orderBodySchema = z
  .strictObject({
    items: z
      .array(
        z.strictObject({
          dishId: z.number().int().positive(),
          quantity: z.number().int().min(1).max(10),
        }),
      )
      .min(1)
      .max(20),
    note: z.string().max(200).optional(),
  })
  .superRefine(({ items }, context) => {
    const dishIds = items.map((item) => item.dishId);
    if (new Set(dishIds).size !== dishIds.length) {
      context.addIssue({ code: "custom", path: ["items"], message: "Un même plat ne peut apparaître qu'une fois" });
    }
  });

// Convertit les erreurs Zod en erreur de validation au format de l'API.
function validationError(error: z.ZodError) {
  return new AppError(
    400,
    "VALIDATION_ERROR",
    "Données invalides",
    error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
  );
}

// Transforme les données de commande en réponse publique sans données privées.
function toOrderDto(order: OrderWithRelations) {
  return {
    id: order.id,
    status: order.status,
    note: order.note,
    totalCents: order.totalCents,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    customer: order.user,
    items: order.items.map((item) => ({
      dishId: item.dishId,
      name: item.dish.name,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      lineTotalCents: item.quantity * item.unitPriceCents,
    })),
    paymentStatus: order.paymentStatus,
  };
}

// Valide les paramètres HTTP, appelle le service et prépare les réponses Express.
export function createOrdersController(service: OrdersService) {
  return {
    // Valide le panier, demande au service de créer la commande et renvoie le DTO.
    async create(req: Request, res: Response): Promise<void> {
      const parsed = orderBodySchema.safeParse(req.body);
      if (!parsed.success) throw validationError(parsed.error);

      const customer = currentUser(req);
      const order = await service.createOrder(customer.id, parsed.data.items, parsed.data.note);
      res.status(201).location(`/orders/${order.id}`).json(toOrderDto(order));
    },

    // Valide les filtres et renvoie la page de commandes autorisées pour l'utilisateur.
    async list(req: Request, res: Response): Promise<void> {
      const querySchema = z.strictObject({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(50).default(20),
        sort: z.enum(["createdAt", "-createdAt"]).default("-createdAt"),
        status: z.string().optional(),
      });
      const query = querySchema.safeParse(req.query);
      if (!query.success) throw validationError(query.error);

      const statusValues = query.data.status?.split(",");
      if (statusValues?.some((status) => !orderStatuses.includes(status as (typeof orderStatuses)[number]))) {
        throw validationError(
          new z.ZodError([{ code: "custom", path: ["status"], message: "Statut de commande inconnu" }]),
        );
      }

      const result = await service.listOrders(currentUser(req), {
        ...query.data,
        statusValues,
      });
      res.json({ items: result.orders.map(toOrderDto), total: result.total, page: result.page, pageSize: result.pageSize });
    },

    // Valide l'identifiant et renvoie la commande accessible correspondante.
    async getById(req: Request, res: Response): Promise<void> {
      const id = z.coerce.number().int().positive().safeParse(req.params.id);
      if (!id.success) throw validationError(id.error);

      const order = await service.getOrderById(id.data, currentUser(req));
      res.json(toOrderDto(order));
    },

    // Valide le statut demandé, puis renvoie la commande après la transition.
    async updateStatus(req: Request, res: Response): Promise<void> {
      const id = z.coerce.number().int().positive().safeParse(req.params.id);
      if (!id.success) throw validationError(id.error);
      const body = z.strictObject({ status: z.enum(orderStatuses) }).safeParse(req.body);
      if (!body.success) throw validationError(body.error);

      const order = await service.updateOrderStatus(id.data, body.data.status, currentUser(req));
      res.json(toOrderDto(order));
    },
  };
}
