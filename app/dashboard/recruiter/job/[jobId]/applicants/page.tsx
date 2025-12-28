'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getCurrentUser, type User } from '@/lib/auth'
import { getJobApplicants, getJobRequiredChallenges, getRecruiterJobs, getRecruiterChallenges, type JobApplicant } from '@/lib/recruiter-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Logo } from '@/components/logo'
import { ArrowLeft, Users, CheckCircle2, RotateCcw, Star, UserStar, AlertTriangle, MessageSquare, X, Play, Clock, Shield, Wrench, Building2, TrendingUp, Monitor, Clipboard, EyeOff, ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type RankingPreset = 'balanced' | 'fast-solver' | 'strong-fundamentals' | 'production-ready' | 'careful-accurate' | 'custom'

type PerformanceWeights = {
  correctness: number
  timeEfficiency: number
  codeQuality: number
  problemSolving: number
}

type IntegrityLevel = 'strict' | 'standard' | 'lenient'

type GroupingOption = 'tool-familiarity' | 'industry-experience' | 'seniority' | 'none'

type CandidateMetrics = {
  correctness: number // 0-10
  timeEfficiency: number // 0-10 (inverse of time spent, normalized)
  codeQuality: number // 0-10
  problemSolving: number // 0-10
  toolFit: {
    score: number
    total: number
    level: 'High' | 'Medium' | 'Low' | 'None'
    matchedTools: string[]
  }
  industryFit: {
    level: 'High' | 'Medium' | 'Low'
    domains: string[]
    yearsExperience?: number
  }
  communication: {
    explanationClarity: 'High' | 'Medium' | 'Low'
    structuredThinking: 'High' | 'Medium' | 'Low'
    confidenceUnderPressure: 'High' | 'Medium' | 'Low'
    overall: 'High' | 'Medium' | 'Low'
  }
}

const PRESET_WEIGHTS: Record<RankingPreset, PerformanceWeights> = {
  'balanced': { correctness: 45, timeEfficiency: 20, codeQuality: 20, problemSolving: 15 },
  'fast-solver': { correctness: 35, timeEfficiency: 35, codeQuality: 15, problemSolving: 15 },
  'strong-fundamentals': { correctness: 50, timeEfficiency: 10, codeQuality: 30, problemSolving: 10 },
  'production-ready': { correctness: 40, timeEfficiency: 15, codeQuality: 35, problemSolving: 10 },
  'careful-accurate': { correctness: 60, timeEfficiency: 10, codeQuality: 20, problemSolving: 10 },
  'custom': { correctness: 45, timeEfficiency: 20, codeQuality: 20, problemSolving: 15 },
}

// Deterministic hash function for consistent results
const hashString = (str: string): number => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

// Helper to generate violation types deterministically
const generateViolationTypes = (candidateId: string, challengeId: string, violationCount: number): Array<'tab_switch' | 'copy_paste' | 'looked_away'> => {
  if (violationCount === 0) return []
  const seed = hashString(candidateId + challengeId)
  const types: Array<'tab_switch' | 'copy_paste' | 'looked_away'> = ['tab_switch', 'copy_paste', 'looked_away']
  const result: Array<'tab_switch' | 'copy_paste' | 'looked_away'> = []
  for (let i = 0; i < violationCount; i++) {
    result.push(types[(seed + i) % types.length])
  }
  return result
}

// Helper to get violation icon
const getViolationIcon = (type: 'tab_switch' | 'copy_paste' | 'looked_away') => {
  switch (type) {
    case 'tab_switch':
      return Monitor
    case 'copy_paste':
      return Clipboard
    case 'looked_away':
      return EyeOff
  }
}

// Helper to get violation color (matching the integrity warning popup colors)
const getViolationColor = (type: 'tab_switch' | 'copy_paste' | 'looked_away') => {
  switch (type) {
    case 'tab_switch':
      return 'text-orange-500 bg-orange-500/10 border-orange-500/20'
    case 'copy_paste':
      return 'text-red-500 bg-red-500/10 border-red-500/20'
    case 'looked_away':
      return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
  }
}

// Mock tool usage data for candidates (deterministic)
const generateToolUsage = (candidateId: string, availableTools: string[]): string[] => {
  const seed = hashString(candidateId)
  const numTools = 3 + (seed % 3) // 3-5 tools
  
  // Deterministic shuffle using seed
  const shuffled = [...availableTools].sort((a, b) => {
    const hashA = hashString(candidateId + a)
    const hashB = hashString(candidateId + b)
    return hashA - hashB
  })
  return shuffled.slice(0, numTools)
}

// Mock industry experience data (deterministic)
const generateIndustryExperience = (candidateId: string, availableIndustries: string[]): { domains: string[], years: number } => {
  const seed = hashString(candidateId)
  const numDomains = 1 + (seed % 2) // 1-2 domains
  const years = 1 + (seed % 5) // 1-5 years
  
  // Deterministic shuffle using seed
  const shuffled = [...availableIndustries].sort((a, b) => {
    const hashA = hashString(candidateId + a)
    const hashB = hashString(candidateId + b)
    return hashA - hashB
  })
  return {
    domains: shuffled.slice(0, numDomains),
    years,
  }
}

// Mock communication scores (deterministic)
const generateCommunication = (candidateId: string): CandidateMetrics['communication'] => {
  const seed = hashString(candidateId)
  const levels: Array<'High' | 'Medium' | 'Low'> = ['High', 'Medium', 'Low']
  const explanationClarity = levels[seed % 3]
  const structuredThinking = levels[(seed + 1) % 3]
  const confidenceUnderPressure = levels[(seed + 2) % 3]
  
  // Calculate overall (average of the three)
  const scores = [explanationClarity, structuredThinking, confidenceUnderPressure].map(l => 
    l === 'High' ? 3 : l === 'Medium' ? 2 : 1
  )
  const avgScore = scores.reduce((a, b) => a + b, 0) / 3
  const overall = avgScore >= 2.5 ? 'High' : avgScore >= 1.5 ? 'Medium' : 'Low'
  
  return { explanationClarity, structuredThinking, confidenceUnderPressure, overall }
}

export default function JobApplicantsPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params?.jobId as string
  
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [applicants, setApplicants] = useState<JobApplicant[]>([])
  
  // Configuration state
  const [rankingPreset, setRankingPreset] = useState<RankingPreset>('balanced')
  const [performanceWeights, setPerformanceWeights] = useState<PerformanceWeights>(PRESET_WEIGHTS.balanced)
  const [integrityLevel, setIntegrityLevel] = useState<IntegrityLevel>('standard')
  const [autoExcludeSevere, setAutoExcludeSevere] = useState(true)
  const [flagMediumRisk, setFlagMediumRisk] = useState(true)
  const [ignoreMinor, setIgnoreMinor] = useState(false)
  const [requiredTools, setRequiredTools] = useState<string[]>([])
  const [toolMatchingRule, setToolMatchingRule] = useState<'most' | 'all' | 'at-least'>('most')
  const [toolEvidenceSources, setToolEvidenceSources] = useState<string[]>(['resume', 'interview', 'projects'])
  const [industryDomains, setIndustryDomains] = useState<string[]>(['Fintech'])
  const [industryExperienceLevel, setIndustryExperienceLevel] = useState<'any' | '1-2' | '3-5' | '5+'>('any')
  const [groupingOption, setGroupingOption] = useState<GroupingOption>('tool-familiarity')
  const [useCommunicationTiebreaker, setUseCommunicationTiebreaker] = useState(true)
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  const [isPresetChange, setIsPresetChange] = useState(false)
  const [shortlistedCandidates, setShortlistedCandidates] = useState<Set<string>>(new Set())
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [hasLoadedShortlisted, setHasLoadedShortlisted] = useState(false)
  const [showComparison, setShowComparison] = useState(false)
  
  const job = useMemo(() => {
    const jobs = getRecruiterJobs()
    return jobs.find(j => j.id === jobId)
  }, [jobId])
  
  const requiredChallengeIds = useMemo(() => getJobRequiredChallenges(jobId), [jobId])
  const allChallenges = useMemo(() => getRecruiterChallenges(), [])
  const requiredChallenges = useMemo(() => {
    return requiredChallengeIds.map(id => allChallenges.find(c => c.id === id)).filter(Boolean) as typeof allChallenges
  }, [requiredChallengeIds, allChallenges])
  const totalChallenges = requiredChallenges.length

  useEffect(() => {
    const currentUser = getCurrentUser()
    
    if (!currentUser) {
      router.push('/login')
      return
    }

    if (currentUser.role !== 'recruiter') {
      router.push('/dashboard/applicant')
      return
    }

    setUser(currentUser)
    setApplicants(getJobApplicants(jobId))
    
    // Initialize required tools from job skills if job exists
    if (job && job.skills && job.skills.length > 0) {
      setRequiredTools(job.skills)
    }
    
    // Load shortlisted candidates from localStorage
    if (typeof window !== 'undefined') {
      const storageKey = `shortlisted-candidates-${jobId}`
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        try {
          const candidateIds = JSON.parse(saved) as string[]
          setShortlistedCandidates(new Set(candidateIds))
        } catch (e) {
          console.error('Failed to load shortlisted candidates:', e)
        }
      }
      setHasLoadedShortlisted(true)
    }
    
    setLoading(false)
  }, [router, jobId, job])

  // Update weights when preset changes
  useEffect(() => {
    if (rankingPreset !== 'custom') {
      setIsPresetChange(true)
      setPerformanceWeights(PRESET_WEIGHTS[rankingPreset])
    }
  }, [rankingPreset])

  // Prevent body scroll when compare modal is open
  useEffect(() => {
    if (showComparison) {
      // Save current scroll position
      const scrollY = window.scrollY
      // Prevent scrolling
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
      
      return () => {
        // Restore scrolling
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        // Restore scroll position
        window.scrollTo(0, scrollY)
      }
    }
  }, [showComparison])

  // Check if weights match a preset (only when weights change manually, not from preset selection)
  useEffect(() => {
    // Skip if we just changed preset (to avoid infinite loop)
    if (isPresetChange) {
      setIsPresetChange(false)
      return
    }

    // Only check if we're in custom mode or if weights don't match current preset
    if (rankingPreset !== 'custom') {
      const currentPresetWeights = PRESET_WEIGHTS[rankingPreset]
      const matches = 
        Math.abs(currentPresetWeights.correctness - performanceWeights.correctness) < 1 &&
        Math.abs(currentPresetWeights.timeEfficiency - performanceWeights.timeEfficiency) < 1 &&
        Math.abs(currentPresetWeights.codeQuality - performanceWeights.codeQuality) < 1 &&
        Math.abs(currentPresetWeights.problemSolving - performanceWeights.problemSolving) < 1
      
      if (!matches) {
        setRankingPreset('custom')
      }
      return
    }

    // Check if weights match any preset
    const currentPreset = Object.entries(PRESET_WEIGHTS).find(
      ([_, weights]) => 
        Math.abs(weights.correctness - performanceWeights.correctness) < 1 &&
        Math.abs(weights.timeEfficiency - performanceWeights.timeEfficiency) < 1 &&
        Math.abs(weights.codeQuality - performanceWeights.codeQuality) < 1 &&
        Math.abs(weights.problemSolving - performanceWeights.problemSolving) < 1
    )?.[0] as RankingPreset | undefined

    if (currentPreset && currentPreset !== rankingPreset) {
      setIsPresetChange(true)
      setRankingPreset(currentPreset)
    }
  }, [performanceWeights, rankingPreset, isPresetChange])

  // Save shortlisted candidates to localStorage whenever they change (but only after initial load)
  useEffect(() => {
    if (typeof window !== 'undefined' && jobId && hasLoadedShortlisted) {
      const storageKey = `shortlisted-candidates-${jobId}`
      const candidateIds = Array.from(shortlistedCandidates)
      localStorage.setItem(storageKey, JSON.stringify(candidateIds))
    }
  }, [shortlistedCandidates, jobId, hasLoadedShortlisted])

  const handleWeightChange = (key: keyof PerformanceWeights, value: number[]) => {
    const newValue = value[0]
    const currentTotal = Object.values(performanceWeights).reduce((a, b) => a + b, 0)
    const otherTotal = currentTotal - performanceWeights[key]
    const maxAllowed = 100 - otherTotal
    
    if (newValue > maxAllowed) {
      return
    }

    const newWeights = { ...performanceWeights, [key]: newValue }
    setPerformanceWeights(newWeights)
  }

  const normalizeWeights = () => {
    const total = Object.values(performanceWeights).reduce((a, b) => a + b, 0)
    if (total !== 100) {
      const factor = 100 / total
      setPerformanceWeights({
        correctness: Math.round(performanceWeights.correctness * factor),
        timeEfficiency: Math.round(performanceWeights.timeEfficiency * factor),
        codeQuality: Math.round(performanceWeights.codeQuality * factor),
        problemSolving: Math.round(performanceWeights.problemSolving * factor),
      })
    }
  }

  const resetToDefault = () => {
    setRankingPreset('balanced')
    setPerformanceWeights(PRESET_WEIGHTS.balanced)
    setIntegrityLevel('standard')
    setAutoExcludeSevere(true)
    setFlagMediumRisk(true)
    setIgnoreMinor(false)
    // Use job skills if available, otherwise use default
    setRequiredTools(job?.skills && job.skills.length > 0 ? job.skills : ['React', 'Node.js', 'PostgreSQL', 'AWS'])
    setToolMatchingRule('most')
    setToolEvidenceSources(['resume', 'interview', 'projects'])
    setIndustryDomains(['Fintech'])
    setIndustryExperienceLevel('any')
    setGroupingOption('tool-familiarity')
    setUseCommunicationTiebreaker(true)
  }

  const totalWeight = Object.values(performanceWeights).reduce((a, b) => a + b, 0)
  const weightWarning = performanceWeights.timeEfficiency > performanceWeights.correctness
  const correctnessWarning = performanceWeights.correctness < 30

  // Build available tools list: include job skills + common tools
  const availableTools = useMemo(() => {
    const commonTools = ['React', 'Node.js', 'PostgreSQL', 'AWS', 'Kubernetes', 'Redis', 'TypeScript', 'Python', 'Go', 'Docker', 'Next.js', 'Tailwind CSS', 'HIPAA', 'MongoDB', 'GraphQL', 'Docker', 'CI/CD', 'Git']
    const jobTools = job?.skills || []
    // Combine and deduplicate
    const allTools = [...new Set([...jobTools, ...commonTools])]
    return allTools.sort()
  }, [job])
  const availableIndustries = ['Fintech', 'Healthcare', 'E-commerce', 'DevOps / Infra', 'AI / ML']

  // Calculate candidate metrics with detailed performance breakdown
  const processedCandidates = useMemo(() => {
    return applicants.map((applicant) => {
      // Calculate integrity percentage
        const totalViolations = applicant.submissions.reduce((sum, sub) => sum + sub.violations, 0)
      const integrityPercentage = Math.max(0, 100 - (totalViolations * 10))
      
      // Calculate detailed performance metrics
      const submissions = applicant.submissions
      
      // Correctness & Completeness (from score, normalized to 0-10)
      const correctness = submissions.length > 0
        ? submissions.reduce((sum, sub) => sum + sub.score, 0) / submissions.length
        : 0
      
      // Time Efficiency (deterministic: inverse of average time, normalized)
      // Lower time = higher efficiency score
      const candidateSeed = hashString(applicant.id)
      const avgTimeMinutes = 20 + (candidateSeed % 30) // Mock: 20-50 minutes (deterministic)
      const timeEfficiency = Math.max(0, 10 - (avgTimeMinutes - 15) / 5) // Normalize to 0-10
      
      // Code Quality (deterministic: based on score with some variation)
      const qualityVariation = (candidateSeed % 3) - 1 // -1, 0, or 1
      const codeQuality = Math.min(10, Math.max(0, correctness + qualityVariation))
      
      // Problem-Solving Approach (deterministic: based on score and completion rate)
      const completionRate = submissions.length / totalChallenges
      const problemSolving = Math.min(10, (correctness * 0.7) + (completionRate * 3)) // Weighted combination
      
      // Calculate weighted performance score using current weights
      const weightedScore = (
        (correctness * performanceWeights.correctness / 100) +
        (timeEfficiency * performanceWeights.timeEfficiency / 100) +
        (codeQuality * performanceWeights.codeQuality / 100) +
        (problemSolving * performanceWeights.problemSolving / 100)
      )
      
      // Generate tool usage and fit (deterministic based on candidate ID)
      const candidateTools = generateToolUsage(applicant.id, availableTools)
      // Calculate tool fit based on required tools (this will be recalculated when requiredTools changes)
      const matchedTools = candidateTools.filter(tool => requiredTools.includes(tool))
      const toolFitScore = matchedTools.length
      const totalRequired = requiredTools.length
      // Determine fit level based on percentage matched
      const matchPercentage = totalRequired > 0 ? toolFitScore / totalRequired : 0
      const toolFitLevel = matchPercentage >= 0.8 ? 'High' : matchPercentage >= 0.5 ? 'Medium' : matchPercentage >= 0.2 ? 'Low' : 'None'
      
      // Generate industry experience (deterministic based on candidate ID)
      const industryExp = generateIndustryExperience(applicant.id, availableIndustries)
      
      // Calculate industry fit based on how well candidate's domains match selected domains
      // This should update when industryDomains changes (it's in the dependency array)
      let industryFitLevel: 'High' | 'Medium' | 'Low' = 'Low'
      if (industryDomains.length > 0) {
        // Find which of the candidate's domains match the selected domains
        const matchedDomains = industryExp.domains.filter(domain => industryDomains.includes(domain))
        const allSelectedMatch = matchedDomains.length === industryDomains.length // Candidate has ALL selected domains
        const someSelectedMatch = matchedDomains.length > 0 && matchedDomains.length < industryDomains.length // Candidate has SOME selected domains
        
        // High: Candidate has ALL selected domains + sufficient years
        if (allSelectedMatch && industryExp.years >= 2) {
          industryFitLevel = 'High'
        } else if (allSelectedMatch && industryExp.years >= 1) {
          industryFitLevel = 'Medium'
        }
        // Medium: Candidate has SOME (but not all) selected domains + sufficient years
        else if (someSelectedMatch && industryExp.years >= 2) {
          industryFitLevel = 'Medium'
        } else if (someSelectedMatch && industryExp.years >= 1) {
          industryFitLevel = 'Low'
        }
        // Low: Candidate has at least one matching domain but insufficient years
        else if (matchedDomains.length > 0) {
          industryFitLevel = 'Low'
        }
        // Low: No matching domains
        else {
          industryFitLevel = 'Low'
        }
      } else {
        // No industry filter selected - show based on years only (neutral display)
        industryFitLevel = industryExp.years >= 3 ? 'High' : industryExp.years >= 1 ? 'Medium' : 'Low'
      }
      
      // Generate communication metrics
      const communication = generateCommunication(applicant.id)
      
      // Generate deterministic candidate number based on ID
      const candidateNumberSeed = hashString(applicant.id)
      const candidateNumber = 1800 + (candidateNumberSeed % 200) + 1
      
      return {
        ...applicant,
        candidateNumber,
        integrityPercentage,
        integrityStatus: integrityPercentage >= 90 ? 'Clean' : integrityPercentage >= 75 ? 'Good' : integrityPercentage >= 60 ? 'Fair' : 'Poor',
        performanceScore: weightedScore,
        metrics: {
          correctness,
          timeEfficiency,
          codeQuality,
          problemSolving,
        },
        toolFit: {
          score: toolFitScore,
          total: requiredTools.length,
          level: toolFitLevel as 'High' | 'Medium' | 'Low' | 'None',
          matchedTools,
          allTools: candidateTools,
        },
        industryFit: {
          level: industryFitLevel as 'High' | 'Medium' | 'Low',
          domains: industryExp.domains,
          yearsExperience: industryExp.years,
        },
        communication,
      }
      })
  }, [applicants, performanceWeights, requiredTools, availableTools, availableIndustries, industryDomains, totalChallenges])

  // Filter by integrity and experience/fit
  const integrityThresholds = useMemo(() => ({
    strict: 90,
    standard: 75,
    lenient: 60,
  }), [])

  const filteredCandidates = useMemo(() => {
    const filtered = processedCandidates.filter(candidate => {
      // Integrity filter
      if (candidate.integrityPercentage < integrityThresholds[integrityLevel]) {
        return false
      }
      
      // Auto-exclude severe violations (only if enabled and below threshold)
      if (autoExcludeSevere && candidate.integrityPercentage < 60) {
        return false
      }
      
      // Flag medium-risk behavior (still include but mark)
      if (flagMediumRisk && candidate.integrityPercentage >= 60 && candidate.integrityPercentage < 75) {
        // Include but will be marked
      }
      
      // Tool Familiarity Filter
      if (requiredTools.length > 0) {
        if (toolMatchingRule === 'all') {
          // Must have all required tools
          if (candidate.toolFit.matchedTools.length < requiredTools.length) {
            return false
          }
        } else if (toolMatchingRule === 'most') {
          // Must have most tools (at least 50%)
          const minRequired = Math.ceil(requiredTools.length * 0.5)
          if (candidate.toolFit.matchedTools.length < minRequired) {
            return false
          }
        } else if (toolMatchingRule === 'at-least') {
          // At least 2 tools (configurable, using 2 as default)
          if (candidate.toolFit.matchedTools.length < 2) {
            return false
          }
        }
      }
      
      // Industry Experience Filter
      if (industryDomains.length > 0) {
        const hasIndustryMatch = candidate.industryFit.domains.some(domain => 
          industryDomains.includes(domain)
        )
        
        if (!hasIndustryMatch) {
          return false
        }
        
        // Filter by experience level if specified
        if (industryExperienceLevel !== 'any' && candidate.industryFit.yearsExperience !== undefined) {
          const years = candidate.industryFit.yearsExperience
          if (industryExperienceLevel === '1-2' && (years < 1 || years > 2)) {
            return false
          } else if (industryExperienceLevel === '3-5' && (years < 3 || years > 5)) {
            return false
          } else if (industryExperienceLevel === '5+' && years < 5) {
            return false
          }
        }
      }
      
      return true
    })

    // Helper function to sort candidates by performance score (with optional communication tiebreaker)
    const sortCandidates = (candidates: typeof filtered) => {
      return [...candidates].sort((a, b) => {
        // Primary sort: Performance score (weighted, from configuration)
        // Higher scores should come first (descending order)
        let scoreA = a.performanceScore
        let scoreB = b.performanceScore
        
        // Secondary sort: Communication tiebreaker (only if scores are very close)
        if (useCommunicationTiebreaker && Math.abs(scoreA - scoreB) < 0.1) {
          const commScore = (c: typeof a) => {
            if (c.communication.overall === 'High') return 0.05
            if (c.communication.overall === 'Medium') return 0.02
            return 0
          }
          scoreA += commScore(a)
          scoreB += commScore(b)
        }
        
        // Return negative if a should come before b (higher score first)
        return scoreB - scoreA
      })
    }

    // Group candidates first, then sort within each group
    if (groupingOption === 'tool-familiarity') {
      const groups: Record<string, typeof filtered> = {
        'Strong Stack Fit': filtered.filter(c => c.toolFit.level === 'High'),
        'Partial Stack Fit': filtered.filter(c => c.toolFit.level === 'Medium'),
        'No Prior Stack Experience': filtered.filter(c => c.toolFit.level === 'Low' || c.toolFit.level === 'None'),
      }
      // Sort within each group and remove empty groups
      const sortedGroups: Record<string, typeof filtered> = {}
      Object.entries(groups).forEach(([key, candidates]) => {
        if (candidates.length > 0) {
          sortedGroups[key] = sortCandidates(candidates)
        }
      })
      return sortedGroups
    } else if (groupingOption === 'industry-experience') {
      const groups: Record<string, typeof filtered> = {
        'High Industry Fit': filtered.filter(c => c.industryFit.level === 'High'),
        'Medium Industry Fit': filtered.filter(c => c.industryFit.level === 'Medium'),
        'Low Industry Fit': filtered.filter(c => c.industryFit.level === 'Low'),
      }
      // Sort within each group and remove empty groups
      const sortedGroups: Record<string, typeof filtered> = {}
      Object.entries(groups).forEach(([key, candidates]) => {
        if (candidates.length > 0) {
          sortedGroups[key] = sortCandidates(candidates)
        }
      })
      return sortedGroups
    } else if (groupingOption === 'seniority') {
      // Group by years of experience
      const groups: Record<string, typeof filtered> = {
        'Senior (5+ years)': filtered.filter(c => (c.industryFit.yearsExperience || 0) >= 5),
        'Mid-level (3-5 years)': filtered.filter(c => {
          const years = c.industryFit.yearsExperience || 0
          return years >= 3 && years < 5
        }),
        'Junior (1-2 years)': filtered.filter(c => {
          const years = c.industryFit.yearsExperience || 0
          return years >= 1 && years < 3
        }),
        'Entry-level (<1 year)': filtered.filter(c => (c.industryFit.yearsExperience || 0) < 1),
      }
      // Sort within each group and remove empty groups
      const sortedGroups: Record<string, typeof filtered> = {}
      Object.entries(groups).forEach(([key, candidates]) => {
        if (candidates.length > 0) {
          sortedGroups[key] = sortCandidates(candidates)
        }
      })
      return sortedGroups
    } else {
      // No grouping - sort all candidates together
      return { 'All Candidates': sortCandidates(filtered) }
    }
  }, [
    processedCandidates, 
    integrityLevel, 
    integrityThresholds,
    autoExcludeSevere, 
    flagMediumRisk,
    groupingOption,
    requiredTools,
    toolMatchingRule,
    industryDomains,
    industryExperienceLevel,
    useCommunicationTiebreaker,
  ])

  // Assign ranks within groups
  const rankedCandidates = useMemo(() => {
    const result: Record<string, Array<typeof processedCandidates[0] & { rank: number }>> = {}
    
    Object.entries(filteredCandidates).forEach(([groupName, candidates]) => {
      result[groupName] = candidates.map((candidate, index) => ({
        ...candidate,
        rank: index + 1,
      }))
    })
    
    return result
  }, [filteredCandidates])

  // Find the selected candidate from processed candidates
  const selectedCandidate = useMemo(() => {
    if (!selectedCandidateId) return null
    const allCandidates = Object.values(rankedCandidates).flat()
    return allCandidates.find(c => c.id === selectedCandidateId) || null
  }, [selectedCandidateId, rankedCandidates])

  // Get shortlisted candidates (from all processed candidates, not just filtered ones)
  const shortlistedCandidatesList = useMemo(() => {
    if (shortlistedCandidates.size === 0) return []
    return processedCandidates
      .filter(c => shortlistedCandidates.has(c.id))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [shortlistedCandidates, processedCandidates])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user || !job) {
    return null
  }

  const userInitials = user.email?.charAt(0).toUpperCase() || 'R'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/dashboard/recruiter" className="transition-opacity hover:opacity-80">
            <Logo />
          </Link>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Link href="/profile">
              <Avatar className="cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ring-offset-2 ring-offset-background">
                <AvatarImage src="" alt={user.email || ''} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">{userInitials}</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Top Section - Job Information */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-6">
              {/* Left Side - Job Description */}
              <div className="flex-1 space-y-4">
                {/* Job Title with Back Arrow */}
                <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/recruiter')}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
            <h1 className="text-3xl font-bold">{job.role}</h1>
          </div>

                {/* Job Description */}
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground mb-2">Job Description</h2>
                  <p className="text-base leading-relaxed">{job.description}</p>
        </div>

                {/* Role Expectations / Tools / Domain Context */}
                <div className="pt-4 border-t border-border/50">
                  <div className="space-y-3">
                    {/* Tools */}
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground mb-2">Required Tools & Technologies</h3>
                      <div className="flex flex-wrap gap-2">
                        {job.skills.map((skill, idx) => (
                          <Badge key={idx} variant="outline" className="text-sm">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Shortlisted Candidates */}
              <div className="w-80 shrink-0 border-l border-border/50 pl-6" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                      <UserStar className="h-4 w-4 text-yellow-500" />
                      Shortlisted Candidates
                    </h3>
                    {shortlistedCandidatesList.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No candidates shortlisted yet. Click the star icon on candidate cards to shortlist them.</p>
                    ) : (
                      <div className="space-y-2">
                        {shortlistedCandidatesList.map((candidate) => (
                          <div
                            key={candidate.id}
                            className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedCandidateId(candidate.id)
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                {candidate.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{candidate.name}</p>
                              <p className="text-xs text-muted-foreground">#{candidate.candidateNumber}</p>
                            </div>
                            <UserStar className="h-4 w-4 text-yellow-500 fill-yellow-500 shrink-0" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {shortlistedCandidatesList.length > 0 && (
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => {
                        setShowComparison(true)
                      }}
                    >
                      Compare Shortlisted ({shortlistedCandidatesList.length})
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Two Panel Layout */}
        <div className="flex gap-6">
          {/* LEFT PANEL - Configuration Controls */}
          <div className="w-1/3 border-r border-border/50 pr-6">
            {/* Global Control Bar */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
            <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetToDefault}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset to Default
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Star className="h-4 w-4" />
                  Personalised
                </Button>
              </div>
            </div>

            {/* 1. Ranking Preset */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Ranking Preset (Performance-Focused)</CardTitle>
                <CardDescription>Quickly define what "good performance" means for this role.</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={rankingPreset} onValueChange={(value) => setRankingPreset(value as RankingPreset)}>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="balanced" id="balanced" />
                      <Label htmlFor="balanced" className="cursor-pointer flex-1">
                        <span className="font-medium">Balanced</span>
                        <Badge variant="outline" className="ml-2 text-xs">Recommended</Badge>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fast-solver" id="fast-solver" />
                      <Label htmlFor="fast-solver" className="cursor-pointer flex-1">Fast Solver</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="strong-fundamentals" id="strong-fundamentals" />
                      <Label htmlFor="strong-fundamentals" className="cursor-pointer flex-1">Strong Fundamentals</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="production-ready" id="production-ready" />
                      <Label htmlFor="production-ready" className="cursor-pointer flex-1">Production-Ready</Label>
          </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="careful-accurate" id="careful-accurate" />
                      <Label htmlFor="careful-accurate" className="cursor-pointer flex-1">Careful & Accurate</Label>
          </div>
        </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* 2. Performance Weighting */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Performance Weighting</CardTitle>
                <CardDescription>Define how technical performance is scored and ranked. Must total 100%.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {weightWarning && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-sm text-yellow-700 dark:text-yellow-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Warning: Speed is weighted higher than correctness.</span>
                  </div>
                )}
                {correctnessWarning && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-sm text-red-700 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Warning: Correctness is below recommended minimum (30%).</span>
                            </div>
                )}

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Correctness & Completeness</Label>
                      <span className="text-sm font-medium">{performanceWeights.correctness}%</span>
                    </div>
                    <Slider
                      value={[performanceWeights.correctness]}
                      onValueChange={(value) => handleWeightChange('correctness', value)}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Test cases passed, edge cases, partial credit</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Time Efficiency</Label>
                      <span className="text-sm font-medium">{performanceWeights.timeEfficiency}%</span>
                    </div>
                    <Slider
                      value={[performanceWeights.timeEfficiency]}
                      onValueChange={(value) => handleWeightChange('timeEfficiency', value)}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Time to first correct solution, total solve time</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Code Quality & Maintainability</Label>
                      <span className="text-sm font-medium">{performanceWeights.codeQuality}%</span>
                    </div>
                    <Slider
                      value={[performanceWeights.codeQuality]}
                      onValueChange={(value) => handleWeightChange('codeQuality', value)}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Readability, structure, refactoring, error rate</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Problem-Solving Approach</Label>
                      <span className="text-sm font-medium">{performanceWeights.problemSolving}%</span>
                            </div>
                    <Slider
                      value={[performanceWeights.problemSolving]}
                      onValueChange={(value) => handleWeightChange('problemSolving', value)}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Iterative reasoning, logical progression, recovery</p>
                            </div>
                              </div>

                <div className={cn(
                  "p-3 rounded-md border text-sm font-medium",
                  totalWeight === 100 
                    ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400"
                    : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400"
                )}>
                  Total: {totalWeight}%
                  {totalWeight !== 100 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={normalizeWeights}
                      className="ml-2 h-6 text-xs"
                    >
                      Normalize
                    </Button>
                            )}
            </div>
              </CardContent>
            </Card>

            {/* 3. Integrity & Proctoring Rules */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Integrity & Proctoring Rules</CardTitle>
                <CardDescription>Determine who is eligible before ranking occurs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-3 block">Minimum Integrity Requirement</Label>
                  <RadioGroup value={integrityLevel} onValueChange={(value) => setIntegrityLevel(value as IntegrityLevel)}>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="strict" id="strict" />
                        <Label htmlFor="strict" className="cursor-pointer">Strict ≥ 90%</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="standard" id="standard" />
                        <Label htmlFor="standard" className="cursor-pointer">Standard ≥ 75%</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="lenient" id="lenient" />
                        <Label htmlFor="lenient" className="cursor-pointer">Lenient ≥ 60%</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div className="pt-4 border-t border-border/50">
                  <Label className="text-sm font-medium mb-3 block">Violation Handling</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
              <Checkbox
                        id="auto-exclude"
                        checked={autoExcludeSevere}
                        onCheckedChange={(checked) => setAutoExcludeSevere(checked === true)}
              />
                      <Label htmlFor="auto-exclude" className="cursor-pointer">Auto-exclude severe violations</Label>
            </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="flag-medium"
                        checked={flagMediumRisk}
                        onCheckedChange={(checked) => setFlagMediumRisk(checked === true)}
                      />
                      <Label htmlFor="flag-medium" className="cursor-pointer">Flag medium-risk behavior for review</Label>
          </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ignore-minor"
                        checked={ignoreMinor}
                        onCheckedChange={(checked) => setIgnoreMinor(checked === true)}
                      />
                      <Label htmlFor="ignore-minor" className="cursor-pointer">Ignore minor violations</Label>
                    </div>
          </div>
        </div>

                <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                  Integrity affects eligibility before ranking. Candidates below the threshold are excluded or flagged.
                </p>
              </CardContent>
            </Card>

            {/* 4. Experience & Fit Filters */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Experience & Fit Filters</CardTitle>
                <CardDescription>Narrow and organize the candidate pool before ranking.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 4.1 Tool Familiarity Filter */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Required / Preferred Tools</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                    {availableTools.map((tool) => (
                      <div key={tool} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tool-${tool}`}
                          checked={requiredTools.includes(tool)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setRequiredTools([...requiredTools, tool])
                            } else {
                              setRequiredTools(requiredTools.filter(t => t !== tool))
                            }
                          }}
                        />
                        <Label htmlFor={`tool-${tool}`} className="cursor-pointer text-sm">{tool}</Label>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3">
                    <Label className="text-sm font-medium mb-2 block">Matching rule:</Label>
                    <RadioGroup value={toolMatchingRule} onValueChange={(value) => setToolMatchingRule(value as 'most' | 'all' | 'at-least')}>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="most" id="most-tools" />
                          <Label htmlFor="most-tools" className="cursor-pointer text-sm">Most of these tools</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="all" id="all-tools" />
                          <Label htmlFor="all-tools" className="cursor-pointer text-sm">All of these tools</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="at-least" id="at-least-tools" />
                          <Label htmlFor="at-least-tools" className="cursor-pointer text-sm">At least ___ tools</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="mt-3">
                    <Label className="text-sm font-medium mb-2 block">Evidence sources:</Label>
                    <div className="space-y-2">
                      {['resume', 'interview', 'projects'].map((source) => (
                        <div key={source} className="flex items-center space-x-2">
                          <Checkbox
                            id={`evidence-${source}`}
                            checked={toolEvidenceSources.includes(source)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setToolEvidenceSources([...toolEvidenceSources, source])
                              } else {
                                setToolEvidenceSources(toolEvidenceSources.filter(s => s !== source))
                              }
                            }}
                          />
                          <Label htmlFor={`evidence-${source}`} className="cursor-pointer text-sm capitalize">{source}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4.2 Industry Experience Filter */}
                <div className="pt-4 border-t border-border/50">
                  <Label className="text-sm font-medium mb-3 block">Relevant Industry Experience</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-3 mb-3">
                    {availableIndustries.map((industry) => (
                      <div key={industry} className="flex items-center space-x-2">
                        <Checkbox
                          id={`industry-${industry}`}
                          checked={industryDomains.includes(industry)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setIndustryDomains([...industryDomains, industry])
                            } else {
                              setIndustryDomains(industryDomains.filter(i => i !== industry))
                            }
                          }}
                        />
                        <Label htmlFor={`industry-${industry}`} className="cursor-pointer text-sm">{industry}</Label>
                      </div>
                    ))}
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Experience level:</Label>
                    <RadioGroup value={industryExperienceLevel} onValueChange={(value) => setIndustryExperienceLevel(value as 'any' | '1-2' | '3-5' | '5+')}>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="any" id="any-exp" />
                          <Label htmlFor="any-exp" className="cursor-pointer text-sm">Any</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="1-2" id="1-2-exp" />
                          <Label htmlFor="1-2-exp" className="cursor-pointer text-sm">1–2 years</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="3-5" id="3-5-exp" />
                          <Label htmlFor="3-5-exp" className="cursor-pointer text-sm">3–5 years</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="5+" id="5+-exp" />
                          <Label htmlFor="5+-exp" className="cursor-pointer text-sm">5+ years</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                {/* Candidate Grouping */}
                <div className="pt-4 border-t border-border/50">
                  <Label className="text-sm font-medium mb-3 block">Group candidates by:</Label>
                  <RadioGroup value={groupingOption} onValueChange={(value) => setGroupingOption(value as GroupingOption)}>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="tool-familiarity" id="group-tools" />
                        <Label htmlFor="group-tools" className="cursor-pointer text-sm">Tool familiarity</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="industry-experience" id="group-industry" />
                        <Label htmlFor="group-industry" className="cursor-pointer text-sm">Industry experience</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="seniority" id="group-seniority" />
                        <Label htmlFor="group-seniority" className="cursor-pointer text-sm">Seniority</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="none" id="group-none" />
                        <Label htmlFor="group-none" className="cursor-pointer text-sm">None</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* Communication Tiebreaker */}
                <div className="pt-4 border-t border-border/50">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="communication-tiebreaker"
                      checked={useCommunicationTiebreaker}
                      onCheckedChange={(checked) => setUseCommunicationTiebreaker(checked === true)}
                    />
                    <Label htmlFor="communication-tiebreaker" className="cursor-pointer text-sm">
                      Use communication only as a tie-breaker
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Communication signals are shown on candidate cards but not included in ranking math by default.
                  </p>
                    </div>
                  </CardContent>
                </Card>
          </div>

          {/* RIGHT PANEL - Candidate Results */}
          <div className="flex-1">
            <div className="space-y-6">
              {Object.entries(rankedCandidates).map(([groupName, candidates]) => {
                const isCollapsed = collapsedGroups.has(groupName)
                return (
                  <div key={groupName}>
                    <div 
                      className="flex items-center gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => {
                        const newCollapsed = new Set(collapsedGroups)
                        if (isCollapsed) {
                          newCollapsed.delete(groupName)
                        } else {
                          newCollapsed.add(groupName)
                        }
                        setCollapsedGroups(newCollapsed)
                      }}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                      <h3 className="text-lg font-semibold">{groupName}</h3>
                      <Badge variant="outline" className="text-xs">
                        {candidates.length}
                      </Badge>
                    </div>
                  
                    {!isCollapsed && (
                      <div className="space-y-3">
                        {candidates.map((candidate) => {
                          const isShortlisted = shortlistedCandidates.has(candidate.id)
              return (
                            <Card 
                              key={candidate.id}
                              className="hover:border-primary/50 transition-colors bg-gradient-to-br from-card via-card/90 to-muted/30"
                            >
                              <CardContent className="p-5 relative">
                                <div className="flex items-start justify-between gap-6">
                                  <div 
                                    className="flex-1 space-y-4 cursor-pointer"
                                    onClick={() => setSelectedCandidateId(candidate.id)}
                                  >
                                    {/* Header: Candidate Name and Number */}
                                    <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-base font-semibold">
                                          {candidate.name}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                          (#{candidate.candidateNumber})
                              </span>
                            </div>
                                    </div>
                              
                              {/* Metrics Grid */}
                              <div className="grid grid-cols-2 gap-4">
                                {/* Integrity */}
                                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30">
                                  <Shield className={cn(
                                    "h-4 w-4 shrink-0",
                                    candidate.integrityStatus === 'Clean' ? "text-green-500" :
                                    candidate.integrityStatus === 'Good' ? "text-blue-500" :
                                    candidate.integrityStatus === 'Fair' ? "text-yellow-500" : "text-red-500"
                                  )} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground">Integrity</p>
                                    <p className={cn(
                                      "text-sm font-medium",
                                      candidate.integrityStatus === 'Clean' ? "text-green-600 dark:text-green-400" :
                                      candidate.integrityStatus === 'Good' ? "text-blue-600 dark:text-blue-400" :
                                      candidate.integrityStatus === 'Fair' ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"
                              )}>
                                      {candidate.integrityPercentage}% ({candidate.integrityStatus})
                                    </p>
                            </div>
                            </div>
                                
                                {/* Tool Fit */}
                                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30">
                                  <Wrench className={cn(
                                    "h-4 w-4 shrink-0",
                                    candidate.toolFit.level === 'High' ? "text-green-500" :
                                    candidate.toolFit.level === 'Medium' ? "text-yellow-500" : "text-red-500"
                                  )} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground">Tool Fit</p>
                                    <p className={cn(
                                      "text-sm font-medium",
                                      candidate.toolFit.level === 'High' ? "text-green-600 dark:text-green-400" :
                                      candidate.toolFit.level === 'Medium' ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"
                                    )}>
                                      {candidate.toolFit.level} ({candidate.toolFit.score}/{candidate.toolFit.total})
                                    </p>
                              </div>
                          </div>
                                
                                {/* Industry Fit */}
                                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30">
                                  <Building2 className={cn(
                                    "h-4 w-4 shrink-0",
                                    candidate.industryFit.level === 'High' ? "text-green-500" :
                                    candidate.industryFit.level === 'Medium' ? "text-yellow-500" : "text-red-500"
                                  )} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground">Industry Fit</p>
                                    <p className={cn(
                                      "text-sm font-medium",
                                      candidate.industryFit.level === 'High' ? "text-green-600 dark:text-green-400" :
                                      candidate.industryFit.level === 'Medium' ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"
                                    )}>
                                      {candidate.industryFit.level}
                                    </p>
                        </div>
                      </div>
                                
                                {/* Communication */}
                                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30">
                                  <MessageSquare className={cn(
                                    "h-4 w-4 shrink-0",
                                    candidate.communication.overall === 'High' ? "text-green-500" :
                                    candidate.communication.overall === 'Medium' ? "text-yellow-500" : "text-red-500"
                                  )} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground">Communication</p>
                                    <p className={cn(
                                      "text-sm font-medium",
                                      candidate.communication.overall === 'High' ? "text-green-600 dark:text-green-400" :
                                      candidate.communication.overall === 'Medium' ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"
                                    )}>
                                      {candidate.communication.overall}
                                    </p>
                    </div>
                                </div>
                              </div>
                        </div>
                                  
                                  {/* Performance Score - Right Side */}
                                  <div className="flex items-start gap-4 shrink-0">
                                    <div className="text-right">
                                      <div className="flex items-center gap-2 justify-end mb-1">
                                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                        <p className="text-xs text-muted-foreground">Performance</p>
                                      </div>
                                      <p className="text-3xl font-bold">{candidate.performanceScore.toFixed(1)}</p>
                                      <p className="text-xs text-muted-foreground mt-1">out of 10.0</p>
                                    </div>
                      </div>
                    </div>
                                  
                                  {/* UserStar Button - Absolute Bottom Right */}
                                  <Button
                                    variant="ghost"
                                    className={cn(
                                      "absolute bottom-2 right-2 h-24 w-24 shrink-0 p-0 flex items-center justify-center",
                                      isShortlisted && "text-yellow-500 hover:text-yellow-600"
                                    )}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      const newShortlisted = new Set(shortlistedCandidates)
                                      if (isShortlisted) {
                                        newShortlisted.delete(candidate.id)
                                      } else {
                                        newShortlisted.add(candidate.id)
                                      }
                                      setShortlistedCandidates(newShortlisted)
                                    }}
                                  >
                                    <UserStar 
                                      className={cn(isShortlisted && "fill-yellow-500")} 
                                      style={{ width: '36px', height: '36px' }}
                                    />
                                  </Button>
                  </CardContent>
                </Card>
              )
                        })}
                      </div>
          )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Candidate Detail Modal */}
      {selectedCandidate && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={() => setSelectedCandidateId(null)}
        >
          <Card 
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="border-b pb-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-semibold mb-3 break-words text-foreground leading-tight">
                    {selectedCandidate.name}
                  </h2>
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>Candidate #{selectedCandidate.candidateNumber}</span>
                      <span>•</span>
                      <span className="break-all">{selectedCandidate.email}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setSelectedCandidateId(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Score Breakdown */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Score Breakdown
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">Overall Performance</div>
                      <div className="text-3xl font-bold text-primary">{selectedCandidate.performanceScore.toFixed(1)}/10</div>
                      <div className="text-xs text-muted-foreground mt-1">Weighted by current preset</div>
            </CardContent>
          </Card>
                  <Card className={cn(
                    "border-2",
                    selectedCandidate.integrityStatus === 'Clean' ? "bg-green-500/10 border-green-500/20" :
                    selectedCandidate.integrityStatus === 'Good' ? "bg-blue-500/10 border-blue-500/20" :
                    selectedCandidate.integrityStatus === 'Fair' ? "bg-yellow-500/10 border-yellow-500/20" : "bg-red-500/10 border-red-500/20"
                  )}>
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">Integrity Score</div>
                      <div className={cn(
                        "text-3xl font-bold",
                        selectedCandidate.integrityStatus === 'Clean' ? "text-green-600 dark:text-green-400" :
                        selectedCandidate.integrityStatus === 'Good' ? "text-blue-600 dark:text-blue-400" :
                        selectedCandidate.integrityStatus === 'Fair' ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"
                      )}>
                        {selectedCandidate.integrityPercentage}%
                            </div>
                      <div className="text-xs text-muted-foreground mt-1">{selectedCandidate.integrityStatus}</div>
                    </CardContent>
                  </Card>
                  <Card className={cn(
                    "border-2",
                    selectedCandidate.toolFit.level === 'High' ? "bg-green-500/10 border-green-500/20" :
                    selectedCandidate.toolFit.level === 'Medium' ? "bg-yellow-500/10 border-yellow-500/20" : "bg-red-500/10 border-red-500/20"
                  )}>
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">Tool Fit</div>
                      <div className={cn(
                        "text-2xl font-bold",
                        selectedCandidate.toolFit.level === 'High' ? "text-green-600 dark:text-green-400" :
                        selectedCandidate.toolFit.level === 'Medium' ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"
                      )}>
                        {selectedCandidate.toolFit.level}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{selectedCandidate.toolFit.score}/{selectedCandidate.toolFit.total} tools matched</div>
                    </CardContent>
                  </Card>
                  <Card className={cn(
                    "border-2",
                    selectedCandidate.industryFit.level === 'High' ? "bg-green-500/10 border-green-500/20" :
                    selectedCandidate.industryFit.level === 'Medium' ? "bg-yellow-500/10 border-yellow-500/20" : "bg-red-500/10 border-red-500/20"
                  )}>
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">Industry Fit</div>
                      <div className={cn(
                        "text-2xl font-bold",
                        selectedCandidate.industryFit.level === 'High' ? "text-green-600 dark:text-green-400" :
                        selectedCandidate.industryFit.level === 'Medium' ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"
                      )}>
                        {selectedCandidate.industryFit.level}
                      </div>
                      {selectedCandidate.industryFit.yearsExperience && (
                        <div className="text-xs text-muted-foreground mt-1">{selectedCandidate.industryFit.yearsExperience} years experience</div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                
                {/* Performance Metrics Breakdown */}
                <div className="p-4 border rounded-lg bg-muted/30">
                  <h4 className="text-sm font-semibold mb-3">Performance Metrics (Weighted)</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Correctness & Completeness</span>
                            <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{selectedCandidate.metrics?.correctness.toFixed(1)}/10</span>
                        <span className="text-xs text-muted-foreground">({performanceWeights.correctness}%)</span>
                            </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Time Efficiency</span>
                              <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{selectedCandidate.metrics?.timeEfficiency.toFixed(1)}/10</span>
                        <span className="text-xs text-muted-foreground">({performanceWeights.timeEfficiency}%)</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Code Quality & Maintainability</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{selectedCandidate.metrics?.codeQuality.toFixed(1)}/10</span>
                        <span className="text-xs text-muted-foreground">({performanceWeights.codeQuality}%)</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Problem-Solving Approach</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{selectedCandidate.metrics?.problemSolving.toFixed(1)}/10</span>
                        <span className="text-xs text-muted-foreground">({performanceWeights.problemSolving}%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Challenges Attempted */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Challenges Attempted
                </h3>
                <div className="space-y-3">
                  {selectedCandidate.submissions.map((submission, idx) => {
                    const violationTypes = generateViolationTypes(selectedCandidate.id, submission.challengeId, submission.violations)
                    const durationMinutes = 15 + (hashString(selectedCandidate.id + submission.challengeId) % 30) // 15-45 minutes
                    return (
                      <Card key={idx} className={cn(
                        "border-2",
                        submission.violations === 0 ? "border-green-500/20 bg-green-500/5" :
                        submission.violations < 3 ? "border-yellow-500/20 bg-yellow-500/5" : "border-red-500/20 bg-red-500/5"
                      )}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className={cn(
                                  "flex items-center justify-center w-10 h-10 rounded-lg font-bold text-sm",
                                  submission.violations === 0 ? "bg-green-500 text-white" :
                                  submission.violations < 3 ? "bg-yellow-500 text-white" : "bg-red-500 text-white"
                                )}>
                                  {submission.score.toFixed(1)}
                                </div>
                                <div>
                                  <div className="font-semibold text-base">{submission.challengeId}</div>
                                  <div className="text-sm text-muted-foreground">
                                    Score: {submission.score}/10
                                  </div>
                                </div>
                              </div>
                              
                              {violationTypes.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {violationTypes.map((type, vIdx) => {
                                    const Icon = getViolationIcon(type)
                                    const color = getViolationColor(type)
                                    return (
                                      <div key={vIdx} className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border", color)}>
                                        <Icon className="h-4 w-4 shrink-0" />
                                        <span>
                                          {type === 'tab_switch' ? 'Tab Switching' : type === 'copy_paste' ? 'Code Pasted' : 'Looked Away'}
                                        </span>
                                      </div>
                                    )
                                  })}
                              </div>
                            )}
                              {violationTypes.length === 0 && (
                                <div className="mt-2 flex items-center gap-1.5 text-green-600 dark:text-green-400 text-sm">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span>No violations detected</span>
                          </div>
                              )}
                        </div>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 shrink-0"
                            >
                              <Play className="h-4 w-4" />
                              <div className="text-left">
                                <div className="text-xs font-medium">Play Recording</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {durationMinutes} min
                      </div>
                              </div>
                            </Button>
                    </div>
                  </CardContent>
                </Card>
              )
                  })}
                </div>
              </div>

              {/* Communication Signals */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Communication Signals</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Explanation Clarity</div>
                    <div className="font-medium">{selectedCandidate.communication.explanationClarity}</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Structured Thinking</div>
                    <div className="font-medium">{selectedCandidate.communication.structuredThinking}</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Confidence Under Pressure</div>
                    <div className="font-medium">{selectedCandidate.communication.confidenceUnderPressure}</div>
                  </div>
                </div>
              </div>
              
              {/* Tool & Industry Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Matched Tools</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCandidate.toolFit.matchedTools.map((tool, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                  {selectedCandidate.toolFit.allTools.length > selectedCandidate.toolFit.matchedTools.length && (
                    <div className="mt-2">
                      <h5 className="text-xs text-muted-foreground mb-1">Other Tools</h5>
                      <div className="flex flex-wrap gap-2">
                        {selectedCandidate.toolFit.allTools
                          .filter(t => !selectedCandidate.toolFit.matchedTools.includes(t))
                          .map((tool, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs opacity-50">
                              {tool}
                            </Badge>
                          ))}
                      </div>
                    </div>
          )}
        </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Industry Experience</h4>
                  <div className="space-y-1">
                    {selectedCandidate.industryFit.domains.map((domain, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs mr-2">
                        {domain}
                      </Badge>
                    ))}
                    {selectedCandidate.industryFit.yearsExperience && (
                      <div className="text-xs text-muted-foreground mt-2">
                        {selectedCandidate.industryFit.yearsExperience} years of experience
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Compare Shortlisted Modal */}
      {showComparison && shortlistedCandidatesList.length > 0 && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-hidden"
          onClick={() => setShowComparison(false)}
        >
          <Card 
            className="w-full max-w-7xl h-[95vh] flex flex-col my-4 overflow-hidden p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="border-b pb-4 bg-black pt-6 px-6 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Compare Shortlisted Candidates ({shortlistedCandidatesList.length})</h2>
                  <p className="text-sm text-muted-foreground mt-1">Visualize tradeoffs and make informed hiring decisions</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Export Comparison
                  </Button>
                  <Button variant="outline" size="sm">
                    Share with Team
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowComparison(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-8 overflow-y-auto flex-1">
              {/* Candidate Selector - Header Row */}
              <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: `repeat(${shortlistedCandidatesList.length}, minmax(180px, 1fr))` }}>
                {shortlistedCandidatesList.map((candidate) => (
                  <Card key={candidate.id} className="text-center border-2">
                    <CardContent className="p-4">
                      <div className="flex flex-col items-center gap-2">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {candidate.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm">{candidate.name}</p>
                          <p className="text-xs text-muted-foreground">#{candidate.candidateNumber}</p>
                        </div>
                      </div>
            </CardContent>
          </Card>
                ))}
        </div>

              {/* Challenges Attempted Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Challenges Attempted
                </h3>
                <div className="flex gap-5 overflow-x-auto pb-6 -mx-6 px-6 snap-x snap-mandatory items-stretch" style={{ scrollbarWidth: 'thin' }}>
                  {requiredChallenges.map((challenge) => {
                    // Get all shortlisted candidates who attempted this challenge
                    const candidatesWhoAttempted = shortlistedCandidatesList
                      .map(candidate => {
                        const submission = candidate.submissions?.find(sub => sub.challengeId === challenge.id)
                        return submission ? { candidate, submission } : null
                      })
                      .filter(Boolean) as Array<{ candidate: typeof shortlistedCandidatesList[0], submission: { challengeId: string, score: number, violations: number } }>
                    
                    return (
                      <Card key={challenge.id} className="min-w-[380px] max-w-[380px] border-2 snap-start flex-shrink-0 h-full">
                        <CardContent className="p-6 h-full flex flex-col">
                          <div className="space-y-4 flex-1 flex flex-col">
                            <div className="flex-shrink-0">
                              <h4 className="font-semibold text-lg mb-2">{challenge.title}</h4>
                              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{challenge.description}</p>
                            </div>
                            
                            {/* List of candidates who attempted */}
                            <div className="space-y-3 flex-1 min-h-0">
                              {candidatesWhoAttempted.length > 0 ? (
                                <div className="space-y-2">
                                  {candidatesWhoAttempted.map(({ candidate, submission }) => (
                                    <div 
                                      key={candidate.id} 
                                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                                    >
                                      <div className="flex items-center gap-3 flex-1">
                                        <Avatar className="h-8 w-8">
                                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                            {candidate.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium truncate">{candidate.name}</p>
                                          <p className="text-xs text-muted-foreground">#{candidate.candidateNumber}</p>
                                        </div>
                                      </div>
                                      <div className="text-right min-w-[70px]">
                                        <div className="text-xs text-muted-foreground mb-1">Score</div>
                                        <div className="text-sm font-semibold">{submission.score.toFixed(1)}/10</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground italic">No shortlisted candidates have attempted this challenge</p>
                              )}
                            </div>
                            
                            {/* Replay Submissions Button */}
                            <Button 
                              variant="default" 
                              className="w-full flex-shrink-0"
                              disabled={candidatesWhoAttempted.length === 0}
                              onClick={() => {
                                router.push(`/dashboard/recruiter/job/${jobId}/applicants/replay/${challenge.id}`)
                              }}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Replay Submissions
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>

              {/* Section 1: Performance Comparison */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Performance Comparison
                </h3>
                
                {/* Radar Chart */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-base">Performance Radar Chart</CardTitle>
                    <CardDescription>Compare performance across all metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center min-h-[500px] py-4">
                      <svg width="500" height="500" viewBox="0 0 500 500" className="max-w-full" style={{ overflow: 'visible' }}>
                        {/* Grid circles */}
                        {[1, 2, 3, 4, 5].map((level) => (
                          <circle
                            key={level}
                            cx="250"
                            cy="250"
                            r={level * 35}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1"
                            className="text-muted"
                            opacity={0.2}
                          />
                        ))}
                        
                        {/* Axis lines and labels */}
                        {['Correctness', 'Time Efficiency', 'Code Quality', 'Problem Solving'].map((metric, idx) => {
                          const angle = (idx * Math.PI * 2) / 4 - Math.PI / 2
                          const x = 250 + 175 * Math.cos(angle)
                          const y = 250 + 175 * Math.sin(angle)
                          // Move labels closer to the chart but within bounds
                          const labelX = 250 + 195 * Math.cos(angle)
                          const labelY = 250 + 195 * Math.sin(angle)
                          
                          // Adjust text anchor and position based on angle for better visibility
                          let textAnchor: 'start' | 'middle' | 'end' = 'middle'
                          let dx = 0
                          let dy = 0
                          
                          if (idx === 0) { // Top - Correctness
                            textAnchor = 'middle'
                            dy = -8
                          } else if (idx === 1) { // Right - Time Efficiency
                            textAnchor = 'start'
                            dx = 8
                          } else if (idx === 2) { // Bottom - Code Quality
                            textAnchor = 'middle'
                            dy = 8
                          } else { // Left - Problem Solving
                            textAnchor = 'end'
                            dx = -8
                          }
                          
                          return (
                            <g key={metric}>
                              <line
                                x1="250"
                                y1="250"
                                x2={x}
                                y2={y}
                                stroke="currentColor"
                                strokeWidth="1"
                                className="text-muted"
                                opacity={0.3}
                              />
                              <text
                                x={labelX + dx}
                                y={labelY + dy}
                                textAnchor={textAnchor}
                                dominantBaseline="middle"
                                className="text-sm fill-foreground font-medium"
                              >
                                {metric}
                              </text>
                            </g>
                          )
                        })}
                        
                        {/* Candidate polygons */}
                        {shortlistedCandidatesList.map((candidate, candidateIdx) => {
                          const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4']
                          const color = colors[candidateIdx % colors.length]
                          const metrics = [
                            candidate.metrics.correctness,
                            candidate.metrics.timeEfficiency,
                            candidate.metrics.codeQuality,
                            candidate.metrics.problemSolving,
                          ]
                          
                          const points = metrics.map((value, idx) => {
                            const angle = (idx * Math.PI * 2) / 4 - Math.PI / 2
                            const radius = (value / 10) * 175
                            const x = 250 + radius * Math.cos(angle)
                            const y = 250 + radius * Math.sin(angle)
                            return `${x},${y}`
                          }).join(' ')
                          
                          return (
                            <g key={candidate.id}>
                              <polygon
                                points={points}
                                fill={color}
                                fillOpacity="0.2"
                                stroke={color}
                                strokeWidth="2"
                              />
                            </g>
                          )
                        })}
                      </svg>
                    </div>
                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 justify-center mt-4">
                      {shortlistedCandidatesList.map((candidate, idx) => {
                        const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4']
                        const color = colors[idx % colors.length]
                        return (
                          <div key={candidate.id} className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                            <span className="text-sm font-medium">{candidate.name} (#{candidate.candidateNumber})</span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Supporting Bar Chart - Per Metric Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Performance Breakdown by Metric</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {['Correctness', 'Time Efficiency', 'Code Quality', 'Problem Solving'].map((metric) => {
                        const metricKey = metric.toLowerCase().replace(' ', '') as 'correctness' | 'timeefficiency' | 'codequality' | 'problemsolving'
                        const key = metricKey === 'timeefficiency' ? 'timeEfficiency' : metricKey === 'codequality' ? 'codeQuality' : metricKey === 'problemsolving' ? 'problemSolving' : 'correctness'
                        return (
                          <div key={metric}>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium">{metric}</span>
                              <span className="text-xs text-muted-foreground">/10</span>
                            </div>
                            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${shortlistedCandidatesList.length}, 1fr)` }}>
                              {shortlistedCandidatesList.map((candidate, idx) => {
                                const value = candidate.metrics[key as keyof typeof candidate.metrics]
                                const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4']
                                const color = colors[idx % colors.length]
                                return (
                                  <div key={candidate.id} className="space-y-1">
                                    <div className="text-xs text-center font-medium mb-1">{candidate.name.split(' ')[0]}</div>
                                    <div className="h-8 bg-muted rounded relative overflow-hidden">
                                      <div 
                                        className="h-full rounded"
                                        style={{ 
                                          width: `${(value / 10) * 100}%`,
                                          backgroundColor: color
                                        }}
                                      />
                                    </div>
                                    <p className="text-xs text-center font-medium">{value.toFixed(1)}</p>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Total Performance Score - Column Layout */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Total Performance Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${shortlistedCandidatesList.length}, minmax(200px, 1fr))` }}>
                      {shortlistedCandidatesList.map((candidate) => (
                        <Card key={candidate.id} className="text-center">
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <p className="text-sm font-semibold">{candidate.name}</p>
                              <p className="text-xs text-muted-foreground">#{candidate.candidateNumber}</p>
                              <div className="pt-2">
                                <p className="text-3xl font-bold">{candidate.performanceScore.toFixed(1)}</p>
                                <p className="text-xs text-muted-foreground">/ 10.0</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Section 2: Integrity & Risk Profile */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Integrity & Risk Profile
                </h3>
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${shortlistedCandidatesList.length}, minmax(200px, 1fr))` }}>
                  {shortlistedCandidatesList.map((candidate) => {
                    const totalViolations = candidate.submissions?.reduce((sum, sub) => sum + sub.violations, 0) || 0
                    return (
                      <Card key={candidate.id}>
                        <CardContent className="p-4">
                          <div className="text-center space-y-3">
                            <div>
                              <p className="font-semibold text-sm">{candidate.name}</p>
                              <p className="text-xs text-muted-foreground">#{candidate.candidateNumber}</p>
                            </div>
                            <div className={cn(
                              "mx-auto w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold",
                              candidate.integrityStatus === 'Clean' ? "bg-green-500/10 text-green-600 dark:text-green-400" :
                              candidate.integrityStatus === 'Good' ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                              candidate.integrityStatus === 'Fair' ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
                            )}>
                              {candidate.integrityPercentage}%
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{candidate.integrityStatus}</p>
                              <p className="text-sm text-muted-foreground">{totalViolations} violation{totalViolations !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>

              {/* Section 4: Interview Quality Signals */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Interview Quality Signals
                </h3>
                <Card>
                  <CardContent className="p-4">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr>
                            <th className="text-left p-3 font-semibold">Signal</th>
                            {shortlistedCandidatesList.map((candidate) => (
                              <th key={candidate.id} className="text-center p-3 text-sm font-medium">
                                <div>
                                  <div>{candidate.name}</div>
                                  <div className="text-xs text-muted-foreground font-normal">#{candidate.candidateNumber}</div>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="p-3 font-medium">Explanation Clarity</td>
                            {shortlistedCandidatesList.map((candidate) => (
                              <td key={candidate.id} className="p-3 text-center">
                                <Badge 
                                  variant="outline"
                                  className={cn(
                                    candidate.communication.explanationClarity === 'High' ? "bg-green-500/10 text-green-600 border-green-500/20" :
                                    candidate.communication.explanationClarity === 'Medium' ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" :
                                    "bg-red-500/10 text-red-600 border-red-500/20"
                                  )}
                                >
                                  {candidate.communication.explanationClarity}
                                </Badge>
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b">
                            <td className="p-3 font-medium">Structured Thinking</td>
                            {shortlistedCandidatesList.map((candidate) => (
                              <td key={candidate.id} className="p-3 text-center">
                                <Badge 
                                  variant="outline"
                                  className={cn(
                                    candidate.communication.structuredThinking === 'High' ? "bg-green-500/10 text-green-600 border-green-500/20" :
                                    candidate.communication.structuredThinking === 'Medium' ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" :
                                    "bg-red-500/10 text-red-600 border-red-500/20"
                                  )}
                                >
                                  {candidate.communication.structuredThinking}
                                </Badge>
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="p-3 font-medium">Confidence Under Pressure</td>
                            {shortlistedCandidatesList.map((candidate) => (
                              <td key={candidate.id} className="p-3 text-center">
                                <Badge 
                                  variant="outline"
                                  className={cn(
                                    candidate.communication.confidenceUnderPressure === 'High' ? "bg-green-500/10 text-green-600 border-green-500/20" :
                                    candidate.communication.confidenceUnderPressure === 'Medium' ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" :
                                    "bg-red-500/10 text-red-600 border-red-500/20"
                                  )}
                                >
                                  {candidate.communication.confidenceUnderPressure}
                                </Badge>
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
