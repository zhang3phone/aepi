import { describe, expect, it } from 'vitest'
import { buildApiUrl } from './devProxy'

describe('buildApiUrl', () => {
  it('uses the same-origin proxy prefix when API proxy is enabled', () => {
    expect(buildApiUrl('http://api.example.com/v1', 'images/edits', null, true)).toBe(
      '/api-proxy/images/edits?__target=http%3A%2F%2Fapi.example.com%2Fv1',
    )
  })

  it('keeps the v1 segment when the configured API URL does not include it', () => {
    expect(buildApiUrl('http://api.example.com', 'images/generations', null, true)).toBe(
      '/api-proxy/v1/images/generations?__target=http%3A%2F%2Fapi.example.com',
    )
  })

  it('uses a configured proxy prefix when one is available', () => {
    expect(
      buildApiUrl(
        'http://api.example.com/v1',
        'responses',
        {
          enabled: true,
          prefix: '/openai-proxy',
          target: 'http://api.example.com/v1',
          changeOrigin: true,
          secure: false,
        },
        true,
      ),
    ).toBe('/openai-proxy/responses?__target=http%3A%2F%2Fapi.example.com%2Fv1')
  })

  it('uses the configured API URL directly when API proxy is disabled', () => {
    expect(buildApiUrl('http://api.example.com/v1', 'responses', null, false)).toBe(
      'http://api.example.com/v1/responses',
    )
  })

  it('can build Chat Completions URLs without forcing a v1 segment', () => {
    expect(buildApiUrl('https://api.deepseek.com', 'chat/completions', null, false, { prefixV1: false })).toBe(
      'https://api.deepseek.com/chat/completions',
    )
  })
})
