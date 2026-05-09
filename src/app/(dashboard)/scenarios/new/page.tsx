import * as React from "react";
import { type Metadata } from "next";
import { NewScenarioClient } from "./NewScenarioClient";

export const metadata: Metadata = {
  title: "New Scenario",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NewScenarioPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const templateId = typeof params.template === "string" ? params.template : undefined;

  return <NewScenarioClient templateId={templateId} />;
}
