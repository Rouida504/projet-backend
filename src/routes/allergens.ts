import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

// GET /allergens (accès public)
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