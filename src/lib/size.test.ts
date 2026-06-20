import { describe, expect, it } from 'vitest'
import { getModelRequestImageSize, normalizeImageSize, normalizeStoredImageSize } from './size'

describe('image size helpers', () => {
  it('keeps user-entered custom dimensions for stored task params', () => {
    expect(normalizeStoredImageSize('970x300')).toBe('970x300')
    expect(normalizeStoredImageSize('1472x608')).toBe('1472x608')
  })

  it('uses model-compatible dimensions only for API requests', () => {
    expect(getModelRequestImageSize('970x300')).not.toBe('970x300')
    expect(getModelRequestImageSize('970x300')).toBe(normalizeImageSize('970x300'))
  })

  it('rejects invalid stored custom dimensions', () => {
    expect(normalizeStoredImageSize('970abcx300')).toBe('')
    expect(normalizeStoredImageSize('')).toBe('')
  })
})
