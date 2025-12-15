'use client'

import { useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Monitor, Clipboard, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export type IntegrityWarningType = 'looked_away' | 'tab_switch' | 'copy_paste'

interface IntegrityWarningPopupProps {
  type: IntegrityWarningType
  message: string
  isVisible: boolean
  onDismiss: () => void
  autoDismissMs?: number
}

function getWarningIcon(type: IntegrityWarningType) {
  switch (type) {
    case 'tab_switch':
      return Monitor
    case 'copy_paste':
      return Clipboard
    case 'looked_away':
      return EyeOff
    default:
      return EyeOff
  }
}

function getWarningColor(type: IntegrityWarningType) {
  switch (type) {
    case 'tab_switch':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
    case 'copy_paste':
      return 'bg-red-500/10 text-red-500 border-red-500/20'
    case 'looked_away':
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
    default:
      return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
  }
}

function getWarningLabel(type: IntegrityWarningType): string {
  switch (type) {
    case 'tab_switch':
      return 'Tab Switching'
    case 'copy_paste':
      return 'Code Pasted'
    case 'looked_away':
      return 'Looked Away'
    default:
      return 'Warning'
  }
}

export function IntegrityWarningPopup({
  type,
  message,
  isVisible,
  onDismiss,
  autoDismissMs,
}: IntegrityWarningPopupProps) {
  const Icon = getWarningIcon(type)
  const colorClass = getWarningColor(type)
  const label = getWarningLabel(type)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const onDismissRef = useRef(onDismiss)

  // Keep onDismiss ref up to date
  useEffect(() => {
    onDismissRef.current = onDismiss
  }, [onDismiss])

  // Auto-dismiss functionality
  useEffect(() => {
    if (!isVisible || !autoDismissMs) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    // Set new timer
    timerRef.current = setTimeout(() => {
      onDismissRef.current()
      timerRef.current = null
    }, autoDismissMs)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isVisible, autoDismissMs])

  if (!isVisible) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-2xl w-[400px] h-[100px]">
        <CardContent className="p-4 h-full flex items-center">
          <div className="flex items-start gap-3 w-full">
            <div className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              colorClass.split(' ')[0] // Just the bg color
            )}>
              <Icon className={cn("h-4 w-4", colorClass.split(' ')[1])} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className={cn("text-xs", colorClass)}>
                  {label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {message}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

