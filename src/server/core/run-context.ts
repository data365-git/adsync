/**
 * RunContext — carries inter-step data during a single scenario execution.
 *
 * Each step stores its output rows by position. Downstream steps can call
 * `getUpstreamRows(currentPosition)` to get data from the most recent prior
 * position that produced rows.
 */

type StepMeta = {
  durationMs?: number;
  rowCount?: number;
  sheetsUrl?: string;
  [key: string]: unknown;
};

export class RunContext {
  /** step position → array of row objects */
  outputs: Map<number, unknown[]> = new Map<number, unknown[]>();
  /** step position → metadata about the step run */
  meta: Map<number, StepMeta> = new Map<number, StepMeta>();

  setOutput(position: number, rows: unknown[]): void {
    this.outputs.set(position, rows);
  }

  getOutput(position: number): unknown[] {
    return this.outputs.get(position) ?? [];
  }

  setMeta(position: number, data: StepMeta): void {
    this.meta.set(position, data);
  }

  getMeta(position: number): StepMeta | undefined {
    return this.meta.get(position);
  }

  /**
   * Returns rows from the most recent prior position (< currentPosition)
   * that has data. Returns [] if no upstream data exists.
   */
  getUpstreamRows(currentPosition: number): unknown[] {
    let bestPosition = -1;
    for (const [pos] of this.outputs) {
      if (pos < currentPosition && pos > bestPosition) {
        const rows = this.outputs.get(pos);
        if (rows && rows.length > 0) {
          bestPosition = pos;
        }
      }
    }
    if (bestPosition === -1) return [];
    return this.outputs.get(bestPosition) ?? [];
  }
}
