export interface CandidateEmail {
  id: string
  threadId: string
  date: string
  from: string
  to: string
  subject: string
  snippet: string
}

export type ReadEmail = CandidateEmail & { body: string }
