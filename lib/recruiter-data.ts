// Recruiter dashboard data types and mock data

import { getAllJobs } from '@/lib/jobs'
import { JobPosting } from '@/data/jobs/types'

export type CheatingFlagType = 'tab_switch' | 'copy_paste' | 'looked_away'

export type CheatingFlag = {
  type: CheatingFlagType
  timestamp: string
  details: string
}

export type ChangeEvent = {
  changes: Array<{
    range: {
      startLineNumber: number
      startColumn: number
      endLineNumber: number
      endColumn: number
    }
    text: string
  }>
  timestamp: number
}

export type ApplicantSubmission = {
  id: string
  applicantName: string
  applicantEmail: string
  score: number // out of 10
  submittedAt: string
  timeSpent: string
  cheatingFlags: CheatingFlag[]
  recordedChanges?: ChangeEvent[] // Editor change events for replay
  finalCode?: string // Final code state at submission
  audioFileName?: string // Audio recording filename (e.g., {submissionId}.webm)
}

export type RecruiterChallenge = {
  id: string
  title: string
  description: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  timeLimit: string
  applicantCount: number
  createdAt: string
}

// Re-export JobPosting as RecruiterJob for backward compatibility
export type RecruiterJob = JobPosting

// Job applicant data structure
export type JobApplicant = {
  id: string
  name: string
  email: string
  resumeFitness: number // 0-10 score
  submissions: {
    challengeId: string
    score: number
    violations: number
  }[]
}

// Mock challenges for recruiter
export const recruiterChallenges: RecruiterChallenge[] = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    description: 'Find two numbers that add up to a target value.',
    difficulty: 'Easy',
    timeLimit: '30m',
    applicantCount: 45,
    createdAt: '2024-11-15',
  },
  {
    id: 'merge-intervals',
    title: 'Merge Intervals',
    description: 'Merge overlapping intervals in a collection.',
    difficulty: 'Medium',
    timeLimit: '45m',
    applicantCount: 32,
    createdAt: '2024-11-20',
  },
  {
    id: 'binary-tree-max-path-sum',
    title: 'Binary Tree Maximum Path Sum',
    description: 'Find the maximum path sum in a binary tree.',
    difficulty: 'Hard',
    timeLimit: '60m',
    applicantCount: 18,
    createdAt: '2024-11-25',
  },
  {
    id: 'patient-monitoring-system',
    title: 'Patient Monitoring System',
    description: 'Design a system to track patients and their vital readings over time.',
    difficulty: 'Hard',
    timeLimit: '60m',
    applicantCount: 56,
    createdAt: '2024-12-01',
  },
]

// Mock applicant submissions per challenge
export const challengeSubmissions: Record<string, ApplicantSubmission[]> = {
  'two-sum': [
    {
      id: 'sub-1',
      applicantName: 'Alice Johnson',
      applicantEmail: 'alice.johnson@email.com',
      score: 9.5,
      submittedAt: '2024-12-10T14:30:00Z',
      timeSpent: '18m',
      cheatingFlags: [],
    },
    {
      id: 'sub-2',
      applicantName: 'Bob Smith',
      applicantEmail: 'bob.smith@email.com',
      score: 8.0,
      submittedAt: '2024-12-10T15:45:00Z',
      timeSpent: '25m',
      cheatingFlags: [
        {
          type: 'tab_switch',
          timestamp: '2024-12-10T15:52:00Z',
          details: 'Switched to another browser tab 3 times during the assessment.',
        },
      ],
    },
    {
      id: 'sub-3',
      applicantName: 'Carol Williams',
      applicantEmail: 'carol.w@email.com',
      score: 10.0,
      submittedAt: '2024-12-09T10:20:00Z',
      timeSpent: '12m',
      cheatingFlags: [
        {
          type: 'copy_paste',
          timestamp: '2024-12-09T10:25:00Z',
          details: 'Large code block (47 lines) was pasted from external source.',
        },
        {
          type: 'tab_switch',
          timestamp: '2024-12-09T10:24:00Z',
          details: 'Switched to another browser tab 5 times during the assessment.',
        },
      ],
    },
    {
      id: 'sub-4',
      applicantName: 'David Lee',
      applicantEmail: 'david.lee@email.com',
      score: 7.5,
      submittedAt: '2024-12-08T09:15:00Z',
      timeSpent: '28m',
      cheatingFlags: [],
    },
    {
      id: 'sub-5',
      applicantName: 'Emma Davis',
      applicantEmail: 'emma.d@email.com',
      score: 6.0,
      submittedAt: '2024-12-11T11:00:00Z',
      timeSpent: '30m',
      cheatingFlags: [
        {
          type: 'looked_away',
          timestamp: '2024-12-11T11:15:00Z',
          details: 'Face not detected in webcam for extended periods (total: 4m 30s).',
        },
      ],
    },
  ],
  'merge-intervals': [
    {
      id: 'sub-6',
      applicantName: 'Frank Miller',
      applicantEmail: 'frank.m@email.com',
      score: 9.0,
      submittedAt: '2024-12-10T16:00:00Z',
      timeSpent: '35m',
      cheatingFlags: [],
    },
    {
      id: 'sub-7',
      applicantName: 'Grace Chen',
      applicantEmail: 'grace.chen@email.com',
      score: 8.5,
      submittedAt: '2024-12-09T14:30:00Z',
      timeSpent: '40m',
      cheatingFlags: [],
    },
    {
      id: 'sub-8',
      applicantName: 'Henry Wilson',
      applicantEmail: 'henry.w@email.com',
      score: 7.0,
      submittedAt: '2024-12-08T11:45:00Z',
      timeSpent: '45m',
      cheatingFlags: [
        {
          type: 'tab_switch',
          timestamp: '2024-12-08T12:00:00Z',
          details: 'Switched to another browser tab 2 times during the assessment.',
        },
        {
          type: 'looked_away',
          timestamp: '2024-12-08T12:10:00Z',
          details: 'Face not detected in webcam for extended periods (total: 2m 15s).',
        },
      ],
    },
    {
      id: 'sub-9',
      applicantName: 'Ivy Thompson',
      applicantEmail: 'ivy.t@email.com',
      score: 5.5,
      submittedAt: '2024-12-11T09:00:00Z',
      timeSpent: '45m',
      cheatingFlags: [],
    },
  ],
  'binary-tree-max-path-sum': [
    {
      id: 'sub-10',
      applicantName: 'Jack Brown',
      applicantEmail: 'jack.b@email.com',
      score: 8.0,
      submittedAt: '2024-12-10T13:00:00Z',
      timeSpent: '55m',
      cheatingFlags: [],
    },
    {
      id: 'sub-11',
      applicantName: 'Karen White',
      applicantEmail: 'karen.w@email.com',
      score: 9.5,
      submittedAt: '2024-12-09T10:00:00Z',
      timeSpent: '48m',
      cheatingFlags: [
        {
          type: 'copy_paste',
          timestamp: '2024-12-09T10:30:00Z',
          details: 'Code snippet (12 lines) was pasted that matches a known solution pattern.',
        },
      ],
    },
    {
      id: 'sub-12',
      applicantName: 'Leo Martinez',
      applicantEmail: 'leo.m@email.com',
      score: 6.5,
      submittedAt: '2024-12-08T15:30:00Z',
      timeSpent: '60m',
      cheatingFlags: [],
    },
    {
      id: 'sub-17',
      applicantName: 'Quinn Rodriguez',
      applicantEmail: 'quinn.r@email.com',
      score: 9.0,
      submittedAt: '2024-12-11T14:20:00Z',
      timeSpent: '52m',
      cheatingFlags: [],
    },
    {
      id: 'sub-18',
      applicantName: 'Rachel Kim',
      applicantEmail: 'rachel.k@email.com',
      score: 7.5,
      submittedAt: '2024-12-10T16:45:00Z',
      timeSpent: '58m',
      cheatingFlags: [
        {
          type: 'tab_switch',
          timestamp: '2024-12-10T17:00:00Z',
          details: 'Switched to another browser tab 4 times during the assessment.',
        },
      ],
    },
    {
      id: 'sub-19',
      applicantName: 'Sam Patel',
      applicantEmail: 'sam.p@email.com',
      score: 8.5,
      submittedAt: '2024-12-09T11:30:00Z',
      timeSpent: '50m',
      cheatingFlags: [],
    },
    {
      id: 'sub-20',
      applicantName: 'Tina Nguyen',
      applicantEmail: 'tina.n@email.com',
      score: 6.0,
      submittedAt: '2024-12-08T13:15:00Z',
      timeSpent: '60m',
      cheatingFlags: [
        {
          type: 'looked_away',
          timestamp: '2024-12-08T13:30:00Z',
          details: 'Face not detected in webcam for extended periods (total: 3m 20s).',
        },
      ],
    },
    {
      id: 'sub-21',
      applicantName: 'Uma Singh',
      applicantEmail: 'uma.s@email.com',
      score: 9.0,
      submittedAt: '2024-12-11T09:00:00Z',
      timeSpent: '45m',
      cheatingFlags: [],
    },
    {
      id: 'sub-22',
      applicantName: 'Victor Chen',
      applicantEmail: 'victor.c@email.com',
      score: 7.0,
      submittedAt: '2024-12-10T10:00:00Z',
      timeSpent: '59m',
      cheatingFlags: [],
    },
    {
      id: 'sub-23',
      applicantName: 'Wendy Zhang',
      applicantEmail: 'wendy.z@email.com',
      score: 8.0,
      submittedAt: '2024-12-09T15:00:00Z',
      timeSpent: '54m',
      cheatingFlags: [
        {
          type: 'copy_paste',
          timestamp: '2024-12-09T15:20:00Z',
          details: 'Code snippet (8 lines) was pasted from external source.',
        },
      ],
    },
    {
      id: 'sub-24',
      applicantName: 'Xavier Lopez',
      applicantEmail: 'xavier.l@email.com',
      score: 5.5,
      submittedAt: '2024-12-08T14:00:00Z',
      timeSpent: '60m',
      cheatingFlags: [
        {
          type: 'tab_switch',
          timestamp: '2024-12-08T14:15:00Z',
          details: 'Switched to another browser tab 6 times during the assessment.',
        },
        {
          type: 'looked_away',
          timestamp: '2024-12-08T14:30:00Z',
          details: 'Face not detected in webcam for extended periods (total: 5m 10s).',
        },
      ],
    },
    {
      id: 'sub-25',
      applicantName: 'Yara Ali',
      applicantEmail: 'yara.a@email.com',
      score: 9.5,
      submittedAt: '2024-12-11T12:00:00Z',
      timeSpent: '47m',
      cheatingFlags: [],
    },
    {
      id: 'sub-26',
      applicantName: 'Zoe Foster',
      applicantEmail: 'zoe.f@email.com',
      score: 7.5,
      submittedAt: '2024-12-10T11:30:00Z',
      timeSpent: '56m',
      cheatingFlags: [],
    },
    {
      id: 'sub-27',
      applicantName: 'Alex Kumar',
      applicantEmail: 'alex.k@email.com',
      score: 8.5,
      submittedAt: '2024-12-09T13:45:00Z',
      timeSpent: '51m',
      cheatingFlags: [],
    },
    {
      id: 'sub-28',
      applicantName: 'Bella Torres',
      applicantEmail: 'bella.t@email.com',
      score: 6.5,
      submittedAt: '2024-12-08T16:00:00Z',
      timeSpent: '60m',
      cheatingFlags: [
        {
          type: 'tab_switch',
          timestamp: '2024-12-08T16:20:00Z',
          details: 'Switched to another browser tab 2 times during the assessment.',
        },
      ],
    },
    {
      id: 'sub-29',
      applicantName: 'Chris Wong',
      applicantEmail: 'chris.w@email.com',
      score: 9.0,
      submittedAt: '2024-12-11T15:30:00Z',
      timeSpent: '49m',
      cheatingFlags: [],
    },
    {
      id: 'sub-30',
      applicantName: 'Diana Park',
      applicantEmail: 'diana.p@email.com',
      score: 7.0,
      submittedAt: '2024-12-10T09:15:00Z',
      timeSpent: '57m',
      cheatingFlags: [],
    },
    {
      id: 'sub-31',
      applicantName: 'Ethan Rivera',
      applicantEmail: 'ethan.r@email.com',
      score: 8.0,
      submittedAt: '2024-12-09T14:20:00Z',
      timeSpent: '53m',
      cheatingFlags: [
        {
          type: 'copy_paste',
          timestamp: '2024-12-09T14:40:00Z',
          details: 'Code snippet (15 lines) was pasted that matches a known solution pattern.',
        },
      ],
    },
  ],
  'patient-monitoring-system': [
    {
      id: 'sub-13',
      applicantName: 'Mia Garcia',
      applicantEmail: 'mia.g@email.com',
      score: 9.5,
      submittedAt: '2024-12-11T08:00:00Z',
      timeSpent: '52m',
      cheatingFlags: [],
    },
    {
      id: 'sub-14',
      applicantName: 'Noah Anderson',
      applicantEmail: 'noah.a@email.com',
      score: 9.0,
      submittedAt: '2024-12-10T17:30:00Z',
      timeSpent: '55m',
      cheatingFlags: [],
    },
    {
      id: 'sub-15',
      applicantName: 'Olivia Taylor',
      applicantEmail: 'olivia.t@email.com',
      score: 8.5,
      submittedAt: '2024-12-09T12:00:00Z',
      timeSpent: '58m',
      cheatingFlags: [
        {
          type: 'looked_away',
          timestamp: '2024-12-09T12:05:00Z',
          details: 'Face not detected in webcam for extended periods (total: 1m 45s).',
        },
      ],
    },
    {
      id: 'sub-16',
      applicantName: 'Peter Jackson',
      applicantEmail: 'peter.j@email.com',
      score: 8.0,
      submittedAt: '2024-12-08T14:00:00Z',
      timeSpent: '60m',
      cheatingFlags: [],
    },
    {
      id: 'sub-32',
      applicantName: 'Amanda Foster',
      applicantEmail: 'amanda.f@email.com',
      score: 9.5,
      submittedAt: '2024-12-11T10:00:00Z',
      timeSpent: '50m',
      cheatingFlags: [],
    },
    {
      id: 'sub-33',
      applicantName: 'Ben Mitchell',
      applicantEmail: 'ben.m@email.com',
      score: 7.5,
      submittedAt: '2024-12-10T11:00:00Z',
      timeSpent: '59m',
      cheatingFlags: [
        {
          type: 'tab_switch',
          timestamp: '2024-12-10T11:20:00Z',
          details: 'Switched to another browser tab 3 times during the assessment.',
        },
      ],
    },
    {
      id: 'sub-34',
      applicantName: 'Carla Rodriguez',
      applicantEmail: 'carla.r@email.com',
      score: 8.5,
      submittedAt: '2024-12-09T13:00:00Z',
      timeSpent: '54m',
      cheatingFlags: [],
    },
    {
      id: 'sub-35',
      applicantName: 'Daniel Kim',
      applicantEmail: 'daniel.k@email.com',
      score: 7.0,
      submittedAt: '2024-12-08T15:00:00Z',
      timeSpent: '60m',
      cheatingFlags: [],
    },
    {
      id: 'sub-36',
      applicantName: 'Elena Torres',
      applicantEmail: 'elena.t@email.com',
      score: 9.0,
      submittedAt: '2024-12-11T14:00:00Z',
      timeSpent: '48m',
      cheatingFlags: [],
    },
    {
      id: 'sub-37',
      applicantName: 'Felix Chen',
      applicantEmail: 'felix.c@email.com',
      score: 6.5,
      submittedAt: '2024-12-10T09:00:00Z',
      timeSpent: '60m',
      cheatingFlags: [
        {
          type: 'copy_paste',
          timestamp: '2024-12-10T09:30:00Z',
          details: 'Code snippet (20 lines) was pasted from external source.',
        },
      ],
    },
    {
      id: 'sub-38',
      applicantName: 'Grace Park',
      applicantEmail: 'grace.p@email.com',
      score: 8.0,
      submittedAt: '2024-12-09T16:00:00Z',
      timeSpent: '56m',
      cheatingFlags: [],
    },
    {
      id: 'sub-39',
      applicantName: 'Hugo Martinez',
      applicantEmail: 'hugo.m@email.com',
      score: 7.5,
      submittedAt: '2024-12-08T10:00:00Z',
      timeSpent: '58m',
      cheatingFlags: [],
    },
    {
      id: 'sub-40',
      applicantName: 'Isabella Wong',
      applicantEmail: 'isabella.w@email.com',
      score: 9.0,
      submittedAt: '2024-12-11T11:30:00Z',
      timeSpent: '51m',
      cheatingFlags: [],
    },
    {
      id: 'sub-41',
      applicantName: 'James Liu',
      applicantEmail: 'james.l@email.com',
      score: 6.0,
      submittedAt: '2024-12-10T13:00:00Z',
      timeSpent: '60m',
      cheatingFlags: [
        {
          type: 'looked_away',
          timestamp: '2024-12-10T13:20:00Z',
          details: 'Face not detected in webcam for extended periods (total: 4m 10s).',
        },
        {
          type: 'tab_switch',
          timestamp: '2024-12-10T13:30:00Z',
          details: 'Switched to another browser tab 5 times during the assessment.',
        },
      ],
    },
    {
      id: 'sub-42',
      applicantName: 'Katherine Brown',
      applicantEmail: 'katherine.b@email.com',
      score: 8.5,
      submittedAt: '2024-12-09T14:30:00Z',
      timeSpent: '53m',
      cheatingFlags: [],
    },
    {
      id: 'sub-43',
      applicantName: 'Liam Davis',
      applicantEmail: 'liam.d@email.com',
      score: 7.0,
      submittedAt: '2024-12-08T12:00:00Z',
      timeSpent: '59m',
      cheatingFlags: [],
    },
    {
      id: 'sub-44',
      applicantName: 'Maya Patel',
      applicantEmail: 'maya.p@email.com',
      score: 9.5,
      submittedAt: '2024-12-11T15:00:00Z',
      timeSpent: '47m',
      cheatingFlags: [],
    },
    {
      id: 'sub-45',
      applicantName: 'Nathan Lee',
      applicantEmail: 'nathan.l@email.com',
      score: 8.0,
      submittedAt: '2024-12-10T16:00:00Z',
      timeSpent: '55m',
      cheatingFlags: [],
    },
    {
      id: 'sub-46',
      applicantName: 'Oscar Zhang',
      applicantEmail: 'oscar.z@email.com',
      score: 7.5,
      submittedAt: '2024-12-09T09:00:00Z',
      timeSpent: '57m',
      cheatingFlags: [
        {
          type: 'copy_paste',
          timestamp: '2024-12-09T09:25:00Z',
          details: 'Code snippet (18 lines) was pasted that matches a known solution pattern.',
        },
      ],
    },
    {
      id: 'sub-47',
      applicantName: 'Penelope Wilson',
      applicantEmail: 'penelope.w@email.com',
      score: 9.0,
      submittedAt: '2024-12-08T17:00:00Z',
      timeSpent: '49m',
      cheatingFlags: [],
    },
    {
      id: 'sub-48',
      applicantName: 'Quinn Thompson',
      applicantEmail: 'quinn.t@email.com',
      score: 6.5,
      submittedAt: '2024-12-11T12:00:00Z',
      timeSpent: '60m',
      cheatingFlags: [],
    },
    {
      id: 'sub-49',
      applicantName: 'Ryan Johnson',
      applicantEmail: 'ryan.j@email.com',
      score: 8.5,
      submittedAt: '2024-12-10T14:30:00Z',
      timeSpent: '52m',
      cheatingFlags: [],
    },
    {
      id: 'sub-50',
      applicantName: 'Sophia Anderson',
      applicantEmail: 'sophia.a@email.com',
      score: 7.0,
      submittedAt: '2024-12-09T15:00:00Z',
      timeSpent: '58m',
      cheatingFlags: [],
    },
    {
      id: 'sub-51',
      applicantName: 'Thomas White',
      applicantEmail: 'thomas.w@email.com',
      score: 9.0,
      submittedAt: '2024-12-08T11:00:00Z',
      timeSpent: '50m',
      cheatingFlags: [],
    },
    {
      id: 'sub-52',
      applicantName: 'Victoria Chen',
      applicantEmail: 'victoria.c@email.com',
      score: 8.0,
      submittedAt: '2024-12-11T13:00:00Z',
      timeSpent: '54m',
      cheatingFlags: [],
    },
    {
      id: 'sub-53',
      applicantName: 'William Kim',
      applicantEmail: 'william.k@email.com',
      score: 7.5,
      submittedAt: '2024-12-10T10:30:00Z',
      timeSpent: '56m',
      cheatingFlags: [],
    },
    {
      id: 'sub-54',
      applicantName: 'Ximena Lopez',
      applicantEmail: 'ximena.l@email.com',
      score: 9.5,
      submittedAt: '2024-12-09T11:00:00Z',
      timeSpent: '46m',
      cheatingFlags: [],
    },
    {
      id: 'sub-55',
      applicantName: 'Yuki Tanaka',
      applicantEmail: 'yuki.t@email.com',
      score: 6.0,
      submittedAt: '2024-12-08T16:30:00Z',
      timeSpent: '60m',
      cheatingFlags: [
        {
          type: 'tab_switch',
          timestamp: '2024-12-08T16:45:00Z',
          details: 'Switched to another browser tab 4 times during the assessment.',
        },
        {
          type: 'looked_away',
          timestamp: '2024-12-08T17:00:00Z',
          details: 'Face not detected in webcam for extended periods (total: 3m 30s).',
        },
      ],
    },
    {
      id: 'sub-56',
      applicantName: 'Zara Singh',
      applicantEmail: 'zara.s@email.com',
      score: 8.5,
      submittedAt: '2024-12-11T09:30:00Z',
      timeSpent: '53m',
      cheatingFlags: [],
    },
  ],
}

// Storage key for custom problems (same as in lib/problems.ts)
const CUSTOM_PROBLEMS_KEY = 'custom_problems'

// Helper functions
export function getRecruiterJobs(): RecruiterJob[] {
  return getAllJobs()
}

export function getRecruiterChallenges(): RecruiterChallenge[] {
  // Get static challenges
  const staticChallenges = [...recruiterChallenges]
  
  // Get custom problems from localStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(CUSTOM_PROBLEMS_KEY)
      if (stored) {
        const customProblems = JSON.parse(stored)
        const customChallenges: RecruiterChallenge[] = Object.values(customProblems).map((problem: any) => ({
          id: problem.id,
          title: problem.title,
          description: problem.description.substring(0, 100) + (problem.description.length > 100 ? '...' : ''),
          difficulty: problem.difficulty,
          timeLimit: '30m', // Default time limit for custom problems
          applicantCount: 0, // New problems have no submissions
          createdAt: new Date().toISOString().split('T')[0],
        }))
        return [...staticChallenges, ...customChallenges]
      }
    } catch {
      // Ignore errors
    }
  }
  
  return staticChallenges
}

export function getChallengeById(id: string): RecruiterChallenge | undefined {
  // Check static challenges first
  const staticChallenge = recruiterChallenges.find(c => c.id === id)
  if (staticChallenge) return staticChallenge
  
  // Check custom problems
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(CUSTOM_PROBLEMS_KEY)
      if (stored) {
        const customProblems = JSON.parse(stored)
        const problem = customProblems[id]
        if (problem) {
          return {
            id: problem.id,
            title: problem.title,
            description: problem.description,
            difficulty: problem.difficulty,
            timeLimit: '30m',
            applicantCount: 0,
            createdAt: new Date().toISOString().split('T')[0],
          }
        }
      }
    } catch {
      // Ignore errors
    }
  }
  
  return undefined
}

/**
 * Add a new submission for a challenge (via API)
 */
export async function addChallengeSubmission(challengeId: string, submission: ApplicantSubmission): Promise<void> {
  try {
    const response = await fetch(`/api/submissions/${challengeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submission),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to add submission')
    }

    const result = await response.json()
    console.log('Submission added successfully:', result)
    
    // Dispatch custom event to notify other components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('submissionAdded', { 
        detail: { challengeId, submission } 
      }))
    }
  } catch (error) {
    console.error('Error adding submission:', error)
    throw error
  }
}

/**
 * Delete a submission by ID (via API)
 */
export async function deleteChallengeSubmission(challengeId: string, submissionId: string): Promise<void> {
  try {
    const response = await fetch(`/api/submissions/${challengeId}?id=${submissionId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete submission')
    }

    console.log('Submission deleted successfully')
  } catch (error) {
    console.error('Error deleting submission:', error)
    throw error
  }
}

/**
 * Get submissions for a challenge (via API)
 * For patient-monitoring-system, only returns stored submissions
 * For other challenges, merges stored with hardcoded data
 */
export async function getChallengeSubmissions(challengeId: string): Promise<ApplicantSubmission[]> {
  try {
    const response = await fetch(`/api/submissions/${challengeId}`, {
      method: 'GET',
      cache: 'no-store', // Always fetch fresh data
    })

    if (!response.ok) {
      throw new Error('Failed to fetch submissions')
    }

    const storedSubmissions: ApplicantSubmission[] = await response.json()
    console.log(`getChallengeSubmissions called for ${challengeId}, found ${storedSubmissions.length} stored submissions`)
    
    // For patient-monitoring-system, only return stored submissions
    if (challengeId === 'patient-monitoring-system') {
      console.log(`Returning ${storedSubmissions.length} submissions for patient-monitoring-system`)
      return storedSubmissions
    }
    
    // For other challenges, merge stored with hardcoded data
    const hardcodedSubmissions = challengeSubmissions[challengeId] || []
    
    // Combine and deduplicate by ID (stored takes precedence)
    const submissionMap = new Map<string, ApplicantSubmission>()
    
    // Add hardcoded first
    hardcodedSubmissions.forEach(sub => {
      submissionMap.set(sub.id, sub)
    })
    
    // Override with stored submissions
    storedSubmissions.forEach(sub => {
      submissionMap.set(sub.id, sub)
    })
    
    // Sort by score descending
    return Array.from(submissionMap.values()).sort((a, b) => b.score - a.score)
  } catch (error) {
    console.error('Error fetching submissions:', error)
    // Fallback to hardcoded data for other challenges
    if (challengeId !== 'patient-monitoring-system') {
      return challengeSubmissions[challengeId] || []
    }
    return []
  }
}

export function getCheatingFlagLabel(type: CheatingFlagType): string {
  switch (type) {
    case 'tab_switch':
      return 'Tab Switching'
    case 'copy_paste':
      return 'Code Pasted'
    case 'looked_away':
      return 'Looked Away'
    default:
      return 'Unknown'
  }
}

/**
 * Get required challenge IDs for a job
 */
export function getJobRequiredChallenges(jobId: string): string[] {
  const mapping: Record<string, string[]> = {
    'cliniq-frontend-dev': ['two-sum', 'merge-intervals', 'binary-tree-max-path-sum', 'patient-monitoring-system'],
    'cliniq-backend-dev': ['two-sum', 'merge-intervals', 'binary-tree-max-path-sum', 'patient-monitoring-system'],
    'cliniq-senior-frontend': ['two-sum', 'merge-intervals', 'binary-tree-max-path-sum', 'patient-monitoring-system'],
    'cliniq-backend-engineer': ['two-sum', 'merge-intervals', 'patient-monitoring-system'],
    'cliniq-fullstack': ['two-sum', 'merge-intervals', 'binary-tree-max-path-sum', 'patient-monitoring-system', 'two-sum'],
    'cliniq-devops': ['two-sum', 'merge-intervals', 'patient-monitoring-system'],
  }
  return mapping[jobId] || []
}

// Helper to generate a consistent hash from a string (for deterministic data)
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0 // Convert to 32bit integer
  }
  return Math.abs(hash)
}

// Helper to generate a pseudo-random number between 0 and 1 based on a seed
function seededRandom(seed: number): number {
  // Simple seeded random number generator
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

// Generate dummy applicant data for all jobs
function generateDummyApplicants(jobId: string): JobApplicant[] {
  const requiredChallenges = getJobRequiredChallenges(jobId)
  const totalChallenges = requiredChallenges.length
  
  // Generate 100 applicants with varied data to demonstrate filtering and grouping
  const applicantNames = [
    'Alex Thompson', 'Sarah Chen', 'Michael Rodriguez', 'Emily Johnson', 'David Kim',
    'Jessica Martinez', 'Ryan Patel', 'Olivia Brown', 'James Wilson', 'Sophia Lee',
    'Daniel Garcia', 'Emma Davis', 'Matthew Taylor', 'Isabella Anderson', 'Christopher Moore',
    'Ava Jackson', 'Andrew White', 'Mia Harris', 'Joshua Martin', 'Charlotte Thompson',
    'Noah Martinez', 'Lily Chen', 'Ethan Williams', 'Grace Kim', 'Lucas Anderson',
    'Zoe Patel', 'Benjamin Lee', 'Chloe Garcia', 'Mason Brown', 'Harper Davis',
    'Logan Wilson', 'Amelia Rodriguez', 'Jackson Moore', 'Ella Thompson', 'Aiden Johnson',
    'Scarlett Martinez', 'Carter Kim', 'Luna Chen', 'Henry Patel', 'Nora Williams',
    'Oliver Taylor', 'Victoria Smith', 'Sebastian Jones', 'Penelope Wilson', 'Gabriel Brown',
    'Hannah Davis', 'Nathan Garcia', 'Madison Martinez', 'Samuel Anderson', 'Avery Johnson',
    'Liam White', 'Sofia Rodriguez', 'Caleb Lee', 'Natalie Kim', 'Isaac Patel',
    'Addison Chen', 'Owen Thompson', 'Aubrey Williams', 'Levi Moore', 'Layla Davis',
    'Wyatt Taylor', 'Stella Brown', 'Jack Anderson', 'Hazel Garcia', 'Luke Martinez',
    'Aria Johnson', 'Grayson Lee', 'Lillian Patel', 'Julian Chen', 'Nova Thompson',
    'Maya Williams', 'Eli Moore', 'Willow Davis', 'Lincoln Taylor', 'Riley Brown',
    'Aurora Anderson', 'Hudson Garcia', 'Savannah Martinez', 'Elena Johnson', 'Parker Lee',
    'Clara Patel', 'Brayden Chen', 'Violet Thompson', 'Nolan Williams', 'Ivy Moore',
    'Zoe Martinez', 'Ethan Brown', 'Lily Garcia', 'Mason Wilson', 'Sophia Chen',
    'Oliver Davis', 'Emma Rodriguez', 'Noah Kim', 'Ava Patel', 'Lucas Thompson',
    'Isabella White', 'Mia Anderson', 'Charlotte Lee', 'James Martinez', 'Olivia Taylor'
  ]
  
  const applicants: JobApplicant[] = []
  
  // Generate all applicants (80 total)
  for (let i = 0; i < applicantNames.length; i++) {
    const name = applicantNames[i]
    const email = name.toLowerCase().replace(/\s+/g, '.') + '@email.com'
    const applicantId = `applicant-${jobId}-${i + 1}`
    
    // Use deterministic seed based on applicant ID
    const baseSeed = hashString(applicantId)
    
    // Ensure all applicants complete all challenges (100% completion rate)
    const numCompleted = totalChallenges
    
    // Varied violation counts (0-5 per applicant total) - deterministic
    const totalViolations = Math.floor(seededRandom(baseSeed + 2) * 6)
    
    // Varied scores (5.0-10.0) - deterministic
    const baseScore = 5 + seededRandom(baseSeed + 3) * 5
    
    // Varied resume fitness (4-10) - deterministic
    const resumeFitness = 4 + seededRandom(baseSeed + 4) * 6
    
    // Create submissions for completed challenges
    let violationsRemaining = totalViolations
    const submissions = requiredChallenges.slice(0, numCompleted).map((challengeId, idx) => {
      // Use deterministic seed for each challenge submission
      const challengeSeed = hashString(applicantId + challengeId)
      
      // Distribute violations across submissions (deterministic)
      let violationsForThis = 0
      if (violationsRemaining > 0 && seededRandom(challengeSeed) > 0.5) {
        violationsForThis = Math.min(violationsRemaining, Math.floor(seededRandom(challengeSeed + 1) * 3) + 1)
        violationsRemaining -= violationsForThis
      }
      // Slight score variation per challenge - deterministic
      const score = Math.max(5, Math.min(10, baseScore + (seededRandom(challengeSeed + 2) - 0.5) * 2))
      
      return {
        challengeId,
        score: Math.round(score * 10) / 10,
        violations: violationsForThis,
      }
    })
    
    // Ensure total violations match (distribute any remaining) - deterministic
    const actualTotal = submissions.reduce((sum, sub) => sum + sub.violations, 0)
    if (actualTotal < totalViolations && submissions.length > 0) {
      const diff = totalViolations - actualTotal
      for (let j = 0; j < diff && j < submissions.length; j++) {
        submissions[j].violations += 1
      }
    }
    
    applicants.push({
      id: applicantId,
      name,
      email,
      resumeFitness: Math.round(resumeFitness * 10) / 10,
      submissions,
    })
  }
  
  return applicants
}

// Cache for job applicants (same data for all jobs as specified)
const jobApplicantsCache: Record<string, JobApplicant[]> = {}

/**
 * Get all applicants for a job
 */
export function getJobApplicants(jobId: string): JobApplicant[] {
  // Use the same dummy data for all jobs as specified
  if (!jobApplicantsCache['default']) {
    jobApplicantsCache['default'] = generateDummyApplicants('cliniq-frontend-dev')
  }
  return jobApplicantsCache['default']
}
