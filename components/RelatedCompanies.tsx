import Link from 'next/link'
import CompanyLogo from '@/components/CompanyLogo'

interface RelatedCompany {
  id: string
  name: string
  slug: string
  category: string | null
  description: string | null
  logo_color: string | null
  logo_url: string | null
}

interface Props {
  companies: RelatedCompany[]
}

export default function RelatedCompanies({ companies }: Props) {
  if (!companies || companies.length === 0) return null

  return (
    <div style={{ marginTop: '40px', paddingTop: '32px', borderTop: '1px solid #E4E4E7' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#09090B', marginBottom: '16px', letterSpacing: '-0.02em' }}>
        Related Companies
      </h2>

      <div className="related-companies-grid">
        {companies.map(company => (
          <Link
            key={company.id}
            href={`/company/${company.slug}`}
            style={{ textDecoration: 'none' }}
          >
            <div
              className="related-company-card"
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                padding: '14px 16px',
                background: '#fff',
                border: '1px solid #E4E4E7',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = '#a8cbe8'
                el.style.boxShadow = '0 4px 16px rgba(6,63,118,0.1)'
                el.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = '#E4E4E7'
                el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
                el.style.transform = 'translateY(0)'
              }}
            >
              <div style={{ flexShrink: 0 }}>
                <CompanyLogo name={company.name} logoUrl={company.logo_url} logoColor={company.logo_color} size={36} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#09090B', lineHeight: 1.3, marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {company.name}
                </div>
                {company.category && (
                  <div style={{ fontSize: '11.5px', color: '#A1A1AA', fontWeight: 500 }}>
                    {company.category}
                  </div>
                )}
                {company.description && (
                  <div style={{ fontSize: '12px', color: '#71717A', marginTop: '4px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {company.description}
                  </div>
                )}
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </Link>
        ))}
      </div>

      <style>{`
        .related-companies-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        @media (max-width: 900px) {
          .related-companies-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 500px) {
          .related-companies-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
