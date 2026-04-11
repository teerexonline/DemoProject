'use client'

import { useEffect } from 'react'
import { initializePaddle } from '@paddle/paddle-js'

// Initialises Paddle once when the app mounts.
// Environment is 'sandbox' while using test keys; switch to 'production' when live.
export default function PaddleProvider() {
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
    if (!token) return

    initializePaddle({
      environment: 'sandbox',
      token,
      eventCallback(event) {
        console.log('[Paddle event]', event.name, event)
      },
    })
  }, [])

  return null
}
