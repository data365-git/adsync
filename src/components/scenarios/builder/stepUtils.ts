import type { ModuleType } from "~/server/mocks/types";
import { getModule } from "~/lib/modules";

/**
 * Returns true when the module's output is an array of items.
 * Downstream cards use this to show the iterator badge and prefix
 * FieldMappingPicker option keys with `item.`.
 */
export function moduleProducesArray(moduleType: ModuleType): boolean {
  return getModule(moduleType)?.outputsArray === true;
}

/**
 * Returns the number of items in the module's sampleOutput array.
 * Falls back to 1 when sampleOutput is not an array (scalar output).
 */
export function moduleSampleOutputLength(moduleType: ModuleType): number {
  const sample = getModule(moduleType)?.sampleOutput;
  return Array.isArray(sample) ? sample.length : 1;
}
