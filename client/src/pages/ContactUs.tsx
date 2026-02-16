import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, Mail, MessageSquare, HelpCircle, Bug, CreditCard } from "lucide-react";
import { FadeIn } from "@/components/ui/motion";

const CATEGORIES = [
  { value: "booking_issue", label: "Booking Issue", icon: CreditCard },
  { value: "account", label: "Account Help", icon: HelpCircle },
  { value: "bug", label: "Report a Bug", icon: Bug },
  { value: "other", label: "General Inquiry", icon: MessageSquare },
];

export default function ContactUs() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("other");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim(), category }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(data.message || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-neutral-950 dark:to-neutral-900">
      <Navigation />

      <main className="container mx-auto px-4 pt-24 pb-16 max-w-2xl">
        <FadeIn>
          {submitted ? (
            <Card className="text-center">
              <CardContent className="pt-12 pb-12">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Message Sent!</h2>
                <p className="text-slate-500 mb-6 max-w-md mx-auto">
                  Thanks for reaching out. Our team will review your message and get back to you at <strong>{email}</strong> as soon as possible.
                </p>
                <Button variant="outline" onClick={() => { setSubmitted(false); setName(""); setEmail(""); setSubject(""); setMessage(""); setCategory("other"); }}>
                  Send Another Message
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
                <p className="text-slate-500">
                  Have a question, issue, or feedback? We're here to help.
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Get in Touch
                  </CardTitle>
                  <CardDescription>
                    Fill out the form below and our support team will respond within 24 hours.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contact-name">Your Name</Label>
                        <Input
                          id="contact-name"
                          placeholder="John Smith"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-email">Email Address</Label>
                        <Input
                          id="contact-email"
                          type="email"
                          placeholder="john@example.com"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact-category">Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact-subject">Subject</Label>
                      <Input
                        id="contact-subject"
                        placeholder="Brief summary of your request"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact-message">Message</Label>
                      <Textarea
                        id="contact-message"
                        placeholder="Describe your issue or question in detail..."
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        className="min-h-[140px]"
                        required
                      />
                    </div>

                    {error && (
                      <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                        {error}
                      </div>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...</>
                      ) : (
                        <><Mail className="w-4 h-4 mr-2" /> Send Message</>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <div className="mt-8 text-center text-sm text-slate-400">
                <p>You can also email us directly at <a href="mailto:support@gapnight.com" className="text-primary hover:underline">support@gapnight.com</a></p>
              </div>
            </>
          )}
        </FadeIn>
      </main>

      {/* Footer */}
      <footer className="py-8 bg-neutral-900 dark:bg-neutral-950 text-white/60">
        <div className="container mx-auto px-4 text-center text-sm">
          <p>© 2026 GapNight. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
