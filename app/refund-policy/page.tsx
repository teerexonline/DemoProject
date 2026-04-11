import type { Metadata } from 'next'
import LegalLayout from '@/components/legal/LegalLayout'
import type { LegalSection } from '@/components/legal/LegalLayout'

export const metadata: Metadata = {
  title: 'Refund Policy — ResearchOrg',
  description: 'ResearchOrg refund and cancellation policy for Pro subscriptions.',
}

const sections: LegalSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    content: (
      <div className="legal-content">
        <p>ResearchOrg offers a free plan with no payment required. Paid Pro subscriptions are processed through Paddle, our authorized reseller and Merchant of Record. This policy explains our refund terms.</p>
        <p>By subscribing to a Pro plan, you agree to this Refund Policy as part of our <a href="/terms">Terms of Service</a>.</p>
      </div>
    ),
  },
  {
    id: 'refund-window',
    title: 'Refund Window',
    content: (
      <div className="legal-content">
        <p>You may request a full refund within <strong>30 days</strong> of your initial purchase or renewal. Refund requests made after 30 days will not be eligible.</p>
        <p>To request a refund, email <strong>support@researchorg.com</strong> with your account email address and the date of the charge. We will process your request within 5–10 business days.</p>
      </div>
    ),
  },
  {
    id: 'cancellation',
    title: 'Cancellation',
    content: (
      <div className="legal-content">
        <p>You may cancel your Pro subscription at any time from your <a href="/settings">Account Settings</a>. Cancellation takes effect at the end of the current billing period — you will retain full Pro access until that date and will not be charged again. After cancellation, your account reverts to the free plan.</p>
      </div>
    ),
  },
  {
    id: 'paddle',
    title: 'Paddle as Merchant of Record',
    content: (
      <div className="legal-content">
        <p>All payments are processed by <strong>Paddle.com Market Limited</strong>, which acts as the Merchant of Record for ResearchOrg subscriptions. Your payment and billing relationship is with Paddle. Paddle handles all payment processing, tax compliance, and transaction records.</p>
        <p>If you have questions about a specific charge that appears on your bank or card statement, you may also contact Paddle directly at <a href="https://www.paddle.com/help" target="_blank" rel="noopener noreferrer">paddle.com/help</a>.</p>
      </div>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to This Policy',
    content: (
      <div className="legal-content">
        <p>We may update this Refund Policy from time to time. We will post the updated policy on this page with a revised effective date. Continued use of the Service after changes are posted constitutes acceptance of the revised policy.</p>
        <p>For questions about this policy, contact us at <strong>support@researchorg.com</strong>.</p>
      </div>
    ),
  },
]

export default function RefundPolicyPage() {
  return (
    <LegalLayout
      badge="Legal"
      title="Refund Policy"
      subtitle="Our policy on refunds, cancellations, and billing for ResearchOrg Pro subscriptions."
      lastUpdated="April 11, 2026"
      effectiveDate="April 11, 2026"
      sections={sections}
    />
  )
}
