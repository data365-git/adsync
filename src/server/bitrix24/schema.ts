import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "~/server/db";
import { call } from "./client";
import type { BitrixEntity, BitrixSchema } from "./types";

const TTL_MS = 24 * 60 * 60 * 1_000; // 24 hours

/**
 * Fetch and cache the Bitrix24 field schema for an entity.
 * Caches in BitrixSchemaCache Postgres table with a 24-hour TTL.
 * Returns the full schema including all UF_CRM_* custom fields.
 */
export async function fetchEntitySchema(entity: BitrixEntity): Promise<BitrixSchema> {
  const cached = await db.bitrixSchemaCache.findUnique({ where: { entity } });

  if (cached && Date.now() - cached.fetchedAt.getTime() < TTL_MS) {
    // Prisma's JsonValue does not sufficiently overlap with our typed schema;
    // bridge through `unknown` since the column contents are produced by us.
    return cached.schema as unknown as BitrixSchema;
  }

  const schema = await call<BitrixSchema>(`crm.${entity}.fields`);

  await db.bitrixSchemaCache.upsert({
    where: { entity },
    create: { entity, schema: schema as unknown as Prisma.InputJsonValue, fetchedAt: new Date() },
    update: { schema: schema as unknown as Prisma.InputJsonValue, fetchedAt: new Date() },
  });

  return schema;
}
