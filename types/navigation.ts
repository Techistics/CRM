import type { LucideIcon } from 'lucide-react'

/** A navigation link shown in the main nav section of the sidebar */
export type SidebarNavLink = {
  name: string
  href: string
  icon: LucideIcon
  matchPrefix?: boolean
  /** Key used to attach a dynamic badge count; matched against `badges` prop */
  badgeKey?: string
}

/** A settings-style link with a sub-description */
export type SidebarSettingsLink = {
  name: string
  description: string
  href: string
  icon: LucideIcon
}

/** Branding config for the sidebar header */
export type SidebarBrand = {
  /** Single letter shown in the coloured logo box */
  initial: string
  /** Main title text */
  title: string
  /** Small subtitle/badge shown below the title */
  subtitle: string
}

// Legacy aliases (kept for backwards compat while migrating)
export type AdminNavLink = SidebarNavLink
export type AdminSettingsLink = SidebarSettingsLink
