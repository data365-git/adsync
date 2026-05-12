import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

/**
 * Suspense fallback for the /scenarios route.
 * Skeleton dimensions match the real table/card rows exactly (h-14 rows, same column rhythm)
 * to prevent layout shift on hydration.
 */
export default function ScenariosLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="bg-muted h-7 w-28 rounded-md motion-safe:animate-pulse motion-reduce:opacity-70" />
          <div className="bg-muted h-4 w-72 rounded motion-safe:animate-pulse motion-reduce:opacity-70" />
        </div>
        <div className="bg-muted h-8 w-32 shrink-0 rounded-lg motion-safe:animate-pulse motion-reduce:opacity-70" />
      </div>

      {/* Banner skeleton */}
      <div className="bg-muted/50 flex items-center gap-3 rounded-xl border px-4 py-3">
        <div className="bg-muted h-8 w-8 shrink-0 rounded-md motion-safe:animate-pulse motion-reduce:opacity-70" />
        <div className="flex flex-1 flex-col gap-1">
          <div className="bg-muted h-4 w-40 rounded motion-safe:animate-pulse motion-reduce:opacity-70" />
          <div className="bg-muted h-3 w-80 rounded motion-safe:animate-pulse motion-reduce:opacity-70" />
        </div>
      </div>

      {/* Filter bar skeleton */}
      <div className="flex h-6 items-center gap-2">
        <div className="bg-muted h-[14px] w-6 rounded-full motion-safe:animate-pulse motion-reduce:opacity-70" />
        <div className="bg-muted h-4 w-44 rounded motion-safe:animate-pulse motion-reduce:opacity-70" />
      </div>

      {/* Desktop skeleton table */}
      <div className="hidden rounded-xl border md:block">
        <Table aria-label="Loading scenarios">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Last Run</TableHead>
              <TableHead className="sr-only w-10">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4].map((i) => (
              <TableRow key={i} className="h-14">
                <td className="p-2">
                  <div className="flex flex-col gap-1">
                    <div className="bg-muted h-4 w-44 rounded motion-safe:animate-pulse motion-reduce:opacity-70" />
                    <div className="bg-muted h-3 w-14 rounded motion-safe:animate-pulse motion-reduce:opacity-70" />
                  </div>
                </td>
                <td className="p-2">
                  <div className="bg-muted h-5 w-16 rounded-full motion-safe:animate-pulse motion-reduce:opacity-70" />
                </td>
                <td className="p-2">
                  <div className="bg-muted h-[18px] w-8 rounded-full motion-safe:animate-pulse motion-reduce:opacity-70" />
                </td>
                <td className="p-2">
                  <div className="flex flex-col gap-1">
                    <div className="bg-muted h-3.5 w-16 rounded motion-safe:animate-pulse motion-reduce:opacity-70" />
                    <div className="bg-muted h-5 w-20 rounded-full motion-safe:animate-pulse motion-reduce:opacity-70" />
                  </div>
                </td>
                <td className="p-2">
                  <div className="bg-muted h-8 w-8 rounded-lg motion-safe:animate-pulse motion-reduce:opacity-70" />
                </td>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card skeletons */}
      <div className="flex flex-col gap-3 md:hidden">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex h-[180px] flex-col gap-3 rounded-xl border p-4 motion-safe:animate-pulse motion-reduce:opacity-70"
          >
            <div className="flex items-start justify-between">
              <div className="flex flex-1 flex-col gap-1">
                <div className="bg-muted h-4 w-36 rounded" />
                <div className="bg-muted h-5 w-16 rounded-full" />
              </div>
              <div className="bg-muted h-11 w-11 shrink-0 rounded-lg" />
            </div>
            <div className="flex items-start gap-2">
              <div className="bg-muted h-3.5 w-14 rounded" />
              <div className="flex flex-col gap-1">
                <div className="bg-muted h-3.5 w-16 rounded" />
                <div className="bg-muted h-5 w-20 rounded-full" />
              </div>
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <div className="bg-muted h-[18px] w-16 rounded-full" />
              <div className="bg-muted h-11 w-24 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
