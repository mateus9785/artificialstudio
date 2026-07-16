const DIACRITICS_REGEX = new RegExp('[\\u0300-\\u036f]', 'g')

export function slugify(text) {
  return (text || '')
    .toString()
    .normalize('NFD')
    .replace(DIACRITICS_REGEX, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
