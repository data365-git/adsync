import * as React from "react";
import { type Metadata } from "next";

import { NewScenarioClient } from "./NewScenarioClient";

export const metadata: Metadata = {
  title: "New Scenario",
};

export default function NewScenarioPage() {
  return <NewScenarioClient />;
}
