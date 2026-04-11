'use client'

import { useEffect, useRef } from 'react'

interface Props {
  onVerify: (token: string) => void
  onExpire?: () => void
}

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: object) => string
      reset: (widgetId: string) => void
    }
  }
}

export default function TurnstileWidget({ onVerify, onExpire }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  useEffect(() => {
    const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    if (!sitekey) return

    function renderWidget() {
      if (!containerRef.current || !window.turnstile) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey,
        theme: 'light',
        size: 'flexible',
        callback: onVerify,
        'expired-callback': onExpire,
      })
    }

    if (window.turnstile) {
      renderWidget()
      return
    }

    const existing = document.querySelector('script[data-turnstile]')
    if (!existing) {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      script.async = true
      script.dataset.turnstile = '1'
      script.onload = renderWidget
      document.head.appendChild(script)
    } else {
      existing.addEventListener('load', renderWidget)
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current)
      }
    }
  }, [onVerify, onExpire])

  return <div ref={containerRef} style={{ width: '100%' }} />
}
