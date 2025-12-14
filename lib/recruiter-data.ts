// Recruiter dashboard data types and mock data

export type CheatingFlagType = 'tab_switch' | 'copy_paste' | 'looked_away'

export type CheatingFlag = {
  type: CheatingFlagType
  timestamp: string
  details: string
}

export type ApplicantSubmission = {
  id: string
  applicantName: string
  applicantEmail: string
  score: number // out of 10
  submittedAt: string
  timeSpent: string
  cheatingFlags: CheatingFlag[]
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

export type RecruiterJob = {
  id: string
  role: string
  description: string
  skills: string[]
  postedAt: string
  applicantCount: number
  status: 'active' | 'closed' | 'draft'
}

// Mock job postings for recruiter
export const recruiterJobs: RecruiterJob[] = [
  {
    id: 'job-1',
    role: 'Senior Frontend Developer',
    description: 'Build beautiful, performant user interfaces using React and TypeScript.',
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'Next.js'],
    postedAt: '2024-12-01',
    applicantCount: 24,
    status: 'active',
  },
  {
    id: 'job-2',
    role: 'Backend Engineer',
    description: 'Design and implement scalable APIs and microservices.',
    skills: ['Node.js', 'Python', 'PostgreSQL', 'Redis'],
    postedAt: '2024-12-05',
    applicantCount: 18,
    status: 'active',
  },
  {
    id: 'job-3',
    role: 'Full Stack Developer',
    description: 'Work across the entire stack to deliver end-to-end features.',
    skills: ['React', 'Node.js', 'TypeScript', 'AWS'],
    postedAt: '2024-12-10',
    applicantCount: 31,
    status: 'active',
  },
  {
    id: 'job-4',
    role: 'DevOps Engineer',
    description: 'Manage cloud infrastructure and CI/CD pipelines.',
    skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform'],
    postedAt: '2024-12-08',
    applicantCount: 12,
    status: 'active',
  },
]

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
    id: 'reverse-string',
    title: 'Reverse String',
    description: 'Reverse a string in-place using O(1) extra memory.',
    difficulty: 'Easy',
    timeLimit: '15m',
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
  ],
  'reverse-string': [
    {
      id: 'sub-13',
      applicantName: 'Mia Garcia',
      applicantEmail: 'mia.g@email.com',
      score: 10.0,
      submittedAt: '2024-12-11T08:00:00Z',
      timeSpent: '8m',
      cheatingFlags: [],
    },
    {
      id: 'sub-14',
      applicantName: 'Noah Anderson',
      applicantEmail: 'noah.a@email.com',
      score: 9.0,
      submittedAt: '2024-12-10T17:30:00Z',
      timeSpent: '10m',
      cheatingFlags: [],
    },
    {
      id: 'sub-15',
      applicantName: 'Olivia Taylor',
      applicantEmail: 'olivia.t@email.com',
      score: 8.5,
      submittedAt: '2024-12-09T12:00:00Z',
      timeSpent: '12m',
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
      score: 7.5,
      submittedAt: '2024-12-08T14:00:00Z',
      timeSpent: '14m',
      cheatingFlags: [],
    },
  ],
}

// Storage key for custom problems (same as in lib/problems.ts)
const CUSTOM_PROBLEMS_KEY = 'custom_problems'

// Helper functions
export function getRecruiterJobs(): RecruiterJob[] {
  return recruiterJobs
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

export function getChallengeSubmissions(challengeId: string): ApplicantSubmission[] {
  const submissions = challengeSubmissions[challengeId] || []
  // Sort by score descending
  return [...submissions].sort((a, b) => b.score - a.score)
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
