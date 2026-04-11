import LegalLayout from '@/components/legal/LegalLayout'
import type { LegalSection } from '@/components/legal/LegalLayout'

const sections: LegalSection[] = [
  {
    id: 'agreement',
    title: 'Agreement to Terms',
    content: (
      <div className="legal-content">
        <p>These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the ResearchOrg platform (&ldquo;Service&rdquo;) operated by ResearchOrg, Inc. (&ldquo;ResearchOrg,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;).</p>
        <p>By creating an account or accessing the Service, you confirm that you are at least 16 years old, have read and understood these Terms, and agree to be bound by them. If you are using the Service on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.</p>
        <p>If you do not agree to these Terms, do not use the Service.</p>
      </div>
    ),
  },
  {
    id: 'description',
    title: 'Description of the Service',
    content: (
      <div className="legal-content">
        <p>ResearchOrg is a company research platform designed to help job seekers prepare for interviews and employment decisions. The Service provides access to information about companies, including organizational structures, financial data, internal tooling, and interview preparation content.</p>
        <p>The content on ResearchOrg is compiled from publicly available sources, user contributions, and third-party data providers. We make reasonable efforts to ensure accuracy but do not warrant the completeness, timeliness, or fitness of the information for any specific purpose.</p>
        <p>We reserve the right to modify, suspend, or discontinue any part of the Service at any time with reasonable notice.</p>
      </div>
    ),
  },
  {
    id: 'accounts',
    title: 'Account Registration',
    content: (
      <div className="legal-content">
        <p>To access most features of the Service, you must create an account. When registering, you agree to:</p>
        <ul>
          <li>Provide accurate, current, and complete information</li>
          <li>Keep your login credentials confidential and not share them with others</li>
          <li>Notify us immediately of any unauthorized access to your account at <strong>support@researchorg.com</strong></li>
          <li>Be responsible for all activity that occurs under your account</li>
        </ul>
        <p>We reserve the right to terminate or suspend accounts that violate these Terms, provide false information, or engage in abuse of the Service.</p>
        <p>You may only create one account per person. Creating duplicate accounts to circumvent plan limits is prohibited and may result in permanent suspension.</p>
      </div>
    ),
  },
  {
    id: 'subscriptions',
    title: 'Subscriptions & Payments',
    content: (
      <div className="legal-content">
        <p><strong>Free Plan:</strong> All users have access to a free plan that includes one full company profile view per month and limited previews for all other companies. The monthly allowance resets on a rolling 30-day basis from your account creation date.</p>
        <p><strong>Pro Plan:</strong> Paid subscriptions are billed in advance on a monthly, annual, or multi-year basis as selected. Pro plans provide unlimited access to all company profiles and premium features.</p>
        <p><strong>Billing:</strong> Payments are processed by Paddle.com Market Limited, which acts as Merchant of Record. By providing payment information, you authorize Paddle to charge the selected payment method for the applicable subscription fee. All prices are in USD and exclusive of any applicable taxes.</p>
        <p><strong>Cancellation & Refunds:</strong> You may cancel your subscription at any time from your Account Settings. Cancellation takes effect at the end of the current billing period. Refunds are governed by our <a href="/refund-policy">Refund Policy</a>.</p>
        <p><strong>Price changes:</strong> We will provide at least 30 days&apos; notice before any price changes take effect for existing subscribers.</p>
        <p><strong>Failed payments:</strong> If a payment fails, we will attempt to retry the charge. After three failed attempts, your account will be downgraded to the Free plan and access to Pro features will be suspended until payment is resolved.</p>
      </div>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable Use',
    content: (
      <div className="legal-content">
        <p>You agree to use the Service only for lawful purposes and in accordance with these Terms. You must not:</p>
        <ul>
          <li>Scrape, crawl, or systematically extract data from the Service using automated means</li>
          <li>Reproduce, redistribute, sell, or sublicense any content from the Service without our written permission</li>
          <li>Circumvent any access controls, usage limits, or security features</li>
          <li>Use the Service to harass, defame, or harm any individual or organization</li>
          <li>Upload or transmit malware, viruses, or any malicious code</li>
          <li>Attempt to reverse-engineer, decompile, or disassemble any part of the Service</li>
          <li>Impersonate any person or entity, or misrepresent your affiliation with any person or entity</li>
          <li>Use the Service in a way that could damage, disable, or impair our infrastructure</li>
        </ul>
        <p>Violation of these restrictions may result in immediate termination of your account and, where applicable, legal action.</p>
      </div>
    ),
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual Property',
    content: (
      <div className="legal-content">
        <p><strong>Our content:</strong> The Service and its original content, features, design, and functionality are owned by ResearchOrg, Inc. and protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, or create derivative works from our platform or content without express written permission.</p>
        <p><strong>Company data:</strong> Information about companies displayed on the Service is compiled from publicly available sources. ResearchOrg does not claim ownership of facts or public information, but does claim rights in the curation, structure, and presentation of that information.</p>
        <p><strong>Feedback:</strong> If you submit feedback, suggestions, or ideas about the Service, you grant us an irrevocable, perpetual, royalty-free license to use that feedback for any purpose without compensation to you.</p>
        <p><strong>Your content:</strong> You retain ownership of any content you submit to the Service. By submitting content, you grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute that content in connection with operating the Service.</p>
      </div>
    ),
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers',
    content: (
      <div className="legal-content">
        <p>THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.</p>
        <p>We do not warrant that:</p>
        <ul>
          <li>Company information displayed is accurate, complete, or current</li>
          <li>The Service will be uninterrupted, error-free, or free from viruses</li>
          <li>Results obtained from using the Service will meet your expectations</li>
          <li>Any interview preparation content will result in a job offer or positive outcome</li>
        </ul>
        <p>Company data is provided for informational and research purposes only. Do not rely solely on ResearchOrg data for material business or employment decisions without independent verification.</p>
      </div>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of Liability',
    content: (
      <div className="legal-content">
        <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, RESEARCHORG, INC. AND ITS DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES — INCLUDING LOST PROFITS, LOST DATA, OR BUSINESS INTERRUPTION — ARISING FROM YOUR USE OF THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</p>
        <p>OUR TOTAL CUMULATIVE LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATED TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO RESEARCHORG IN THE 12 MONTHS PRECEDING THE CLAIM, OR (B) $50 USD.</p>
        <p>Some jurisdictions do not allow limitation of implied warranties or exclusion of certain damages, so some of the above limitations may not apply to you.</p>
      </div>
    ),
  },
  {
    id: 'indemnification',
    title: 'Indemnification',
    content: (
      <div className="legal-content">
        <p>You agree to indemnify, defend, and hold harmless ResearchOrg, Inc. and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of or in connection with:</p>
        <ul>
          <li>Your use of the Service in violation of these Terms</li>
          <li>Your violation of any applicable law or third-party rights</li>
          <li>Any content you submit to the Service</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'termination',
    title: 'Termination',
    content: (
      <div className="legal-content">
        <p><strong>By you:</strong> You may delete your account at any time from Account Settings. Deleting your account will cancel any active subscription at the end of the current billing period and result in permanent deletion of your data within 30 days.</p>
        <p><strong>By us:</strong> We may suspend or terminate your access to the Service at any time, with or without cause, with reasonable notice except where immediate termination is necessary to prevent harm, fraud, or legal liability. If we terminate your account without cause, we will provide a pro-rated refund for any unused prepaid subscription period.</p>
        <p>Upon termination, all licenses granted to you under these Terms will immediately cease, and you must stop using the Service.</p>
      </div>
    ),
  },
  {
    id: 'governing-law',
    title: 'Governing Law & Disputes',
    content: (
      <div className="legal-content">
        <p>These Terms are governed by the laws of the State of California, United States, without regard to its conflict of law provisions.</p>
        <p><strong>Informal resolution:</strong> Before filing any legal action, you agree to first contact us at <strong>legal@researchorg.com</strong> and attempt to resolve the dispute informally for at least 30 days.</p>
        <p><strong>Arbitration:</strong> If informal resolution fails, disputes shall be resolved by binding individual arbitration under the American Arbitration Association&apos;s Consumer Arbitration Rules, rather than in court. Class action lawsuits and class-wide arbitration are not permitted.</p>
        <p>Notwithstanding the above, either party may seek injunctive or equitable relief in a court of competent jurisdiction to prevent actual or threatened infringement of intellectual property rights.</p>
      </div>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to Terms',
    content: (
      <div className="legal-content">
        <p>We may update these Terms from time to time. For material changes, we will provide at least 14 days&apos; notice by:</p>
        <ul>
          <li>Emailing the address on your account, and/or</li>
          <li>Displaying a banner within the Service</li>
        </ul>
        <p>Continued use of the Service after the effective date of updated Terms constitutes your acceptance. If you do not agree with the updated Terms, you must stop using the Service before the effective date.</p>
      </div>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    content: (
      <div className="legal-content">
        <p>Questions about these Terms? Contact us:</p>
        <ul>
          <li><strong>Email:</strong> legal@researchorg.com</li>
          <li><strong>Address:</strong> ResearchOrg, Inc., 548 Market St, San Francisco, CA 94104</li>
        </ul>
      </div>
    ),
  },
]

export default function TermsPage() {
  return (
    <LegalLayout
      badge="Legal"
      title="Terms of Service"
      subtitle="The rules and conditions that govern your use of ResearchOrg. Please read carefully."
      lastUpdated="April 9, 2026"
      effectiveDate="April 9, 2026"
      sections={sections}
    />
  )
}
