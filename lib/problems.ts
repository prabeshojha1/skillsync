import { ProblemData } from '@/data/problems/types'
import twoSumData from '@/data/problems/two-sum.json'
import reverseStringData from '@/data/problems/reverse-string.json'
import mergeIntervalsData from '@/data/problems/merge-intervals.json'
import binaryTreeMaxPathSumData from '@/data/problems/binary-tree-max-path-sum.json'

// Registry of all available problems
const problemRegistry: Record<string, ProblemData> = {
  'two-sum': twoSumData as ProblemData,
  'reverse-string': reverseStringData as ProblemData,
  'merge-intervals': mergeIntervalsData as ProblemData,
  'binary-tree-max-path-sum': binaryTreeMaxPathSumData as ProblemData,
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
  return exerciseToProblemMap[title] || null
}

