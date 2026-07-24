import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { TypingDisplay } from './TypingDisplay'

describe('TypingDisplay', () => {
  it('renders one span per character', () => {
    const { container } = render(
      <TypingDisplay text="abc" charStateAt={() => 'pending'} typedLength={0} />
    )
    const wrapper = container.querySelector('[aria-hidden]')
    expect(wrapper?.children.length).toBe(3)
  })

  it('places the blinking caret at the current typed position', () => {
    const { container } = render(
      <TypingDisplay text="abc" charStateAt={(i) => (i < 1 ? 'correct' : i === 1 ? 'current' : 'pending')} typedLength={1} />
    )
    expect(container.querySelector('.animate-caret-blink')).not.toBeNull()
  })
})
