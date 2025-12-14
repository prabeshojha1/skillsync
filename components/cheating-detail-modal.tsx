'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { type CheatingFlag, getCheatingFlagLabel } from '@/lib/recruiter-data'
import { Monitor, Clipboard, EyeOff, X, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CheatingDetailModalProps {
  isOpen: boolean
  onClose: () => void
  applicantName: string
  cheatingFlags: CheatingFlag[]
}

function getCheatingIcon(type: CheatingFlag['type']) {
  switch (type) {
    case 'tab_switch':
      return Monitor
    case 'copy_paste':
      return Clipboard
    case 'looked_away':
      return EyeOff
    default:
      return AlertTriangle
  }
}

function getCheatingColor(type: CheatingFlag['type']) {
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

export function CheatingDetailModal({ 
  isOpen, 
  onClose, 
  applicantName, 
  cheatingFlags 
}: CheatingDetailModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <Card className="relative w-full max-w-lg bg-card border border-border shadow-2xl">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Integrity Concerns</CardTitle>
              <p className="text-sm text-muted-foreground">{applicantName}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The following potential integrity violations were detected during this candidate&apos;s assessment:
          </p>
          
          <div className="space-y-3">
            {cheatingFlags.map((flag, index) => {
              const Icon = getCheatingIcon(flag.type)
              const colorClass = getCheatingColor(flag.type)
              
              return (
                <Card key={index} className="border-border/50 bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg",
                        colorClass.split(' ')[0] // Just the bg color
                      )}>
                        <Icon className={cn("h-4 w-4", colorClass.split(' ')[1])} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={cn("text-xs", colorClass)}>
                            {getCheatingFlagLabel(flag.type)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(flag.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {flag.details}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          
          <div className="flex gap-3 pt-4 border-t border-border/50">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Dismiss
            </Button>
            <Button variant="destructive" className="flex-1">
              Flag for Review
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook for managing modal state
export function useCheatingModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedApplicant, setSelectedApplicant] = useState<{
    name: string
    flags: CheatingFlag[]
  } | null>(null)

  const openModal = (applicantName: string, cheatingFlags: CheatingFlag[]) => {
    setSelectedApplicant({ name: applicantName, flags: cheatingFlags })
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
    setSelectedApplicant(null)
  }

  return {
    isOpen,
    selectedApplicant,
    openModal,
    closeModal,
  }
}
