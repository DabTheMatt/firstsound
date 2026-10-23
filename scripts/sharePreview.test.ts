import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const manifest = readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8')
const shareImage = readFileSync(new URL('../public/icon-1024.png', import.meta.url))

function meta(attr: 'name' | 'property', key: string): string {
  const pattern = new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]*)"`, 'i')
  const match = html.match(pattern)
  expect(match, `${attr}=${key}`).not.toBeNull()
  return match![1]
}

describe('link preview', () => {
  it('uses the name once and points Slack and Teams at the logo', () => {
    expect(html).toMatch(/<title>FIELD<\/title>/)
    expect(meta('property', 'og:title')).toBe('FIELD')
    expect(meta('name', 'twitter:title')).toBe('FIELD')

    expect(meta('name', 'description')).toBe('sound / interference / transformation')
    expect(meta('property', 'og:description')).toBe('sound / interference / transformation')
    expect(meta('name', 'twitter:description')).toBe('sound / interference / transformation')
    expect(meta('property', 'og:site_name')).toBe('dabthematt.github.io')
    expect(html).not.toContain('FIELD —')
    expect(html).not.toContain('FIELD -')

    const image = 'https://dabthematt.github.io/firstsound/icon-1024.png'
    expect(meta('property', 'og:image')).toBe(image)
    expect(meta('property', 'og:image:secure_url')).toBe(image)
    expect(meta('property', 'og:image:type')).toBe('image/png')
    expect(meta('property', 'og:image:width')).toBe('1024')
    expect(meta('property', 'og:image:height')).toBe('1024')
    expect(meta('property', 'og:image:alt')).toBe('FIELD')
    expect(meta('name', 'twitter:card')).toBe('summary')
    expect(meta('name', 'twitter:image')).toBe(image)
    expect(meta('property', 'og:url')).toBe('https://dabthematt.github.io/firstsound/')

    expect(shareImage.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    expect(shareImage.readUInt32BE(16)).toBe(1024)
    expect(shareImage.readUInt32BE(20)).toBe(1024)
  })

  it('keeps the installed app name and does not repeat it in the manifest description', () => {
    const parsed = JSON.parse(manifest) as { name: string; short_name: string; description: string }
    expect(parsed.name).toBe('FIELD')
    expect(parsed.short_name).toBe('FIELD')
    expect(parsed.description).toBe('sound / interference / transformation')
  })
})
