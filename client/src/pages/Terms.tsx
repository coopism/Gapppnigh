import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

export default function Terms() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1 py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 2026</p>
          
          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using GapNight ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service. We reserve the right to modify these terms at any time, and your continued use of the Service constitutes acceptance of any changes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                GapNight is an online marketplace that connects travellers with hotels offering discounted "gap night" accommodations. Gap nights are unsold room nights between existing bookings that hotels offer at reduced rates. We act as an intermediary platform and do not own, operate, or manage any hotel properties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                To access certain features of the Service, you may be required to create an account. You agree to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Provide accurate and complete information when creating your account</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
                <li>Accept responsibility for all activities that occur under your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Bookings and Payments</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                When you make a booking through GapNight:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>You are entering into a direct contractual relationship with the hotel</li>
                <li>All prices displayed are in Australian Dollars (AUD) unless otherwise stated</li>
                <li>Payment is processed securely through our payment partners</li>
                <li>Booking confirmations will be sent to the email address you provide</li>
                <li>Cancellation policies vary by hotel and are displayed before booking</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Cancellations and Refunds</h2>
              <p className="text-muted-foreground leading-relaxed">
                Cancellation policies are set by individual hotels and displayed on each listing. Due to the nature of gap night deals (last-minute, discounted inventory), many bookings may be non-refundable. Please review the cancellation policy carefully before completing your booking. Refunds, where applicable, will be processed according to the hotel's stated policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. User Conduct</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                You agree not to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Use the Service for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to any part of the Service</li>
                <li>Interfere with the proper operation of the Service</li>
                <li>Submit false or misleading information</li>
                <li>Use automated systems to access the Service without permission</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                All content on the Service, including text, graphics, logos, and software, is the property of GapNight or its licensors and is protected by Australian and international copyright laws. You may not reproduce, distribute, or create derivative works from this content without our express written permission.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                To the fullest extent permitted by law, GapNight shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability shall not exceed the amount paid by you for bookings in the twelve months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Disclaimer</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service is provided "as is" without warranties of any kind. We do not guarantee the accuracy of hotel listings, availability, or pricing. Hotel amenities, photos, and descriptions are provided by the hotels and we are not responsible for any discrepancies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of Victoria, Australia. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Victoria.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at{" "}
                <a href="mailto:info@gapnight.com" className="text-primary hover:underline">
                  info@gapnight.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
