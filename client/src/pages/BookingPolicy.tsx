import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Shield, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function BookingPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/stays" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold font-display">Booking & Liability Policy</h1>
        </div>

        <p className="text-sm text-muted-foreground mb-8">
          Last updated: February 2026. This policy forms a legally binding agreement between you (&ldquo;Guest&rdquo;), the property owner (&ldquo;Host&rdquo;), and GapNight Pty Ltd (&ldquo;GapNight&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). By completing a booking on GapNight, you acknowledge that you have read, understood, and agree to be bound by this policy in its entirety.
        </p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">

          <section>
            <h2 className="text-xl font-bold">1. Definitions</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
              <li><strong>&ldquo;GapNight&rdquo;</strong> means GapNight Pty Ltd, the operator of the GapNight platform accessible at gapnight.com.</li>
              <li><strong>&ldquo;Platform&rdquo;</strong> means the GapNight website, mobile application, and associated services.</li>
              <li><strong>&ldquo;Host&rdquo;</strong> means a property owner or manager who lists accommodation on the Platform.</li>
              <li><strong>&ldquo;Guest&rdquo;</strong> means a person who requests or completes a booking through the Platform.</li>
              <li><strong>&ldquo;Booking&rdquo;</strong> means a confirmed reservation of accommodation made through the Platform.</li>
              <li><strong>&ldquo;Booking Total&rdquo;</strong> means the total amount payable by the Guest for a Booking, including the nightly rate, cleaning fee, and GapNight service fee, as displayed at checkout.</li>
              <li><strong>&ldquo;Payment Method&rdquo;</strong> means the credit card, debit card, or other payment instrument stored against a Guest&rsquo;s account and tokenised via GapNight&rsquo;s payment provider.</li>
              <li><strong>&ldquo;Stay&rdquo;</strong> means the period from the confirmed check-in date to the confirmed check-out date.</li>
              <li><strong>&ldquo;Additional Charges&rdquo;</strong> means amounts charged to a Guest&rsquo;s Payment Method after the Booking Total, arising from damage, missing goods, excessive cleaning, smoking, rule breaches, or other verified costs as described in this Policy.</li>
              <li><strong>&ldquo;Unauthorised Gathering&rdquo;</strong> means any gathering at the property that exceeds the number of guests stated in the Booking, or any event not expressly approved in writing by the Host prior to the Stay.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold">2. Platform Intermediary Status</h2>
            <p className="text-sm text-muted-foreground">
              GapNight operates as a platform intermediary that connects Hosts and Guests. GapNight is not a party to the accommodation agreement between a Host and Guest, and is not a property manager, landlord, or accommodation provider.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Nothing in this Policy limits any right you may have under the Australian Consumer Law (Schedule 2 of the <em>Competition and Consumer Act 2010</em> (Cth)) or any other applicable law that cannot be excluded by contract.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">3. Booking Approval & Payment Timing</h2>
            <ol className="list-[lower-alpha] pl-5 space-y-2 text-sm text-muted-foreground">
              <li><strong>Submission.</strong> When a Guest submits a booking request, no charge is made and no hold is placed on the Guest&rsquo;s Payment Method. The Guest&rsquo;s payment details are securely tokenised and stored against their account and the pending booking.</li>
              <li><strong>Host Approval.</strong> A booking is not confirmed until the Host explicitly approves it. Upon Host approval, GapNight will charge the Booking Total to the Guest&rsquo;s stored Payment Method.</li>
              <li><strong>Rejection or Expiry.</strong> If the Host declines the booking request, or if the request expires without a Host response, no charge is made. The booking is marked as declined or expired and the Guest is notified.</li>
              <li><strong>Payment Failure at Approval.</strong> If the charge fails at the time of Host approval, the booking is not confirmed. The Guest will be notified and prompted to update their Payment Method. The Host will see a &ldquo;payment failed&rdquo; status. The booking will not proceed until payment is successfully collected.</li>
              <li><strong>Instant Book.</strong> Where a Host has enabled Instant Book, the booking is confirmed immediately upon Guest submission and the Booking Total is charged at that time.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold">4. Authorisation to Charge Saved Payment Method</h2>
            <p className="text-sm text-muted-foreground">
              By submitting a booking request and ticking the agreement checkbox at checkout, the Guest expressly authorises GapNight to charge their stored Payment Method for:
            </p>
            <ol className="list-[lower-alpha] pl-5 space-y-2 text-sm text-muted-foreground mt-2">
              <li><strong>The Booking Total</strong>, at the time of Host approval (or immediately, for Instant Book listings); and</li>
              <li><strong>Verified Additional Charges</strong>, following the evidence and dispute process set out in Section 7 of this Policy.</li>
            </ol>
            <p className="text-sm text-muted-foreground mt-2">
              This authorisation remains in effect for the duration of the booking and for any Additional Charges that arise within 14 days of check-out. The Guest&rsquo;s Payment Method is stored securely via GapNight&rsquo;s payment provider using industry-standard tokenisation. GapNight does not store raw card numbers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">5. House Rules, Prohibited Conduct & Parties</h2>
            <ol className="list-[lower-alpha] pl-5 space-y-2 text-sm text-muted-foreground">
              <li><strong>Compliance with House Rules.</strong> Guests must comply with all house rules published on the listing at the time of booking. House rules form part of the accommodation agreement between the Guest and Host.</li>
              <li><strong>Parties and Unauthorised Gatherings &mdash; strictly prohibited.</strong> Parties and unauthorised gatherings are prohibited on all GapNight properties unless the Host has given prior written approval. An Unauthorised Gathering includes any event where the number of people present exceeds the maximum guest count stated in the Booking; amplified music, commercial equipment, or event infrastructure is used; or the gathering causes noise complaints, neighbour disturbance, or property damage.</li>
              <li><strong>Consequences.</strong> Where GapNight or the Host reasonably determines that an Unauthorised Gathering has occurred, GapNight and/or the Host may: immediately terminate the Stay and require the Guest and all occupants to vacate; charge the Guest for additional cleaning, security, or remediation costs; charge the Guest for any damage caused by the Guest or any member of their party; report the incident to relevant authorities; and suspend or permanently remove the Guest&rsquo;s account.</li>
              <li><strong>Guest responsibility for party members.</strong> The Guest is responsible for the conduct of all persons who enter the property during the Stay. The Guest is liable for any damage, loss, or additional costs caused by any member of their party.</li>
              <li><strong>Other prohibited conduct.</strong> The following are prohibited unless expressly permitted by the Host in writing: smoking or vaping inside the property or in non-designated outdoor areas; pets where the listing states no pets; commercial filming or photography; subletting or re-listing the property.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold">6. Cancellations & Refunds</h2>
            <ol className="list-[lower-alpha] pl-5 space-y-1 text-sm text-muted-foreground">
              <li><strong>Cancellation more than 24 hours before check-in:</strong> Full refund of the Booking Total.</li>
              <li><strong>Cancellation within 24 hours of check-in:</strong> Non-refundable.</li>
              <li><strong>Host cancellation:</strong> Full refund to the Guest.</li>
              <li><strong>No-show:</strong> No refund.</li>
              <li><strong>Force majeure:</strong> GapNight will facilitate a resolution which may include a full or partial refund or rebooking credit at GapNight&rsquo;s discretion.</li>
              <li>The GapNight service fee (currently 8% of the nightly rate) is non-refundable except in cases of Host cancellation or platform error.</li>
              <li>Refunds are returned to the original Payment Method and may take 5&ndash;10 business days to appear.</li>
              <li>All prices are displayed and charged in Australian Dollars (AUD) unless otherwise stated.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold">7. Damage, Missing Goods, Excessive Cleaning &amp; Smoking</h2>
            <ol className="list-[lower-alpha] pl-5 space-y-2 text-sm text-muted-foreground">
              <li><strong>Reporting window.</strong> Hosts must report any damage, missing goods, excessive cleaning requirements, or smoking within 48 hours of Guest check-out. Reports submitted after this window may not be eligible for Additional Charges.</li>
              <li><strong>Evidence requirements.</strong> To initiate an Additional Charge, the Host must submit: photographs or video clearly showing the damage or issue with timestamps where available; an itemised list of damaged or missing items with estimated or actual replacement/repair costs; invoices or quotes from a tradesperson, cleaner, or supplier where the cost exceeds $150 AUD; and an inventory list or check-in condition report where available.</li>
              <li><strong>Reasonableness requirement.</strong> Additional Charges must be reasonable and proportionate to the actual loss or cost incurred. GapNight will not facilitate punitive or penalty charges; charges for pre-existing damage not caused by the Guest; charges not supported by evidence; or charges that exceed the reasonable cost of repair, replacement, or remediation.</li>
              <li><strong>Guest notification &amp; dispute window.</strong> Upon receiving a valid Host claim, GapNight will notify the Guest by email of the claim, the amount sought, and the evidence provided; give the Guest 48 hours to respond and submit a counter-statement or evidence; and review both parties&rsquo; submissions before making a determination.</li>
              <li><strong>GapNight determination.</strong> After the dispute window closes, GapNight will review the evidence and determine whether an Additional Charge is warranted. GapNight&rsquo;s determination is final for platform purposes, but does not affect any rights the Guest may have under Australian Consumer Law.</li>
              <li><strong>Charging.</strong> Where GapNight determines an Additional Charge is warranted, it will charge the Guest&rsquo;s stored Payment Method for the approved amount. The Guest will be notified of the charge and the reason.</li>
              <li><strong>Smoking.</strong> Where evidence of smoking inside a non-smoking property is established, GapNight may charge the Guest for the reasonable cost of professional cleaning and deodorisation, up to a maximum of $500 AUD unless a higher amount is supported by an invoice.</li>
              <li><strong>Personal liability.</strong> The Guest is personally and financially liable for any damage to the Property caused by the Guest, any member of the Guest&rsquo;s party, or any person the Guest permits to enter the Property during the Stay. This includes but is not limited to: furniture, appliances, fixtures, fittings, walls, floors, windows, doors, linens, kitchenware, electronics, outdoor areas, gardens, and pools.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold">8. Chargebacks</h2>
            <p className="text-sm text-muted-foreground">
              By making a booking and agreeing to this Policy, the Guest acknowledges that charges made in accordance with this Policy (including the Booking Total and verified Additional Charges) are legitimate and authorised. The Guest agrees not to initiate a chargeback or payment dispute with their bank or card issuer for any charge that was made in accordance with this Policy. Where a Guest initiates a chargeback for a legitimate policy charge, GapNight may provide the Guest&rsquo;s booking records, agreement to this Policy, and all relevant evidence to the payment provider or card issuer to contest the chargeback. GapNight reserves the right to suspend or terminate the Guest&rsquo;s account pending resolution of any chargeback.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Nothing in this section prevents a Guest from exercising rights available under Australian Consumer Law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">9. Limitation of Liability &amp; Indemnity</h2>
            <ol className="list-[lower-alpha] pl-5 space-y-2 text-sm text-muted-foreground">
              <li><strong>Platform limitation.</strong> To the maximum extent permitted by law, GapNight&rsquo;s liability to any Guest or Host arising out of or in connection with the Platform or any Booking is limited to the amount of the Booking Total paid by the Guest for the relevant Booking. GapNight is not liable for any act or omission of a Host or Guest; the condition, safety, or suitability of any property; any loss, damage, injury, or death occurring during a Stay; or any indirect, consequential, special, or punitive loss.</li>
              <li><strong>Australian Consumer Law.</strong> Nothing in this Policy excludes, restricts, or modifies any consumer guarantee, right, or remedy that cannot be excluded under the Australian Consumer Law or any other applicable legislation.</li>
              <li><strong>Guest indemnity.</strong> The Guest agrees to indemnify and hold harmless GapNight, its officers, employees, and agents from any claim, loss, damage, or expense (including reasonable legal costs) arising from the Guest&rsquo;s breach of this Policy, breach of house rules, or the conduct of any member of the Guest&rsquo;s party during a Stay.</li>
              <li><strong>Host indemnity.</strong> The Host agrees to indemnify and hold harmless GapNight from any claim arising from the Host&rsquo;s listing, the condition of the property, or the Host&rsquo;s conduct toward Guests.</li>
              <li><strong>Travel insurance.</strong> GapNight strongly recommends that all Guests obtain comprehensive travel insurance covering trip cancellation, personal liability, medical expenses, and personal belongings for the duration of their stay.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold">10. Dispute Resolution &amp; Governing Law</h2>
            <ol className="list-[lower-alpha] pl-5 space-y-1 text-sm text-muted-foreground">
              <li><strong>Direct resolution.</strong> Guests and Hosts are encouraged to resolve disputes directly in the first instance.</li>
              <li><strong>GapNight mediation.</strong> If direct resolution fails, either party may request GapNight to mediate. GapNight will review evidence from both parties and issue a determination within 14 business days.</li>
              <li><strong>External resolution.</strong> Nothing in this policy limits either party&rsquo;s right to pursue resolution through applicable consumer protection bodies, small claims tribunals, or courts of competent jurisdiction.</li>
              <li><strong>Governing law.</strong> This policy is governed by the laws of New South Wales, Australia. The parties submit to the non-exclusive jurisdiction of the courts of New South Wales.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold">11. Privacy &amp; Data</h2>
            <p className="text-sm text-muted-foreground">
              Guest personal information is collected and processed in accordance with the GapNight <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> and the Australian Privacy Act 1988 (Cth). Guest identification information may be shared with the Host for the purpose of the Booking and with law enforcement upon lawful request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">12. Changes to This Policy</h2>
            <p className="text-sm text-muted-foreground">
              GapNight may update this Policy from time to time. The version in effect at the time of booking applies to that booking. Material changes will be communicated to registered users by email or in-platform notification. Continued use of the Platform after the effective date constitutes acceptance of the amended policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">13. Entire Agreement</h2>
            <p className="text-sm text-muted-foreground">
              This Policy, together with the GapNight <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, constitutes the entire agreement between the parties regarding the subject matter hereof and supersedes all prior or contemporaneous communications, representations, or agreements, whether oral or written.
            </p>
          </section>

          <section className="bg-muted/50 rounded-xl p-5 border border-border/50">
            <h2 className="text-lg font-bold mb-2">Contact</h2>
            <p className="text-sm text-muted-foreground">
              For booking disputes, damage claims, or policy questions, contact GapNight at:<br />
              <strong>Email:</strong> support@gapnight.com<br />
              <strong>Response time:</strong> We endeavour to respond within 2 business days.<br />
              <strong>Address:</strong> GapNight Pty Ltd, Sydney, NSW, Australia
            </p>
          </section>

        </div>
      </main>
      <Footer />
    </div>
  );
}
