// Renvoie les allergènes disponibles, triés par code.
import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

// Charge les allergènes de la base et les renvoie triés par code.
router.get("/allergens", async (req, res) => {
  try {
    const allergens = await prisma.allergen.findMany({
      orderBy: {
        code: "asc",
      },
    });
    res.status(200).json(allergens);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des allergènes" });
  }
});

export default router;