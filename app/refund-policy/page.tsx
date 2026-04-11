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
        <p>ResearchOrg offers a free plan with no payment required. Paid Pro subscriptions are processed through Paddle, our authorized reseller and Merchant of Record. This policy explains when refunds are available and how to request them.</p>
        <p>By subscribing to a Pro plan, you agree to this Refund Policy as part of our <a href="/terms">Terms of Service</a>.</p>
      </div>
    ),
  },
  {
    id: 'no-refund',
    title: 'General No-Refund Policy',
    content: (
      <div className="legal-content">
        <p>All sales are final. We do not provide refunds or credits for:</p>
        <ul>
          <li>Partial billing periods after cancellation</li>
          <li>Subscription periods where the account was used</li>
          <li>Failure to cancel before a renewal date</li>
          <li>Dissatisfaction with content or data that was accessible as described</li>
        </ul>
        <p>We encourage all users to take advantage of the free plan to evaluate ResearchOrg before subscribing to Pro.</p>
      </div>
    ),
  },
  {
    id: 'exceptions',
    title: 'Exceptions & Eligible Refunds',
    content: (
      <div className="legal-content">
        <p>We will issue a full refund in the following circumstances:</p>
        <ul>
          <li><strong>Duplicate charges:</strong> If you were charged more than once for the same subscription period due to a billing error</li>
          <li><strong>Unauthorized transaction:</strong> If a charge was made without your authorization and you notify us within 14 days</li>
          <li><strong>Service unavailability:</strong> If the platform experienced extended, unplanned downtime (more than 72 consecutive hours) during a paid billing period</li>
          <li><strong>Required by law:</strong> Where consumer protection laws in your jurisdiction mandate a right of withdrawal or cooling-off period</li>
        </ul>
        <p>Refunds for eligible cases will be issued to the original payment method within 5–10 business days.</p>
      </div>
    ),
  },
  {
    id: 'cancellation',
    title: 'Cancellation',
    content: (
      <div className="legal-content">
        <p>You may cancel your Pro subscription at any time from your <a href="/settings">Account Settings</a>. Cancellation takes effect at the end of the current billing period — you will retain full Pro access until that date and will not be charged again.</p>
        <p>Cancelling does not trigger a refund for the current period. After cancellation, your account reverts to the free plan.</p>
      </div>
    ),
  },
  {
    id: 'how-to-request',
    title: 'How to Request a Refund',
    content: (
      <div className="legal-content">
        <p>To request a refund for an eligible case, email us at <strong>support@researchorg.com</strong> with:</p>
        <ul>
          <li>Your account email address</li>
          <li>The date and amount of the charge</li>
          <li>A brief description of the reason for your request</li>
        </ul>
        <p>We will respond within 3 business days. If your refund is approved, it will be processed through Paddle and reflected in your original payment method within 5–10 business days depending on your bank or card issuer.</p>
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
