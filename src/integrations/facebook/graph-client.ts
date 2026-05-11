/**
 * Stub — real implementation provided by Agent C on branch phase2/facebook-client.
 * This file exists only so that module-handlers.ts can import and tests can vi.mock it.
 * DO NOT add logic here — Agent C owns this file in their branch.
 */

export async function getAccountInsights(
  _userId: string,
  _params: unknown,
): Promise<unknown[]> {
  throw new Error("graph-client stub: not implemented — Agent C provides real implementation");
}

export async function getCampaignInsights(
  _userId: string,
  _params: unknown,
): Promise<unknown[]> {
  throw new Error("graph-client stub: not implemented");
}

export async function getAdInsights(
  _userId: string,
  _params: unknown,
): Promise<unknown[]> {
  throw new Error("graph-client stub: not implemented");
}
