interface CompanySource {
  companyName?: string
  organization?: string
}

function addNames(names: Set<string>, value?: string) {
  if (!value?.trim()) return
  for (const part of value.split(',')) {
    const trimmed = part.trim()
    if (trimmed) names.add(trimmed)
  }
}

export function collectCompanyNames(sources: CompanySource[]): string[] {
  const names = new Set<string>()

  for (const source of sources) {
    addNames(names, source.companyName)
    addNames(names, source.organization)
  }

  return Array.from(names).sort((a, b) => a.localeCompare(b))
}
