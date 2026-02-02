import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

export default function Privacy() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1 py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 2026</p>
          
          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                GapNight ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services. By using GapNight, you consent to the practices described in this policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Account Information:</strong> Name, email address, phone number, and password when you create an account</li>
                <li><strong>Booking Information:</strong> Travel dates, guest details, special requests, and payment information</li>
                <li><strong>Communication Data:</strong> Messages you send to us or hotels through our platform</li>
                <li><strong>Waitlist Information:</strong> Email address and preferred city when you join our waitlist</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4 mb-3">
                We also collect information automatically, including:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Device Information:</strong> Browser type, operating system, and device identifiers</li>
                <li><strong>Usage Data:</strong> Pages visited, search queries, and interaction with our services</li>
                <li><strong>Location Data:</strong> General location based on IP address</li>
                <li><strong>Cookies:</strong> Data collected through cookies and similar technologies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Process and manage your bookings</li>
                <li>Send booking confirmations and updates</li>
                <li>Provide customer support</li>
                <li>Personalize your experience and show relevant deals</li>
                <li>Send promotional communications (with your consent)</li>
                <li>Improve our services and develop new features</li>
                <li>Detect and prevent fraud</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Information Sharing</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We may share your information with:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Hotels:</strong> To process your bookings and fulfill your reservations</li>
                <li><strong>Payment Processors:</strong> To securely process your payments</li>
                <li><strong>Service Providers:</strong> Who assist us in operating our platform (e.g., hosting, analytics)</li>
                <li><strong>Legal Authorities:</strong> When required by law or to protect our rights</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                We do not sell your personal information to third parties for marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement appropriate technical and organizational measures to protect your personal information. This includes encryption of sensitive data, secure servers, and regular security assessments. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Cookies and Tracking</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We use cookies and similar technologies to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Keep you logged in to your account</li>
                <li>Remember your preferences</li>
                <li>Analyze how our service is used</li>
                <li>Deliver relevant advertisements</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                You can control cookies through your browser settings. Disabling cookies may affect the functionality of our service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Under Australian Privacy Law, you have the right to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your personal information</li>
                <li>Opt-out of marketing communications</li>
                <li>Lodge a complaint with the Office of the Australian Information Commissioner</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                To exercise these rights, please contact us at the email address below.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your personal information for as long as necessary to provide our services and fulfill the purposes described in this policy. Booking records are retained for seven years for legal and accounting purposes. You may request deletion of your account at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Third-Party Links</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our service may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to read the privacy policies of any third-party sites you visit.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Children's Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of the service after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about this Privacy Policy or our data practices, please contact us at{" "}
                <a href="mailto:info@gapnight.com" className="text-primary hover:underline">
                  info@gapnight.com
                </a>
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                GapNight<br />
                Melbourne, Australia
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
