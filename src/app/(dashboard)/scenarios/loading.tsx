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
          <div className="h-7 w-28 rounded-md bg-muted animate-pulse" />
          <div className="h-4 w-72 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-8 w-32 rounded-lg bg-muted animate-pulse shrink-0" />
      </div>

      {/* Banner skeleton */}
      <div className="flex items-center gap-3 rounded-xl border bg-muted/50 px-4 py-3">
        <div className="h-8 w-8 rounded-md bg-muted animate-pulse shrink-0" />
        <div className="flex flex-col gap-1 flex-1">
          <div className="h-4 w-40 rounded bg-muted animate-pulse" />
          <div className="h-3 w-80 rounded bg-muted animate-pulse" />
        </div>
      </div>

      {/* Filter bar skeleton */}
      <div className="flex items-center gap-2 h-6">
        <div className="h-[14px] w-6 rounded-full bg-muted animate-pulse" />
        <div className="h-4 w-44 rounded bg-muted animate-pulse" />
      </div>

      {/* Desktop skeleton table */}
      <div className="hidden md:block rounded-xl border">
        <Table aria-label="Loading scenarios">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Last Run</TableHead>
              <TableHead className="w-10 sr-only">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4].map((i) => (
              <TableRow key={i} className="h-14">
                <td className="p-2">
                  <div className="flex flex-col gap-1">
                    <div className="h-4 w-44 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-14 rounded bg-muted animate-pulse" />
                  </div>
                </td>
                <td className="p-2">
                  <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
                </td>
                <td className="p-2">
                  <div className="h-[18px] w-8 rounded-full bg-muted animate-pulse" />
                </td>
                <td className="p-2">
                  <div className="flex flex-col gap-1">
                    <div className="h-3.5 w-16 rounded bg-muted animate-pulse" />
                    <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
                  </div>
                </td>
                <td className="p-2">
                  <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
                </td>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card skeletons */}
      <div className="md:hidden flex flex-col gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border p-4 flex flex-col gap-3 h-[180px] animate-pulse"
          >
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1 flex-1">
                <div className="h-4 w-36 rounded bg-muted" />
                <div className="h-5 w-16 rounded-full bg-muted" />
              </div>
              <div className="h-11 w-11 rounded-lg bg-muted shrink-0" />
            </div>
            <div className="flex items-start gap-2">
              <div className="h-3.5 w-14 rounded bg-muted" />
              <div className="flex flex-col gap-1">
                <div className="h-3.5 w-16 rounded bg-muted" />
                <div className="h-5 w-20 rounded-full bg-muted" />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="h-[18px] w-16 rounded-full bg-muted" />
              <div className="h-11 w-24 rounded-lg bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
