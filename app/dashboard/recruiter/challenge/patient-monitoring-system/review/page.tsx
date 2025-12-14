'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Editor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { Button } from '@/components/ui/button'
import { Play, Loader2, Pause, ArrowLeft } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getProblemById } from '@/lib/problems'
import { getCompanyBySlug } from '@/lib/companies'
import { getCurrentUser } from '@/lib/auth'
import { getChallengeSubmissions, type ApplicantSubmission, type ChangeEvent } from '@/lib/recruiter-data'

// Simple markdown renderer for problem descriptions
function renderMarkdown(text: string): string {
  let html = text
  // Convert headers
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold mt-4 mb-2 text-foreground">$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold mt-5 mb-3 text-foreground">$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-xl font-semibold mt-6 mb-4 text-foreground">$1</h1>')
  
  // Convert bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
  
  // Convert inline code
  html = html.replace(/`([^`]+)`/g, '<code class="text-xs bg-muted px-1.5 py-0.5 rounded text-primary font-mono">$1</code>')
  
  // Convert code blocks (triple backticks)
  html = html.replace(/```[\s\S]*?```/g, (match) => {
    const code = match.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim()
    return `<pre class="bg-muted p-4 rounded-md overflow-x-auto border border-border/50 my-3"><code class="text-xs text-foreground font-mono whitespace-pre">${code}</code></pre>`
  })
  
  // Convert lists - handle both - and *
  const lines = html.split('\n')
  let inList = false
  let listItems: string[] = []
  let result: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.match(/^[-*]\s/)) {
      if (!inList) {
        inList = true
        listItems = []
      }
      listItems.push(line.replace(/^[-*]\s/, ''))
    } else {
      if (inList && listItems.length > 0) {
        result.push(`<ul class="list-disc list-inside space-y-1 my-2 ml-4">${listItems.map(item => `<li class="text-muted-foreground">${item}</li>`).join('')}</ul>`)
        listItems = []
        inList = false
      }
      if (line) {
        result.push(`<p class="mb-2 leading-relaxed text-muted-foreground">${line}</p>`)
      } else {
        result.push('<br/>')
      }
    }
  }
  
  if (inList && listItems.length > 0) {
    result.push(`<ul class="list-disc list-inside space-y-1 my-2 ml-4">${listItems.map(item => `<li class="text-muted-foreground">${item}</li>`).join('')}</ul>`)
  }
  
  return result.join('')
}

export default function ReviewPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const submissionId = searchParams.get('submissionId')
  const challengeId = 'patient-monitoring-system'
  
  // Load problem data
  const problemData = getProblemById(challengeId)
  const company = problemData?.companyId ? getCompanyBySlug(problemData.companyId) : null

  const [isReplaying, setIsReplaying] = useState(false)
  const [isReplayPaused, setIsReplayPaused] = useState(false)
  const [replaySpeed, setReplaySpeed] = useState('1')
  const [replayProgress, setReplayProgress] = useState({ elapsed: 0, total: 0 })
  const [recordedChanges, setRecordedChanges] = useState<ChangeEvent[]>([])
  const [submission, setSubmission] = useState<ApplicantSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const modelRef = useRef<editor.ITextModel | null>(null)
  const replayTimeoutsRef = useRef<NodeJS.Timeout[]>([])
  const replayStartTimeRef = useRef<number>(0)
  const replayPausedTimeRef = useRef<number>(0)
  const replayPauseDurationRef = useRef<number>(0)
  const replayProgressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const replayProgressElapsedRef = useRef<number>(0)
  const lastAppliedChangeTimeRef = useRef<number>(0)
  // Audio playback refs
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  // Load submission data
  useEffect(() => {
    const loadSubmission = async () => {
      if (!submissionId) {
        setLoading(false)
        return
      }

      try {
        const user = getCurrentUser()
        if (!user || user.role !== 'recruiter') {
          router.push('/dashboard/recruiter')
          return
        }

        const submissions = await getChallengeSubmissions(challengeId)
        const foundSubmission = submissions.find(s => s.id === submissionId)
        
        if (!foundSubmission) {
          console.error('Submission not found')
          router.push(`/dashboard/recruiter/challenge/${challengeId}`)
          return
        }

        setSubmission(foundSubmission)
        
        // Load recorded changes if available
        if (foundSubmission.recordedChanges && foundSubmission.recordedChanges.length > 0) {
          // Convert serialized changes back to editor format
          const changes: ChangeEvent[] = foundSubmission.recordedChanges.map(change => ({
            changes: change.changes.map(delta => ({
              range: {
                startLineNumber: delta.range.startLineNumber,
                startColumn: delta.range.startColumn,
                endLineNumber: delta.range.endLineNumber,
                endColumn: delta.range.endColumn,
              },
              text: delta.text,
            })) as any,
            timestamp: change.timestamp,
          }))
          setRecordedChanges(changes)
        } else if (foundSubmission.finalCode) {
          // If no recorded changes but we have final code, create a single change event
          // This is a fallback for submissions without replay data
          setRecordedChanges([])
        }

        // Load audio file if available
        if (foundSubmission.audioFileName || foundSubmission.id) {
          const audioFileName = foundSubmission.audioFileName || `${foundSubmission.id}.webm`
          const audioUrl = `/api/submissions/${challengeId}/audio/${foundSubmission.id}`
          setAudioUrl(audioUrl)
        }
        
        setLoading(false)
      } catch (error) {
        console.error('Error loading submission:', error)
        setLoading(false)
      }
    }

    loadSubmission()
  }, [submissionId, router, challengeId])

  // Format time in seconds to MM:SS format
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Start replay with current speed
  const startReplay = useCallback((speed: number, startFromElapsed: number = 0) => {
    // Start audio playback if available
    if (audioRef.current && audioUrl) {
      const audio = audioRef.current
      
      // Function to play audio when ready
      const playAudio = () => {
        if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
          audio.currentTime = startFromElapsed === 0 ? 0 : audio.currentTime
          audio.playbackRate = speed
          audio.play().catch(error => {
            // Only log if it's not a NotSupportedError (file might not exist)
            if (error.name !== 'NotSupportedError') {
              console.error('Error playing audio:', error)
            }
          })
        } else {
          // Wait for audio to load
          const onCanPlay = () => {
            audio.currentTime = startFromElapsed === 0 ? 0 : audio.currentTime
            audio.playbackRate = speed
            audio.play().catch(error => {
              if (error.name !== 'NotSupportedError') {
                console.error('Error playing audio:', error)
              }
            })
            audio.removeEventListener('canplay', onCanPlay)
            audio.removeEventListener('error', onError)
          }
          
          const onError = () => {
            // Audio file doesn't exist or failed to load - silently continue
            audio.removeEventListener('canplay', onCanPlay)
            audio.removeEventListener('error', onError)
          }
          
          audio.addEventListener('canplay', onCanPlay, { once: true })
          audio.addEventListener('error', onError, { once: true })
          
          // Trigger load if not already loading
          if (audio.readyState === 0) {
            audio.load()
          }
        }
      }
      
      if (startFromElapsed === 0) {
        playAudio()
      } else {
        // Resume from current position
        playAudio()
      }
    }

    if (!editorRef.current || !modelRef.current || recordedChanges.length === 0) {
      // If no recorded changes, just show final code
      if (submission?.finalCode && modelRef.current) {
        modelRef.current.setValue(submission.finalCode)
        setIsReplaying(false)
      }
      return
    }

    // Clear any existing replay timeouts
    replayTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout))
    replayTimeoutsRef.current = []
    if (replayProgressIntervalRef.current) {
      clearInterval(replayProgressIntervalRef.current)
      replayProgressIntervalRef.current = null
    }

    // Calculate relative timings from the first change
    const firstTimestamp = recordedChanges[0].timestamp
    const lastTimestamp = recordedChanges[recordedChanges.length - 1].timestamp
    const totalDuration = lastTimestamp - firstTimestamp
    const relativeChanges = recordedChanges.map((change) => ({
      ...change,
      relativeTime: change.timestamp - firstTimestamp,
    }))

    // Filter changes that haven't been applied yet
    let startTimeInOriginalTimeline: number
    if (startFromElapsed > 0 && lastAppliedChangeTimeRef.current > 0) {
      startTimeInOriginalTimeline = lastAppliedChangeTimeRef.current
    } else {
      startTimeInOriginalTimeline = startFromElapsed * 1000 * speed
    }
    const remainingChanges = relativeChanges.filter(change => change.relativeTime >= startTimeInOriginalTimeline)
    
    if (startFromElapsed === 0) {
      lastAppliedChangeTimeRef.current = 0
    }

    // Set total duration
    const initialDelay = 100
    const totalReplayDuration = startFromElapsed === 0 
      ? (totalDuration / 1000) + (initialDelay / 1000)
      : totalDuration / 1000
    setReplayProgress({ elapsed: startFromElapsed, total: totalReplayDuration })

    // Start progress tracking
    const initialElapsed = startTimeInOriginalTimeline / speed / 1000
    const adjustedInitialElapsed = startFromElapsed === 0 ? initialDelay / 1000 : initialElapsed
    replayStartTimeRef.current = Date.now() - (adjustedInitialElapsed * 1000)
    replayProgressElapsedRef.current = adjustedInitialElapsed
    replayProgressIntervalRef.current = setInterval(() => {
      if (!isReplayPaused) {
        let elapsed: number
        if (lastAppliedChangeTimeRef.current > 0) {
          elapsed = startFromElapsed === 0
            ? (initialDelay / 1000) + (lastAppliedChangeTimeRef.current / speed / 1000)
            : startFromElapsed + (lastAppliedChangeTimeRef.current / speed / 1000)
        } else {
          elapsed = (Date.now() - replayStartTimeRef.current) / 1000
        }
        replayProgressElapsedRef.current = elapsed
        setReplayProgress(prev => ({ ...prev, elapsed: Math.min(elapsed, prev.total) }))
      }
    }, 100)

    // If starting from the beginning, show boilerplate first
    if (startFromElapsed === 0 && problemData && modelRef.current) {
      modelRef.current.setValue(problemData.boilerplate)
    }

    // Replay remaining changes with speed-adjusted timing
    remainingChanges.forEach((change, index) => {
      const baseDelay = startFromElapsed === 0 ? initialDelay : 0
      const adjustedDelay = baseDelay + (change.relativeTime - startTimeInOriginalTimeline) / speed
      const timeout = setTimeout(() => {
        if (modelRef.current && editorRef.current) {
          const edits = change.changes.map((delta) => ({
            range: delta.range,
            text: delta.text,
          }))

          modelRef.current.applyEdits(edits)
          lastAppliedChangeTimeRef.current = change.relativeTime

          const baseElapsed = change.relativeTime / speed / 1000
          const currentElapsed = startFromElapsed === 0 
            ? (initialDelay / 1000) + baseElapsed
            : startFromElapsed + baseElapsed
          replayProgressElapsedRef.current = currentElapsed
          setReplayProgress(prev => ({ ...prev, elapsed: Math.min(currentElapsed, prev.total) }))

          // If this is the last change, finish replay
          if (index === remainingChanges.length - 1) {
            setTimeout(() => {
              if (editorRef.current && replayProgressIntervalRef.current) {
                clearInterval(replayProgressIntervalRef.current)
                replayProgressIntervalRef.current = null
                setIsReplaying(false)
                setIsReplayPaused(false)
                setReplayProgress({ elapsed: 0, total: 0 })
                replayProgressElapsedRef.current = 0
                replayPauseDurationRef.current = 0
                lastAppliedChangeTimeRef.current = 0
                // Pause audio when replay finishes
                if (audioRef.current) {
                  audioRef.current.pause()
                }
              }
            }, (100 / speed))
          }
        }
      }, adjustedDelay)

      replayTimeoutsRef.current.push(timeout)
    })
  }, [recordedChanges, problemData, submission, audioUrl])

  // Ensure audio element is ready when audioUrl is set
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      const audio = audioRef.current
      
      // Set up error handler
      const handleError = () => {
        console.log('Audio file not available or failed to load')
      }
      
      // Set up canplay handler to ensure audio is ready
      const handleCanPlay = () => {
        console.log('Audio is ready to play')
      }
      
      audio.addEventListener('error', handleError)
      audio.addEventListener('canplay', handleCanPlay)
      
      // Trigger load
      audio.load()
      
      return () => {
        audio.removeEventListener('error', handleError)
        audio.removeEventListener('canplay', handleCanPlay)
      }
    }
  }, [audioUrl])

  // Auto-start replay when data is loaded
  useEffect(() => {
    if (!loading && recordedChanges.length > 0 && !isReplaying && problemData) {
      setIsReplaying(true)
      const speed = parseFloat(replaySpeed)
      // Small delay to ensure editor and audio are mounted
      setTimeout(() => {
        startReplay(speed)
      }, 500)
    } else if (!loading && !recordedChanges.length && submission?.finalCode && modelRef.current) {
      // Fallback: just show final code if no replay data
      modelRef.current.setValue(submission.finalCode)
    }
  }, [loading, recordedChanges, isReplaying, problemData, submission, replaySpeed, startReplay])

  // Handle pause/resume replay
  const handlePauseResumeReplay = useCallback(() => {
    if (!isReplaying) return

    if (isReplayPaused) {
      const speed = parseFloat(replaySpeed)
      const elapsedReplayTime = lastAppliedChangeTimeRef.current > 0
        ? lastAppliedChangeTimeRef.current / speed / 1000
        : replayProgressElapsedRef.current
      startReplay(speed, elapsedReplayTime)
      setIsReplayPaused(false)
      // Resume audio
      if (audioRef.current) {
        const audio = audioRef.current
        if (audio.readyState >= 2) {
          audio.play().catch(error => {
            if (error.name !== 'NotSupportedError') {
              console.error('Error resuming audio:', error)
            }
          })
        }
      }
    } else {
      replayPausedTimeRef.current = Date.now()
      replayTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout))
      replayTimeoutsRef.current = []
      setIsReplayPaused(true)
      // Pause audio
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [isReplaying, isReplayPaused, replaySpeed, startReplay])

  // Handle speed change during replay
  useEffect(() => {
    if (isReplaying && !isReplayPaused) {
      const speed = parseFloat(replaySpeed)
      const elapsedReplayTime = lastAppliedChangeTimeRef.current > 0
        ? lastAppliedChangeTimeRef.current / speed / 1000
        : replayProgressElapsedRef.current
      startReplay(speed, elapsedReplayTime)
    }
    // Update audio playback rate when speed changes
    if (audioRef.current) {
      audioRef.current.playbackRate = parseFloat(replaySpeed)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replaySpeed, isReplaying, isReplayPaused])

  const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor
    const model = editor.getModel()
    if (model) {
      modelRef.current = model
      editor.updateOptions({ readOnly: true })

      // Set initial boilerplate if problem data is available
      if (problemData && model.getValue().trim() === '') {
        model.setValue(problemData.boilerplate)
      }
    }
  }, [problemData])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      replayTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout))
      if (replayProgressIntervalRef.current) {
        clearInterval(replayProgressIntervalRef.current)
      }
      // Clean up audio
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (audioUrl) {
        // Note: We're using a direct API URL, so no need to revoke object URL
        setAudioUrl(null)
      }
    }
  }, [audioUrl])

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'text-green-500'
      case 'Medium':
        return 'text-yellow-500'
      case 'Hard':
        return 'text-red-500'
      default:
        return 'text-foreground'
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading submission...</p>
        </div>
      </div>
    )
  }

  if (!problemData || !submission) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Submission Not Found</h1>
          <p className="text-muted-foreground">
            The requested submission could not be found.
          </p>
          <Button onClick={() => router.push(`/dashboard/recruiter/challenge/${challengeId}`)}>
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/dashboard/recruiter/challenge/${challengeId}`)}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Review Submission</h1>
            {company && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">{company.name}</span>
              </>
            )}
            <span className="text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">{submission.applicantName}</span>
          </div>
          <div className="flex items-center gap-2">
            {isReplaying && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className={`h-2 w-2 rounded-full ${isReplayPaused ? 'bg-yellow-500' : 'bg-blue-500 animate-pulse'}`} />
                  <span>{isReplayPaused ? 'Paused' : 'Replaying...'}</span>
                </div>
                
                {/* Speed Control */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Speed:</span>
                  <Select value={replaySpeed} onValueChange={setReplaySpeed}>
                    <SelectTrigger className="h-7 w-20 text-xs" size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.25">0.25x</SelectItem>
                      <SelectItem value="0.5">0.5x</SelectItem>
                      <SelectItem value="0.75">0.75x</SelectItem>
                      <SelectItem value="1">1x</SelectItem>
                      <SelectItem value="1.25">1.25x</SelectItem>
                      <SelectItem value="1.5">1.5x</SelectItem>
                      <SelectItem value="2">2x</SelectItem>
                      <SelectItem value="3">3x</SelectItem>
                      <SelectItem value="4">4x</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Progress Display */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatTime(replayProgress.elapsed)}</span>
                  <span>/</span>
                  <span>{formatTime(replayProgress.total)}</span>
                </div>

                {/* Pause/Resume Button */}
                <Button
                  onClick={handlePauseResumeReplay}
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1"
                >
                  {isReplayPaused ? (
                    <>
                      <Play className="h-3 w-3" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="h-3 w-3" />
                      Pause
                    </>
                  )}
                </Button>
              </div>
            )}
            {!isReplaying && recordedChanges.length > 0 && (
              <Button
                onClick={() => {
                  setIsReplaying(true)
                  const speed = parseFloat(replaySpeed)
                  startReplay(speed)
                }}
                size="sm"
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Replay
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Hidden audio element for playback */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="auto"
          style={{ display: 'none' }}
          onError={(e) => {
            // Log error for debugging
            console.error('Audio element error:', e)
            console.log('Audio URL:', audioUrl)
          }}
          onLoadedData={() => {
            console.log('Audio data loaded successfully')
          }}
          onCanPlay={() => {
            console.log('Audio can play')
          }}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Problem Description */}
        <div className="w-1/2 border-r overflow-y-auto bg-card">
          <div className="p-6 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">{problemData.title}</h2>
                <span className={`font-semibold ${getDifficultyColor(problemData.difficulty)}`}>
                  {problemData.difficulty}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <div 
                  className="text-sm"
                  dangerouslySetInnerHTML={{ 
                    __html: renderMarkdown(problemData.description)
                  }}
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Examples</h3>
                <div className="space-y-4">
                  {problemData.examples.map((example, idx) => (
                    <div key={idx} className="bg-muted p-4 rounded-md space-y-3 border border-border/50">
                      <div>
                        <span className="font-semibold text-sm mb-2 block">Input:</span>
                        <pre className="text-xs bg-background p-3 rounded-md overflow-x-auto border border-border/50">
                          <code className="text-primary">{example.input}</code>
                        </pre>
                      </div>
                      <div>
                        <span className="font-semibold text-sm mb-2 block">Output:</span>
                        <pre className="text-xs bg-background p-3 rounded-md overflow-x-auto border border-border/50">
                          <code className="text-primary whitespace-pre-wrap">{example.output}</code>
                        </pre>
                      </div>
                      {example.explanation && (
                        <div className="pt-2 border-t border-border/50">
                          <span className="font-semibold text-sm mb-1 block">Explanation:</span>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {example.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Constraints</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {problemData.constraints.map((constraint, idx) => (
                    <li key={idx}>{constraint}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Code Editor */}
        <div className="w-1/2 flex flex-col">
          <div className="flex-1 border-b overflow-hidden flex flex-col">
            <div className="border-b bg-muted/50 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Python</span>
                <span className="text-xs text-muted-foreground">Read-only</span>
              </div>
            </div>
            <div className="flex-1 border border-border">
              <Editor
                height="100%"
                defaultLanguage="python"
                defaultValue={problemData.boilerplate}
                theme="vs-dark"
                onMount={handleEditorDidMount}
                options={{
                  minimap: { enabled: true },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  readOnly: true,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
