// Démarre l'API HTTP avec les services configurés et le port validé.
import { createApp } from "./app.js";
import { createServices } from "./container.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

// Démarre l'écoute HTTP puis affiche l'adresse locale de l'API.
createApp(createServices(prisma)).listen(env.PORT, () =>
  console.log(`API La Roulotte : http://localhost:${env.PORT}`),
);
