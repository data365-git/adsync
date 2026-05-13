/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // googleapis and its auth deps are CJS-only packages with complex require()
  // chains. Tell Next.js (both webpack and Turbopack) to leave them as native
  // Node.js requires instead of bundling them — avoids HMR graph corruption in
  // Turbopack and keeps production builds fast.
  serverExternalPackages: [
    "googleapis",
    "google-auth-library",
    "gaxios",
    "gcp-metadata",
    "@prisma/client",
    "@auth/prisma-adapter",
    "prisma",
  ],
};

export default config;
