// Applique les règles métier des commandes et orchestre les opérations du repository.
import { Prisma } from "@prisma/client";
import type { Role } from "../auth/crypto.js";
import { AppError } from "../shared/errors.js";
import { OrdersRepository, type OrderWithRelations } from "./orders.repository.js";

export const orderStatuses = ["RECEIVED", "PREPARING", "READY", "PICKED_UP", "CANCELLED"] as const;
export type OrderStatus = (typeof orderStatuses)[number];
type OrderUser = { id: number; role: Role };
type OrderItemInput = { dishId: number; quantity: number };

// Crée l'erreur 404 utilisée quand la commande n'est pas visible ou inexistante.
function notFound() {
  return new AppError(404, "NOT_FOUND", "Commande introuvable");
}

// Crée l'erreur 409 utilisée pour une transition de commande interdite.
function invalidTransition() {
  return new AppError(409, "INVALID_TRANSITION", "Changement de statut interdit");
}

// Contient les règles métier et délègue les accès aux données au repository.
export class OrdersService {
  constructor(private readonly repository: OrdersRepository) {}

  // Vérifie plats et stock, puis orchestre la création atomique de la commande.
  async createOrder(customerId: number, items: OrderItemInput[], note?: string): Promise<OrderWithRelations> {
    return this.repository.transaction(async (transaction) => {
      const dishes = await transaction.findDishes(items.map((item) => item.dishId));
      const dishesById = new Map(dishes.map((dish) => [dish.id, dish]));

      const unavailable = items.flatMap(({ dishId }) => {
        const dish = dishesById.get(dishId);
        if (!dish) return [{ dishId, reason: "NOT_FOUND" }];
        if (!dish.available) return [{ dishId, reason: "UNAVAILABLE" }];
        return [];
      });
      if (unavailable.length > 0) {
        throw new AppError(422, "DISH_UNAVAILABLE", "Un ou plusieurs plats ne sont pas disponibles", unavailable);
      }

      const outOfStock = items.flatMap(({ dishId, quantity }) => {
        const dish = dishesById.get(dishId);
        return dish && dish.stock !== null && dish.stock < quantity
          ? [{ dishId, available: dish.stock }]
          : [];
      });
      if (outOfStock.length > 0) {
        throw new AppError(409, "OUT_OF_STOCK", "Stock insuffisant", outOfStock);
      }

      for (const { dishId, quantity } of items) {
        const dish = dishesById.get(dishId);
        if (dish?.stock !== null && dish?.stock !== undefined) {
          const result = await transaction.decrementDishStock(dishId, quantity);
          if (result.count !== 1) {
            const latest = await transaction.findDishStock(dishId);
            throw new AppError(409, "OUT_OF_STOCK", "Stock insuffisant", [
              { dishId, available: latest?.stock ?? 0 },
            ]);
          }
        }
      }

      const totalCents = items.reduce((sum, item) => {
        const dish = dishesById.get(item.dishId);
        return sum + (dish?.priceCents ?? 0) * item.quantity;
      }, 0);

      return transaction.createOrder({
        userId: customerId,
        totalCents,
        note,
        items: items.map(({ dishId, quantity }) => ({
          dishId,
          quantity,
          unitPriceCents: dishesById.get(dishId)!.priceCents,
        })),
      });
    });
  }

  // Applique les filtres d'accès et orchestre la pagination des commandes.
  async listOrders(
    user: OrderUser,
    options: {
      page: number;
      pageSize: number;
      sort: "createdAt" | "-createdAt";
      statusValues?: string[];
    },
  ) {
    const where: Prisma.OrderWhereInput = {};
    if (user.role === "CUSTOMER") where.userId = user.id;
    if (options.statusValues) where.status = { in: options.statusValues };

    const { orders, total } = await this.repository.listOrders(
      where,
      options.sort === "createdAt" ? "asc" : "desc",
      (options.page - 1) * options.pageSize,
      options.pageSize,
    );
    return { orders, total, page: options.page, pageSize: options.pageSize };
  }

  // Vérifie que l'utilisateur peut consulter la commande demandée.
  async getOrderById(id: number, user: OrderUser): Promise<OrderWithRelations> {
    const order = await this.repository.findOrderById(id);
    if (!order || (user.role === "CUSTOMER" && order.userId !== user.id)) throw notFound();
    return order;
  }

  // Vérifie les droits et la transition, puis orchestre le changement et le retour en stock.
  async updateOrderStatus(id: number, nextStatus: OrderStatus, user: OrderUser): Promise<OrderWithRelations> {
    return this.repository.transaction(async (transaction) => {
      const existing = await transaction.findOrderForStatusUpdate(id);
      if (!existing || (user.role === "CUSTOMER" && existing.userId !== user.id)) throw notFound();
      if (user.role === "CUSTOMER" && nextStatus !== "CANCELLED") {
        throw new AppError(403, "FORBIDDEN", "Un client peut uniquement annuler sa commande");
      }

      const allowed: Partial<Record<OrderStatus, OrderStatus[]>> = {
        RECEIVED: ["PREPARING", "CANCELLED"],
        PREPARING: ["READY", "CANCELLED"],
        READY: ["PICKED_UP", "CANCELLED"],
      };
      if (!allowed[existing.status as OrderStatus]?.includes(nextStatus)) throw invalidTransition();
      if (user.role === "CUSTOMER" && existing.status !== "RECEIVED") throw invalidTransition();

      if (nextStatus === "CANCELLED") {
        for (const item of existing.items) {
          await transaction.restoreDishStock(item.dishId, item.quantity);
        }
      }

      return transaction.updateOrderStatus(id, nextStatus);
    });
  }
}
