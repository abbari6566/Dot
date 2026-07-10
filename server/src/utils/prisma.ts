import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// Prisma 7 client requires an explicit driver adapter — it no longer reads
// the datasource url from schema.prisma at runtime (only the CLI does, via prisma.config.ts).
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
export default prisma;
