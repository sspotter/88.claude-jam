import dotenv from "dotenv";
import prisma from "../config/prisma.js";
import { AuthService } from "../services/auth.service.js";

dotenv.config();

/**
 * Creates (or updates the password of) the first admin account.
 * Credentials come from CLI args or SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env.
 *
 *   npm run seed-admin -- admin@jamhawi.com "SuperSecret123"
 */
async function main() {
  const email = (process.argv[2] || process.env.SEED_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.argv[3] || process.env.SEED_ADMIN_PASSWORD || "";

  if (!email || !password) {
    console.error(
      "Usage: npm run seed-admin -- <email> <password>\n" +
        "   or set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env"
    );
    process.exit(1);
  }

  const passwordHash = await AuthService.hashPassword(password);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  console.log(`✅ Admin ready: ${admin.email} (id: ${admin.id})`);
}

main()
  .catch((err) => {
    console.error("Failed to seed admin:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
