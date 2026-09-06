// @vitest-environment node

import { describe, expect, it } from "vitest"

import { atsDomains } from "@/lib/jobhunt/config/ats-domains"
import {
  sentKeywords,
  subjectKeywords,
} from "@/lib/jobhunt/config/keywords"
import { jobHuntLabel } from "@/lib/jobhunt/config/labels"
import {
  buildDiscoveryQuery,
  defaultDiscoveryQueryInput,
} from "@/lib/jobhunt/gmail/search"

describe("buildDiscoveryQuery", () => {
  it("builds the default combined query (A ∪ B ∪ C ∪ D)", () => {
    const query = buildDiscoveryQuery()

    expect(query).toBe(
      `((from:linkedin.com OR from:indeed.com OR from:jobstreet.com OR ` +
        `from:jobstreet.com.ph OR from:onlinejobs.ph) OR ` +
        `("your application" OR "thank you for applying" OR interview OR ` +
        `"next steps" OR "we regret to inform" OR position OR role) OR ` +
        `(from:me (resume OR application OR "cover letter") ` +
        `has:attachment filename:pdf) OR label:JobHunt)`
    )
  })

  it("quotes only phrases containing spaces", () => {
    const query = buildDiscoveryQuery({
      domains: ["acme.com"],
      subjectKeywords: ["your application", "interview"],
      sentKeywords: ["resume", "cover letter"],
      jobHuntLabel: "JobHunt",
    })

    expect(query).toBe(
      `(from:acme.com OR ("your application" OR interview) OR ` +
        `(from:me (resume OR "cover letter") has:attachment filename:pdf) ` +
        `OR label:JobHunt)`
    )
  })

  it("drops empty clauses without breaking the query", () => {
    const query = buildDiscoveryQuery({
      domains: [],
      subjectKeywords: ["interview"],
      sentKeywords: [],
      jobHuntLabel: "",
    })

    expect(query).toBe("interview")
  })

  it("returns a bare clause when a single strategy is present", () => {
    const query = buildDiscoveryQuery({
      domains: ["acme.com"],
      subjectKeywords: [],
      sentKeywords: [],
      jobHuntLabel: "",
    })

    expect(query).toBe("from:acme.com")
  })

  it("returns an empty string when every clause is absent", () => {
    const query = buildDiscoveryQuery({
      domains: [],
      subjectKeywords: [],
      sentKeywords: [],
      jobHuntLabel: "",
    })

    expect(query).toBe("")
  })
})

describe("config (editable data)", () => {
  it("has the expected strategy A whitelist", () => {
    expect([...atsDomains]).toEqual([
      "linkedin.com",
      "indeed.com",
      "jobstreet.com",
      "jobstreet.com.ph",
      "onlinejobs.ph",
    ])
  })

  it("defaults match the strategy B and C keyword lists", () => {
    const input = defaultDiscoveryQueryInput()
    expect(input.subjectKeywords).toEqual([...subjectKeywords])
    expect(input.sentKeywords).toEqual([...sentKeywords])
    expect(input.jobHuntLabel).toBe(jobHuntLabel)
  })
})