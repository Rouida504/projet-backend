// Renvoie les catégories du menu triées par position.
import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

// Charge les catégories de la base dans l'ordre prévu pour l'affichage.
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