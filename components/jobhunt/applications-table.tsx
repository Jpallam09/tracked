import { format } from "date-fns"

import { RefreshButton } from "@/components/jobhunt/refresh-button"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { DiscoveryResult } from "@/lib/jobhunt/discovery"

function formatDate(iso: string): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return format(date, "MMM d")
}

function pageNumbers(
  current: number,
  total: number
): (number | "left" | "right")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const numbers: (number | "left" | "right")[] = [1]
  if (current > 4) numbers.push("left")
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) numbers.push(i)
  if (current < total - 3) numbers.push("right")
  numbers.push(total)
  return numbers
}

export function ApplicationsTable({
  candidates,
  page,
  pageSize,
  hasNext,
  totalEstimate,
}: DiscoveryResult) {
  const pageCount = Math.max(1, Math.ceil(totalEstimate / pageSize))

  return (
    <div className="flex w-full min-w-0 flex-col gap-3 p-4 lg:p-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {totalEstimate} candidate email{totalEstimate === 1 ? "" : "s"} found
        </p>
        <RefreshButton />
      </div>

      {candidates.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-center">
          <p className="text-sm font-medium">No candidates found</p>
          <p className="text-xs text-muted-foreground">
            Widen the lists in lib/jobhunt/config/ or add the {"#JobHunt"} label
            to a stray thread.
          </p>
        </div>
      ) : (
        <div className="min-w-0 overflow-hidden">
          <Table size="compact" className="w-full table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Date</TableHead>
                <TableHead className="w-56">From</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="w-64 text-right">Snippet</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((email, index) => (
                <TableRow key={email.id} index={index}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {formatDate(email.date)}
                  </TableCell>
                  <TableCell className="truncate" title={email.from}>
                    {email.from}
                  </TableCell>
                  <TableCell
                    className="truncate font-medium"
                    title={email.subject}
                  >
                    {email.subject || "(no subject)"}
                  </TableCell>
                  <TableCell
                    className="truncate text-right"
                    title={email.snippet}
                  >
                    {email.snippet}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pageCount > 1 ? (
        <Pagination className="mt-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={`/applications?page=${Math.max(1, page - 1)}`}
                className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                aria-disabled={page <= 1}
              />
            </PaginationItem>
            {pageNumbers(Math.min(page, pageCount), pageCount).map(
              (value, i) =>
                typeof value === "number" ? (
                  <PaginationItem key={value}>
                    <PaginationLink
                      href={`/applications?page=${value}`}
                      isActive={value === page}
                    >
                      {value}
                    </PaginationLink>
                  </PaginationItem>
                ) : (
                  <PaginationItem key={`${value}-${i}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                )
            )}
            <PaginationItem>
              <PaginationNext
                href={`/applications?page=${page + 1}`}
                className={!hasNext ? "pointer-events-none opacity-50" : ""}
                aria-disabled={!hasNext}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  )
}
