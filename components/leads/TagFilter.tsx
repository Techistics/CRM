// 'use client'

// import * as React from 'react'
// import { useRouter, useSearchParams } from 'next/navigation'
// import { Check, Filter, X } from 'lucide-react'
// import { cn } from '@/lib/utils'
// import { Badge } from '@/components/ui/badge'
// import { Button } from '@/components/ui/button'
// import {
//   Command,
//   CommandEmpty,
//   CommandGroup,
//   CommandInput,
//   CommandItem,
//   CommandList,
// } from '@/components/ui/command'
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from '@/components/ui/popover'

// interface Tag {
//   id: string
//   name: string
//   color: string
// }

// export function TagFilter() {
//   const router = useRouter()
//   const searchParams = useSearchParams()
//   const [open, setOpen] = React.useState(false)
//   const [availableTags, setAvailableTags] = React.useState<Tag[]>([])
  
//   const selectedTagIds = React.useMemo(() => {
//     const tags = searchParams.get('tags')
//     return tags ? tags.split(',') : []
//   }, [searchParams])

//   React.useEffect(() => {
//     async function fetchTags() {
//       try {
//         const res = await fetch('/api/tags')
//         const data = await res.json()
//         if (data.ok && data.data?.tags) setAvailableTags(data.data.tags)
//       } catch {
//         // Handle error silently or in UI
//       }
//     }
//     fetchTags()
//   }, [])

//   const toggleTag = (tagId: string) => {
//     const params = new URLSearchParams(searchParams.toString())
//     let newTags: string[]
    
//     if (selectedTagIds.includes(tagId)) {
//       newTags = selectedTagIds.filter((id) => id !== tagId)
//     } else {
//       newTags = [...selectedTagIds, tagId]
//     }

//     if (newTags.length > 0) {
//       params.set('tags', newTags.join(','))
//     } else {
//       params.delete('tags')
//     }
//     params.set('page', '1')
//     router.push(`?${params.toString()}`)
//   }

//   const clearFilters = () => {
//     const params = new URLSearchParams(searchParams.toString())
//     params.delete('tags')
//     params.set('page', '1')
//     router.push(`?${params.toString()}`)
//   }

//   const selectedTagsCount = selectedTagIds.length

//   return (
//     <div className="flex items-center gap-2">
//       <Popover open={open} onOpenChange={setOpen}>
//         <PopoverTrigger asChild>
//           <Button
//             variant="outline"
//             size="sm"
//             className={cn(
//               "h-9 border px-3 text-xs font-medium dark:text-white text-black",
//               selectedTagsCount > 0 && "border-blue-200 bg-blue-50"
//             )}
//           >
//             Tags
//             {selectedTagsCount > 0 && (
//               <Badge
//                 variant="secondary"
//                 className="ml-2 h-5 min-w-[20px] justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white hover:bg-blue-600"
//               >
//                 {selectedTagsCount}
//               </Badge>
//             )}
//           </Button>
//         </PopoverTrigger>
//         <PopoverContent className="w-[200px] p-0" align="start">
//           <Command>
//             <CommandInput placeholder="Filter tags..." />
//             <CommandList>
//               <CommandEmpty>No tags found.</CommandEmpty>
//               <CommandGroup>
//                 {availableTags.map((tag) => tag && (
//                   <CommandItem
//                     key={tag.id}
//                     onSelect={() => toggleTag(tag.id)}
//                     className="flex items-center justify-between"
//                   >
//                     <div className="flex items-center gap-2">
//                       <span 
//                         className="h-2 w-2 rounded-full flex-shrink-0 inline-block"
//                         style={{ backgroundColor: tag.color }}
//                       />
//                       <span>{tag.name}</span>
//                     </div>
//                     {selectedTagIds.includes(tag.id) && (
//                       <Check className="h-4 w-4" />
//                     )}
//                   </CommandItem>
//                 ))}
//               </CommandGroup>
//             </CommandList>
//           </Command>
//           {selectedTagsCount > 0 && (
//             <div className="border-t p-1">
//               <Button
//                 variant="ghost"
//                 size="sm"
//                 className="w-full justify-center text-xs font-normal text-muted-foreground hover:text-foreground"
//                 onClick={clearFilters}
//               >
//                 Clear filters
//               </Button>
//             </div>
//           )}
//         </PopoverContent>
//       </Popover>

//       {selectedTagsCount > 0 && (
//         <div className="hidden flex-wrap gap-1.5 lg:flex">
//           {availableTags
//             .filter((tag) => tag && selectedTagIds.includes(tag.id))
//             .map((tag) => (
//               <Badge
//                 key={tag.id}
//                 variant="secondary"
//                 className="inline-flex h-6 items-center gap-1.5 rounded-md px-2 py-0 text-[10px] font-medium transition-all"
//                 style={{ 
//                   backgroundColor: `${tag.color}15`, 
//                   color: tag.color,
//                   border: `1px solid ${tag.color}30`
//                 }}
//               >
//                 <span 
//                   className="h-2 w-2 rounded-full flex-shrink-0 inline-block"
//                   style={{ backgroundColor: tag.color }}
//                 />
//                 {tag.name}
//                 <button
//                   onClick={() => toggleTag(tag.id)}
//                   className="group ml-1 rounded-full p-0.5 hover:bg-blue-200/50"
//                 >
//                   <X className="h-2.5 w-2.5 text-current opacity-70 group-hover:opacity-100" />
//                 </button>
//               </Badge>
//             ))}
//         </div>
//       )}
//     </div>
//   )
// }


'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
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

interface Tag {
  id: string
  name: string
  color: string
}

interface TagFilterProps {
  /**
   * Optional controlled mode. When provided (together with onChange), TagFilter
   * stops reading/writing the URL itself and instead behaves like a normal
   * controlled input — useful inside a filter sheet that batches changes
   * until an "Apply" button is clicked.
   */
  value?: string[]
  onChange?: (tagIds: string[]) => void
}

export function TagFilter({ value, onChange }: TagFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = React.useState(false)
  const [availableTags, setAvailableTags] = React.useState<Tag[]>([])

  const isControlled = value !== undefined && onChange !== undefined

  const urlTagIds = React.useMemo(() => {
    const tags = searchParams.get('tags')
    return tags ? tags.split(',') : []
  }, [searchParams])

  const selectedTagIds = isControlled ? (value as string[]) : urlTagIds

  React.useEffect(() => {
    async function fetchTags() {
      try {
        const res = await fetch('/api/tags')
        const data = await res.json()
        if (data.ok && data.data?.tags) setAvailableTags(data.data.tags)
      } catch {
        // Handle error silently or in UI
      }
    }
    fetchTags()
  }, [])

  const toggleTag = (tagId: string) => {
    const newTags = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId]

    if (isControlled) {
      onChange!(newTags)
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    if (newTags.length > 0) params.set('tags', newTags.join(','))
    else params.delete('tags')
    params.set('page', '1')
    router.push(`?${params.toString()}`)
  }

  const clearFilters = () => {
    if (isControlled) {
      onChange!([])
      return
    }
    const params = new URLSearchParams(searchParams.toString())
    params.delete('tags')
    params.set('page', '1')
    router.push(`?${params.toString()}`)
  }

  const selectedTagsCount = selectedTagIds.length

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 border px-3 text-xs font-medium dark:text-white text-black",
              selectedTagsCount > 0 && "border-blue-200 bg-blue-50"
            )}
          >
            Tags
            {selectedTagsCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 h-5 min-w-[20px] justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white hover:bg-blue-600"
              >
                {selectedTagsCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Filter tags..." />
            <CommandList>
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup>
                {availableTags.map((tag) => tag && (
                  <CommandItem
                    key={tag.id}
                    onSelect={() => toggleTag(tag.id)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full flex-shrink-0 inline-block"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span>{tag.name}</span>
                    </div>
                    {selectedTagIds.includes(tag.id) && (
                      <Check className="h-4 w-4" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          {selectedTagsCount > 0 && (
            <div className="border-t p-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-xs font-normal text-muted-foreground hover:text-foreground"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {selectedTagsCount > 0 && (
        <div className="hidden flex-wrap gap-1.5 lg:flex">
          {availableTags
            .filter((tag) => tag && selectedTagIds.includes(tag.id))
            .map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="inline-flex h-6 items-center gap-1.5 rounded-md px-2 py-0 text-[10px] font-medium transition-all"
                style={{
                  backgroundColor: `${tag.color}15`,
                  color: tag.color,
                  border: `1px solid ${tag.color}30`
                }}
              >
                <span
                  className="h-2 w-2 rounded-full flex-shrink-0 inline-block"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
                <button
                  onClick={() => toggleTag(tag.id)}
                  className="group ml-1 rounded-full p-0.5 hover:bg-blue-200/50"
                >
                  <X className="h-2.5 w-2.5 text-current opacity-70 group-hover:opacity-100" />
                </button>
              </Badge>
            ))}
        </div>
      )}
    </div>
  )
}