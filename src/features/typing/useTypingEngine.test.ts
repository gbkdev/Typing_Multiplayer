import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTypingEngine } from './useTypingEngine'

describe('useTypingEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with zeroed stats and pending char states', () => {
    const { result } = renderHook(() => useTypingEngine({ text: 'hello', mode: 'words' }))
    expect(result.current.stats.wpm).toBe(0)
    expect(result.current.stats.accuracy).toBe(100)
    expect(result.current.charStateAt(0)).toBe('current')
    expect(result.current.charStateAt(1)).toBe('pending')
  })

  it('marks correct and incorrect characters as typed', () => {
    const { result } = renderHook(() => useTypingEngine({ text: 'hello', mode: 'words' }))
    act(() => result.current.handleInput('hxllo'))
    expect(result.current.charStateAt(0)).toBe('correct')
    expect(result.current.charStateAt(1)).toBe('incorrect')
    expect(result.current.stats.errors).toBe(1)
  })

  it('finishes automatically in words mode once the full text is typed', () => {
    const onFinish = vi.fn()
    const { result } = renderHook(() => useTypingEngine({ text: 'hi', mode: 'words', onFinish }))
    act(() => result.current.handleInput('hi'))
    expect(result.current.isFinished).toBe(true)
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('counts down time remaining and auto-finishes at zero for time mode', () => {
    const { result } = renderHook(() => useTypingEngine({ text: 'a'.repeat(50), mode: 'time', duration: 15 }))
    act(() => result.current.handleInput('a'))
    expect(result.current.timeRemaining).toBeCloseTo(15, 0)

    act(() => {
      vi.advanceTimersByTime(15_100)
    })
    expect(result.current.isFinished).toBe(true)
  })

  it('restart clears typed input and finished state', () => {
    const { result } = renderHook(() => useTypingEngine({ text: 'hi', mode: 'words' }))
    act(() => result.current.handleInput('hi'))
    expect(result.current.isFinished).toBe(true)

    act(() => result.current.restart())
    expect(result.current.typed).toBe('')
    expect(result.current.isFinished).toBe(false)
  })
})
