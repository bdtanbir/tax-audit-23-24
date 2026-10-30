import rows from './data/tins.json'

export const records = rows

// TIN -> record, for instant exact lookups
export const byTin = new Map(rows.map((r) => [r.tin, r]))

export const circles = [...new Set(rows.map((r) => r.circle))].sort()

const BN_DIGITS = '০১২৩৪৫৬৭৮৯'

// Convert Bangla digits to English and drop everything that is not a digit
export function normalizeTin(input) {
  return String(input || '')
    .replace(/[০-৯]/g, (d) => BN_DIGITS.indexOf(d))
    .replace(/\D/g, '')
}

// Show TIN as 1234 5678 9012 for easier reading
export function formatTin(tin) {
  return tin.replace(/(\d{4})(?=\d)/g, '$1 ')
}

export function toCsv(list) {
  const head = 'id,assessment_year,zone_name,circle_name,tin'
  const body = list.map((r) => [r.id, r.year, r.zone, `"${r.circle}"`, r.tin].join(','))
  return [head, ...body].join('\n')
}

export function downloadCsv(list, name) {
  const blob = new Blob([toCsv(list)], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}
