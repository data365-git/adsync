import { FormSkeleton } from "~/components/ad-accounts/form/AdAccountForm";

export default function EditAdAccountLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Breadcrumb skeleton */}
      <div className="h-4 w-32 rounded bg-slate-100 motion-safe:animate-pulse motion-reduce:opacity-70" />

      {/* Heading skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 rounded bg-slate-100 motion-safe:animate-pulse motion-reduce:opacity-70" />
        <div className="h-4 w-72 rounded bg-slate-100 motion-safe:animate-pulse motion-reduce:opacity-70" />
      </div>

      {/* Form skeleton */}
      <FormSkeleton />
    </div>
  );
}
