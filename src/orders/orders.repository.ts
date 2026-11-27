// Regroupe les requêtes Prisma relatives aux commandes et aux plats en stock.
import { Prisma } from "@prisma/client";
import type { Db } from "../lib/prisma.js";

const orderInclude = {
  user: { select: { id: true, name: true } },
  items: { include: { dish: { select: { name: true } } } },
} satisfies Prisma.OrderInclude;

export type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
type OrderForStatusUpdate = Prisma.OrderGetPayload<{ include: { items: true } }>;
type OrderItemCreateInput = { dishId: number; quantity: number; unitPriceCents: number };
type CreateOrderInput = { userId: number; totalCents: number; note?: string; items: OrderItemCreateInput[] };

// Permet aux services d'orchestrer une transaction sans accéder directement à Prisma.
export class OrdersTransactionRepository {
  constructor(private readonly transaction: Prisma.TransactionClient) {}

  // Charge les plats nécessaires à la création d'une commande.
  findDishes(ids: number[]) {
    return this.transaction.dish.findMany({ where: { id: { in: ids } } });
  }

  // Décrémente le stock uniquement si la quantité reste suffisante.
  decrementDishStock(dishId: number, quantity: number) {
    return this.transaction.dish.updateMany({
      where: { id: dishId, stock: { gte: quantity } },
      data: { stock: { decrement: quantity } },
    });
  }

  // Relit le stock après une tentative de décrément concurrente.
  findDishStock(dishId: number) {
    return this.transaction.dish.findUnique({ where: { id: dishId }, select: { stock: true } });
  }

  // Insère la commande et ses lignes dans la transaction courante.
  createOrder(data: CreateOrderInput): Promise<OrderWithRelations> {
    return this.transaction.order.create({
      data: {
        userId: data.userId,
        totalCents: data.totalCents,
        note: data.note,
        items: { create: data.items },
      },
      include: orderInclude,
    });
  }

  // Charge la commande et ses lignes pour vérifier une transition de statut.
  findOrderForStatusUpdate(id: number): Promise<OrderForStatusUpdate | null> {
    return this.transaction.order.findUnique({ where: { id }, include: { items: true } });
  }

  // Remet en stock les unités d'un plat après l'annulation d'une commande.
  restoreDishStock(dishId: number, quantity: number) {
    return this.transaction.dish.updateMany({
      where: { id: dishId, stock: { not: null } },
      data: { stock: { increment: quantity } },
    });
  }

  // Enregistre le nouveau statut et renvoie la commande complète.
  updateOrderStatus(id: number, status: OrderWithRelations["status"]): Promise<OrderWithRelations> {
    return this.transaction.order.update({
      where: { id },
      data: { status },
      include: orderInclude,
    });
  }
}

// Fournit au service des lectures et des transactions encapsulées dans le repository.
export class OrdersRepository {
  constructor(private readonly db: Db) {}

  // Récupère une page de commandes et son total avec les relations utiles.
  async listOrders(where: Prisma.OrderWhereInput, direction: "asc" | "desc", skip: number, take: number) {
    const [orders, total] = await Promise.all([
      this.db.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: direction },
        skip,
        take,
      }),
      this.db.order.count({ where }),
    ]);
    return { orders, total };
  }

  // Recherche une commande et ses relations à partir de son identifiant.
  findOrderById(id: number): Promise<OrderWithRelations | null> {
    return this.db.order.findUnique({ where: { id }, include: orderInclude });
  }

  // Exécute les opérations fournies par le service dans une transaction Prisma.
  transaction<T>(work: (repository: OrdersTransactionRepository) => Promise<T>): Promise<T> {
    return this.db.$transaction((transaction) => work(new OrdersTransactionRepository(transaction)));
  }
}
