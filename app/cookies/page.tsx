import LegalLayout from '@/components/legal/LegalLayout'
import type { LegalSection } from '@/components/legal/LegalLayout'

const sections: LegalSection[] = [
  {
    id: 'what-are-cookies',
    title: 'What Are Cookies',
    content: (
      <div className="legal-content">
        <p>Cookies are small text files placed on your device when you visit a website. They are widely used to make websites work efficiently, remember your preferences, and provide usage information to site owners.</p>
        <p>Cookies may be &ldquo;session cookies&rdquo; (deleted when you close your browser) or &ldquo;persistent cookies&rdquo; (stored on your device for a set period or until you delete them). They may be set by the website you are visiting (&ldquo;first-party cookies&rdquo;) or by third-party services the site uses.</p>
        <p>Similar technologies include local storage, session storage, and pixels. This policy covers all such technologies collectively as &ldquo;cookies.&rdquo;</p>
      </div>
    ),
  },
  {
    id: 'how-we-use-cookies',
    title: 'How We Use Cookies',
    content: (
      <div className="legal-content">
        <p>ResearchOrg uses cookies for the following purposes:</p>
        <ul>
          <li><strong>Authentication:</strong> To keep you signed in across page loads and browser sessions.</li>
          <li><strong>Preferences:</strong> To remember settings such as your preferred plan view or display options.</li>
          <li><strong>Security:</strong> To detect and prevent fraudulent activity, CSRF attacks, and unauthorized access.</li>
          <li><strong>Analytics:</strong> To understand how users interact with the platform so we can improve it.</li>
          <li><strong>Performance:</strong> To identify and resolve technical issues, measure page load times, and optimize delivery.</li>
        </ul>
        <p>We do not use cookies for advertising targeting, behavioral profiling for sale to third parties, or any purpose not described in this policy.</p>
      </div>
    ),
  },
  {
    id: 'types-of-cookies',
    title: 'Types of Cookies We Use',
    content: (
      <div className="legal-content">
        <p><strong>Strictly Necessary Cookies</strong></p>
        <p>These cookies are essential for the Service to function and cannot be disabled without breaking core functionality. They include:</p>
        <ul>
          <li><strong>sb-access-token / sb-refresh-token:</strong> Supabase authentication tokens that maintain your logged-in session. Session cookies — expire when your browser closes or after inactivity.</li>
          <li><strong>__Host-next-auth.csrf-token:</strong> CSRF protection token to prevent cross-site request forgery attacks. Session cookie.</li>
          <li><strong>researchorg_session:</strong> Session identifier used to associate your activity with your account. Expires after 7 days of inactivity.</li>
        </ul>

        <p style={{ marginTop: 16 }}><strong>Functional Cookies</strong></p>
        <p>These cookies enable enhanced functionality and personalization. They may be set by us or third-party providers. Disabling them may affect some features.</p>
        <ul>
          <li><strong>researchorg_prefs:</strong> Stores UI preferences such as sidebar state and display settings. Persistent — expires after 1 year.</li>
          <li><strong>researchorg_viewed:</strong> Tracks which companies you have viewed to enforce monthly quota limits. Persistent — resets monthly.</li>
        </ul>

        <p style={{ marginTop: 16 }}><strong>Analytics Cookies</strong></p>
        <p>These cookies help us understand how the Service is used so we can improve it. All analytics data is aggregated and does not identify individual users.</p>
        <ul>
          <li><strong>_rorg_analytics:</strong> First-party analytics cookie tracking page views, session duration, and feature usage. Persistent — expires after 90 days.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'third-party-cookies',
    title: 'Third-Party Cookies',
    content: (
      <div className="legal-content">
        <p>Some cookies on our Service are set by third-party providers we use to operate the platform:</p>
        <ul>
          <li><strong>Stripe:</strong> When you access billing or payment pages, Stripe may set cookies to detect fraudulent activity and maintain PCI DSS compliance. These are governed by <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Stripe&apos;s Privacy Policy</a>.</li>
          <li><strong>Supabase:</strong> Our backend infrastructure provider may set technical cookies for rate limiting and security. These are governed by <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Supabase&apos;s Privacy Policy</a>.</li>
        </ul>
        <p>We do not use Google Analytics, Meta Pixel, or any advertising network cookies. We intentionally keep our third-party cookie footprint minimal.</p>
      </div>
    ),
  },
  {
    id: 'managing-cookies',
    title: 'Managing Cookies',
    content: (
      <div className="legal-content">
        <p><strong>Browser controls:</strong> Most browsers allow you to view, manage, and delete cookies through their settings. Common paths:</p>
        <ul>
          <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
          <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data</li>
          <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
          <li><strong>Edge:</strong> Settings → Cookies and site permissions → Cookies and site data</li>
        </ul>
        <p><strong>Important:</strong> Blocking strictly necessary cookies will prevent you from signing in and using the Service. We recommend blocking only analytics or functional cookies if you wish to limit tracking while maintaining full access.</p>
        <p><strong>Do Not Track:</strong> Some browsers send a &ldquo;Do Not Track&rdquo; (DNT) signal. We honor DNT signals by disabling non-essential analytics cookies when a DNT signal is detected.</p>
        <p><strong>Cookie consent:</strong> On your first visit, we display a cookie notice. You may update your preferences at any time by clicking &ldquo;Cookie Settings&rdquo; in the footer.</p>
      </div>
    ),
  },
  {
    id: 'retention',
    title: 'Cookie Retention Periods',
    content: (
      <div className="legal-content">
        <p>Different cookies are retained for different periods:</p>
        <ul>
          <li><strong>Session cookies:</strong> Deleted when you close your browser or your session expires.</li>
          <li><strong>Authentication tokens:</strong> Expire after 7 days of inactivity; refreshed automatically when you are active.</li>
          <li><strong>Preference cookies:</strong> Retained for up to 12 months.</li>
          <li><strong>Analytics cookies:</strong> Retained for up to 90 days.</li>
        </ul>
        <p>You can delete cookies at any time through your browser settings. Deleting authentication cookies will sign you out of the Service.</p>
      </div>
    ),
  },
  {
    id: 'updates',
    title: 'Updates to This Policy',
    content: (
      <div className="legal-content">
        <p>We may update this Cookie Policy as our use of cookies changes or when required by law. Material updates will be communicated by displaying a notice on the Service or by updating the &ldquo;Last updated&rdquo; date above.</p>
        <p>We encourage you to review this policy periodically to stay informed about how we use cookies.</p>
      </div>
    ),
  },
  {
    id: 'contact',
    title: 'Contact Us',
    content: (
      <div className="legal-content">
        <p>If you have questions about our use of cookies or this policy, please contact us:</p>
        <ul>
          <li><strong>Email:</strong> privacy@researchorg.com</li>
          <li><strong>Address:</strong> ResearchOrg, 2967 Dundas St W #770d, Toronto, ON M6P 1Z2</li>
        </ul>
      </div>
    ),
  },
]

export default function CookiesPage() {
  return (
    <LegalLayout
      badge="Legal"
      title="Cookie Policy"
      subtitle="What cookies we use on ResearchOrg, why we use them, and how you can control them."
      lastUpdated="April 9, 2026"
      effectiveDate="April 9, 2026"
      sections={sections}
    />
  )
}
