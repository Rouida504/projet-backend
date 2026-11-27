// Pattern SINGLETON : un seul PrismaClient pour toute l'application.
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

// Prisma 7 : le client passe par un « driver adapter » (ici better-sqlite3)
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});

export const prisma = new PrismaClient({
  adapter,
  log: process.env.PRISMA_LOG === "query" ? ["query"] : ["warn"],
});

export type Db = typeof prisma;