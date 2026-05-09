import { z } from "zod";

import { MOCK_RUNS } from "~/server/mocks/data";
import type { Run } from "~/server/mocks/types";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const StatusSchema = z.enum(["queued", "running", "success", "failed"]);

const ListInputSchema = z.object({
  accountIds: z.array(z.string()).optional(),
  statuses: z.array(StatusSchema).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
});

export type RunsListResult = {
  runs: Run[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const runsRouter = createTRPCRouter({
  list: publicProcedure
    .input(ListInputSchema.optional())
    .query(({ input }): RunsListResult => {
      const opts = input ?? { page: 1, pageSize: 10 };
      const filtered = MOCK_RUNS.filter((r) => {
        if (opts.accountIds && opts.accountIds.length > 0) {
          if (!opts.accountIds.includes(r.adAccountId)) return false;
        }
        if (opts.statuses && opts.statuses.length > 0) {
          if (!opts.statuses.includes(r.status)) return false;
        }
        return true;
      });
      const sorted = [...filtered].sort(
        (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
      );
      const total = sorted.length;
      const totalPages = Math.max(1, Math.ceil(total / opts.pageSize));
      const start = (opts.page - 1) * opts.pageSize;
      const runs = sorted.slice(start, start + opts.pageSize);
      return {
        runs,
        total,
        page: opts.page,
        pageSize: opts.pageSize,
        totalPages,
      };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }): Run => {
      const run = MOCK_RUNS.find((r) => r.id === input.id);
      if (!run) throw new Error(`Run ${input.id} not found`);
      return run;
    }),
});
