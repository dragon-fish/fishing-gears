import JSON5 from 'json5'

export const tryParseJSON = <T = any>(str: any): T | null => {
  try {
    return JSON5.parse(str)
  } catch (e) {
    return null
  }
}
