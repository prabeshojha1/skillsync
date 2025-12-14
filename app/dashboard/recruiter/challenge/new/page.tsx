'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, type User } from '@/lib/auth'
import { getRecruiterJobs, type RecruiterJob } from '@/lib/recruiter-data'
import { addProblem, generateSlug, problemExists } from '@/lib/problems'
import { type Difficulty, type ProblemData, type ProblemExample, type ProblemTestCase } from '@/data/problems/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Logo } from '@/components/logo'
import { 
  ArrowLeft, 
  Plus, 
  Trash2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface FormErrors {
  title?: string
  functionName?: string
  description?: string
  boilerplate?: string
  examples?: string
  testCases?: string
  constraints?: string
  general?: string
}

export default function NewChallengePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [jobs, setJobs] = useState<RecruiterJob[]>([])
  const [errors, setErrors] = useState<FormErrors>({})
  const [success, setSuccess] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy')
  const [jobId, setJobId] = useState<string>('')
  const [functionName, setFunctionName] = useState('')
  const [description, setDescription] = useState('')
  const [boilerplate, setBoilerplate] = useState('def solution():\n    # Your code here\n    pass')
  const [constraints, setConstraints] = useState<string[]>([''])
  const [examples, setExamples] = useState<ProblemExample[]>([
    { input: '', output: '', explanation: '' }
  ])
  const [testCases, setTestCases] = useState<ProblemTestCase[]>([
    { id: '1', name: 'Test Case 1', input: '', expectedOutput: '' }
  ])

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
    setJobs(getRecruiterJobs())
    setLoading(false)
  }, [router])

  const addExample = () => {
    setExamples([...examples, { input: '', output: '', explanation: '' }])
  }

  const removeExample = (index: number) => {
    if (examples.length > 1) {
      setExamples(examples.filter((_, i) => i !== index))
    }
  }

  const updateExample = (index: number, field: keyof ProblemExample, value: string) => {
    const updated = [...examples]
    updated[index] = { ...updated[index], [field]: value }
    setExamples(updated)
  }

  const addTestCase = () => {
    const newId = String(testCases.length + 1)
    setTestCases([...testCases, { id: newId, name: `Test Case ${newId}`, input: '', expectedOutput: '' }])
  }

  const removeTestCase = (index: number) => {
    if (testCases.length > 1) {
      setTestCases(testCases.filter((_, i) => i !== index))
    }
  }

  const updateTestCase = (index: number, field: keyof ProblemTestCase, value: string) => {
    const updated = [...testCases]
    updated[index] = { ...updated[index], [field]: value }
    setTestCases(updated)
  }

  const addConstraint = () => {
    setConstraints([...constraints, ''])
  }

  const removeConstraint = (index: number) => {
    if (constraints.length > 1) {
      setConstraints(constraints.filter((_, i) => i !== index))
    }
  }

  const updateConstraint = (index: number, value: string) => {
    const updated = [...constraints]
    updated[index] = value
    setConstraints(updated)
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!title.trim()) {
      newErrors.title = 'Title is required'
    }

    if (!functionName.trim()) {
      newErrors.functionName = 'Function name is required'
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(functionName)) {
      newErrors.functionName = 'Function name must be a valid Python identifier'
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required'
    }

    if (!boilerplate.trim()) {
      newErrors.boilerplate = 'Boilerplate code is required'
    }

    const validExamples = examples.filter(e => e.input.trim() && e.output.trim())
    if (validExamples.length === 0) {
      newErrors.examples = 'At least one example with input and output is required'
    }

    const validTestCases = testCases.filter(t => t.input.trim() && t.expectedOutput.trim())
    if (validTestCases.length === 0) {
      newErrors.testCases = 'At least one test case with input and expected output is required'
    }

    const slug = generateSlug(title)
    if (problemExists(slug)) {
      newErrors.title = 'A problem with this title already exists'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setSubmitting(true)

    const slug = generateSlug(title)
    
    // Filter out empty values
    const validExamples = examples.filter(e => e.input.trim() && e.output.trim())
    const validTestCases = testCases.filter(t => t.input.trim() && t.expectedOutput.trim())
    const validConstraints = constraints.filter(c => c.trim())

    const problemData: ProblemData = {
      id: slug,
      title: title.trim(),
      difficulty,
      functionName: functionName.trim(),
      description: description.trim(),
      boilerplate: boilerplate,
      examples: validExamples,
      testCases: validTestCases.map((tc, index) => ({
        ...tc,
        id: String(index + 1),
        name: tc.name || `Test Case ${index + 1}`,
      })),
      constraints: validConstraints,
      companyId: 'recruiter', // Tag to the recruiter's company
      jobId: (jobId && jobId !== '__none__') ? jobId : undefined,
    }

    const success = addProblem(problemData)

    if (success) {
      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard/recruiter')
      }, 1500)
    } else {
      setErrors({ general: 'Failed to add problem. Please try again.' })
    }

    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Challenge Created!</h2>
            <p className="text-muted-foreground">Redirecting to dashboard...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => router.push('/dashboard/recruiter')}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Link href="/" className="transition-opacity hover:opacity-80">
              <Logo />
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create New Challenge</h1>
          <p className="text-muted-foreground">
            Add a new coding challenge for candidates to solve.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Enter the basic details of the challenge.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Two Sum"
                    className={errors.title ? 'border-red-500' : ''}
                  />
                  {errors.title && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.title}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty *</Label>
                  <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="functionName">Function Name *</Label>
                  <Input
                    id="functionName"
                    value={functionName}
                    onChange={(e) => setFunctionName(e.target.value)}
                    placeholder="e.g., twoSum"
                    className={cn("font-mono", errors.functionName ? 'border-red-500' : '')}
                  />
                  {errors.functionName && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.functionName}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobId">Related Job Posting (Optional)</Label>
                  <Select value={jobId} onValueChange={setJobId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a job posting" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {jobs.map((job) => (
                        <SelectItem key={job.id} value={job.id}>
                          {job.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Problem Description</CardTitle>
              <CardDescription>Write the problem description. Markdown is supported.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the problem in detail..."
                  className={cn("min-h-[200px] font-mono text-sm", errors.description ? 'border-red-500' : '')}
                />
                {errors.description && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.description}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Constraints */}
          <Card>
            <CardHeader>
              <CardTitle>Constraints</CardTitle>
              <CardDescription>List the constraints for this problem.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {constraints.map((constraint, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={constraint}
                    onChange={(e) => updateConstraint(index, e.target.value)}
                    placeholder={`e.g., 1 ≤ n ≤ 10⁴`}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeConstraint(index)}
                    disabled={constraints.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addConstraint}>
                <Plus className="h-4 w-4 mr-2" />
                Add Constraint
              </Button>
            </CardContent>
          </Card>

          {/* Boilerplate Code */}
          <Card>
            <CardHeader>
              <CardTitle>Boilerplate Code</CardTitle>
              <CardDescription>Provide the starter Python code for candidates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  value={boilerplate}
                  onChange={(e) => setBoilerplate(e.target.value)}
                  placeholder="def solution():\n    pass"
                  className={cn("min-h-[150px] font-mono text-sm", errors.boilerplate ? 'border-red-500' : '')}
                />
                {errors.boilerplate && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.boilerplate}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Examples */}
          <Card>
            <CardHeader>
              <CardTitle>Examples</CardTitle>
              <CardDescription>Add examples showing input, output, and explanation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {errors.examples && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.examples}
                </p>
              )}
              {examples.map((example, index) => (
                <Card key={index} className="border-border/50">
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">Example {index + 1}</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExample(index)}
                        disabled={examples.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Input *</Label>
                        <Textarea
                          value={example.input}
                          onChange={(e) => updateExample(index, 'input', e.target.value)}
                          placeholder="nums = [2,7,11,15], target = 9"
                          className="font-mono text-sm min-h-[80px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Output *</Label>
                        <Textarea
                          value={example.output}
                          onChange={(e) => updateExample(index, 'output', e.target.value)}
                          placeholder="[0,1]"
                          className="font-mono text-sm min-h-[80px]"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Explanation (Optional)</Label>
                      <Textarea
                        value={example.explanation}
                        onChange={(e) => updateExample(index, 'explanation', e.target.value)}
                        placeholder="Because nums[0] + nums[1] == 9, we return [0, 1]."
                        className="min-h-[60px]"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addExample}>
                <Plus className="h-4 w-4 mr-2" />
                Add Example
              </Button>
            </CardContent>
          </Card>

          {/* Test Cases */}
          <Card>
            <CardHeader>
              <CardTitle>Test Cases</CardTitle>
              <CardDescription>Add test cases to validate candidate solutions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {errors.testCases && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.testCases}
                </p>
              )}
              {testCases.map((testCase, index) => (
                <Card key={index} className="border-border/50">
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Test Case {index + 1}</Badge>
                        <Input
                          value={testCase.name}
                          onChange={(e) => updateTestCase(index, 'name', e.target.value)}
                          placeholder="Test Case Name"
                          className="w-48 h-7 text-sm"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTestCase(index)}
                        disabled={testCases.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Input *</Label>
                        <Textarea
                          value={testCase.input}
                          onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                          placeholder="nums = [2,7,11,15], target = 9"
                          className="font-mono text-sm min-h-[80px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Expected Output *</Label>
                        <Textarea
                          value={testCase.expectedOutput}
                          onChange={(e) => updateTestCase(index, 'expectedOutput', e.target.value)}
                          placeholder="[0,1]"
                          className="font-mono text-sm min-h-[80px]"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addTestCase}>
                <Plus className="h-4 w-4 mr-2" />
                Add Test Case
              </Button>
            </CardContent>
          </Card>

          {/* Submit */}
          {errors.general && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.general}
            </p>
          )}

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/recruiter')}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? 'Creating...' : 'Create Challenge'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
