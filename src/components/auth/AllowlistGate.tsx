"use client";

import { ShieldAlert } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";

export function AllowlistGate() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-muted">
            <ShieldAlert className="size-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <CardTitle>Access restricted</CardTitle>
          <CardDescription>
            Your account isn&apos;t on the access list. Contact the administrator
            to request access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            If you believe this is a mistake, reach out to the dashboard owner
            at{" "}
            <a
              href="mailto:jumanovsamandar005@gmail.com"
              className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
            >
              jumanovsamandar005@gmail.com
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
