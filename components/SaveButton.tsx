'use client'

import { useState, useTransition } from 'react'
import { saveCompany, unsaveCompany } from '@/app/actions/profile'

interface Props {
  companyId: string
  companyName: string
  initialSaved: boolean
  size?: 'sm' | 'md'
  logoColor?: string
}

export default function SaveButton({ companyId, companyName, initialSaved, size = 'md', logoColor = '#063f76' }: Props) {
  const [saved, setSaved] = useState(initialSaved)
  const [isPending, startTransition] = useTransition()

  function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const next = !saved
    setSaved(next) // optimistic
    startTransition(async () => {
      if (next) {
        const result = await saveCompany(companyId)
        if (result?.error) setSaved(!next)
      } else {
        const result = await unsaveCompany(companyId)
        if (result?.error) setSaved(!next)
      }
    })
  }

  const dim = size === 'sm' ? 28 : 32
  const iconSize = size === 'sm' ? 13 : 15

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      title={saved ? `Unsave ${companyName}` : `Save ${companyName}`}
      style={{
        width: dim, height: dim,
        borderRadius: 8,
        border: saved ? `1.5px solid ${logoColor}40` : '1.5px solid #E4E4E7',
        background: saved ? `${logoColor}10` : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: isPending ? 'default' : 'pointer',
        transition: 'border-color 0.15s, background 0.15s, transform 0.15s',
        flexShrink: 0,
        transform: isPending ? 'scale(0.9)' : 'scale(1)',
      }}
      onMouseEnter={e => {
        if (!isPending) {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = saved ? `${logoColor}60` : '#D4D4D8'
          el.style.background = saved ? `${logoColor}18` : '#F7F7F8'
          el.style.transform = 'scale(1.08)'
        }
      }}
      onMouseLeave={e => {
        if (!isPending) {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = saved ? `${logoColor}40` : '#E4E4E7'
          el.style.background = saved ? `${logoColor}10` : '#fff'
          el.style.transform = 'scale(1)'
        }
      }}
    >
      <svg
        width={iconSize} height={iconSize}
        viewBox="0 0 24 24"
        fill={saved ? logoColor : 'none'}
        stroke={saved ? logoColor : '#A1A1AA'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: 'fill 0.15s, stroke 0.15s' }}
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
    </button>
  )
}
