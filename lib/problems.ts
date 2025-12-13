import { ProblemData } from '@/data/problems/types'
import twoSumData from '@/data/problems/two-sum.json'
import reverseStringData from '@/data/problems/reverse-string.json'

// Registry of all available problems
const problemRegistry: Record<string, ProblemData> = {
  'two-sum': twoSumData as ProblemData,
  'reverse-string': reverseStringData as ProblemData,
}

/**
 * Get a problem by its ID
 * @param id The problem ID (e.g., 'two-sum')
 * @returns The problem data or null if not found
 */
export function getProblemById(id: string): ProblemData | null {
  return problemRegistry[id] || null
}

/**
 * Get all available problem IDs
 * @returns Array of problem IDs
 */
export function getAllProblemIds(): string[] {
  return Object.keys(problemRegistry)
}

/**
 * Check if a problem exists
 * @param id The problem ID to check
 * @returns true if the problem exists, false otherwise
 */
export function problemExists(id: string): boolean {
  return id in problemRegistry
}
