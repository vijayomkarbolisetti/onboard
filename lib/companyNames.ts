interface CompanySource {
  companyName?: string
  organization?: string
}

export function collectCompanyNames(sources: CompanySource[]): string[] {
  const names = new Set<string>()

  for (const source of sources) {
    const company = source.companyName?.trim()
    const organization = source.organization?.trim()
    if (company) names.add(company)
    if (organization) names.add(organization)
  }

  return Array.from(names).sort((a, b) => a.localeCompare(b))
}
