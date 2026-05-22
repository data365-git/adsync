"use client";

import type { OAuthConnection } from "~/server/mocks/types";
import { ConnectionCard } from "~/components/connections/ConnectionCard";

type FrontendConnection = OAuthConnection & {
  scope?: string | null;
  issuedAt?: Date | null;
  updatedAt?: Date | null;
};

interface FacebookConnectionCardProps {
  connection: FrontendConnection;
}

export function FacebookConnectionCard({
  connection,
}: FacebookConnectionCardProps) {
  return <ConnectionCard connection={connection} />;
}
