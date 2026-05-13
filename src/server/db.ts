import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  // Cap pool size in dev so occasional HMR-leaked clients can't add up
  // to Postgres's max_connections (default 100). Without this, after enough
  // hot reloads we see "too many connections" / PrismaClientInitializationError
  // on the next query — typically `connections.list` since it's the first one
  // a logged-in user hits.
  const baseUrl = process.env.DATABASE_URL;
  let datasourceUrl: string | undefined;
  if (
    process.env.NODE_ENV !== "production" &&
    baseUrl &&
    !baseUrl.includes("connection_limit=")
  ) {
    const sep = baseUrl.includes("?") ? "&" : "?";
    datasourceUrl = `${baseUrl}${sep}connection_limit=5&pool_timeout=10`;
  }

  return new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
