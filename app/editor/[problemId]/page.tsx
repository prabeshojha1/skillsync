'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Editor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { Button } from '@/components/ui/button'
import { Square, Play, Loader2, CheckCircle2, XCircle, Circle, Pause } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getProblemById } from '@/lib/problems'
import { ProblemData } from '@/data/problems/types'

// Type declarations for global Pyodide
declare global {
  interface Window {
    loadPyodide: (options?: { indexURL?: string }) => Promise<any>
  }
}

interface ChangeEvent {
  changes: editor.IModelContentChange[]
  timestamp: number
}

interface TestCase {
  id: string
  name: string
  input: string
  expectedOutput: string
  actualOutput: string | null
  status: 'pending' | 'running' | 'passed' | 'failed'
  error: string | null
}

export default function EditorPage() {
  const params = useParams()
  const problemId = params?.problemId as string
  
  // Load problem data
  const problemData = problemId ? getProblemById(problemId) : null

  const [isRecording, setIsRecording] = useState(true)
  const [isReplaying, setIsReplaying] = useState(false)
  const [isReplayPaused, setIsReplayPaused] = useState(false)
  const [replaySpeed, setReplaySpeed] = useState('1')
  const [replayProgress, setReplayProgress] = useState({ elapsed: 0, total: 0 })
  const [recordedChanges, setRecordedChanges] = useState<ChangeEvent[]>([])
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const modelRef = useRef<editor.ITextModel | null>(null)
  const replayTimeoutsRef = useRef<NodeJS.Timeout[]>([])
  const replayStartTimeRef = useRef<number>(0)
  const replayPausedTimeRef = useRef<number>(0)
  const replayPauseDurationRef = useRef<number>(0)
  const replayProgressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const replayProgressElapsedRef = useRef<number>(0)
  const disposableRef = useRef<{ dispose: () => void } | null>(null)
  const isRecordingRef = useRef(true)
  const isReplayingRef = useRef(false)
  const pyodideRef = useRef<any>(null)
  const [isLoadingPyodide, setIsLoadingPyodide] = useState(false)
  const [isPyodideReady, setIsPyodideReady] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [output, setOutput] = useState<{ type: 'output' | 'error'; content: string } | null>(null)
  const testCasesRef = useRef<TestCase[]>([])

  // Initialize test cases from problem data
  const initialTestCases: TestCase[] = problemData?.testCases.map(tc => ({
    id: tc.id,
    name: tc.name,
    input: tc.input,
    expectedOutput: tc.expectedOutput,
    actualOutput: null,
    status: 'pending' as const,
    error: null,
  })) || []

  const [testCases, setTestCases] = useState<TestCase[]>(initialTestCases)
  const [activeTestCase, setActiveTestCase] = useState(initialTestCases.length > 0 ? initialTestCases[0].id : '1')

  // Reset editor and test cases when problem changes
  useEffect(() => {
    if (problemData) {
      const newTestCases: TestCase[] = problemData.testCases.map(tc => ({
        id: tc.id,
        name: tc.name,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: null,
        status: 'pending' as const,
        error: null,
      }))
      setTestCases(newTestCases)
      setActiveTestCase(newTestCases.length > 0 ? newTestCases[0].id : '1')
      
      // Reset editor content
      if (modelRef.current) {
        modelRef.current.setValue(problemData.boilerplate)
      }
      
      // Reset recording and replay
      setIsRecording(true)
      setIsReplaying(false)
      setIsReplayPaused(false)
      setRecordedChanges([])
      setOutput(null)
      setReplayProgress({ elapsed: 0, total: 0 })
      replayProgressElapsedRef.current = 0
      replayPauseDurationRef.current = 0
      
      // Clear any replay timeouts
      replayTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout))
      replayTimeoutsRef.current = []
      if (replayProgressIntervalRef.current) {
        clearInterval(replayProgressIntervalRef.current)
        replayProgressIntervalRef.current = null
      }
    }
  }, [problemId, problemData])

  // Keep refs in sync with state
  useEffect(() => {
    isRecordingRef.current = isRecording
  }, [isRecording])

  useEffect(() => {
    isReplayingRef.current = isReplaying
  }, [isReplaying])

  const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor
    const model = editor.getModel()
    if (model) {
      modelRef.current = model

      // Set initial boilerplate if problem data is available
      if (problemData && model.getValue().trim() === '') {
        model.setValue(problemData.boilerplate)
      }

      // Dispose previous listener if it exists
      if (disposableRef.current) {
        disposableRef.current.dispose()
      }

      // Start recording changes
      const disposable = model.onDidChangeContent((e) => {
        // Check current state via refs to avoid closure issues
        if (isRecordingRef.current && !isReplayingRef.current) {
          const timestamp = Date.now()
          setRecordedChanges((prev) => [
            ...prev,
            {
              changes: e.changes,
              timestamp,
            },
          ])
        }
      })

      disposableRef.current = disposable
    }
  }, [problemData])

  // Format time in seconds to MM:SS format
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Start replay with current speed
  const startReplay = useCallback((speed: number, startFromElapsed: number = 0) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dec71052-97df-49d2-96cc-8de4a0fbb3c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/editor/[problemId]/page.tsx:171',message:'startReplay called',data:{speed,startFromElapsed,hasEditor:!!editorRef.current,hasModel:!!modelRef.current,changesCount:recordedChanges.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (!editorRef.current || !modelRef.current || recordedChanges.length === 0) {
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
    // startFromElapsed is in seconds of replay time, convert to original timeline
    const startTimeInOriginalTimeline = startFromElapsed * 1000 * speed
    const remainingChanges = relativeChanges.filter(change => change.relativeTime >= startTimeInOriginalTimeline)

    // Set total duration
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dec71052-97df-49d2-96cc-8de4a0fbb3c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/editor/[problemId]/page.tsx:199',message:'setReplayProgress called in startReplay',data:{elapsed:startFromElapsed,total:totalDuration/1000},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    setReplayProgress({ elapsed: startFromElapsed, total: totalDuration / 1000 })

    // Start progress tracking
    replayStartTimeRef.current = Date.now() - (startFromElapsed * 1000)
    replayProgressElapsedRef.current = startFromElapsed
    replayProgressIntervalRef.current = setInterval(() => {
      if (!isReplayPaused) {
        const elapsed = (Date.now() - replayStartTimeRef.current) / 1000
        replayProgressElapsedRef.current = elapsed
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/dec71052-97df-49d2-96cc-8de4a0fbb3c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/editor/[problemId]/page.tsx:203',message:'progress interval updating replayProgress',data:{elapsed,prevTotal:replayProgress.total},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        setReplayProgress(prev => ({ ...prev, elapsed: Math.min(elapsed, prev.total) }))
      }
    }, 100)

    // Replay remaining changes with speed-adjusted timing
    remainingChanges.forEach((change, index) => {
      const adjustedDelay = (change.relativeTime - startTimeInOriginalTimeline) / speed
      const timeout = setTimeout(() => {
        if (modelRef.current && editorRef.current) {
          // Apply the changes using applyEdits
          const edits = change.changes.map((delta) => ({
            range: delta.range,
            text: delta.text,
          }))

          modelRef.current.applyEdits(edits)

          // Update progress based on actual elapsed time
          const currentElapsed = startFromElapsed + (change.relativeTime - startTimeInOriginalTimeline) / speed / 1000
          replayProgressElapsedRef.current = currentElapsed
          setReplayProgress(prev => ({ ...prev, elapsed: Math.min(currentElapsed, prev.total) }))

          // If this is the last change, finish replay
          if (index === remainingChanges.length - 1) {
            setTimeout(() => {
              if (editorRef.current && replayProgressIntervalRef.current) {
                clearInterval(replayProgressIntervalRef.current)
                replayProgressIntervalRef.current = null
                editorRef.current.updateOptions({ readOnly: false })
                setIsReplaying(false)
                setIsReplayPaused(false)
                setReplayProgress({ elapsed: 0, total: 0 })
                replayProgressElapsedRef.current = 0
                replayPauseDurationRef.current = 0
                // Reset recording state for next session
                setRecordedChanges([])
                setIsRecording(true)
              }
            }, (100 / speed))
          }
        }
      }, adjustedDelay)

      replayTimeoutsRef.current.push(timeout)
    })
  }, [recordedChanges])

  const handleStopAndReplay = useCallback(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dec71052-97df-49d2-96cc-8de4a0fbb3c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/editor/[problemId]/page.tsx:250',message:'handleStopAndReplay called',data:{hasEditor:!!editorRef.current,hasModel:!!modelRef.current,changesCount:recordedChanges.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    if (!editorRef.current || !modelRef.current || recordedChanges.length === 0) {
      return
    }

    // Stop recording
    setIsRecording(false)
    setIsReplaying(true)
    setIsReplayPaused(false)
    replayPauseDurationRef.current = 0

    // Make editor read-only
    editorRef.current.updateOptions({ readOnly: true })

    // Clear editor content
    modelRef.current.setValue('')

    // Start replay with current speed
    const speed = parseFloat(replaySpeed)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dec71052-97df-49d2-96cc-8de4a0fbb3c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/editor/[problemId]/page.tsx:270',message:'calling startReplay from handleStopAndReplay',data:{speed},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    startReplay(speed)
  }, [recordedChanges, replaySpeed, startReplay])

  // Handle pause/resume replay
  const handlePauseResumeReplay = useCallback(() => {
    if (!isReplaying) return

    if (isReplayPaused) {
      // Resume - restart from current progress using ref to avoid dependency
      const speed = parseFloat(replaySpeed)
      startReplay(speed, replayProgressElapsedRef.current)
      setIsReplayPaused(false)
    } else {
      // Pause - clear timeouts and stop progress tracking
      replayPausedTimeRef.current = Date.now()
      replayTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout))
      replayTimeoutsRef.current = []
      setIsReplayPaused(true)
    }
  }, [isReplaying, isReplayPaused, replaySpeed, startReplay])

  // Handle speed change during replay
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dec71052-97df-49d2-96cc-8de4a0fbb3c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/editor/[problemId]/page.tsx:292',message:'speed change useEffect triggered',data:{isReplaying,isReplayPaused,replaySpeed},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    if (isReplaying && !isReplayPaused) {
      // Restart replay with new speed from current progress
      // Use ref to get current progress without triggering re-renders
      const speed = parseFloat(replaySpeed)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/dec71052-97df-49d2-96cc-8de4a0fbb3c4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/editor/[problemId]/page.tsx:296',message:'calling startReplay from speed change effect',data:{speed,elapsed:replayProgressElapsedRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      startReplay(speed, replayProgressElapsedRef.current)
    }
    // Only depend on replaySpeed, isReplaying, and isReplayPaused - NOT replayProgress or startReplay
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replaySpeed, isReplaying, isReplayPaused])

  const handleReset = useCallback(() => {
    // Clear all timeouts
    replayTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout))
    replayTimeoutsRef.current = []
    
    // Clear progress interval
    if (replayProgressIntervalRef.current) {
      clearInterval(replayProgressIntervalRef.current)
      replayProgressIntervalRef.current = null
    }

    // Reset state
    setIsRecording(true)
      setIsReplaying(false)
      setIsReplayPaused(false)
      setRecordedChanges([])
      setReplayProgress({ elapsed: 0, total: 0 })
      replayProgressElapsedRef.current = 0
      replayPauseDurationRef.current = 0

    // Re-enable editing
    if (editorRef.current) {
      editorRef.current.updateOptions({ readOnly: false })
    }

    // Reset content to boilerplate
    if (modelRef.current && problemData) {
      modelRef.current.setValue(problemData.boilerplate)
    } else if (modelRef.current) {
      modelRef.current.setValue('')
    }
  }, [problemData])

  // Suppress Pyodide stackframe loading errors (non-critical)
  useEffect(() => {
    const originalError = console.error
    console.error = (...args: any[]) => {
      // Filter out stackframe loading errors from Pyodide
      // Check all arguments for stackframe-related errors
      const errorString = args.map(arg => 
        typeof arg === 'string' ? arg : 
        arg?.toString?.() || 
        JSON.stringify(arg)
      ).join(' ')
      
      if (
        errorString.includes('Loading "stackframe" failed') ||
        (errorString.includes('stackframe') && errorString.includes('failed')) ||
        errorString.includes('stackframe') && errorString.includes('loader.js')
      ) {
        // Suppress this specific non-critical error
        return
      }
      // Log all other errors normally
      originalError.apply(console, args)
    }

    return () => {
      console.error = originalError
    }
  }, [])

  // Initialize Pyodide
  useEffect(() => {
    const initializePyodide = async () => {
      setIsLoadingPyodide(true)
      try {
        // Wait for Pyodide script to load
        // Poll for Pyodide to be available (script loads asynchronously)
        let attempts = 0
        const maxAttempts = 50
        while (typeof window === 'undefined' || typeof window.loadPyodide === 'undefined') {
          if (attempts >= maxAttempts) {
            throw new Error('Pyodide failed to load: window.loadPyodide not available after timeout')
          }
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }
        
        const pyodide = await window.loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
        })
        pyodideRef.current = pyodide
        setIsPyodideReady(true)
      } catch (error) {
        console.error('Failed to load Pyodide:', error)
        setOutput({ type: 'error', content: `Failed to load Pyodide: ${error}` })
      } finally {
        setIsLoadingPyodide(false)
      }
    }
    initializePyodide()
  }, [])

  // Parse test case input string to extract function arguments
  const parseTestCaseInput = useCallback((input: string): any[] => {
    // Parse input like "nums = [2,7,11,15], target = 9"
    const args: any[] = []
    let i = 0
    const len = input.length
    
    while (i < len) {
      // Skip whitespace
      while (i < len && /\s/.test(input[i])) i++
      if (i >= len) break
      
      // Match variable name and equals sign
      const varMatch = input.substring(i).match(/^(\w+)\s*=\s*/)
      if (!varMatch) break
      
      i += varMatch[0].length
      const valueStart = i
      
      // Parse the value, tracking bracket depth to handle lists properly
      let bracketDepth = 0
      let parenDepth = 0
      let braceDepth = 0
      
      while (i < len) {
        const char = input[i]
        
        // Track brackets
        if (char === '[') bracketDepth++
        else if (char === ']') bracketDepth--
        else if (char === '(') parenDepth++
        else if (char === ')') parenDepth--
        else if (char === '{') braceDepth++
        else if (char === '}') braceDepth--
        else if (char === ',' && bracketDepth === 0 && parenDepth === 0 && braceDepth === 0) {
          // Found a top-level comma - check if it's followed by another assignment
          const remaining = input.substring(i + 1).trim()
          if (remaining.match(/^\w+\s*=/)) {
            // This comma separates assignments
            break
          }
        }
        
        i++
      }
      
      const valueStr = input.substring(valueStart, i).trim()
      if (valueStr) {
        args.push(valueStr)
      }
      
      // Skip the comma and whitespace before next assignment
      while (i < len && (input[i] === ',' || /\s/.test(input[i]))) i++
    }
    
    return args
  }, [])

  // Compare outputs, handling formatting differences
  const compareOutputs = useCallback((actual: string, expected: string): boolean => {
    // Normalize whitespace in arrays/lists
    const normalize = (str: string) => {
      return str
        .replace(/\s+/g, ' ')
        .replace(/\[\s+/g, '[')
        .replace(/\s+\]/g, ']')
        .replace(/,\s+/g, ',')
        .trim()
    }
    return normalize(actual) === normalize(expected)
  }, [])

  // Execute test case with user's code
  const executeTestCase = useCallback(async (
    code: string,
    input: string,
    functionName: string
  ): Promise<{ output: string | null; error: string | null }> => {
    if (!pyodideRef.current) {
      return { output: null, error: 'Pyodide not loaded' }
    }

    try {
      // Parse input to get argument values
      const args = parseTestCaseInput(input)
      
      // Capture stdout and stderr
      let stdout = ''
      let stderr = ''
      
      pyodideRef.current.setStdout({
        batched: (text: string) => {
          stdout += text
        },
      })

      pyodideRef.current.setStderr({
        batched: (text: string) => {
          stderr += text
        },
      })

      // Execute the user's code first
      await pyodideRef.current.runPythonAsync(code)

      // Build function call with parsed arguments
      const argString = args.map(arg => {
        // If it's already a valid Python literal, use it as-is
        // Otherwise, wrap strings in quotes
        if (arg.startsWith('[') || arg.match(/^-?\d+$/)) {
          return arg
        }
        return `"${arg}"`
      }).join(', ')

      const functionCall = `${functionName}(${argString})`
      
      // Execute the function call and get result
      const result = await pyodideRef.current.runPythonAsync(functionCall)
      
      // Format output
      let output: string | null = null
      if (result !== undefined && result !== null) {
        // Convert result to string, handling lists/arrays properly
        if (Array.isArray(result)) {
          // Format as Python list: [0,1] not [0, 1]
          output = `[${result.join(',')}]`
        } else {
          output = String(result)
        }
      } else if (stdout) {
        output = stdout.trim()
      }

      if (stderr) {
        return { output: null, error: stderr }
      }

      return { output, error: null }
    } catch (error: any) {
      return {
        output: null,
        error: error.message || String(error),
      }
    }
  }, [parseTestCaseInput])

  // Handle running a single test case
  const handleRunTestCase = useCallback(async (testCaseId: string, testCaseOverride?: TestCase) => {
    if (!editorRef.current || !pyodideRef.current || !isPyodideReady || !problemData) {
      return
    }

    // Get test case - use override if provided, otherwise look up from ref or state
    let testCase: TestCase | undefined = testCaseOverride
    
    if (!testCase) {
      // Try ref first (most up-to-date)
      testCase = testCasesRef.current.find(tc => tc.id === testCaseId)
      
      // If not in ref, try state
      if (!testCase) {
        setTestCases(prev => {
          testCase = prev.find(tc => tc.id === testCaseId)
          return prev // Don't modify state here, just read it
        })
      }
    }

    if (!testCase) {
      return
    }

    // Update status to running
    setTestCases(prev => prev.map(tc => 
      tc.id === testCaseId ? { ...tc, status: 'running', error: null } : tc
    ))

    try {
      const code = editorRef.current.getValue()
      const result = await executeTestCase(code, testCase.input, problemData.functionName)
      
      // Check if there's an error first
      if (result.error) {
        setTestCases(prev => prev.map(tc => 
          tc.id === testCaseId ? {
            ...tc,
            status: 'failed',
            actualOutput: result.output,
            error: result.error,
          } : tc
        ))
        return
      }
      
      // Check if no output was produced but output was expected
      if (!result.output && testCase.expectedOutput) {
        setTestCases(prev => prev.map(tc => 
          tc.id === testCaseId ? {
            ...tc,
            status: 'failed',
            actualOutput: null,
            error: 'No output was produced. Expected output but got none.',
          } : tc
        ))
        return
      }
      
      // Compare outputs if both exist
      const passed = result.output ? compareOutputs(result.output, testCase.expectedOutput) : false
      
      setTestCases(prev => prev.map(tc => 
        tc.id === testCaseId ? {
          ...tc,
          status: passed ? 'passed' : 'failed',
          actualOutput: result.output,
          error: result.error || (!passed && result.output ? 'Output does not match expected result.' : null),
        } : tc
      ))
    } catch (error: any) {
      setTestCases(prev => prev.map(tc => 
        tc.id === testCaseId ? {
          ...tc,
          status: 'failed',
          error: error.message || String(error),
        } : tc
      ))
    }
  }, [executeTestCase, compareOutputs, isPyodideReady, problemData])

  // Handle running all test cases
  const handleRunAllTests = useCallback(async () => {
    if (!editorRef.current || !pyodideRef.current || !isPyodideReady || !problemData) {
      return
    }

    // Get current test cases from ref (kept in sync via useEffect)
    let currentTestCases: TestCase[] = testCasesRef.current.length > 0 
      ? testCasesRef.current.map(tc => ({ ...tc }))
      : []
    
    // If ref is empty, try to read from state one more time
    if (currentTestCases.length === 0) {
      let fallbackCases: TestCase[] = []
      setTestCases(prev => {
        fallbackCases = prev.map(tc => ({ ...tc }))
        return prev
      })
      if (fallbackCases.length > 0) {
        currentTestCases = fallbackCases
        testCasesRef.current = fallbackCases // Update ref for next time
      }
    }
    
    // Reset all test cases to pending
    setTestCases(prev => prev.map(tc => ({
      ...tc,
      status: 'pending',
      actualOutput: null,
      error: null,
    })))

    // Run each test case sequentially using the captured array
    for (let i = 0; i < currentTestCases.length; i++) {
      const testCase = currentTestCases[i]
      await handleRunTestCase(testCase.id, testCase)
      // Small delay between tests for better UX
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }, [handleRunTestCase, isPyodideReady, problemData])

  // Handle code execution
  const handleRunCode = useCallback(async () => {
    if (!editorRef.current || !pyodideRef.current || isRunning) {
      return
    }

    setIsRunning(true)
    setOutput(null)

    try {
      const code = editorRef.current.getValue()
      
      // Capture stdout
      let stdout = ''
      pyodideRef.current.setStdout({
        batched: (text: string) => {
          stdout += text
        },
      })

      // Capture stderr
      let stderr = ''
      pyodideRef.current.setStderr({
        batched: (text: string) => {
          stderr += text
        },
      })

      // Run the code
      const result = await pyodideRef.current.runPythonAsync(code)

      // Combine output
      let outputContent = stdout
      if (result !== undefined) {
        outputContent += String(result)
      }
      if (stderr) {
        setOutput({ type: 'error', content: stderr })
      } else {
        setOutput({ type: 'output', content: outputContent || '(No output)' })
      }

      // Switch to output tab
      setActiveTestCase('output')
    } catch (error: any) {
      setOutput({
        type: 'error',
        content: error.message || String(error),
      })
      setActiveTestCase('output')
    } finally {
      setIsRunning(false)
    }
  }, [isRunning])

  // Keep ref in sync with state and initialize it
  useEffect(() => {
    testCasesRef.current = testCases
  }, [testCases])
  
  // Initialize ref on mount
  useEffect(() => {
    if (testCasesRef.current.length === 0 && testCases.length > 0) {
      testCasesRef.current = testCases
    }
  }, [testCases])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      replayTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout))
      if (replayProgressIntervalRef.current) {
        clearInterval(replayProgressIntervalRef.current)
      }
      if (disposableRef.current) {
        disposableRef.current.dispose()
      }
    }
  }, [])

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

  // Handle missing problem
  if (!problemData) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Problem Not Found</h1>
          <p className="text-muted-foreground">
            The problem &quot;{problemId}&quot; does not exist.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <h1 className="text-lg font-semibold">Code Editor</h1>
          <div className="flex items-center gap-2">
            {isRecording && !isReplaying && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                <span>Recording...</span>
                <span className="text-xs">
                  ({recordedChanges.length} change{recordedChanges.length !== 1 ? 's' : ''})
                </span>
              </div>
            )}
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
            <Button
              onClick={handleStopAndReplay}
              disabled={isReplaying || recordedChanges.length === 0}
              size="sm"
              className="gap-2"
            >
              <Square className="h-4 w-4" />
              Stop & Replay
            </Button>
            <Button onClick={handleReset} variant="outline" size="sm">
              Reset
            </Button>
          </div>
        </div>
      </div>

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
                <div className="text-sm text-muted-foreground whitespace-pre-line">
                  {problemData.description}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Examples</h3>
                <div className="space-y-4">
                  {problemData.examples.map((example, idx) => (
                    <div key={idx} className="bg-muted p-4 rounded-md space-y-2">
                      <div>
                        <span className="font-semibold">Input: </span>
                        <code className="text-sm bg-background px-2 py-1 rounded">
                          {example.input}
                        </code>
                      </div>
                      <div>
                        <span className="font-semibold">Output: </span>
                        <code className="text-sm bg-background px-2 py-1 rounded">
                          {example.output}
                        </code>
                      </div>
                      {example.explanation && (
                        <div>
                          <span className="font-semibold">Explanation: </span>
                          <span className="text-sm text-muted-foreground">
                            {example.explanation}
                          </span>
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

        {/* Right Panel - Code Editor and Test Cases */}
        <div className="w-1/2 flex flex-col">
          {/* Top Right - Code Editor */}
          <div className="flex-1 border-b overflow-hidden flex flex-col">
            <div className="border-b bg-muted/50 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Python</span>
                <span className="text-xs text-muted-foreground">
                  {isLoadingPyodide ? 'Loading...' : isPyodideReady ? 'Ready' : 'Initializing...'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleRunAllTests}
                  disabled={isRunning || isLoadingPyodide || !isPyodideReady || testCases.some(tc => tc.status === 'running')}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  {testCases.some(tc => tc.status === 'running') ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Run All Tests
                </Button>
                <Button
                  onClick={handleRunCode}
                  disabled={isRunning || isLoadingPyodide || !isPyodideReady}
                  size="sm"
                  className="gap-2"
                >
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {isRunning ? 'Running...' : 'Run'}
                </Button>
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
                }}
              />
            </div>
          </div>

          {/* Bottom Right - Test Cases and Output */}
          <div className="h-64 border-t bg-card">
            <Tabs value={activeTestCase} onValueChange={setActiveTestCase} className="h-full flex flex-col">
              <div className="border-b px-4 pt-2">
                <TabsList>
                  {testCases.map((testCase) => {
                    const getStatusIcon = () => {
                      switch (testCase.status) {
                        case 'passed':
                          return <CheckCircle2 className="h-3 w-3 text-green-500 ml-1" />
                        case 'failed':
                          return <XCircle className="h-3 w-3 text-red-500 ml-1" />
                        case 'running':
                          return <Loader2 className="h-3 w-3 text-yellow-500 ml-1 animate-spin" />
                        default:
                          return <Circle className="h-3 w-3 text-muted-foreground ml-1" />
                      }
                    }
                    return (
                      <TabsTrigger key={testCase.id} value={testCase.id} className="gap-1">
                        {testCase.name}
                        {getStatusIcon()}
                      </TabsTrigger>
                    )
                  })}
                  <TabsTrigger value="output">
                    Output
                    {output && (
                      <span className={`ml-2 h-2 w-2 rounded-full ${
                        output.type === 'error' ? 'bg-red-500' : 'bg-green-500'
                      }`} />
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {testCases.map((testCase) => {
                  const getStatusText = () => {
                    switch (testCase.status) {
                      case 'passed':
                        return <span className="text-green-500 font-semibold">Passed</span>
                      case 'failed':
                        return <span className="text-red-500 font-semibold">Failed</span>
                      case 'running':
                        return <span className="text-yellow-500 font-semibold">Running...</span>
                      default:
                        return <span className="text-muted-foreground font-semibold">Pending</span>
                    }
                  }

                  return (
                    <TabsContent key={testCase.id} value={testCase.id} className="mt-0 h-full">
                      <div className="space-y-4 h-full">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-sm">Status: </span>
                            {getStatusText()}
                          </div>
                          <Button
                            onClick={() => handleRunTestCase(testCase.id)}
                            disabled={!isPyodideReady || testCase.status === 'running' || testCases.some(tc => tc.status === 'running')}
                            size="sm"
                            variant="outline"
                            className="gap-2"
                          >
                            {testCase.status === 'running' ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                            Run
                          </Button>
                        </div>
                        <div>
                          <span className="font-semibold text-sm">Input:</span>
                          <div className="mt-1 bg-muted p-3 rounded-md">
                            <code className="text-sm">{testCase.input}</code>
                          </div>
                        </div>
                        <div>
                          <span className="font-semibold text-sm">Expected Output:</span>
                          <div className="mt-1 bg-muted p-3 rounded-md">
                            <code className="text-sm">{testCase.expectedOutput}</code>
                          </div>
                        </div>
                        {(testCase.status === 'passed' || testCase.status === 'failed') && (
                          <div>
                            <span className="font-semibold text-sm">Your Output:</span>
                            <div className={`mt-1 p-3 rounded-md ${
                              testCase.status === 'passed' 
                                ? 'bg-green-500/10 border border-green-500/50' 
                                : 'bg-red-500/10 border border-red-500/50'
                            }`}>
                              {testCase.actualOutput !== null ? (
                                <code className="text-sm">{testCase.actualOutput}</code>
                              ) : (
                                <code className="text-sm text-muted-foreground italic">(No output produced)</code>
                              )}
                            </div>
                          </div>
                        )}
                        {testCase.error && (
                          <div>
                            <span className="font-semibold text-sm text-red-500">Error:</span>
                            <div className="mt-1 bg-red-500/10 border border-red-500/50 p-3 rounded-md">
                              <code className="text-sm text-red-500">{testCase.error}</code>
                            </div>
                          </div>
                        )}
                        {testCase.status === 'failed' && testCase.actualOutput !== null && (
                          <div>
                            <span className="font-semibold text-sm text-red-500">Comparison:</span>
                            <div className="mt-1 bg-muted p-3 rounded-md space-y-2">
                              <div>
                                <span className="text-xs text-muted-foreground">Expected: </span>
                                <code className="text-sm text-green-500">{testCase.expectedOutput}</code>
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground">Got: </span>
                                <code className="text-sm text-red-500">{testCase.actualOutput}</code>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  )
                })}
                <TabsContent value="output" className="mt-0 h-full">
                  <div className="h-full">
                    {isLoadingPyodide ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Loading Python runtime...
                      </div>
                    ) : output ? (
                      <div className="h-full">
                        <div className="mb-2">
                          <span className={`text-sm font-semibold ${
                            output.type === 'error' ? 'text-red-500' : 'text-green-500'
                          }`}>
                            {output.type === 'error' ? 'Error' : 'Output'}
                          </span>
                        </div>
                        <div className={`bg-muted p-3 rounded-md h-[calc(100%-2rem)] overflow-auto ${
                          output.type === 'error' ? 'border border-red-500/50' : ''
                        }`}>
                          <pre className="text-sm whitespace-pre-wrap font-mono">
                            {output.content}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Click &quot;Run&quot; to execute your code
                      </div>
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
