"use client";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import type { User } from "~/server/mocks/types";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface ProfileSectionProps {
  user: User;
}

export function ProfileSection({ user }: ProfileSectionProps) {
  const initials = getInitials(user.name);

  return (
    <Card className="rounded-lg border border-slate-200 bg-white py-5 text-slate-950 shadow-none ring-0">
      <CardHeader className="gap-1 px-5">
        <CardTitle className="text-lg font-semibold leading-7 text-slate-900">
          Profile
        </CardTitle>
        <CardDescription className="text-sm font-normal leading-5 text-slate-500">
          Your identity as seen by this dashboard. Read-only in Phase 1.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5">
        <div className="flex min-h-16 items-center gap-4">
          <Avatar size="lg">
            {user.image ? (
              <AvatarImage src={user.image} alt={user.name} />
            ) : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <dl className="space-y-1">
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.04em] text-slate-500">
                Name
              </dt>
              <dd className="text-sm font-medium leading-5 text-slate-900">
                {user.name}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.04em] text-slate-500">
                Email
              </dt>
              <dd className="text-sm font-normal leading-5 text-slate-700">
                {user.email}
              </dd>
            </div>
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}
