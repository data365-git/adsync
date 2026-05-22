"use client";

import type { OAuthConnection } from "~/server/mocks/types";
import { ConnectionCard } from "~/components/connections/ConnectionCard";

type FrontendConnection = OAuthConnection & {
  scope?: string | null;
  issuedAt?: Date | null;
  updatedAt?: Date | null;
};

interface GoogleConnectionCardProps {
  connection: FrontendConnection;
}

export function GoogleConnectionCard({ connection }: GoogleConnectionCardProps) {
  return <ConnectionCard connection={connection} />;
}
