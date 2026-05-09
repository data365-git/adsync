import { adAccountsRouter } from "~/server/api/routers/adAccounts";
import { authRouter } from "~/server/api/routers/auth";
import { connectionsRouter } from "~/server/api/routers/connections";
import { fbRouter } from "~/server/api/routers/fb";
import { runLogsRouter } from "~/server/api/routers/runLogs";
import { runsRouter } from "~/server/api/routers/runs";
import { settingsRouter } from "~/server/api/routers/settings";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  connections: connectionsRouter,
  adAccounts: adAccountsRouter,
  runs: runsRouter,
  runLogs: runLogsRouter,
  settings: settingsRouter,
  fb: fbRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
