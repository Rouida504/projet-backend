import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

// GET /categories (accès public)
router.get("/categories", async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        position: "asc",
      },
    });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des catégories" });
  }
});

export default router;