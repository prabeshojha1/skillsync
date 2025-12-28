'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Editor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { Button } from '@/components/ui/button'
import { Play, Pause, ArrowLeft, Circle, Square, Trash2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getProblemById } from '@/lib/problems'
import { getCompanyBySlug } from '@/lib/companies'
import { getCurrentUser } from '@/lib/auth'
import { getJobApplicants, getJobRequiredChallenges, type JobApplicant } from '@/lib/recruiter-data'
import { type ChangeEvent } from '@/lib/recruiter-data'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Helper function to generate deterministic hash from string
const hashString = (str: string): number => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

interface EditorState {
  isRecording: boolean
  isReplaying: boolean
  isReplayPaused: boolean
  recordedChanges: ChangeEvent[]
  audioUrl: string | null
  replayProgress: { elapsed: number; total: number }
  candidate: JobApplicant | null
  submissionId: string
}

export default function ReplayPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params?.jobId as string
  const challengeId = params?.challengeId as string

  // Load problem data
  const problemData = challengeId ? getProblemById(challengeId) : null
  const company = problemData?.companyId ? getCompanyBySlug(problemData.companyId) : null

  // Get candidates who attempted this challenge
  const [candidates, setCandidates] = useState<JobApplicant[]>([])
  const [loading, setLoading] = useState(true)
  const [replaySpeed, setReplaySpeed] = useState('1')
  const [focusedEditorIndex, setFocusedEditorIndex] = useState<number | null>(null)

  // Load stored recordings from API
  const loadRecordings = useCallback(async (initialEditors: EditorState[]) => {
    try {
      const response = await fetch(`/api/submissions/${challengeId}/recruiter-recording`, {
        method: 'GET',
        cache: 'no-store',
      })

      if (!response.ok) {
        console.error('Failed to load stored recordings')
        return
      }

      const data = await response.json()
      const recordings = Array.isArray(data.recordings) ? data.recordings : []

      if (recordings.length === 0) {
        return // No stored recordings
      }

      // Update editors with loaded recordings
      setEditors(prev => {
        const newEditors = [...prev]
        
        recordings.forEach((recording: {
          editorIndex: number
          submissionId: string
          recordedChanges: ChangeEvent[]
          audioFileName: string
        }) => {
          if (recording.editorIndex >= 0 && recording.editorIndex < 3) {
            // Don't add cache-busting when loading - the audio file should be the correct one
            const audioUrl = `/api/submissions/${challengeId}/audio/${recording.submissionId}`
            newEditors[recording.editorIndex] = {
              ...newEditors[recording.editorIndex],
              recordedChanges: recording.recordedChanges,
              audioUrl,
              submissionId: recording.submissionId,
            }
          }
        })
        
        return newEditors
      })
    } catch (error) {
      console.error('Error loading stored recordings:', error)
    }
  }, [challengeId])

  // Save recordings to API
  const saveRecordings = useCallback(async (editorsState: EditorState[]) => {
    try {
      // Collect recordings from all editors that have recordedChanges
      const recordings = editorsState
        .map((editor, index) => {
          if (editor.recordedChanges.length > 0 && editor.submissionId) {
            // Audio filename is always {submissionId}.webm
            const audioFileName = `${editor.submissionId}.webm`
            
            // Serialize recordedChanges to ensure they're JSON-compatible
            const serializedChanges = editor.recordedChanges.map(change => ({
              changes: change.changes.map(delta => ({
                range: {
                  startLineNumber: delta.range.startLineNumber,
                  startColumn: delta.range.startColumn,
                  endLineNumber: delta.range.endLineNumber,
                  endColumn: delta.range.endColumn,
                },
                text: delta.text,
              })),
              timestamp: change.timestamp,
            }))
            
            return {
              editorIndex: index,
              submissionId: editor.submissionId,
              recordedChanges: serializedChanges,
              audioFileName,
            }
          }
          return null
        })
        .filter((recording): recording is NonNullable<typeof recording> => recording !== null)

      if (recordings.length === 0) {
        return // No recordings to save
      }

      const response = await fetch(`/api/submissions/${challengeId}/recruiter-recording`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recordings }),
      })

      if (!response.ok) {
        console.error('Failed to save recordings:', await response.text())
        return
      }

      console.log(`Saved ${recordings.length} recordings for challenge ${challengeId}`)
    } catch (error) {
      console.error('Error saving recordings:', error)
    }
  }, [challengeId])

  // State for 3 editors
  const [editors, setEditors] = useState<EditorState[]>([
    {
      isRecording: false,
      isReplaying: false,
      isReplayPaused: false,
      recordedChanges: [],
      audioUrl: null,
      replayProgress: { elapsed: 0, total: 0 },
      candidate: null,
      submissionId: '',
    },
    {
      isRecording: false,
      isReplaying: false,
      isReplayPaused: false,
      recordedChanges: [],
      audioUrl: null,
      replayProgress: { elapsed: 0, total: 0 },
      candidate: null,
      submissionId: '',
    },
    {
      isRecording: false,
      isReplaying: false,
      isReplayPaused: false,
      recordedChanges: [],
      audioUrl: null,
      replayProgress: { elapsed: 0, total: 0 },
      candidate: null,
      submissionId: '',
    },
  ])

  // Refs for each editor
  const editorRefs = useRef<(editor.IStandaloneCodeEditor | null)[]>([null, null, null])
  const modelRefs = useRef<(editor.ITextModel | null)[]>([null, null, null])
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([null, null, null])
  const mediaRecorderRefs = useRef<(MediaRecorder | null)[]>([null, null, null])
  const audioChunksRefs = useRef<Blob[][]>([[], [], []])
  const audioStreamRefs = useRef<(MediaStream | null)[]>([null, null, null])
  const hasAudioRecordingStartedRefs = useRef<boolean[]>([false, false, false])
  const isIntentionallyStoppingRefs = useRef<boolean[]>([false, false, false])
  const replayTimeoutsRefs = useRef<NodeJS.Timeout[][]>([[], [], []])
  const replayProgressIntervalRefs = useRef<(NodeJS.Timeout | null)[]>([null, null, null])
  const replayStartTimeRefs = useRef<number[]>([0, 0, 0])
  const replayProgressElapsedRefs = useRef<number[]>([0, 0, 0])
  const lastAppliedChangeTimeRefs = useRef<number[]>([0, 0, 0])
  const disposableRefs = useRef<({ dispose: () => void } | null)[]>([null, null, null])
  const isRecordingRefs = useRef<boolean[]>([false, false, false])
  const isReplayingRefs = useRef<boolean[]>([false, false, false])
  const isReplayPausedRefs = useRef<boolean[]>([false, false, false])
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load candidates
  useEffect(() => {
    const loadCandidates = async () => {
      const user = getCurrentUser()
      if (!user || user.role !== 'recruiter') {
        router.push('/dashboard/recruiter')
        return
      }

      try {
        const applicants = getJobApplicants(jobId)
        const requiredChallengeIds = getJobRequiredChallenges(jobId)
        
        if (!requiredChallengeIds.includes(challengeId)) {
          router.push(`/dashboard/recruiter/job/${jobId}/applicants`)
          return
        }

        // Load shortlisted candidates from localStorage
        let shortlistedCandidateIds = new Set<string>()
        if (typeof window !== 'undefined') {
          try {
            const storageKey = `shortlisted-candidates-${jobId}`
            const stored = localStorage.getItem(storageKey)
            if (stored) {
              shortlistedCandidateIds = new Set(JSON.parse(stored))
            }
          } catch (e) {
            console.error('Failed to load shortlisted candidates:', e)
          }
        }

        // Get shortlisted candidates who attempted this challenge
        let candidatesWhoAttempted = applicants
          .filter(applicant => {
            const submission = applicant.submissions?.find(sub => sub.challengeId === challengeId)
            return submission !== undefined && shortlistedCandidateIds.has(applicant.id)
          })
          .slice(0, 3) // Take first 3

        // If we don't have 3 shortlisted candidates, fall back to any candidates who attempted
        if (candidatesWhoAttempted.length < 3) {
          const fallbackCandidates = applicants
            .filter(applicant => {
              const submission = applicant.submissions?.find(sub => sub.challengeId === challengeId)
              return submission !== undefined && !shortlistedCandidateIds.has(applicant.id)
            })
            .slice(0, 3 - candidatesWhoAttempted.length)
          candidatesWhoAttempted = [...candidatesWhoAttempted, ...fallbackCandidates]
        }

        if (candidatesWhoAttempted.length === 0) {
          router.push(`/dashboard/recruiter/job/${jobId}/applicants`)
          return
        }

        // Initialize editors with candidates
        // Use stable submissionId based on challengeId and editor index (not timestamp)
        const newEditors: EditorState[] = candidatesWhoAttempted.map((candidate, index) => ({
          isRecording: false,
          isReplaying: false,
          isReplayPaused: false,
          recordedChanges: [],
          audioUrl: null,
          replayProgress: { elapsed: 0, total: 0 },
          candidate,
          submissionId: `recruiter-recording-${challengeId}-${index}`,
        }))

        // Pad with empty editors if less than 3
        while (newEditors.length < 3) {
          newEditors.push({
            isRecording: false,
            isReplaying: false,
            isReplayPaused: false,
            recordedChanges: [],
            audioUrl: null,
            replayProgress: { elapsed: 0, total: 0 },
            candidate: null,
            submissionId: `recruiter-recording-${challengeId}-${newEditors.length}`,
          })
        }

        setCandidates(candidatesWhoAttempted)
        setEditors(newEditors)
        setLoading(false)
        
        // Load stored recordings after editors are initialized
        loadRecordings(newEditors)
      } catch (error) {
        console.error('Error loading candidates:', error)
        setLoading(false)
      }
    }

    loadCandidates()
  }, [jobId, challengeId, router])

  // Start audio recording for a specific editor
  const startAudioRecording = useCallback(async (editorIndex: number) => {
    if (hasAudioRecordingStartedRefs.current[editorIndex]) {
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRefs.current[editorIndex] = stream

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      })
      mediaRecorderRefs.current[editorIndex] = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRefs.current[editorIndex].push(event.data)
        }
      }

      mediaRecorder.onerror = (event) => {
        console.error(`MediaRecorder error for editor ${editorIndex}:`, event)
        if (isRecordingRefs.current[editorIndex] && hasAudioRecordingStartedRefs.current[editorIndex]) {
          mediaRecorderRefs.current[editorIndex] = null
          hasAudioRecordingStartedRefs.current[editorIndex] = false
          setTimeout(() => {
            startAudioRecording(editorIndex)
          }, 100)
        }
      }

      mediaRecorder.onstop = () => {
        if (!isIntentionallyStoppingRefs.current[editorIndex] && 
            isRecordingRefs.current[editorIndex] && 
            hasAudioRecordingStartedRefs.current[editorIndex] && 
            mediaRecorderRefs.current[editorIndex] === mediaRecorder) {
          const wasRecording = isRecordingRefs.current[editorIndex]
          mediaRecorderRefs.current[editorIndex] = null
          hasAudioRecordingStartedRefs.current[editorIndex] = false
          setTimeout(() => {
            if (wasRecording && isRecordingRefs.current[editorIndex]) {
              startAudioRecording(editorIndex)
            }
          }, 100)
        }
      }

      mediaRecorder.start(1000)
      hasAudioRecordingStartedRefs.current[editorIndex] = true
      console.log(`Audio recording started for editor ${editorIndex}`)
    } catch (error) {
      console.error(`Error starting audio recording for editor ${editorIndex}:`, error)
    }
  }, [])

  // Stop audio recording and upload for a specific editor
  const stopAudioRecordingAndUpload = useCallback(async (editorIndex: number): Promise<string | null> => {
    const mediaRecorder = mediaRecorderRefs.current[editorIndex]
    if (!mediaRecorder || !hasAudioRecordingStartedRefs.current[editorIndex]) {
      return null
    }

    return new Promise((resolve) => {
      isIntentionallyStoppingRefs.current[editorIndex] = true

      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRefs.current[editorIndex], { type: 'audio/webm' })
          const submissionId = editors[editorIndex].submissionId

          const formData = new FormData()
          formData.append('audio', audioBlob, `${submissionId}.webm`)

          const response = await fetch(`/api/submissions/${challengeId}/audio?submissionId=${submissionId}`, {
            method: 'POST',
            body: formData,
          })

          if (response.ok) {
            const result = await response.json()
            // Add cache-busting parameter to ensure fresh audio (use timestamp to force reload)
            const timestamp = Date.now()
            const audioUrl = `/api/submissions/${challengeId}/audio/${submissionId}?t=${timestamp}`
            
            setEditors(prev => {
              const newEditors = [...prev]
              newEditors[editorIndex] = { ...newEditors[editorIndex], audioUrl }
              
              // Clear and reload the audio element to ensure it uses the new file
              const audioRef = audioRefs.current[editorIndex]
              if (audioRef) {
                audioRef.pause()
                audioRef.src = audioUrl
                audioRef.load()
              }
              
              // Save recordings after audio is uploaded
              setTimeout(() => {
                saveRecordings(newEditors)
              }, 100)
              
              return newEditors
            })

            resolve(result.audioFileName || `${submissionId}.webm`)
          } else {
            console.error('Error uploading audio:', await response.text())
            resolve(null)
          }
        } catch (error) {
          console.error('Error processing audio upload:', error)
          resolve(null)
        } finally {
          if (audioStreamRefs.current[editorIndex]) {
            audioStreamRefs.current[editorIndex]!.getTracks().forEach(track => track.stop())
            audioStreamRefs.current[editorIndex] = null
          }
          mediaRecorderRefs.current[editorIndex] = null
          audioChunksRefs.current[editorIndex] = []
          isIntentionallyStoppingRefs.current[editorIndex] = false
        }
      }

      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop()
      } else {
        if (audioStreamRefs.current[editorIndex]) {
          audioStreamRefs.current[editorIndex]!.getTracks().forEach(track => track.stop())
          audioStreamRefs.current[editorIndex] = null
        }
        isIntentionallyStoppingRefs.current[editorIndex] = false
        resolve(null)
      }
    })
  }, [challengeId, editors])

  // Handle editor mount
  const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor, editorIndex: number) => {
    editorRefs.current[editorIndex] = editor
    const model = editor.getModel()
    if (model) {
      modelRefs.current[editorIndex] = model

      // Remove minimap
      editor.updateOptions({ minimap: { enabled: false } })

      // Set initial boilerplate
      if (problemData && model.getValue().trim() === '') {
        model.setValue(problemData.boilerplate)
      }

      // Dispose previous listener
      if (disposableRefs.current[editorIndex]) {
        disposableRefs.current[editorIndex]!.dispose()
      }

      // Start recording changes
      const disposable = model.onDidChangeContent((e) => {
        if (isRecordingRefs.current[editorIndex] && !isReplayingRefs.current[editorIndex]) {
          if (!hasAudioRecordingStartedRefs.current[editorIndex]) {
            startAudioRecording(editorIndex)
          }

          const timestamp = Date.now()
          setEditors(prev => {
            const newEditors = [...prev]
            newEditors[editorIndex] = {
              ...newEditors[editorIndex],
              recordedChanges: [
                ...newEditors[editorIndex].recordedChanges,
                {
                  changes: e.changes,
                  timestamp,
                },
              ],
            }
            // Save recordings after each change (debounced)
            if (saveTimeoutRef.current) {
              clearTimeout(saveTimeoutRef.current)
            }
            saveTimeoutRef.current = setTimeout(() => {
              saveRecordings(newEditors)
            }, 2000) // Debounce: save 2 seconds after last change
            return newEditors
          })
        }
      })

      disposableRefs.current[editorIndex] = disposable
    }
  }, [problemData, startAudioRecording, saveRecordings])

  // Format time
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Store editors in ref to avoid dependency issues
  const editorsRef = useRef<EditorState[]>(editors)
  useEffect(() => {
    editorsRef.current = editors
  }, [editors])

  // Start replay for a specific editor
  const startReplay = useCallback((editorIndex: number, speed: number = 1, startFromElapsed: number = 0) => {
    const editorRef = editorRefs.current[editorIndex]
    const modelRef = modelRefs.current[editorIndex]
    const audioRef = audioRefs.current[editorIndex]

    if (!editorRef || !modelRef) {
      return
    }

    // Get editor state from ref to avoid dependency on editors state
    const editorState = editorsRef.current[editorIndex]
    
    // Get current focus state - read directly since it's in dependency array
    const currentFocusedIndex = focusedEditorIndex
    if (!editorState || editorState.recordedChanges.length === 0) {
      return
    }

    // Clear existing timeouts
    replayTimeoutsRefs.current[editorIndex].forEach((timeout) => clearTimeout(timeout))
    replayTimeoutsRefs.current[editorIndex] = []
    if (replayProgressIntervalRefs.current[editorIndex]) {
      clearInterval(replayProgressIntervalRefs.current[editorIndex]!)
      replayProgressIntervalRefs.current[editorIndex] = null
    }

    // Start audio playback if available
    if (audioRef && editorState.audioUrl) {
      // Always pause and reset audio first to ensure clean start
      audioRef.pause()
      
      // Set volume based on current focus state
      if (currentFocusedIndex === editorIndex) {
        audioRef.volume = 1.0
      } else if (currentFocusedIndex !== null) {
        audioRef.volume = 0.1
      } else {
        audioRef.volume = 1.0
      }
      
      const playAudio = () => {
        // Always reset to start position when starting from beginning
        if (startFromElapsed === 0) {
          audioRef.currentTime = 0
        } else {
          audioRef.currentTime = startFromElapsed
        }
        audioRef.playbackRate = speed
        
        // Ensure volume is set correctly before playing
        if (currentFocusedIndex === editorIndex) {
          audioRef.volume = 1.0
        } else if (currentFocusedIndex !== null) {
          audioRef.volume = 0.1
        } else {
          audioRef.volume = 1.0
        }
        
        // Try to play immediately if ready
        if (audioRef.readyState >= 2) {
          audioRef.play().catch(error => {
            if (error.name !== 'NotSupportedError') {
              console.error(`Error playing audio for editor ${editorIndex}:`, error)
            }
          })
        } else {
          // Wait for audio to be ready
          const onCanPlay = () => {
            // Ensure volume is set correctly before playing
            if (currentFocusedIndex === editorIndex) {
              audioRef.volume = 1.0
            } else if (currentFocusedIndex !== null) {
              audioRef.volume = 0.05
            } else {
              audioRef.volume = 1.0
            }
            audioRef.play().catch(error => {
              if (error.name !== 'NotSupportedError') {
                console.error(`Error playing audio for editor ${editorIndex}:`, error)
              }
            })
            audioRef.removeEventListener('canplay', onCanPlay)
            audioRef.removeEventListener('loadeddata', onLoadedData)
            audioRef.removeEventListener('error', onError)
          }
          
          const onLoadedData = () => {
            // Ensure volume is set correctly before playing
            if (currentFocusedIndex === editorIndex) {
              audioRef.volume = 1.0
            } else if (currentFocusedIndex !== null) {
              audioRef.volume = 0.1
            } else {
              audioRef.volume = 1.0
            }
            // Audio data is loaded, try to play
            audioRef.play().catch(error => {
              if (error.name !== 'NotSupportedError') {
                console.error(`Error playing audio for editor ${editorIndex}:`, error)
              }
            })
            audioRef.removeEventListener('canplay', onCanPlay)
            audioRef.removeEventListener('loadeddata', onLoadedData)
            audioRef.removeEventListener('error', onError)
          }
          
          const onError = () => {
            console.error(`Error loading audio for editor ${editorIndex}`)
            audioRef.removeEventListener('canplay', onCanPlay)
            audioRef.removeEventListener('loadeddata', onLoadedData)
            audioRef.removeEventListener('error', onError)
          }
          
          audioRef.addEventListener('canplay', onCanPlay, { once: true })
          audioRef.addEventListener('loadeddata', onLoadedData, { once: true })
          audioRef.addEventListener('error', onError, { once: true })
          
          // Ensure audio is loading
          if (audioRef.readyState === 0 || audioRef.readyState === 1) {
            audioRef.load()
          }
        }
      }
      
      // Small delay to ensure audio element is ready after reset
      setTimeout(() => {
        playAudio()
      }, 50)
    }

    // Calculate relative timings
    const firstTimestamp = editorState.recordedChanges[0].timestamp
    const lastTimestamp = editorState.recordedChanges[editorState.recordedChanges.length - 1].timestamp
    const totalDuration = lastTimestamp - firstTimestamp
    const relativeChanges = editorState.recordedChanges.map((change) => ({
      ...change,
      relativeTime: change.timestamp - firstTimestamp,
    }))

    // Filter remaining changes
    let startTimeInOriginalTimeline: number
    if (startFromElapsed > 0 && lastAppliedChangeTimeRefs.current[editorIndex] > 0) {
      startTimeInOriginalTimeline = lastAppliedChangeTimeRefs.current[editorIndex]
    } else {
      startTimeInOriginalTimeline = startFromElapsed * 1000 * speed
    }
    const remainingChanges = relativeChanges.filter(change => change.relativeTime >= startTimeInOriginalTimeline)
    
    if (startFromElapsed === 0) {
      lastAppliedChangeTimeRefs.current[editorIndex] = 0
    }

    // Set total duration (not used for display, but needed for calculations)
    const initialDelay = 100

    // Show boilerplate first
    if (startFromElapsed === 0 && problemData && modelRef) {
      modelRef.setValue(problemData.boilerplate)
    }

    // Replay changes
    remainingChanges.forEach((change, index) => {
      const baseDelay = startFromElapsed === 0 ? initialDelay : 0
      const adjustedDelay = baseDelay + (change.relativeTime - startTimeInOriginalTimeline) / speed
      const timeout = setTimeout(() => {
        if (modelRef && editorRef) {
          const edits = change.changes.map((delta) => ({
            range: delta.range,
            text: delta.text,
          }))

          modelRef.applyEdits(edits)
          lastAppliedChangeTimeRefs.current[editorIndex] = change.relativeTime

          // Progress tracking removed

          // If last change, finish replay after remaining time
          if (index === remainingChanges.length - 1) {
            // Calculate remaining time after last change
            const remainingTime = (totalDuration - change.relativeTime) / speed / 1000
            // Add a small buffer (100ms) to ensure audio finishes
            const finishDelay = Math.max(remainingTime * 1000 + 100, 100)
            
            setTimeout(() => {
              if (editorRef) {
                editorRef.updateOptions({ readOnly: false })
                setEditors(prev => {
                  const newEditors = [...prev]
                  newEditors[editorIndex] = {
                    ...newEditors[editorIndex],
                    isReplaying: false,
                    isReplayPaused: false,
                  }
                  return newEditors
                })
                lastAppliedChangeTimeRefs.current[editorIndex] = 0
                if (audioRef) {
                  audioRef.pause()
                  audioRef.currentTime = 0 // Reset audio position
                }
              }
            }, finishDelay)
          }
        }
      }, adjustedDelay)

      replayTimeoutsRefs.current[editorIndex].push(timeout)
    })
  }, [problemData, focusedEditorIndex])

  // Handle start recording for an editor
  const handleStartRecording = useCallback((editorIndex: number) => {
    const editorRef = editorRefs.current[editorIndex]
    const audioRef = audioRefs.current[editorIndex]
    if (!editorRef) return

    // Clear any existing audio
    if (audioRef) {
      audioRef.pause()
      audioRef.src = ''
      audioRef.load()
    }

    editorRef.updateOptions({ readOnly: false })
    setEditors(prev => {
      const newEditors = [...prev]
      newEditors[editorIndex] = {
        ...newEditors[editorIndex],
        isRecording: true,
        recordedChanges: [],
        audioUrl: null, // Clear audio URL when starting new recording
        isReplaying: false,
        isReplayPaused: false,
      }
      return newEditors
    })
    isRecordingRefs.current[editorIndex] = true
    audioChunksRefs.current[editorIndex] = []
  }, [])

  // Handle stop recording for an editor
  const handleStopRecording = useCallback(async (editorIndex: number) => {
    const editorRef = editorRefs.current[editorIndex]
    if (!editorRef) return

    isRecordingRefs.current[editorIndex] = false
    setEditors(prev => {
      const newEditors = [...prev]
      newEditors[editorIndex] = {
        ...newEditors[editorIndex],
        isRecording: false,
      }
      
      // Save recordings after stopping recording
      setTimeout(() => {
        saveRecordings(newEditors)
      }, 200)
      
      return newEditors
    })

    await stopAudioRecordingAndUpload(editorIndex)
  }, [stopAudioRecordingAndUpload, saveRecordings])

  // Handle start replay for an editor
  const handleStartReplay = useCallback((editorIndex: number) => {
    const editorRef = editorRefs.current[editorIndex]
    const modelRef = modelRefs.current[editorIndex]
    const audioRef = audioRefs.current[editorIndex]
    if (!editorRef || !modelRef) return

    // Stop and reset audio if it's playing
    if (audioRef) {
      audioRef.pause()
      audioRef.currentTime = 0
      // Reload audio to ensure it's ready for playback
      audioRef.load()
    }

    // Clear any existing timeouts
    replayTimeoutsRefs.current[editorIndex].forEach((timeout) => clearTimeout(timeout))
    replayTimeoutsRefs.current[editorIndex] = []
    if (replayProgressIntervalRefs.current[editorIndex]) {
      clearInterval(replayProgressIntervalRefs.current[editorIndex]!)
      replayProgressIntervalRefs.current[editorIndex] = null
    }

    editorRef.updateOptions({ readOnly: true })
    modelRef.setValue('')
    
    setEditors(prev => {
      const newEditors = [...prev]
      newEditors[editorIndex] = {
        ...newEditors[editorIndex],
        isReplaying: true,
        isReplayPaused: false,
      }
      return newEditors
    })
    isReplayingRefs.current[editorIndex] = true
    lastAppliedChangeTimeRefs.current[editorIndex] = 0
    
    const speed = parseFloat(replaySpeed)
    startReplay(editorIndex, speed, 0)
  }, [startReplay, replaySpeed])

  // Handle pause/resume replay for an editor
  const handlePauseResumeReplay = useCallback((editorIndex: number) => {
    const editorState = editors[editorIndex]
    if (!editorState.isReplaying) return

    if (editorState.isReplayPaused) {
      const elapsedReplayTime = lastAppliedChangeTimeRefs.current[editorIndex] > 0
        ? lastAppliedChangeTimeRefs.current[editorIndex] / 1000
        : 0
      const speed = parseFloat(replaySpeed)
      startReplay(editorIndex, speed, elapsedReplayTime)
      setEditors(prev => {
        const newEditors = [...prev]
        newEditors[editorIndex] = {
          ...newEditors[editorIndex],
          isReplayPaused: false,
        }
        return newEditors
      })
      isReplayPausedRefs.current[editorIndex] = false
      const audioRef = audioRefs.current[editorIndex]
      if (audioRef && audioRef.readyState >= 2) {
        audioRef.play().catch(error => {
          if (error.name !== 'NotSupportedError') {
            console.error(`Error resuming audio for editor ${editorIndex}:`, error)
          }
        })
      }
    } else {
      replayTimeoutsRefs.current[editorIndex].forEach((timeout) => clearTimeout(timeout))
      replayTimeoutsRefs.current[editorIndex] = []
      setEditors(prev => {
        const newEditors = [...prev]
        newEditors[editorIndex] = {
          ...newEditors[editorIndex],
          isReplayPaused: true,
        }
        return newEditors
      })
      isReplayPausedRefs.current[editorIndex] = true
      const audioRef = audioRefs.current[editorIndex]
      if (audioRef) {
        audioRef.pause()
      }
    }
  }, [editors, startReplay, replaySpeed])

  // Update audio volumes based on focus
  const updateAudioVolumes = useCallback((focusedIndex: number | null) => {
    for (let i = 0; i < 3; i++) {
      const audioRef = audioRefs.current[i]
      if (audioRef) {
        if (focusedIndex === i) {
          audioRef.volume = 1.0 // Full volume for focused editor
        } else if (focusedIndex !== null) {
          audioRef.volume = 0.1 // 10% volume for others
        } else {
          audioRef.volume = 1.0 // Default to full volume if no focus
        }
      }
    }
  }, [])

  // Handle focus on an editor
  const handleFocusEditor = useCallback((editorIndex: number) => {
    const newFocusedIndex = focusedEditorIndex === editorIndex ? null : editorIndex
    const isFirstTimeFocus = focusedEditorIndex === null && newFocusedIndex !== null
    
    setFocusedEditorIndex(newFocusedIndex)
    
    // Only start replays if this is the first time setting focus
    if (isFirstTimeFocus && newFocusedIndex !== null) {
      // Update volumes first before starting replays
      updateAudioVolumes(newFocusedIndex)
      
      editors.forEach((editor, index) => {
        if (editor.candidate && editor.recordedChanges.length > 0) {
          const editorRef = editorRefs.current[index]
          const modelRef = modelRefs.current[index]
          if (editorRef && modelRef) {
            editorRef.updateOptions({ readOnly: true })
            modelRef.setValue('')
            
            setEditors(prev => {
              const newEditors = [...prev]
              newEditors[index] = {
                ...newEditors[index],
                isReplaying: true,
                isReplayPaused: false,
              }
              return newEditors
            })
            isReplayingRefs.current[index] = true
            
            const speed = parseFloat(replaySpeed)
            startReplay(index, speed, 0)
          }
        }
      })
    } else {
      // Update audio volumes when switching focus (without restarting)
      updateAudioVolumes(newFocusedIndex)
    }
  }, [editors, startReplay, replaySpeed, focusedEditorIndex, updateAudioVolumes])

  // Update volumes when focus changes
  useEffect(() => {
    updateAudioVolumes(focusedEditorIndex)
  }, [focusedEditorIndex, updateAudioVolumes])

  // Handle start recording for all editors (replaces Replay All)
  const handleStartRecordingAll = useCallback(() => {
    // Reset all editors and start recording
    editors.forEach((_, index) => {
      if (editors[index].candidate) {
        // Stop any ongoing replays
        if (editors[index].isReplaying) {
          replayTimeoutsRefs.current[index].forEach((timeout) => clearTimeout(timeout))
          replayTimeoutsRefs.current[index] = []
          if (replayProgressIntervalRefs.current[index]) {
            clearInterval(replayProgressIntervalRefs.current[index]!)
            replayProgressIntervalRefs.current[index] = null
          }
          const audioRef = audioRefs.current[index]
          if (audioRef) {
            audioRef.pause()
          }
        }
        handleStartRecording(index)
      }
    })
    setFocusedEditorIndex(null)
  }, [editors, handleStartRecording])

  // Handle pause/resume all
  const handlePauseResumeAll = useCallback(() => {
    const allPaused = editors.every((editor, index) => 
      !editor.candidate || !editor.isReplaying || editor.isReplayPaused
    )

    editors.forEach((_, index) => {
      if (editors[index].candidate && editors[index].isReplaying) {
        if (allPaused) {
          // Resume all
          handlePauseResumeReplay(index)
        } else {
          // Pause all
          handlePauseResumeReplay(index)
        }
      }
    })
  }, [editors, handlePauseResumeReplay])

  // Sync refs with state
  useEffect(() => {
    editors.forEach((editor, index) => {
      isRecordingRefs.current[index] = editor.isRecording
      isReplayingRefs.current[index] = editor.isReplaying
      isReplayPausedRefs.current[index] = editor.isReplayPaused
    })
  }, [editors])

  // Handle speed changes during replay - only update audio playback rate
  // Note: Editor changes replay speed is set when starting replay, changing speed
  // mid-replay will only affect audio playback rate
  useEffect(() => {
    const speed = parseFloat(replaySpeed)
    // Update audio playback rate for all playing editors
    for (let i = 0; i < 3; i++) {
      const audioRef = audioRefs.current[i]
      if (audioRef && isReplayingRefs.current[i] && !isReplayPausedRefs.current[i]) {
        audioRef.playbackRate = speed
      }
    }
  }, [replaySpeed])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup all editors
      for (let i = 0; i < 3; i++) {
        replayTimeoutsRefs.current[i].forEach((timeout) => clearTimeout(timeout))
        if (replayProgressIntervalRefs.current[i]) {
          clearInterval(replayProgressIntervalRefs.current[i]!)
        }
        if (audioRefs.current[i]) {
          audioRefs.current[i]!.pause()
        }
        if (audioStreamRefs.current[i]) {
          audioStreamRefs.current[i]!.getTracks().forEach(track => track.stop())
        }
        if (disposableRefs.current[i]) {
          disposableRefs.current[i]!.dispose()
        }
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!problemData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Challenge not found</div>
      </div>
    )
  }

  const allHaveRecordedData = editors.every((editor, index) => 
    editor.candidate && editor.recordedChanges.length > 0
  )

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/dashboard/recruiter/job/${jobId}/applicants`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{problemData.title}</h1>
            <p className="text-sm text-muted-foreground">{company?.name || 'Challenge'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              if (confirm('Are you sure you want to delete all recordings? This cannot be undone.')) {
                try {
                  const response = await fetch(`/api/submissions/${challengeId}/recruiter-recording`, {
                    method: 'DELETE',
                  })
                  if (response.ok) {
                    // Clear all audio refs
                    for (let i = 0; i < 3; i++) {
                      const audioRef = audioRefs.current[i]
                      if (audioRef) {
                        audioRef.pause()
                        audioRef.src = ''
                        audioRef.load()
                      }
                    }
                    // Reset all editors
                    setEditors(prev => prev.map(editor => ({
                      ...editor,
                      recordedChanges: [],
                      audioUrl: null,
                    })))
                    // Reload page to ensure clean state and clear browser cache
                    window.location.reload()
                  } else {
                    console.error('Failed to delete recordings')
                    const errorText = await response.text()
                    console.error('Error response:', errorText)
                  }
                } catch (error) {
                  console.error('Error deleting recordings:', error)
                }
              }
            }}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete All Recordings
          </Button>
          {allHaveRecordedData ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Speed:</span>
                <Select value={replaySpeed} onValueChange={setReplaySpeed}>
                  <SelectTrigger className="h-9 w-24 text-sm">
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
            </>
          ) : (
            <Button
              variant="default"
              onClick={handleStartRecordingAll}
              disabled={editors.every(e => !e.candidate || e.isRecording || e.isReplaying)}
            >
              <Circle className="h-4 w-4 mr-2" />
              Start Recording
            </Button>
          )}
        </div>
      </div>

      {/* Three Editor Panels */}
      <div className="flex-1 grid grid-cols-3 gap-4 p-4 overflow-hidden">
        {editors.map((editorState, index) => {
          const isFocused = focusedEditorIndex === index
          const hasRecording = editorState.recordedChanges.length > 0
          const showFocusMode = allHaveRecordedData
          
          return (
          <Card 
            key={index} 
            className={`flex flex-col overflow-hidden transition-all ${
              isFocused 
                ? 'border-lime-500 border-2 shadow-lg shadow-lime-500/20' 
                : 'border-border'
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {editorState.candidate ? (
                    <>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {editorState.candidate.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-sm">{editorState.candidate.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          #{(() => {
                            const candidateNumberSeed = hashString(editorState.candidate.id)
                            return 1800 + (candidateNumberSeed % 200) + 1
                          })()}
                        </p>
                      </div>
                    </>
                  ) : (
                    <CardTitle className="text-sm text-muted-foreground">No candidate</CardTitle>
                  )}
                </div>
                {editorState.isRecording && (
                  <div className="flex items-center gap-2">
                    <Circle className="h-3 w-3 text-red-500 fill-red-500 animate-pulse" />
                    <span className="text-xs text-muted-foreground">Recording</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-2 overflow-hidden">
              {/* Controls */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {showFocusMode && hasRecording ? (
                  // Focus mode: show Focus button
                  <Button
                    size="sm"
                    variant={isFocused ? "default" : "outline"}
                    onClick={() => handleFocusEditor(index)}
                    className={`flex-1 ${isFocused ? 'bg-lime-500 hover:bg-lime-600 text-white' : ''}`}
                  >
                    {isFocused ? 'Focused' : 'Focus'}
                  </Button>
                ) : (
                  // Normal mode: show Record/Replay buttons
                  <>
                    {!editorState.isRecording && !editorState.isReplaying && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartRecording(index)}
                        disabled={!editorState.candidate}
                        className="flex-1"
                      >
                        <Circle className="h-3 w-3 mr-2 text-red-500" />
                        Record
                      </Button>
                    )}
                    {editorState.isRecording && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStopRecording(index)}
                        className="flex-1"
                      >
                        <Square className="h-3 w-3 mr-2" />
                        Stop
                      </Button>
                    )}
                    {!editorState.isRecording && editorState.recordedChanges.length > 0 && !editorState.isReplaying && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleStartReplay(index)}
                        className="flex-1"
                      >
                        <Play className="h-3 w-3 mr-2" />
                        Replay
                      </Button>
                    )}
                    {editorState.isReplaying && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePauseResumeReplay(index)}
                        className="flex-1"
                      >
                        {editorState.isReplayPaused ? (
                          <>
                            <Play className="h-3 w-3 mr-2" />
                            Resume
                          </>
                        ) : (
                          <>
                            <Pause className="h-3 w-3 mr-2" />
                            Pause
                          </>
                        )}
                      </Button>
                    )}
                  </>
                )}
              </div>

              {/* Editor */}
              <div className="flex-1 overflow-hidden">
                <Editor
                  height="100%"
                  defaultLanguage="python"
                  defaultValue={problemData.boilerplate}
                  theme="vs-dark"
                  onMount={(editor) => handleEditorDidMount(editor, index)}
                  options={{
                    readOnly: editorState.isReplaying,
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </div>

              {/* Hidden audio element */}
              {editorState.audioUrl && (
                <audio
                  key={editorState.audioUrl} // Force remount when audioUrl changes
                  ref={(el) => {
                    audioRefs.current[index] = el
                    if (el) {
                      // Set initial volume based on focus
                      if (focusedEditorIndex === index) {
                        el.volume = 1.0
                      } else if (focusedEditorIndex !== null) {
                        el.volume = 0.1
                      } else {
                        el.volume = 1.0
                      }
                    }
                  }}
                  src={editorState.audioUrl}
                  preload="auto"
                  style={{ display: 'none' }}
                />
              )}
            </CardContent>
          </Card>
          )
        })}
      </div>
    </div>
  )
}

