import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

// GET /dishes (carte paginée et filtrable)
router.get("/dishes", async (req, res) => {
  try {
    const { category, available, allergenFree, page = "1", pageSize = "50" } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const limit = Math.min(parseInt(pageSize as string, 10), 50);
    const skip = (pageNumber - 1) * limit;

    const where: any = {};

    if (category) {
      where.categoryId = Number(category);
    }

    if (available !== undefined) {
      where.isAvailable = available === "true";
    }

    if (allergenFree) {
      where.allergens = {
        none: {
          allergenCode: allergenFree as string,
        },
      };
    }

    const [items, total] = await Promise.all([
      prisma.dish.findMany({
        where,
        include: {
          category: true,
          allergens: true,
        },
        skip,
        take: limit,
      }),
      prisma.dish.count({ where }),
    ]);

    res.status(200).json({
      items,
      total,
      page: pageNumber,
      pageSize: limit,
    });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des plats" });
  }
});

// GET /dishes/:id (un plat spécifique)
router.get("/dishes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "ID de plat invalide" });
    }

    const dish = await prisma.dish.findUnique({
      where: { id },
      include: {
        category: true,
        allergens: true,
      },
    });

    if (!dish) {
      return res.status(404).json({ error: "Plat non trouvé" });
    }

    res.status(200).json(dish);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération du plat" });
  }
});

export default router;