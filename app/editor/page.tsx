'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { Button } from '@/components/ui/button'
import { Square } from 'lucide-react'

interface ChangeEvent {
  changes: editor.IModelContentChange[]
  timestamp: number
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      replayTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout))
      if (disposableRef.current) {
        disposableRef.current.dispose()
      }
    }
  }, [])

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

      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="typescript"
          defaultValue="// Start typing to record your changes..."
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
  )
}
