// Template Placeholders for feed customization
export interface TemplatePlaceholders {
  [key: string]: string
}

export function replacePlaceholders(
  template: string,
  placeholders: TemplatePlaceholders
): string {
  let result = template
  for (const [key, value] of Object.entries(placeholders)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }
  return result
}

export type { TemplatePlaceholders }
