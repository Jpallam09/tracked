import { atsDomains } from "@/lib/jobhunt/config/ats-domains"
import {
  sentKeywords,
  subjectKeywords,
} from "@/lib/jobhunt/config/keywords"
import { jobHuntLabel } from "@/lib/jobhunt/config/labels"

export interface DiscoveryQueryInput {
  domains: string[]
  subjectKeywords: string[]
  sentKeywords: string[]
  jobHuntLabel: string
}

export function defaultDiscoveryQueryInput(): DiscoveryQueryInput {
  return {
    domains: [...atsDomains],
    subjectKeywords: [...subjectKeywords],
    sentKeywords: [...sentKeywords],
    jobHuntLabel,
  }
}

function wrap(value: string): string {
  return /\s/.test(value) ? `"${value}"` : value
}

function orClause(values: string[]): string {
  if (values.length === 0) return ""
  const parts = values.map(wrap)
  return parts.length === 1 ? parts[0] : `(${parts.join(" OR ")})`
}

/**
 * Builds the single Gmail search query for discovery (Strategy A ∪ B ∪ C ∪ D
 * from doc/main-feature/01-email-discovery.md).
 */
export function buildDiscoveryQuery(
  input: DiscoveryQueryInput = defaultDiscoveryQueryInput()
): string {
  const parts: string[] = [
    orClause(input.domains.map((domain) => `from:${domain}`)),
  ]
  if (input.subjectKeywords.length > 0) {
    parts.push(orClause(input.subjectKeywords))
  }
  if (input.sentKeywords.length > 0) {
    parts.push(
      `(from:me ${orClause(input.sentKeywords)} has:attachment filename:pdf)`
    )
  }
  if (input.jobHuntLabel) {
    parts.push(`label:${input.jobHuntLabel}`)
  }
  const nonEmpty = parts.filter(Boolean)
  if (nonEmpty.length === 0) return ""
  return nonEmpty.length === 1 ? nonEmpty[0] : `(${nonEmpty.join(" OR ")})`
}