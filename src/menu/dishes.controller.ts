// Contrôleur responsable de la lecture paginée des plats.
import type { Prisma } from "@prisma/client";
import type { Response } from "express";
import { prisma } from "../lib/prisma.js";

// Récupère les plats et leur total, puis renvoie la page au format de l'API.
export async function listDishes(
  res: Response,
  where: Prisma.DishWhereInput,
  page: number,
  pageSize: number,
): Promise<void> {
  const [items, total] = await Promise.all([
    prisma.dish.findMany({
      where,
      include: { category: true, allergens: true },
      orderBy: [{ category: { position: "asc" } }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.dish.count({ where }),
  ]);
  res.json({ items, total, page, pageSize });
}
