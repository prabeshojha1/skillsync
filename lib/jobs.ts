import { JobPosting } from '@/data/jobs/types'
import cliniqJobs from '@/data/jobs/cliniq.json'

// Storage key for custom jobs
const CUSTOM_JOBS_KEY = 'custom_jobs'

// Static job registry (from JSON files)
const staticJobRegistry: Record<string, JobPosting[]> = {
  'cliniq': cliniqJobs as JobPosting[],
}

/**
 * Get custom jobs from localStorage
 */
function getCustomJobs(): JobPosting[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(CUSTOM_JOBS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/**
 * Save custom jobs to localStorage
 */
function saveCustomJobs(jobs: JobPosting[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CUSTOM_JOBS_KEY, JSON.stringify(jobs))
  } catch (error) {
    console.error('Failed to save custom jobs:', error)
  }
}

/**
 * Get all jobs (static + custom)
 */
export function getAllJobs(): JobPosting[] {
  const staticJobs = Object.values(staticJobRegistry).flat()
  const customJobs = getCustomJobs()
  return [...staticJobs, ...customJobs]
}

/**
 * Get jobs by company ID
 */
export function getJobsByCompany(companyId: string): JobPosting[] {
  const allJobs = getAllJobs()
  return allJobs.filter(job => job.companyId === companyId)
}

/**
 * Get a job by ID
 */
export function getJobById(id: string): JobPosting | null {
  const allJobs = getAllJobs()
  return allJobs.find(job => job.id === id) || null
}

/**
 * Check if a job exists
 */
export function jobExists(id: string): boolean {
  return getJobById(id) !== null
}

/**
 * Add a new custom job
 */
export function addJob(job: JobPosting): boolean {
  if (jobExists(job.id)) {
    return false
  }
  
  const customJobs = getCustomJobs()
  customJobs.push(job)
  saveCustomJobs(customJobs)
  return true
}

/**
 * Update an existing custom job
 */
export function updateJob(job: JobPosting): boolean {
  const customJobs = getCustomJobs()
  const index = customJobs.findIndex(j => j.id === job.id)
  
  if (index === -1) {
    // Check if it's a static job - can't update those
    const staticJobs = Object.values(staticJobRegistry).flat()
    if (staticJobs.some(j => j.id === job.id)) {
      return false
    }
    return false
  }
  
  customJobs[index] = job
  saveCustomJobs(customJobs)
  return true
}

/**
 * Delete a custom job
 */
export function deleteJob(id: string): boolean {
  const customJobs = getCustomJobs()
  const index = customJobs.findIndex(j => j.id === id)
  
  if (index === -1) {
    return false
  }
  
  customJobs.splice(index, 1)
  saveCustomJobs(customJobs)
  return true
}

/**
 * Generate a slug from a role title
 */
export function generateJobSlug(companyId: string, role: string): string {
  const baseSlug = role
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${companyId}-${baseSlug}-${Date.now()}`
}

/**
 * Get active jobs only
 */
export function getActiveJobs(): JobPosting[] {
  return getAllJobs().filter(job => job.status === 'active')
}

/**
 * Get active jobs by company
 */
export function getActiveJobsByCompany(companyId: string): JobPosting[] {
  return getJobsByCompany(companyId).filter(job => job.status === 'active')
}
