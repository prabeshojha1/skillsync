'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { Button } from '@/components/ui/button'
import { Square, Play, Loader2, CheckCircle2, XCircle, Circle } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

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
  const [isRecording, setIsRecording] = useState(true)
  const [isReplaying, setIsReplaying] = useState(false)
  const [recordedChanges, setRecordedChanges] = useState<ChangeEvent[]>([])
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const modelRef = useRef<editor.ITextModel | null>(null)
  const replayTimeoutsRef = useRef<NodeJS.Timeout[]>([])
  const disposableRef = useRef<{ dispose: () => void } | null>(null)
  const isRecordingRef = useRef(true)
  const isReplayingRef = useRef(false)
  const pyodideRef = useRef<any>(null)
  const [isLoadingPyodide, setIsLoadingPyodide] = useState(false)
  const [isPyodideReady, setIsPyodideReady] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [output, setOutput] = useState<{ type: 'output' | 'error'; content: string } | null>(null)

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
  }, [])

  const handleStopAndReplay = useCallback(() => {
    if (!editorRef.current || !modelRef.current || recordedChanges.length === 0) {
      return
    }

    // Clear any existing replay timeouts
    replayTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout))
    replayTimeoutsRef.current = []

    // Stop recording
    setIsRecording(false)
    setIsReplaying(true)

    // Make editor read-only
    editorRef.current.updateOptions({ readOnly: true })

    // Clear editor content
    modelRef.current.setValue('')

    // Calculate relative timings from the first change
    const firstTimestamp = recordedChanges[0].timestamp
    const relativeChanges = recordedChanges.map((change) => ({
      ...change,
      relativeTime: change.timestamp - firstTimestamp,
    }))

    // Replay changes with original timing
    relativeChanges.forEach((change, index) => {
      const timeout = setTimeout(() => {
        if (modelRef.current && editorRef.current) {
          // Apply the changes using applyEdits
          const edits = change.changes.map((delta) => ({
            range: delta.range,
            text: delta.text,
          }))

          modelRef.current.applyEdits(edits)

          // If this is the last change, re-enable editing
          if (index === relativeChanges.length - 1) {
            setTimeout(() => {
              if (editorRef.current) {
                editorRef.current.updateOptions({ readOnly: false })
                setIsReplaying(false)
                // Reset recording state for next session
                setRecordedChanges([])
                setIsRecording(true)
              }
            }, 100)
          }
        }
      }, change.relativeTime)

      replayTimeoutsRef.current.push(timeout)
    })
  }, [recordedChanges])

  const handleReset = useCallback(() => {
    // Clear all timeouts
    replayTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout))
    replayTimeoutsRef.current = []

    // Reset state
    setIsRecording(true)
    setIsReplaying(false)
    setRecordedChanges([])

    // Re-enable editing
    if (editorRef.current) {
      editorRef.current.updateOptions({ readOnly: false })
    }

    // Clear content
    if (modelRef.current) {
      modelRef.current.setValue('')
    }
  }, [])

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
    functionName: string = 'twoSum'
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
      // Convert args to Python format: twoSum([2,7,11,15], 9)
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
  const handleRunTestCase = useCallback(async (testCaseId: string) => {
    if (!editorRef.current || !pyodideRef.current || !isPyodideReady) {
      return
    }

    // Get test case from state
    let testCase: TestCase | undefined
    setTestCases(prev => {
      testCase = prev.find(tc => tc.id === testCaseId)
      return prev
    })

    if (!testCase) return

    // Update status to running
    setTestCases(prev => prev.map(tc => 
      tc.id === testCaseId ? { ...tc, status: 'running', error: null } : tc
    ))

    try {
      const code = editorRef.current.getValue()
      const result = await executeTestCase(code, testCase.input, 'twoSum')
      
      const passed = result.output && compareOutputs(result.output, testCase.expectedOutput)
      
      setTestCases(prev => prev.map(tc => 
        tc.id === testCaseId ? {
          ...tc,
          status: passed ? 'passed' : 'failed',
          actualOutput: result.output,
          error: result.error,
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
  }, [executeTestCase, compareOutputs, isPyodideReady])

  // Handle running all test cases
  const handleRunAllTests = useCallback(async () => {
    if (!editorRef.current || !pyodideRef.current || !isPyodideReady) {
      return
    }

    // Reset all test cases to pending first and get current test cases
    let currentTestCases: TestCase[] = []
    setTestCases(prev => {
      currentTestCases = prev
      return prev.map(tc => ({
        ...tc,
        status: 'pending',
        actualOutput: null,
        error: null,
      }))
    })

    // Run each test case sequentially
    for (const testCase of currentTestCases) {
      await handleRunTestCase(testCase.id)
      // Small delay between tests for better UX
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }, [handleRunTestCase, isPyodideReady])

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      replayTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout))
      if (disposableRef.current) {
        disposableRef.current.dispose()
      }
    }
  }, [])

  // Dummy problem data
  const problemData = {
    title: 'Two Sum',
    difficulty: 'Easy',
    description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
      },
      {
        input: 'nums = [3,2,4], target = 6',
        output: '[1,2]',
        explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].',
      },
      {
        input: 'nums = [3,3], target = 6',
        output: '[0,1]',
        explanation: '',
      },
    ],
    constraints: [
      '2 ≤ nums.length ≤ 10⁴',
      '-10⁹ ≤ nums[i] ≤ 10⁹',
      '-10⁹ ≤ target ≤ 10⁹',
      'Only one valid answer exists.',
    ],
  }

  // Test cases state
  const [testCases, setTestCases] = useState<TestCase[]>([
    {
      id: '1',
      name: 'Test Case 1',
      input: 'nums = [2,7,11,15], target = 9',
      expectedOutput: '[0,1]',
      actualOutput: null,
      status: 'pending',
      error: null,
    },
    {
      id: '2',
      name: 'Test Case 2',
      input: 'nums = [3,2,4], target = 6',
      expectedOutput: '[1,2]',
      actualOutput: null,
      status: 'pending',
      error: null,
    },
    {
      id: '3',
      name: 'Test Case 3',
      input: 'nums = [3,3], target = 6',
      expectedOutput: '[0,1]',
      actualOutput: null,
      status: 'pending',
      error: null,
    },
  ])

  const [activeTestCase, setActiveTestCase] = useState('1')

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
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                <span>Replaying...</span>
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
                defaultValue={`def twoSum(nums, target):
    # Your code here
    pass`}
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
                        {testCase.actualOutput !== null && (
                          <div>
                            <span className="font-semibold text-sm">Your Output:</span>
                            <div className={`mt-1 p-3 rounded-md ${
                              testCase.status === 'passed' 
                                ? 'bg-green-500/10 border border-green-500/50' 
                                : 'bg-red-500/10 border border-red-500/50'
                            }`}>
                              <code className="text-sm">{testCase.actualOutput}</code>
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
