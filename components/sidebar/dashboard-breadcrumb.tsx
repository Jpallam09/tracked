"use client"

import { usePathname } from "next/navigation"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"

const LABELS: Record<string, string> = {
  "/dashboard": "Project Management & Task Tracking",
  "/applications": "Job Hunt",
}

export function DashboardBreadcrumb() {
  const pathname = usePathname()
  const label = LABELS[pathname] ?? "Dashboard"
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage className="line-clamp-1">
            {label}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}