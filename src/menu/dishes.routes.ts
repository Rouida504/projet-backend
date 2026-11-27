// Expose la consultation filtrée et paginée des plats.
import { Router } from "express";
import { z } from "zod";
import { listDishes } from "./dishes.controller.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../shared/errors.js";

const router = Router();

// Valide les filtres, puis renvoie une page de plats triée selon le menu.
router.get("/dishes", async (req, res) => {
  const querySchema = z.strictObject({
    category: z.coerce.number().int().positive().optional(),
    available: z.enum(["true", "false"]).optional(),
    allergenFree: z.string().optional(),
    q: z.string().max(50).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
  });
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Données invalides",
      parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    );
  }

  const { category, available, allergenFree, q, page, pageSize } = parsed.data;
  const where = {
    ...(category === undefined ? {} : { categoryId: category }),
    ...(available === undefined ? {} : { available: available === "true" }),
    ...(allergenFree === undefined
      ? {}
      : { allergens: { none: { code: { in: allergenFree.split(",").filter(Boolean) } } } }),
    ...(q === undefined ? {} : { name: { contains: q } }),
  };

  await listDishes(res, where, page, pageSize);
});

// Valide l'identifiant demandé et renvoie le plat correspondant ou une erreur 404.
router.get("/dishes/:id", async (req, res) => {
  const parsedId = z.coerce.number().int().positive().safeParse(req.params.id);
  if (!parsedId.success) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Données invalides",
      parsedId.error.issues.map((issue) => ({ path: "id", message: issue.message })),
    );
  }
  const dish = await prisma.dish.findUnique({
    where: { id: parsedId.data },
    include: { category: true, allergens: true },
  });
  if (!dish) throw new AppError(404, "NOT_FOUND", "Plat introuvable");

  res.json(dish);
});

export default router;