'use client'

import { ArrowRightLeft, ChevronDown, Download, Loader2, Trash2, UserCheck, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { Agent } from '@/types/LeadsDashboard'
import type { BulkActionsBarProps } from '@/types/leads'
import { MOVE_STAGE_OPTIONS } from '@/constants/pipeline-stages'

export type { BulkActionsBarProps }

export function BulkActionsBar({
  selectedCount,
  isAdmin,
  canDelete,
  agents,
  bulkActionLoading,
  onAssign,
  onMoveStage,
  onExport,
  onDeleteClick,
  onClearSelection,
}: BulkActionsBarProps) {
  return (
    <div
      className={cn(
        'mb-4 flex flex-wrap items-center gap-2 rounded-lg px-4 py-2.5',
        'bg-brand-light border border-brand/20',
        'animate-in slide-in-from-top-2 duration-200',
      )}
    >
      <span className="text-sm font-medium text-brand">
        {selectedCount} lead{selectedCount > 1 ? 's' : ''} selected
      </span>

      <Separator orientation="vertical" className="h-4 mx-1" />

      {isAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={bulkActionLoading}>
              <UserCheck className="h-3.5 w-3.5" />
              Assign to
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {agents.map((agent) => (
              <DropdownMenuItem key={agent.userId} onSelect={() => onAssign(agent.userId)}>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {agent.name[0]?.toUpperCase()}
                  </div>
                  <span>{agent.name}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={bulkActionLoading}>
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Move to stage
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {MOVE_STAGE_OPTIONS.map((stage) => (
            <DropdownMenuItem key={stage} onSelect={() => onMoveStage(stage)}>
              {stage.replace(/_/g, ' ')}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {isAdmin && (
        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onExport} disabled={bulkActionLoading}>
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      )}

      {(isAdmin || canDelete) && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive"
          onClick={onDeleteClick}
          disabled={bulkActionLoading}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      )}

      {bulkActionLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-1" />}

      <Button variant="ghost" size="sm" className="h-8 ml-auto" onClick={onClearSelection}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}