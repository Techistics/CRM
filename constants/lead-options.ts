export const COUNTRIES = [
  'Pakistan', 'United Kingdom', 'Canada', 'Australia', 
  'USA', 'UAE', 'New Zealand', 'Ireland', 'Germany', 
  'Netherlands', 'Other'
] as const

export const SOURCES = [
  'Walk-in', 'Referral', 'Website', 'Social Media', 
  'University Fair', 'Agent', 'Other'
] as const

export const CURRENCIES = ['PKR', 'USD', 'GBP', 'EUR', 'AED', 'CAD', 'AUD'] as const

export type Country = typeof COUNTRIES[number]
export type Source = typeof SOURCES[number]
export type Currency = typeof CURRENCIES[number]
