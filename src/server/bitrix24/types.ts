export type BitrixEntity = "lead" | "deal" | "contact";

export interface BitrixPhone {
  VALUE: string;
  VALUE_TYPE: "WORK" | "MOBILE" | "HOME" | "FAX" | "PAGER" | "MAILING" | "OTHER";
}

export interface BitrixEmail {
  VALUE: string;
  VALUE_TYPE: "WORK" | "HOME" | "MAILING" | "OTHER";
}

export interface BitrixLead {
  ID?: string;
  TITLE?: string;
  NAME?: string;
  LAST_NAME?: string;
  PHONE?: BitrixPhone[];
  EMAIL?: BitrixEmail[];
  STATUS_ID?: string;
  SOURCE_ID?: string;
  COMMENTS?: string;
  [key: string]: unknown; // for UF_CRM_* custom fields
}

export interface BitrixDeal {
  ID?: string;
  TITLE?: string;
  CONTACT_ID?: string;
  STAGE_ID?: string;
  OPPORTUNITY?: string;
  CURRENCY_ID?: string;
  [key: string]: unknown;
}

export interface BitrixContact {
  ID?: string;
  NAME?: string;
  LAST_NAME?: string;
  PHONE?: BitrixPhone[];
  EMAIL?: BitrixEmail[];
  SOURCE_ID?: string;
  [key: string]: unknown;
}

export interface BitrixDuplicateResult {
  LEAD?: string[];
  CONTACT?: string[];
  COMPANY?: string[];
}

export interface BitrixFieldDef {
  type: string;
  isRequired: boolean;
  isReadOnly: boolean;
  isImmutable: boolean;
  isMultiple: boolean;
  isDynamic: boolean;
  title: string;
}

export type BitrixSchema = Record<string, BitrixFieldDef>;

export interface BitrixBatchResult {
  result: Record<string, unknown>;
  result_error: Record<string, string>;
  result_total: Record<string, number>;
  result_next: Record<string, number>;
}

export interface BatchOperation {
  method: string;
  params: Record<string, unknown>;
}

export interface SyncResult {
  bitrixId: string;
  operation: "created" | "updated";
  durationMs: number;
}

export class BitrixError extends Error {
  constructor(
    public readonly code: string,
    public readonly description: string,
    public readonly method: string,
  ) {
    super(`Bitrix24 [${code}] on ${method}: ${description}`);
    this.name = "BitrixError";
  }
}
