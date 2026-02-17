import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Shield, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function BookingPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/deals" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold font-display">Booking & Liability Policy</h1>
        </div>

        <p className="text-sm text-muted-foreground mb-8">
          Last updated: 17 February 2026. This policy forms a legally binding agreement between you ("Guest"), the property owner ("Host"), and GapNight Pty Ltd ABN [to be inserted] ("GapNight", "we", "us"). By completing a booking on GapNight, you acknowledge that you have read, understood, and agree to be bound by this policy in its entirety.
        </p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">

          <section>
            <h2 className="text-xl font-bold">1. Definitions</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              <li><strong>"Booking"</strong> means a confirmed reservation for accommodation at a Host's property made through the GapNight platform.</li>
              <li><strong>"Property"</strong> means the accommodation listed on GapNight by the Host.</li>
              <li><strong>"Guest"</strong> means the individual who makes a Booking and any persons staying at the Property during the Booking period.</li>
              <li><strong>"Host"</strong> means the owner or authorised manager of the Property listed on GapNight.</li>
              <li><strong>"Damage"</strong> means any physical damage, loss, theft, excessive cleaning requirements, or deterioration to the Property, its contents, fixtures, fittings, or surrounding areas beyond normal wear and tear.</li>
              <li><strong>"Platform"</strong> means the GapNight website, mobile application, and all associated services.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold">2. Guest Responsibilities & Duty of Care</h2>
            <p className="text-sm text-muted-foreground">By making a Booking, the Guest agrees to:</p>
            <ol className="list-[lower-alpha] pl-5 space-y-1 text-sm text-muted-foreground">
              <li>Treat the Property with reasonable care and respect, maintaining it in substantially the same condition as at check-in.</li>
              <li>Comply with all house rules, check-in/check-out times, and maximum occupancy limits specified in the listing.</li>
              <li>Not engage in any illegal activity on the Property.</li>
              <li>Not sub-let, assign, or transfer the Booking to any third party without the Host's prior written consent.</li>
              <li>Not host parties, events, or gatherings exceeding the stated maximum occupancy unless expressly authorised by the Host.</li>
              <li>Promptly report any pre-existing damage or maintenance issues to the Host and GapNight upon check-in.</li>
              <li>Promptly notify the Host and GapNight of any damage, breakage, or incident that occurs during the stay.</li>
              <li>Ensure all members of the Guest's party comply with this policy.</li>
              <li>Vacate the Property by the stated check-out time. Late check-out without Host approval may incur additional charges.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold">3. Damage Liability & Financial Responsibility</h2>
            <ol className="list-[lower-alpha] pl-5 space-y-2 text-sm text-muted-foreground">
              <li><strong>Personal liability.</strong> The Guest is personally and financially liable for any Damage to the Property caused by the Guest, any member of the Guest's party, or any person the Guest permits to enter the Property during the Booking period.</li>
              <li><strong>Scope of liability.</strong> This includes but is not limited to: damage to furniture, appliances, fixtures, fittings, walls, floors, windows, doors, linens, kitchenware, electronics, outdoor areas, gardens, pools, and any common areas.</li>
              <li><strong>Assessment.</strong> Damage will be assessed by the Host and, where disputed, by an independent assessor appointed by GapNight. The cost of the independent assessment shall be borne by the party whose position is not upheld.</li>
              <li><strong>Damage claim process.</strong> The Host must submit a damage claim with photographic evidence within 14 days of the Guest's check-out. GapNight will notify the Guest and provide 7 days to respond before any charge is processed.</li>
              <li><strong>Payment.</strong> If a damage claim is upheld, GapNight is authorised to charge the Guest's payment method on file for the reasonable cost of repair or replacement. If the payment method on file is insufficient, the Guest agrees to pay the outstanding amount within 14 days of written demand.</li>
              <li><strong>No cap on liability.</strong> The Guest's liability for Damage is not limited to the Booking value and extends to the full reasonable cost of repair or replacement at current market value, less fair depreciation.</li>
              <li><strong>Excessive cleaning.</strong> If the Property requires cleaning beyond what is reasonably expected (e.g., stains, odours, biohazards, rubbish), the Guest may be charged an additional cleaning fee as determined by the Host, subject to GapNight's review for reasonableness.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold">4. Stolen or Missing Items</h2>
            <p className="text-sm text-muted-foreground">
              The Guest is liable for any items reported stolen or missing from the Property during the Booking period. The Host must provide an inventory or photographic evidence of the item(s) prior to the Guest's stay. GapNight reserves the right to report suspected theft to law enforcement authorities and to share Guest identification information with police upon lawful request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">5. Cancellation & Refund Policy</h2>
            <ol className="list-[lower-alpha] pl-5 space-y-1 text-sm text-muted-foreground">
              <li><strong>Guest cancellation more than 48 hours before check-in:</strong> Full refund minus a $25 AUD administrative fee.</li>
              <li><strong>Guest cancellation within 48 hours of check-in:</strong> 50% refund of the nightly rate. Cleaning fee and service fee are non-refundable.</li>
              <li><strong>Guest no-show:</strong> No refund.</li>
              <li><strong>Host cancellation:</strong> Full refund to the Guest. The Host may be subject to penalties as outlined in the Host Agreement.</li>
              <li><strong>Early departure:</strong> No refund for unused nights unless the Host agrees in writing.</li>
              <li><strong>Force majeure:</strong> In the event of circumstances beyond either party's reasonable control (natural disaster, government-imposed restrictions, pandemic), GapNight will facilitate a resolution which may include a full or partial refund or rebooking credit at GapNight's discretion.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold">6. Payment Terms</h2>
            <ol className="list-[lower-alpha] pl-5 space-y-1 text-sm text-muted-foreground">
              <li>Upon Booking, the Guest's payment method is authorised (held) for the total Booking amount.</li>
              <li>Payment is captured only when the Host approves the Booking request.</li>
              <li>If the Host does not respond within 24 hours, the authorisation is released and the Booking is cancelled.</li>
              <li>The GapNight service fee (currently 8% of the nightly rate) is non-refundable except in cases of Host cancellation or platform error.</li>
              <li>All prices are displayed and charged in Australian Dollars (AUD) unless otherwise stated.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold">7. Insurance & Indemnity</h2>
            <ol className="list-[lower-alpha] pl-5 space-y-2 text-sm text-muted-foreground">
              <li><strong>Guest indemnity.</strong> The Guest agrees to indemnify and hold harmless GapNight, its directors, officers, employees, and agents from and against any claims, losses, damages, liabilities, and expenses (including reasonable legal fees) arising out of or in connection with the Guest's use of the Property, breach of this policy, or any negligent or wrongful act or omission.</li>
              <li><strong>Host indemnity.</strong> The Host agrees to indemnify and hold harmless GapNight from claims arising from the condition of the Property, misrepresentation in the listing, or failure to comply with applicable laws and regulations.</li>
              <li><strong>Travel insurance.</strong> GapNight strongly recommends that all Guests obtain comprehensive travel insurance covering trip cancellation, personal liability, medical expenses, and personal belongings for the duration of their stay.</li>
              <li><strong>GapNight's role.</strong> GapNight acts as an intermediary platform connecting Guests and Hosts. GapNight does not own, manage, or control any Property and is not liable for the condition, safety, legality, or suitability of any Property listed on the Platform.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold">8. Dispute Resolution</h2>
            <ol className="list-[lower-alpha] pl-5 space-y-1 text-sm text-muted-foreground">
              <li><strong>Direct resolution.</strong> Guests and Hosts are encouraged to resolve disputes directly in the first instance.</li>
              <li><strong>GapNight mediation.</strong> If direct resolution fails, either party may request GapNight to mediate the dispute. GapNight will review evidence from both parties and issue a determination within 14 business days.</li>
              <li><strong>GapNight's determination.</strong> GapNight's determination in a mediated dispute is final and binding on both parties to the extent permitted by law, unless the dispute is escalated to an external body.</li>
              <li><strong>External resolution.</strong> Nothing in this policy limits either party's right to pursue resolution through applicable consumer protection bodies, small claims tribunals, or courts of competent jurisdiction.</li>
              <li><strong>Governing law.</strong> This policy is governed by the laws of the State of New South Wales, Australia. The parties submit to the non-exclusive jurisdiction of the courts of New South Wales.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold">9. Safety & Compliance</h2>
            <ol className="list-[lower-alpha] pl-5 space-y-1 text-sm text-muted-foreground">
              <li>Guests must comply with all applicable local, state, and federal laws during their stay.</li>
              <li>Smoking is prohibited in all Properties unless the listing explicitly states otherwise.</li>
              <li>Pets are only permitted where the listing explicitly allows them.</li>
              <li>The Guest must not tamper with or disable any safety equipment (smoke detectors, fire extinguishers, security cameras in common areas, etc.).</li>
              <li>GapNight reserves the right to immediately cancel a Booking and remove a Guest from the Platform for any violation of this policy, without refund.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold">10. Privacy & Data</h2>
            <p className="text-sm text-muted-foreground">
              Guest personal information is collected and processed in accordance with the GapNight <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a> and the Australian Privacy Act 1988 (Cth). Guest identification information may be shared with the Host for the purpose of the Booking and with law enforcement upon lawful request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">11. Amendments</h2>
            <p className="text-sm text-muted-foreground">
              GapNight reserves the right to amend this policy at any time. Material changes will be communicated to registered users via email at least 14 days before taking effect. Continued use of the Platform after the effective date constitutes acceptance of the amended policy. The version of this policy in effect at the time of Booking shall apply to that Booking.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">12. Severability</h2>
            <p className="text-sm text-muted-foreground">
              If any provision of this policy is found to be invalid, illegal, or unenforceable by a court of competent jurisdiction, the remaining provisions shall continue in full force and effect. The invalid provision shall be modified to the minimum extent necessary to make it valid and enforceable while preserving its original intent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">13. Entire Agreement</h2>
            <p className="text-sm text-muted-foreground">
              This policy, together with the GapNight Terms of Service and Privacy Policy, constitutes the entire agreement between the parties regarding the subject matter hereof and supersedes all prior or contemporaneous communications, representations, or agreements, whether oral or written.
            </p>
          </section>

          <section className="bg-muted/50 rounded-xl p-5 border border-border/50">
            <h2 className="text-lg font-bold mb-2">Contact</h2>
            <p className="text-sm text-muted-foreground">
              For questions about this policy, damage claims, or disputes, contact us at:<br />
              <strong>Email:</strong> support@gapnight.com<br />
              <strong>Address:</strong> GapNight Pty Ltd, Sydney, NSW, Australia
            </p>
          </section>

        </div>
      </main>
      <Footer />
    </div>
  );
}
