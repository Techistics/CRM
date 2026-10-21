export function formatCurrencyAmount(value: number | string, currency: string): string {
  const amount = Number(value)
  if (!Number.isFinite(amount)) {
    throw new RangeError('Currency amount must be a finite number')
  }

  const locale = currency === 'PKR' ? 'en-PK' : 'en-US'
  const formattedAmount = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  }).format(amount)

  return `${currency} ${formattedAmount}`
}
