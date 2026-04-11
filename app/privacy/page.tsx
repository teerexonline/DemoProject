import LegalLayout from '@/components/legal/LegalLayout'
import type { LegalSection } from '@/components/legal/LegalLayout'

const sections: LegalSection[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    content: (
      <div className="legal-content">
        <p>ResearchOrg (&ldquo;ResearchOrg,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the ResearchOrg platform, accessible at researchorg.com (the &ldquo;Service&rdquo;). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.</p>
        <p>By creating an account or using the Service, you agree to the collection and use of information in accordance with this policy. If you do not agree, please do not use the Service.</p>
        <p>If you have questions, contact us at <strong>privacy@researchorg.com</strong>.</p>
      </div>
    ),
  },
  {
    id: 'information-we-collect',
    title: 'Information We Collect',
    content: (
      <div className="legal-content">
        <p><strong>Information you provide directly:</strong></p>
        <ul>
          <li><strong>Account information:</strong> Your name, email address, and password when you register.</li>
          <li><strong>Payment information:</strong> Billing details processed securely through Stripe. We do not store full card numbers — Stripe handles all payment data under PCI DSS compliance.</li>
          <li><strong>Profile information:</strong> Any optional details you choose to add to your profile.</li>
          <li><strong>Communications:</strong> Messages you send us through support or contact forms.</li>
        </ul>
        <p><strong>Information collected automatically:</strong></p>
        <ul>
          <li><strong>Usage data:</strong> Pages visited, features used, search queries, companies viewed, and time spent on the platform.</li>
          <li><strong>Device data:</strong> Browser type, operating system, IP address, and device identifiers.</li>
          <li><strong>Cookies and tracking:</strong> Session cookies, preference cookies, and analytics identifiers. See our <a href="/cookies">Cookie Policy</a> for details.</li>
        </ul>
        <p><strong>Information from third parties:</strong> If you sign in via a third-party provider (e.g., Google OAuth), we receive basic profile information such as your name and email address from that provider, subject to your settings with them.</p>
      </div>
    ),
  },
  {
    id: 'how-we-use-information',
    title: 'How We Use Your Information',
    content: (
      <div className="legal-content">
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide, operate, and maintain the Service</li>
          <li>Process transactions and manage your subscription</li>
          <li>Send transactional emails (account confirmation, password reset, billing receipts)</li>
          <li>Respond to support requests and communicate with you</li>
          <li>Monitor usage patterns to improve the platform and fix bugs</li>
          <li>Enforce our Terms of Service and prevent abuse</li>
          <li>Comply with legal obligations</li>
          <li>Send product updates and announcements (you may opt out at any time)</li>
        </ul>
        <p>We do not sell your personal data to third parties. We do not use your data to train AI or machine learning models.</p>
      </div>
    ),
  },
  {
    id: 'information-sharing',
    title: 'Information Sharing',
    content: (
      <div className="legal-content">
        <p>We share your information only in the following circumstances:</p>
        <ul>
          <li><strong>Service providers:</strong> Trusted vendors who help us operate the Service, including Supabase (database and authentication), Stripe (payments), and analytics providers. These parties process data only on our behalf and are bound by data processing agreements.</li>
          <li><strong>Legal requirements:</strong> When required by law, court order, or government authority, or when necessary to protect our rights, property, or safety.</li>
          <li><strong>Business transfers:</strong> In the event of a merger, acquisition, or sale of assets, your data may be transferred. We will notify you via email or a prominent notice on the Service before any transfer.</li>
          <li><strong>With your consent:</strong> In any other case where you have given explicit consent.</li>
        </ul>
        <p>We do not share your personal data with advertisers, data brokers, or any third party for their own marketing purposes.</p>
      </div>
    ),
  },
  {
    id: 'data-retention',
    title: 'Data Retention',
    content: (
      <div className="legal-content">
        <p>We retain your personal data for as long as your account is active or as needed to provide the Service. Specifically:</p>
        <ul>
          <li><strong>Account data:</strong> Retained for the lifetime of your account plus 30 days after deletion to allow for account recovery.</li>
          <li><strong>Usage data:</strong> Aggregated and anonymized usage statistics may be retained indefinitely; identifiable usage logs are retained for up to 12 months.</li>
          <li><strong>Billing records:</strong> Retained for 7 years to comply with financial and tax regulations.</li>
          <li><strong>Support communications:</strong> Retained for 2 years after the last interaction.</li>
        </ul>
        <p>To request deletion of your account and associated data, visit your Account Settings or email <strong>privacy@researchorg.com</strong>. We will process deletion requests within 30 days.</p>
      </div>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies & Tracking',
    content: (
      <div className="legal-content">
        <p>We use cookies and similar tracking technologies to maintain your session, remember your preferences, and understand how the Service is used. For a full breakdown of the cookies we use and how to control them, see our <a href="/cookies">Cookie Policy</a>.</p>
        <p>You can control cookie behavior through your browser settings. Note that disabling certain cookies may affect the functionality of the Service.</p>
      </div>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your Rights',
    content: (
      <div className="legal-content">
        <p>Depending on your location, you may have the following rights regarding your personal data:</p>
        <ul>
          <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
          <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data.</li>
          <li><strong>Deletion:</strong> Request deletion of your personal data (&ldquo;right to be forgotten&rdquo;).</li>
          <li><strong>Portability:</strong> Request an export of your data in a machine-readable format.</li>
          <li><strong>Objection:</strong> Object to processing of your data for direct marketing purposes.</li>
          <li><strong>Restriction:</strong> Request that we restrict processing of your data in certain circumstances.</li>
          <li><strong>Withdraw consent:</strong> Where processing is based on consent, withdraw it at any time without affecting prior processing.</li>
        </ul>
        <p>To exercise any of these rights, contact us at <strong>privacy@researchorg.com</strong>. We will respond within 30 days. For EU/EEA residents, you also have the right to lodge a complaint with your local supervisory authority.</p>
      </div>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    content: (
      <div className="legal-content">
        <p>We implement industry-standard security measures to protect your personal data, including:</p>
        <ul>
          <li>TLS/HTTPS encryption for all data in transit</li>
          <li>Encrypted storage via Supabase (PostgreSQL with row-level security)</li>
          <li>Password hashing using bcrypt</li>
          <li>Payment processing via Stripe (PCI DSS Level 1 compliant)</li>
          <li>Regular security reviews and access controls</li>
        </ul>
        <p>No method of transmission over the internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your data, we cannot guarantee absolute security. In the event of a data breach that affects your rights, we will notify you as required by applicable law.</p>
      </div>
    ),
  },
  {
    id: 'childrens-privacy',
    title: "Children's Privacy",
    content: (
      <div className="legal-content">
        <p>The Service is not directed at children under 16 years of age. We do not knowingly collect personal data from children under 16. If you become aware that a child has provided us with personal data, please contact us at <strong>privacy@researchorg.com</strong> and we will take steps to delete such information.</p>
      </div>
    ),
  },
  {
    id: 'international-transfers',
    title: 'International Data Transfers',
    content: (
      <div className="legal-content">
        <p>ResearchOrg is operated from the United States. If you are located outside the United States, your information may be transferred to and processed in the United States or other countries where our service providers operate.</p>
        <p>For transfers from the European Economic Area (EEA) or United Kingdom, we rely on appropriate safeguards such as Standard Contractual Clauses (SCCs) to ensure your data is protected in accordance with applicable law.</p>
      </div>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to This Policy',
    content: (
      <div className="legal-content">
        <p>We may update this Privacy Policy from time to time. We will notify you of material changes by:</p>
        <ul>
          <li>Sending an email to the address associated with your account, and/or</li>
          <li>Displaying a prominent notice on the Service prior to the change taking effect.</li>
        </ul>
        <p>The updated policy will be effective as of the &ldquo;Last updated&rdquo; date shown at the top of this page. Continued use of the Service after that date constitutes acceptance of the updated policy.</p>
      </div>
    ),
  },
  {
    id: 'contact',
    title: 'Contact Us',
    content: (
      <div className="legal-content">
        <p>If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:</p>
        <ul>
          <li><strong>Email:</strong> privacy@researchorg.com</li>
          <li><strong>Address:</strong> ResearchOrg, 2967 Dundas St W #770d, Toronto, ON M6P 1Z2</li>
        </ul>
        <p>We aim to respond to all privacy-related inquiries within 5 business days.</p>
      </div>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <LegalLayout
      badge="Legal"
      title="Privacy Policy"
      subtitle="How we collect, use, and protect your personal information when you use ResearchOrg."
      lastUpdated="April 9, 2026"
      effectiveDate="April 9, 2026"
      sections={sections}
    />
  )
}
