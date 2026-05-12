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
    <main
      id="main"
      tabIndex={-1}
      className="bg-background flex min-h-screen items-center justify-center p-6"
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="bg-muted mb-3 flex size-10 items-center justify-center rounded-md">
            <ShieldAlert
              className="text-muted-foreground size-5"
              aria-hidden="true"
            />
          </div>
          <CardTitle>Access restricted</CardTitle>
          <CardDescription>
            Your account isn&apos;t on the access list. Contact the
            administrator to request access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            If you believe this is a mistake, reach out to the dashboard owner
            at{" "}
            <a
              href="mailto:jumanovsamandar005@gmail.com"
              className="text-foreground hover:text-primary font-medium underline underline-offset-4"
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
