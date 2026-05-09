import * as React from "react";
import { type Metadata } from "next";
import { ScenarioDetailClient } from "./ScenarioDetailClient";

export const metadata: Metadata = {
  title: "Scenario",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ScenarioDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <ScenarioDetailClient id={id} />;
}
