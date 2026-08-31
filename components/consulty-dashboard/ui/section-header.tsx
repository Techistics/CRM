import { cn } from '@/lib/utils'

type SectionHeaderProps = {
  title: string
  className?: string
  children?: React.ReactNode
}

export function SectionHeader({ title, className, children }: SectionHeaderProps) {
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-3', className)}>
      <h2 className="text-lg font-semibold leading-tight text-consulty-text-primary">{title}</h2>
      {children}
    </div>
  )
}
