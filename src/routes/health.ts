// Expose le point de contrôle qui confirme que l'API répond.
import { Router } from "express";

const router = Router();

// Confirme que le serveur répond avec le statut de santé de base.
router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

export default router;