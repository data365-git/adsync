/**
 * Field mappings: Prisma model field → Bitrix24 API field.
 *
 * How to add a custom field (UF_CRM_*):
 *   1. Call fetchEntitySchema("lead") to discover the exact field name for your portal.
 *   2. Add an entry: { prismaField: "yourRawField", bitrixField: "UF_CRM_1234567890" }
 *      where "yourRawField" is a key inside the `raw` JSON column, NOT a top-level model field.
 *
 * The optional `transform` converts the Prisma value to the format Bitrix24 expects.
 * Phone and email must be arrays: [{VALUE: "...", VALUE_TYPE: "WORK"}].
 */

export interface FieldMapping {
  prismaField: string;
  bitrixField: string;
  transform?: (value: unknown) => unknown;
}

function wrapMultiple(valueType: "WORK") {
  return (v: unknown) => {
    if (typeof v !== "string" && typeof v !== "number") return undefined;
    const str = String(v);
    return str ? [{ VALUE: str, VALUE_TYPE: valueType }] : undefined;
  };
}

export const LEAD_MAPPING: FieldMapping[] = [
  { prismaField: "name", bitrixField: "TITLE" },
  { prismaField: "phone", bitrixField: "PHONE", transform: wrapMultiple("WORK") },
  { prismaField: "email", bitrixField: "EMAIL", transform: wrapMultiple("WORK") },
  { prismaField: "status", bitrixField: "STATUS_ID" },
  { prismaField: "source", bitrixField: "SOURCE_ID" },
];

export const DEAL_MAPPING: FieldMapping[] = [
  { prismaField: "title", bitrixField: "TITLE" },
  { prismaField: "contactId", bitrixField: "CONTACT_ID" },
  { prismaField: "stageId", bitrixField: "STAGE_ID" },
  { prismaField: "amount", bitrixField: "OPPORTUNITY" },
  { prismaField: "currency", bitrixField: "CURRENCY_ID" },
];

export const CONTACT_MAPPING: FieldMapping[] = [
  { prismaField: "name", bitrixField: "NAME" },
  { prismaField: "phone", bitrixField: "PHONE", transform: wrapMultiple("WORK") },
  { prismaField: "email", bitrixField: "EMAIL", transform: wrapMultiple("WORK") },
  { prismaField: "source", bitrixField: "SOURCE_ID" },
];

export type EntityType = "Lead" | "Deal" | "Contact";

export const MAPPINGS: Record<EntityType, FieldMapping[]> = {
  Lead: LEAD_MAPPING,
  Deal: DEAL_MAPPING,
  Contact: CONTACT_MAPPING,
};
