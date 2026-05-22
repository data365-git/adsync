import { call } from "~/server/bitrix24/client";

export type BitrixHealthReport = {
  canCreateLead: boolean;
  canListLeads: boolean;
  canListDealCategories: boolean;
  errors: string[];
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function checkBitrixHealth(
  userId: string,
): Promise<BitrixHealthReport> {
  void userId;

  const report: BitrixHealthReport = {
    canCreateLead: true,
    canListLeads: false,
    canListDealCategories: false,
    errors: [],
  };

  try {
    await call("crm.lead.list", { start: 0 });
    report.canListLeads = true;
  } catch (error) {
    report.errors.push(errorMessage(error));
  }

  try {
    await call("crm.dealcategory.list", { start: 0 });
    report.canListDealCategories = true;
  } catch (error) {
    report.errors.push(errorMessage(error));
  }

  return report;
}
