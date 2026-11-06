import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import { App } from './App'

it('tracks the current workflow route', async () => {
  render(<MemoryRouter initialEntries={['/setup']}><App /></MemoryRouter>)
  expect(screen.getByText('1. Setup orders').closest('[aria-current]')?.getAttribute('aria-current')).toBe('step')
  expect(await screen.findByRole('heading', { name: 'Prepare demo orders' })).toBeTruthy()
})
