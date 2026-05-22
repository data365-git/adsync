import { adAccountsRouter } from "~/server/api/routers/adAccounts";
import { authRouter } from "~/server/api/routers/auth";
import { connectionsRouter } from "~/server/api/routers/connections";
import { fbRouter } from "~/server/api/routers/fb";
import { foldersRouter } from "~/server/api/routers/folders";
import { modulesRouter } from "~/server/api/routers/modules";
import { runLogsRouter } from "~/server/api/routers/runLogs";
import { runsRouter } from "~/server/api/routers/runs";
import { scenariosRouter } from "~/server/api/routers/scenarios";
import { searchRouter } from "~/server/api/routers/search";
import { settingsRouter } from "~/server/api/routers/settings";
import { syncRouter } from "~/server/api/routers/sync";
import { userSettingsRouter } from "~/server/api/routers/userSettings";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  connections: connectionsRouter,
  adAccounts: adAccountsRouter,
  runs: runsRouter,
  runLogs: runLogsRouter,
  settings: settingsRouter,
  fb: fbRouter,
  folders: foldersRouter,
  scenarios: scenariosRouter,
  search: searchRouter,
  modules: modulesRouter,
  sync: syncRouter,
  userSettings: userSettingsRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
