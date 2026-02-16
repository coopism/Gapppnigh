import { Link } from "wouter";
import { Mail, MapPin } from "lucide-react";
import { GapNightLogo } from "./GapNightLogo";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-neutral-900 dark:bg-neutral-950 text-white/90">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Top section */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8">
          {/* Brand - full width on mobile */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <GapNightLogo size={28} />
              <span className="font-display font-bold text-lg text-white">GapNight</span>
            </Link>
            <p className="text-white/60 text-xs sm:text-sm leading-relaxed max-w-sm mb-3">
              The marketplace for gap nights — unsold rooms between bookings at clearance prices.
            </p>
            <div className="flex items-center gap-2 text-white/50 text-xs">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>Melbourne, Australia</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-bold text-white text-sm mb-3">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/deals" className="text-white/60 hover:text-white text-xs sm:text-sm transition-colors">
                  Browse Deals
                </Link>
              </li>
              <li>
                <Link href="/list-your-hotel" className="text-white/60 hover:text-white text-xs sm:text-sm transition-colors">
                  For Hotels
                </Link>
              </li>
              <li>
                <Link href="/waitlist" className="text-white/60 hover:text-white text-xs sm:text-sm transition-colors">
                  Join Waitlist
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-white/60 hover:text-white text-xs sm:text-sm transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-display font-bold text-white text-sm mb-3">Support</h4>
            <ul className="space-y-2">
              <li>
                <a href="mailto:info@gapnight.com" className="text-white/60 hover:text-white text-xs sm:text-sm transition-colors flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  info@gapnight.com
                </a>
              </li>
              <li>
                <Link href="/privacy" className="text-white/60 hover:text-white text-xs sm:text-sm transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-white/60 hover:text-white text-xs sm:text-sm transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-white/40 text-xs">
            © {currentYear} GapNight. All rights reserved.
          </p>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-white/40">Made with care in Australia</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
