'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { saveUserProfile, hasCompletedProfile, type UserProfile } from '@/lib/profile'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Logo } from '@/components/logo'
import { cn } from '@/lib/utils'
import { Upload, File, X } from 'lucide-react'
import Link from 'next/link'

const PROGRAMMING_LANGUAGES = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'C++',
  'C#',
  'Go',
  'Rust',
  'Swift',
  'Kotlin',
  'PHP',
  'Ruby',
  'Scala',
  'R',
  'MATLAB',
  'Other',
]

const COMPANY_TYPES = [
  'Software Engineering',
  'Cybersecurity',
  'Data Science',
  'Machine Learning / AI',
  'Web Development',
  'Mobile Development',
  'DevOps',
  'Cloud Computing',
  'Game Development',
  'Embedded Systems',
  'Other',
]

const COMPANY_SIZES = [
  'Small startup (1-20 employees)',
  'Medium company (21-100 employees)',
  'Large company (101-1000 employees)',
  'Enterprise (1001+ employees)',
]

export default function ProfileSetupPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Form state
  const [firstName, setFirstName] = useState<string>('')
  const [lastName, setLastName] = useState<string>('')
  const [programmingLanguages, setProgrammingLanguages] = useState<string[]>([])
  const [resumeFileName, setResumeFileName] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const [companyTypes, setCompanyTypes] = useState<string[]>([])
  const [companySize, setCompanySize] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const currentUser = getCurrentUser()
    
    if (!currentUser) {
      router.push('/login')
      return
    }

    // Only applicants need to set up profile
    if (currentUser.role !== 'applicant') {
      router.push('/dashboard/recruiter')
      return
    }

    // Check if profile already completed
    if (hasCompletedProfile(currentUser.id)) {
      router.push('/dashboard/applicant')
      return
    }

    setUser(currentUser)
    setLoading(false)
  }, [router])

  const handleLanguageToggle = (language: string) => {
    setProgrammingLanguages(prev =>
      prev.includes(language)
        ? prev.filter(l => l !== language)
        : [...prev, language]
    )
  }

  const handleCompanyTypeToggle = (type: string) => {
    setCompanyTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  const handleResumeChange = (file: File | null) => {
    if (file) {
      // Just store the file name, not the actual file content
      setResumeFileName(file.name)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    handleResumeChange(file || null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && (file.type === 'application/pdf' || file.name.match(/\.(doc|docx)$/i))) {
      handleResumeChange(file)
    }
  }

  const handleRemoveFile = () => {
    setResumeFileName('')
    // Reset the file input
    const fileInput = document.getElementById('resume') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!user) return

    if (!firstName?.trim() || !lastName?.trim()) {
      setError('Please enter your first and last name')
      return
    }

    if (programmingLanguages.length === 0) {
      setError('Please select at least one programming language')
      return
    }

    if (companyTypes.length === 0) {
      setError('Please select at least one company type')
      return
    }

    if (!companySize) {
      setError('Please select a preferred company size')
      return
    }

    setSubmitting(true)

    try {
      // Just store the file name, not the actual file content
      // This prevents localStorage quota issues
      const profile: UserProfile = {
        userId: user.id,
        firstName: firstName?.trim() || '',
        lastName: lastName?.trim() || '',
        programmingLanguages,
        resumeFileName: resumeFileName || null,
        companyTypes,
        companySize,
        completedAt: new Date().toISOString(),
      }

      saveUserProfile(profile)
      
      // Redirect to dashboard
      router.push('/dashboard/applicant')
      router.refresh()
    } catch (err) {
      console.error('Profile save error:', err)
      setError('Failed to save profile. Please try again.')
      setSubmitting(false)
    }
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/">
            <Logo />
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
              <CardDescription>
                Help us match you with the right opportunities by sharing your skills and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-base font-semibold">
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={submitting}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-base font-semibold">
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={submitting}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                {/* Programming Languages */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    Programming Languages <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Select all programming languages you have proficiency in
                  </p>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {PROGRAMMING_LANGUAGES.map((language) => (
                      <div key={language} className="flex items-center space-x-2">
                        <Checkbox
                          id={`lang-${language}`}
                          checked={programmingLanguages.includes(language)}
                          onCheckedChange={() => handleLanguageToggle(language)}
                        />
                        <label
                          htmlFor={`lang-${language}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {language}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resume Upload */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    Resume (Optional)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Upload your resume file. PDF, DOC, or DOCX format.
                  </p>
                  
                  {!resumeFileName ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={cn(
                        "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                        isDragging
                          ? "border-primary bg-primary/5"
                          : "border-muted-foreground/25 hover:border-muted-foreground/50 bg-muted/30"
                      )}
                    >
                      <input
                        id="resume"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileInputChange}
                        disabled={submitting}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="flex flex-col items-center gap-3">
                        <div className="rounded-full bg-muted p-3">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground">
                            PDF, DOC, or DOCX (max 10MB)
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
                      <div className="rounded-full bg-primary/10 p-2">
                        <File className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{resumeFileName}</p>
                        <p className="text-xs text-muted-foreground">Resume file selected</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleRemoveFile}
                        disabled={submitting}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Company Types */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    Company Types <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Select the types of companies you want to apply for
                  </p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {COMPANY_TYPES.map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`type-${type}`}
                          checked={companyTypes.includes(type)}
                          onCheckedChange={() => handleCompanyTypeToggle(type)}
                        />
                        <label
                          htmlFor={`type-${type}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Company Size */}
                <div className="space-y-3">
                  <Label htmlFor="company-size" className="text-base font-semibold">
                    Preferred Company Size <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Select your preferred company size
                  </p>
                  <Select value={companySize} onValueChange={setCompanySize}>
                    <SelectTrigger id="company-size" className="w-full">
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZES.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : 'Complete Profile'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
