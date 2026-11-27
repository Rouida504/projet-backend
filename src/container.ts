// Composition root : le seul endroit qui assemble les implémentations concrètes.
import type { Db } from "./lib/prisma.js";
import { createAuth, type AuthUserStore, type Role } from "./auth/index.js";
import { env } from "./config/env.js";

// Vérifie que le rôle lu en base fait partie des rôles reconnus par l'application.
function isRole(role: string): role is Role {
  return role === "CUSTOMER" || role === "STAFF" || role === "ADMIN";
}

// Refuse un utilisateur dont le rôle en base est inconnu, sinon retourne son rôle typé.
function validateUserRole<T extends { role: string }>(user: T): T & { role: Role } {
  const role = user.role;
  if (!isRole(role)) {
    throw new Error(`Rôle utilisateur inconnu en base de données : ${role}`);
  }
  return { ...user, role };
}

// Convertit un utilisateur Prisma éventuellement absent en utilisateur auth validé.
function toStoredUser<T extends { role: string }>(user: T | null): (T & { role: Role }) | null {
  if (!user) return null;
  return validateUserRole(user);
}

// Assemble l'accès Prisma aux utilisateurs et le module d'authentification.
export function createServices(db: Db) {
  // Fournit à l'authentification les opérations de lecture et création des utilisateurs.
  const userStore: AuthUserStore = {
    // Recherche un compte à partir de son adresse e-mail.
    async findByEmail(email: string) {
      return toStoredUser(await db.user.findUnique({ where: { email } }));
    },
    // Recherche un compte à partir de son identifiant.
    async findById(id: number) {
      return toStoredUser(await db.user.findUnique({ where: { id } }));
    },
    // Enregistre un compte avec le mot de passe déjà haché.
    async create(data: { email: string; name: string; passwordHash: string; role: Role }) {
      return validateUserRole(await db.user.create({ data }));
    },
  };

  const auth = createAuth({ users: userStore, jwtSecret: env.JWT_SECRET });

  return {
    auth,
  };
}