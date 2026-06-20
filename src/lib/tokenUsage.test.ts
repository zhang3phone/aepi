import { describe, expect, it } from 'vitest'
import { estimateTextTokens, formatTokenCount } from './tokenUsage'

describe('token usage estimator', () => {
  it('returns zero for blank text', () => {
    expect(estimateTextTokens('   \n\t')).toBe(0)
  })

  it('estimates latin text by rough four-character chunks', () => {
    expect(estimateTextTokens('Premium Amazon image')).toBe(6)
  })

  it('counts cjk characters individually', () => {
    expect(estimateTextTokens('云羿智能图形处理中心')).toBe(10)
  })

  it('formats token counts for display', () => {
    expect(formatTokenCount(12345)).toBe('12,345')
  })
})
