import { z } from "zod";

import { MOCK_RUN_LOGS } from "~/server/mocks/data";
import type { RunLog } from "~/server/mocks/types";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const runLogsRouter = createTRPCRouter({
  byRunId: publicProcedure
    .input(z.object({ runId: z.string() }))
    .query(({ input }): RunLog[] =>
      MOCK_RUN_LOGS.filter((l) => l.runId === input.runId).sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      ),
    ),
});
