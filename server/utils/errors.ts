export type DbConstraintError = {
  code: string
  message: string
}

export const isDbConstraintError = (
  error: unknown,
): error is DbConstraintError => {
  if (typeof error !== 'object' || error === null) return false

  const value = error as Record<string, unknown>

  return (
    typeof value.code === 'string' &&
    typeof value.message === 'string' &&
    value.code.startsWith('SQLITE_CONSTRAINT')
  )
}
