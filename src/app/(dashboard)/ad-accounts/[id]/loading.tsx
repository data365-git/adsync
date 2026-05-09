import { FormSkeleton } from "~/components/ad-accounts/form/AdAccountForm";

export default function EditAdAccountLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Breadcrumb skeleton */}
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />

      {/* Heading skeleton */}
      <div className="space-y-2">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      </div>

      {/* Form skeleton */}
      <FormSkeleton />
    </div>
  );
}
