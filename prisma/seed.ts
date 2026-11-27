// Réinitialise les tables applicatives puis charge les comptes et le menu de démonstration.
import * as fs from "fs";
import * as path from "path";
import { hashPassword } from "../src/auth/index.js";
import { prisma } from "../src/lib/prisma.js";

// Réinitialise les tables puis charge les comptes, catégories, allergènes et plats de démonstration.
async function main() {
  console.log("🌱 Début du seed de la base de données...");

  // 1. Nettoyage complet de la base
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.dish.deleteMany();
  await prisma.category.deleteMany();
  await prisma.allergen.deleteMany();
  await prisma.user.deleteMany();

  // 2. Création des utilisateurs par défaut (Annexe B)
  const adminPassword = await hashPassword("Admin123!");
  const staffPassword = await hashPassword("Cuisine123!");
  const clientPassword = await hashPassword("Client123!");

  await prisma.user.createMany({
    data: [
      { email: "admin@roulotte.test", name: "Administratrice", passwordHash: adminPassword, role: "ADMIN" },
      { email: "cuisine@roulotte.test", name: "Cuisine", passwordHash: staffPassword, role: "STAFF" },
      { email: "client@roulotte.test", name: "Client Test", passwordHash: clientPassword, role: "CUSTOMER" },
    ],
  });

  // 3. Lecture du fichier menu.json
  const menuPath = path.join(process.cwd(), "donnees", "menu.json");
  if (!fs.existsSync(menuPath)) {
    throw new Error(`Le fichier menu.json est introuvable : ${menuPath}`);
  }
  const menu = JSON.parse(fs.readFileSync(menuPath, "utf-8"));

  // 4. Insertion des catégories
  const categories = new Map<string, number>();
  for (const category of menu.categories || []) {
    const created = await prisma.category.create({
      data: { name: category.name, position: category.position },
    });
    categories.set(category.name, created.id);
  }

  // 5. Insertion des allergènes
  for (const allergen of menu.allergens || []) {
    await prisma.allergen.create({
      data: { code: allergen.code, label: allergen.label },
    });
  }

  // 6. Insertion des plats
  for (const dish of menu.dishes || []) {
    const categoryId = categories.get(dish.category);
    if (categoryId === undefined) {
      throw new Error(`Catégorie introuvable pour le plat « ${dish.name} » : ${dish.category}`);
    }

    await prisma.dish.create({
      data: {
        name: dish.name,
        description: dish.description,
        priceCents: dish.priceCents,
        available: dish.available ?? true,
        stock: dish.stock ?? null,
        imageUrl: dish.imageUrl,
        categoryId,
        allergens: {
          connect: (dish.allergens || []).map((code: string) => ({ code })),
        },
      },
    });
  }

  console.log("✅ Seed terminé avec succès !");
}

main()
  // Affiche l'erreur du seed et termine le processus avec un code d'échec.
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  // Ferme Prisma même si le chargement du seed échoue.
  .finally(async () => {
    await prisma.$disconnect();
  });