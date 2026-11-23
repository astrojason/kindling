import { describe, expect, it } from 'vitest'
import { buildDraftPrompt, buildSystemPrompt } from './notes-prompts'

const NOTE_CTX = { what_it_said: 'WHAT_TEXT', why_it_matters: 'WHY_TEXT', application: 'APP_TEXT' }

describe('buildSystemPrompt', () => {
  it('injects all three note fields into the prompt', () => {
    const prompt = buildSystemPrompt(NOTE_CTX)
    expect(prompt).toContain('WHAT_TEXT')
    expect(prompt).toContain('WHY_TEXT')
    expect(prompt).toContain('APP_TEXT')
  })

  it('includes the SESSION_COMPLETE instruction', () => {
    const prompt = buildSystemPrompt(NOTE_CTX)
    expect(prompt).toContain('SESSION_COMPLETE')
  })

  it('shows current main question count and 5-question cap', () => {
    const prompt = buildSystemPrompt(NOTE_CTX, 4)
    expect(prompt).toContain('3 of 5')
  })

  it('identifies the opener as question 0 when count is 0', () => {
    const prompt = buildSystemPrompt(NOTE_CTX)
    expect(prompt).toMatch(/question 0|opener/i)
  })

  it('includes both exit conditions — comprehension and question cap', () => {
    const prompt = buildSystemPrompt(NOTE_CTX, 0)
    expect(prompt).toMatch(/comprehension/i)
    expect(prompt).toMatch(/5/i)
  })

  it('includes RATING:X instruction', () => {
    const prompt = buildSystemPrompt(NOTE_CTX)
    expect(prompt).toContain('RATING:X')
  })

  it('issues a hard stop when questionCount reaches 6 (after 5 main questions)', () => {
    const prompt = buildSystemPrompt(NOTE_CTX, 6)
    expect(prompt).toMatch(/do not ask any more questions/i)
  })

  it('enforces exactly one question per turn', () => {
    const prompt = buildSystemPrompt(NOTE_CTX, 0)
    expect(prompt).toMatch(/one question per turn/i)
  })

  it('constrains scope strictly to the note content', () => {
    const prompt = buildSystemPrompt(NOTE_CTX, 0)
    expect(prompt).toMatch(/strictly within/i)
  })
})

describe('buildDraftPrompt', () => {
  it('includes the article title and body', () => {
    const prompt = buildDraftPrompt('My Title', 'Body text here')
    expect(prompt).toContain('My Title')
    expect(prompt).toContain('Body text here')
  })

  it('asks for the four required JSON fields', () => {
    const prompt = buildDraftPrompt('T', 'B')
    expect(prompt).toContain('what_it_said')
    expect(prompt).toContain('why_it_matters')
    expect(prompt).toContain('application')
    expect(prompt).toContain('tag')
  })
})
