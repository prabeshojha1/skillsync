import { ProblemData } from '@/data/problems/types'
import twoSumData from '@/data/problems/two-sum.json'
import reverseStringData from '@/data/problems/reverse-string.json'
import mergeIntervalsData from '@/data/problems/merge-intervals.json'
import binaryTreeMaxPathSumData from '@/data/problems/binary-tree-max-path-sum.json'

// Storage key for custom problems
const CUSTOM_PROBLEMS_KEY = 'custom_problems'

// Registry of all available problems (static)
const staticProblemRegistry: Record<string, ProblemData> = {
  'two-sum': twoSumData as ProblemData,
  'reverse-string': reverseStringData as ProblemData,
  'merge-intervals': mergeIntervalsData as ProblemData,
  'binary-tree-max-path-sum': binaryTreeMaxPathSumData as ProblemData,
}

/**
 * Get custom problems from localStorage
 */
function getCustomProblems(): Record<string, ProblemData> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(CUSTOM_PROBLEMS_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

/**
 * Save custom problems to localStorage
 */
function saveCustomProblems(problems: Record<string, ProblemData>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CUSTOM_PROBLEMS_KEY, JSON.stringify(problems))
  } catch (error) {
    console.error('Failed to save custom problems:', error)
  }
}

/**
 * Get the full problem registry (static + custom)
 */
function getProblemRegistry(): Record<string, ProblemData> {
  return {
    ...staticProblemRegistry,
    ...getCustomProblems(),
  }
}

/**
 * Get a problem by its ID
 * @param id The problem ID (e.g., 'two-sum')
 * @returns The problem data or null if not found
 */
export function getProblemById(id: string): ProblemData | null {
  const registry = getProblemRegistry()
  return registry[id] || null
}

/**
 * Get all available problem IDs
 * @returns Array of problem IDs
 */
export function getAllProblemIds(): string[] {
  return Object.keys(getProblemRegistry())
}

/**
 * Get all problems
 * @returns Array of all problem data
 */
export function getAllProblems(): ProblemData[] {
  return Object.values(getProblemRegistry())
}

/**
 * Get problems by company ID
 * @param companyId The company ID to filter by
 * @returns Array of problems for that company
 */
export function getProblemsByCompany(companyId: string): ProblemData[] {
  const registry = getProblemRegistry()
  return Object.values(registry).filter(p => p.companyId === companyId)
}

/**
 * Check if a problem exists
 * @param id The problem ID to check
 * @returns true if the problem exists, false otherwise
 */
export function problemExists(id: string): boolean {
  return id in getProblemRegistry()
}

/**
 * Add a new custom problem
 * @param problem The problem data to add
 * @returns true if successful, false if problem ID already exists
 */
export function addProblem(problem: ProblemData): boolean {
  if (problemExists(problem.id)) {
    return false
  }
  
  const customProblems = getCustomProblems()
  customProblems[problem.id] = problem
  saveCustomProblems(customProblems)
  return true
}

/**
 * Update an existing custom problem
 * @param problem The problem data to update
 * @returns true if successful, false if problem doesn't exist or is static
 */
export function updateProblem(problem: ProblemData): boolean {
  // Can only update custom problems, not static ones
  if (problem.id in staticProblemRegistry) {
    return false
  }
  
  const customProblems = getCustomProblems()
  if (!(problem.id in customProblems)) {
    return false
  }
  
  customProblems[problem.id] = problem
  saveCustomProblems(customProblems)
  return true
}

/**
 * Delete a custom problem
 * @param id The problem ID to delete
 * @returns true if successful, false if problem doesn't exist or is static
 */
export function deleteProblem(id: string): boolean {
  // Can only delete custom problems, not static ones
  if (id in staticProblemRegistry) {
    return false
  }
  
  const customProblems = getCustomProblems()
  if (!(id in customProblems)) {
    return false
  }
  
  delete customProblems[id]
  saveCustomProblems(customProblems)
  return true
}

// Mapping of exercise titles to problem IDs
const exerciseToProblemMap: Record<string, string> = {
  'Two Sum': 'two-sum',
  'Merge Intervals': 'merge-intervals',
  'Binary Tree Maximum Path Sum': 'binary-tree-max-path-sum',
}

/**
 * Get the problem ID from an exercise title
 * @param title The exercise title (e.g., 'Two Sum')
 * @returns The problem ID or null if not found
 */
export function getProblemIdFromExerciseTitle(title: string): string | null {
  // First check the static map
  if (title in exerciseToProblemMap) {
    return exerciseToProblemMap[title]
  }
  
  // Then check all problems by title
  const allProblems = getAllProblems()
  const problem = allProblems.find(p => p.title === title)
  return problem?.id || null
}

/**
 * Generate a slug from a title
 * @param title The title to convert
 * @returns A URL-friendly slug
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
