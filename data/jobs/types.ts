export type JobStatus = 'active' | 'closed' | 'draft'

export interface JobPosting {
  id: string
  companyId: string
  role: string
  description: string
  skills: string[]
  composition?: string
  postedAt: string
  status: JobStatus
  applicantCount: number
}
