'use client'

export interface FilterCategory {
  id: string
  label: string
}

interface Props {
  categories: FilterCategory[]
  value: string
  onChange: (id: string) => void
}

export default function CategoryFilter({ categories, value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingBottom: 1 }}>
      {categories.map(cat => {
        const active = value === cat.id
        return (
          <button
            key={cat.id}
            onClick={() => onChange(cat.id)}
            style={{
              padding: '5px 13px',
              borderRadius: 6,
              border: active ? '1.5px solid #063f76' : '1.5px solid #E4E4E7',
              background: active ? '#063f76' : 'transparent',
              color: active ? '#fff' : '#52525B',
              fontSize: 12,
              fontWeight: active ? 700 : 500,
              cursor: 'pointer',
              letterSpacing: '0.01em',
              lineHeight: 1.5,
              whiteSpace: 'nowrap',
              transition: 'background 0.12s, border-color 0.12s, color 0.12s, transform 0.1s',
              userSelect: 'none',
            } as React.CSSProperties}
            onMouseEnter={e => {
              if (!active) {
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = '#F0F4FA'
                el.style.borderColor = '#B8CDE8'
                el.style.color = '#063f76'
              }
            }}
            onMouseLeave={e => {
              if (!active) {
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = 'transparent'
                el.style.borderColor = '#E4E4E7'
                el.style.color = '#52525B'
              }
            }}
            onMouseDown={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.transform = 'scale(0.96)'
            }}
            onMouseUp={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.transform = 'scale(1)'
            }}
          >
            {cat.label}
          </button>
        )
      })}
    </div>
  )
}
