const WORD_CHAR_PATTERN = /[A-Za-z0-9]/
const WHITESPACE_PATTERN = /\s/

function countLatinRunTokens(run: string) {
  if (!run) return 0
  return Math.max(1, Math.ceil(run.length / 4))
}

export function estimateTextTokens(text: string) {
  const normalized = text.trim()
  if (!normalized) return 0

  let tokens = 0
  let latinRun = ''

  for (const char of normalized) {
    if (WORD_CHAR_PATTERN.test(char)) {
      latinRun += char
      continue
    }

    tokens += countLatinRunTokens(latinRun)
    latinRun = ''

    if (WHITESPACE_PATTERN.test(char)) continue
    tokens += 1
  }

  tokens += countLatinRunTokens(latinRun)
  return tokens
}

export function formatTokenCount(count: number) {
  return Math.max(0, Math.round(count)).toLocaleString('en-US')
}
