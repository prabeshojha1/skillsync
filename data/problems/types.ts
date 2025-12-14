export type Difficulty = 'Easy' | 'Medium' | 'Hard'

export interface ProblemExample {
  input: string
  output: string
  explanation: string
}

export interface ProblemTestCase {
  id: string
  name: string
  input: string
  expectedOutput: string
}

export interface ProblemData {
  id: string
  title: string
  difficulty: Difficulty
  description: string
  functionName: string
  boilerplate: string
  examples: ProblemExample[]
  constraints: string[]
  testCases: ProblemTestCase[]
  companyId: string // The company that created this problem
  jobId?: string // Optional: linked job posting
}

