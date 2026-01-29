import { Link } from "wouter";
import { Sparkles, Mail, MapPin, Phone } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-neutral-900 dark:bg-neutral-950 text-white/90">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-bold text-xl text-white">GapNight</span>
            </Link>
            <p className="text-white/70 text-sm leading-relaxed max-w-sm mb-4">
              The marketplace for gap nights — unsold hotel rooms between bookings, available at clearance prices. Real discounts on real rooms.
            </p>
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <MapPin className="w-4 h-4" />
              <span>Melbourne, Australia</span>
            </div>
          </div>

          <div>
            <h4 className="font-display font-bold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/deals" className="text-white/70 hover:text-white text-sm transition-colors">
                  Browse Deals
                </Link>
              </li>
              <li>
                <Link href="/list-your-hotel" className="text-white/70 hover:text-white text-sm transition-colors">
                  For Hotels
                </Link>
              </li>
              <li>
                <Link href="/waitlist" className="text-white/70 hover:text-white text-sm transition-colors">
                  Join Waitlist
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-white mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <a href="mailto:hello@gapnight.com" className="text-white/70 hover:text-white text-sm transition-colors flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  hello@gapnight.com
                </a>
              </li>
              <li>
                <Link href="/privacy" className="text-white/70 hover:text-white text-sm transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-white/70 hover:text-white text-sm transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/50 text-sm">
            {currentYear} GapNight. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link 
              href="/owner/login" 
              className="text-white/30 hover:text-white/50 text-xs transition-colors"
              data-testid="link-developer-portal"
            >
              Developer Portal
            </Link>
            <p className="text-white/50 text-xs">
              Made with care in Australia
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
