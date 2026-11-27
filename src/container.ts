// Composition root : le seul endroit qui assemble les implémentations concrètes.
import type { Db } from "./lib/prisma.js";
import { createAuth, type AuthUserStore, type Role } from "./auth/index.js";
import { env } from "./config/env.js";

function isRole(role: string): role is Role {
  return role === "CUSTOMER" || role === "STAFF" || role === "ADMIN";
}

function validateUserRole<T extends { role: string }>(user: T): T & { role: Role } {
  const role = user.role;
  if (!isRole(role)) {
    throw new Error(`Rôle utilisateur inconnu en base de données : ${role}`);
  }
  return { ...user, role };
}

function toStoredUser<T extends { role: string }>(user: T | null): (T & { role: Role }) | null {
  if (!user) return null;
  return validateUserRole(user);
}

export function createServices(db: Db) {
  // Store utilisateur connecté à Prisma (pour l'authentification)
  const userStore: AuthUserStore = {
    async findByEmail(email: string) {
      return toStoredUser(await db.user.findUnique({ where: { email } }));
    },
    async findById(id: number) {
      return toStoredUser(await db.user.findUnique({ where: { id } }));
    },
    async create(data: { email: string; name: string; passwordHash: string; role: Role }) {
      return validateUserRole(await db.user.create({ data }));
    },
  };

  const auth = createAuth({ users: userStore, jwtSecret: env.JWT_SECRET });

  return {
    auth,
  };
}