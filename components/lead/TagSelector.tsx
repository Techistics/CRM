'use client'

import * as React from 'react'
import { Check, Plus, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useToast } from '@/hooks/use-toast'

interface Tag {
  id: string
  name: string
  color: string
}

interface TagSelectorProps {
  leadId: string
  initialTags: Tag[]
}

export function TagSelector({ leadId, initialTags }: TagSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [availableTags, setAvailableTags] = React.useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = React.useState<Tag[]>(initialTags)
  const [loading, setLoading] = React.useState(false)
  const [inputValue, setInputValue] = React.useState('')
  const { toast } = useToast()

  React.useEffect(() => {
    async function fetchTags() {
      try {
        const res = await fetch('/api/tags')
        const data = await res.json()
        if (data.ok && data.data?.tags) setAvailableTags(data.data.tags)
      } catch {
        // Silently fail or handle gracefully in UI
      }
    }
    if (open) fetchTags()
  }, [open])

  const toggleTag = async (tag: Tag) => {
    const isSelected = selectedTags.some((t) => t.id === tag.id)
    const previousTags = [...selectedTags]

    // Optimistic Update
    if (isSelected) {
      setSelectedTags(selectedTags.filter((t) => t.id !== tag.id))
    } else {
      setSelectedTags([...selectedTags, tag])
    }

    try {
      if (isSelected) {
        const res = await fetch(`/api/leads/${leadId}/tags?tagId=${tag.id}`, {
          method: 'DELETE',
        })
        if (!res.ok) throw new Error('Failed to remove tag')
      } else {
        const res = await fetch(`/api/leads/${leadId}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tagId: tag.id }),
        })
        if (!res.ok) throw new Error('Failed to assign tag')
      }
    } catch {
      // Revert on error
      setSelectedTags(previousTags)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update lead tags. Please try again.',
      })
    }
  }

  const createTag = async () => {
    if (!inputValue.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: inputValue.trim(), color: '#3b82f6' }),
      })
      const data = await res.json()
      
      const newTag = data.data?.tag
      if (newTag) {
        setAvailableTags([...availableTags, newTag])
        toggleTag(newTag)
      }
      setInputValue('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred'
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {selectedTags.map((tag) => tag && (
        <Badge
          key={tag.id}
          variant="secondary"
          className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border"
          style={{ 
            backgroundColor: `${tag.color}15`, 
            color: tag.color,
            borderColor: `${tag.color}30`
          }}
        >
          <span 
            className="h-2 w-2 rounded-full flex-shrink-0 inline-block"
            style={{ backgroundColor: tag.color }}
          />
          {tag.name}
          <button
            onClick={() => toggleTag(tag)}
            className="ml-1 rounded-full outline-none focus:ring-1 focus:ring-ring"
          >
            <X className="h-3 w-3 hover:text-foreground" />
          </button>
        </Badge>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 border-dashed bg-transparent px-2 text-xs hover:bg-muted"
          >
            <Plus className="mr-1.5 h-3 w-3" />
            Add Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search or create tag..." 
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              <CommandEmpty>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-xs font-normal"
                  onClick={createTag}
                  disabled={loading}
                >
                  <Plus className="mr-2 h-3 w-3" />
                  Create &quot;{inputValue}&quot;
                </Button>
              </CommandEmpty>
              <CommandGroup>
                {availableTags.map((tag) => tag && (
                  <CommandItem
                    key={tag.id}
                    onSelect={() => toggleTag(tag)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span 
                        className="h-2 w-2 rounded-full flex-shrink-0 inline-block"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span>{tag.name}</span>
                    </div>
                    {selectedTags.some((t) => t?.id === tag.id) && (
                      <Check className="h-4 w-4" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
