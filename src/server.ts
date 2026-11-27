import { createApp } from "./app.js";
import { createServices } from "./container.js";
import { prisma } from "./lib/prisma.js";

const port = Number(process.env.PORT ?? 3000);
createApp(createServices(prisma)).listen(port, () =>
  console.log(`Médiathèque : http://localhost:${port}`),
);
