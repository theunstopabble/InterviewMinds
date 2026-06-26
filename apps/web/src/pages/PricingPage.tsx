import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import {
  Check,
  X,
  Zap,
  Star,
  Building2,
  Sparkles,
  ArrowRight,
  ChevronDown,
  Users,
  Shield,
  BarChart3,
  Video,
  Brain,
  Code,
  Globe,
  Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const plans = [
  {
    id: "free",
    name: "Free",
    tagline: "Perfect for getting started",
    price: "$0",
    period: "/month",
    icon: Sparkles,
    color: "from-blue-400 to-cyan-400",
    shadowColor: "shadow-blue-500/20",
    borderColor: "border-blue-500/20",
    gradient: "from-blue-600 to-cyan-600",
    features: [
      { name: "AI Mock Interviews", included: true },
      { name: "Basic Question Bank", included: true },
      { name: "Resume Parsing", included: true },
      { name: "Score & Feedback", included: true },
      { name: "Interview History", included: true },
      { name: "Video Proctoring", included: false },
      { name: "Advanced Analytics", included: false },
      { name: "Custom Branding", included: false },
      { name: "Priority Support", included: false },
    ],
    cta: "Get Started Free",
    popular: false,
  },
  {
    id: "starter",
    name: "Starter",
    tagline: "For serious candidates",
    price: "$19",
    period: "/month",
    icon: Zap,
    color: "from-purple-400 to-pink-400",
    shadowColor: "shadow-purple-500/20",
    borderColor: "border-purple-500/20",
    gradient: "from-purple-600 to-pink-600",
    features: [
      { name: "Everything in Free", included: true },
      { name: "Video Proctoring", included: true },
      { name: "Fraud Detection", included: true },
      { name: "Geo-Fencing", included: true },
      { name: "Take-Home Challenges", included: true },
      { name: "Advanced Analytics", included: false },
      { name: "SSO Integration", included: false },
      { name: "Custom Branding", included: false },
      { name: "Priority Support", included: false },
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    id: "professional",
    name: "Professional",
    tagline: "For power users & teams",
    price: "$49",
    period: "/month",
    icon: Star,
    color: "from-amber-400 to-orange-400",
    shadowColor: "shadow-amber-500/20",
    borderColor: "border-amber-500/30",
    gradient: "from-amber-600 to-orange-600",
    features: [
      { name: "Everything in Starter", included: true },
      { name: "Advanced Analytics", included: true },
      { name: "Predictive Insights", included: true },
      { name: "Custom Reports", included: true },
      { name: "Pipeline Management", included: true },
      { name: "ATS Integration", included: true },
      { name: "SSO Integration", included: false },
      { name: "Custom Branding", included: false },
      { name: "Priority Support", included: false },
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For organizations",
    price: "Custom",
    period: "",
    icon: Building2,
    color: "from-emerald-400 to-teal-400",
    shadowColor: "shadow-emerald-500/20",
    borderColor: "border-emerald-500/20",
    gradient: "from-emerald-600 to-teal-600",
    features: [
      { name: "Everything in Professional", included: true },
      { name: "SSO Integration", included: true },
      { name: "Custom Branding", included: true },
      { name: "Custom Integrations", included: true },
      { name: "Dedicated Support", included: true },
      { name: "SLA Guarantee", included: true },
      { name: "On-Premise Option", included: true },
      { name: "Bulk User Management", included: true },
      { name: "API Rate Limit", included: true, label: "Unlimited" },
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const detailedFeatures = [
  {
    category: "Interview Features",
    items: [
      { name: "AI Mock Interviews", free: true, starter: true, pro: true, enterprise: true },
      { name: "Video Proctoring", free: false, starter: true, pro: true, enterprise: true },
      { name: "Fraud Detection", free: false, starter: true, pro: true, enterprise: true },
      { name: "Geo-Fencing", free: false, starter: true, pro: true, enterprise: true },
      { name: "Take-Home Challenges", free: false, starter: true, pro: true, enterprise: true },
    ],
    icon: Video,
  },
  {
    category: "Analytics & Reports",
    items: [
      { name: "Basic Score & Feedback", free: true, starter: true, pro: true, enterprise: true },
      { name: "Advanced Analytics", free: false, starter: false, pro: true, enterprise: true },
      { name: "Predictive Insights", free: false, starter: false, pro: true, enterprise: true },
      { name: "Custom Reports", free: false, starter: false, pro: true, enterprise: true },
      { name: "Pipeline Management", free: false, starter: false, pro: true, enterprise: true },
    ],
    icon: BarChart3,
  },
  {
    category: "AI & Intelligence",
    items: [
      { name: "AI Question Generation", free: true, starter: true, pro: true, enterprise: true },
      { name: "Multimodal AI Analysis", free: false, starter: true, pro: true, enterprise: true },
      { name: "Smart Assessment", free: false, starter: false, pro: true, enterprise: true },
      { name: "ATS Integration", free: false, starter: false, pro: true, enterprise: true },
      { name: "Custom AI Training", free: false, starter: false, pro: false, enterprise: true },
    ],
    icon: Brain,
  },
  {
    category: "Security & Compliance",
    items: [
      { name: "E2E Encryption", free: true, starter: true, pro: true, enterprise: true },
      { name: "SSO Integration", free: false, starter: false, pro: false, enterprise: true },
      { name: "Audit Trail", free: true, starter: true, pro: true, enterprise: true },
      { name: "Compliance (GDPR/HIPAA)", free: false, starter: false, pro: true, enterprise: true },
      { name: "On-Premise Option", free: false, starter: false, pro: false, enterprise: true },
    ],
    icon: Shield,
  },
  {
    category: "Code & Technical",
    items: [
      { name: "Code Editor", free: true, starter: true, pro: true, enterprise: true },
      { name: "Code Execution", free: true, starter: true, pro: true, enterprise: true },
      { name: "SQL Challenges", free: false, starter: true, pro: true, enterprise: true },
      { name: "Git Integration", free: false, starter: false, pro: true, enterprise: true },
      { name: "Code Review AI", free: false, starter: false, pro: true, enterprise: true },
    ],
    icon: Code,
  },
  {
    category: "Collaboration",
    items: [
      { name: "Panel Interviews", free: false, starter: false, pro: true, enterprise: true },
      { name: "Collaborative Editor", free: false, starter: false, pro: true, enterprise: true },
      { name: "Whiteboard", free: false, starter: false, pro: true, enterprise: true },
      { name: "Video Calls", free: false, starter: false, pro: true, enterprise: true },
      { name: "Slack/Teams Integration", free: false, starter: false, pro: false, enterprise: true },
    ],
    icon: Users,
  },
  {
    category: "Platform & Support",
    items: [
      { name: "Storage", free: "1 GB", starter: "10 GB", pro: "50 GB", enterprise: "Unlimited" },
      { name: "API Rate Limit", free: "100/day", starter: "1,000/day", pro: "5,000/day", enterprise: "Unlimited" },
      { name: "Custom Branding", free: false, starter: false, pro: false, enterprise: true },
      { name: "Support", free: "Community", starter: "Email", pro: "Priority", enterprise: "Dedicated" },
      { name: "SLA Guarantee", free: false, starter: false, pro: false, enterprise: true },
    ],
    icon: Globe,
  },
];

const faqs = [
  {
    q: "Can I upgrade or downgrade my plan anytime?",
    a: "Yes. You can upgrade anytime — changes take effect immediately. Downgrades apply at the start of your next billing cycle.",
  },
  {
    q: "Is there a free trial for paid plans?",
    a: "Yes! Starter and Professional plans come with a 14-day free trial. No credit card required to start.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit cards, debit cards, and PayPal. Enterprise plans can be invoiced monthly or annually.",
  },
  {
    q: "Can I use InterviewMinds for my organization?",
    a: "Absolutely. Our Professional plan supports teams, and Enterprise offers dedicated onboarding, custom integrations, and SLA guarantees.",
  },
  {
    q: "Is my data secure?",
    a: "All plans include E2E encryption for interview data. Professional and Enterprise plans add compliance coverage (GDPR, HIPAA, SOC2).",
  },
  {
    q: "Do you offer discounts for annual billing?",
    a: "Yes. Annual billing gives you 2 months free — effectively 17% off compared to monthly billing.",
  },
];

export default function PricingPage() {
  const { isSignedIn } = useAuth();
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-24 pb-16 sm:pt-32 sm:pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-300 text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Simple, transparent pricing</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
              Find the perfect plan
            </span>
            <br />
            <span className="text-white">for your interview prep</span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
            From individual practice to enterprise hiring — every plan includes
            AI-powered interviews, real-time feedback, and actionable insights.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 bg-slate-900/50 border border-slate-800 rounded-full px-4 py-2">
            <span className={cn("text-sm font-medium transition-colors", !annual ? "text-white" : "text-slate-500")}>
              Monthly
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className={cn(
                "relative w-12 h-6 rounded-full transition-colors duration-300",
                annual ? "bg-blue-600" : "bg-slate-700"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300",
                  annual ? "translate-x-6" : "translate-x-0.5"
                )}
              />
            </button>
            <span className={cn("text-sm font-medium transition-colors", annual ? "text-white" : "text-slate-500")}>
              Annual{" "}
              <span className="text-emerald-400 font-semibold">Save 17%</span>
            </span>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-4 pb-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const monthlyPrice = plan.id === "enterprise" ? "Custom" : plan.price;
            const annualPrice = plan.id === "enterprise" ? "Custom" : `$${Math.round(parseInt(plan.price.replace("$", "")) * 10 * 12 / 12)}`;

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative group rounded-2xl border transition-all duration-500 hover:-translate-y-1",
                  plan.borderColor,
                  plan.popular
                    ? "bg-gradient-to-b from-slate-800/80 to-slate-900/80 shadow-xl scale-105 md:scale-105 lg:scale-105 z-10"
                    : "bg-slate-900/50 hover:border-slate-700"
                )}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-500/20">
                      <Star className="w-3 h-3 fill-current" />
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="p-6 space-y-6">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className={cn("inline-flex p-2 rounded-lg bg-gradient-to-br mb-3", plan.gradient)}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                      <p className="text-sm text-slate-400 mt-0.5">{plan.tagline}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-white">
                      {annual && plan.id !== "enterprise" ? annualPrice : monthlyPrice}
                    </span>
                    {plan.period && (
                      <span className="text-slate-400 text-sm">{plan.period}</span>
                    )}
                  </div>
                  {annual && plan.id !== "enterprise" && (
                    <p className="text-xs text-emerald-400 -mt-4">
                      ${parseInt(plan.price.replace("$", "")) * 10}/month billed annually
                    </p>
                  )}

                  {/* CTA */}
                  <Link to={isSignedIn ? "/settings" : "/sign-in"}>
                    <Button
                      className={cn(
                        "w-full h-11 font-semibold transition-all duration-300",
                        plan.popular
                          ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-500/20"
                          : plan.id === "enterprise"
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20"
                          : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                      )}
                    >
                      {plan.cta}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>

                  {/* Features */}
                  <ul className="space-y-3 pt-2">
                    {plan.features.map((feature) => (
                      <li key={feature.name} className="flex items-start gap-3">
                        {feature.included ? (
                          <Check className={cn(
                            "w-4 h-4 mt-0.5 shrink-0",
                            plan.popular ? "text-amber-400" : "text-emerald-400"
                          )} />
                        ) : (
                          <X className="w-4 h-4 mt-0.5 shrink-0 text-slate-600" />
                        )}
                        <span className={cn(
                          "text-sm",
                          feature.included ? "text-slate-200" : "text-slate-500"
                        )}>
                          {feature.label || feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Detailed Feature Comparison */}
      <section className="px-4 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                Everything you need
              </span>
            </h2>
            <p className="text-slate-400 text-lg">Compare features across all plans</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-4 pr-4 text-slate-400 font-medium w-1/3">Feature</th>
                  <th className="text-center py-4 px-2 text-blue-300 font-semibold">Free</th>
                  <th className="text-center py-4 px-2 text-purple-300 font-semibold">Starter</th>
                  <th className="text-center py-4 px-2 text-amber-300 font-semibold">Professional</th>
                  <th className="text-center py-4 px-2 text-emerald-300 font-semibold">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {detailedFeatures.map((section) => (
                  <>
                    <tr key={section.category} className="border-b border-slate-800/50">
                      <td colSpan={5} className="py-4">
                        <div className="flex items-center gap-2">
                          <section.icon className="w-4 h-4 text-slate-400" />
                          <span className="font-semibold text-slate-300">{section.category}</span>
                        </div>
                      </td>
                    </tr>
                    {section.items.map((item) => (
                      <tr key={item.name} className="border-b border-slate-800/30 hover:bg-slate-900/30 transition-colors">
                        <td className="py-3 pr-4 text-slate-300">{item.name}</td>
                        {(["free", "starter", "pro", "enterprise"] as const).map((tier) => (
                          <td key={tier} className="text-center py-3 px-2">
                            {typeof item[tier] === "boolean" ? (
                              item[tier] ? (
                                <Check className="w-4 h-4 mx-auto text-emerald-400" />
                              ) : (
                                <X className="w-4 h-4 mx-auto text-slate-600" />
                              )
                            ) : (
                              <span className="text-slate-400 text-xs">{String(item[tier])}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 pb-24">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                Frequently asked questions
              </span>
            </h2>
            <p className="text-slate-400 text-lg">Everything you need to know about our plans</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="border border-slate-800 rounded-xl overflow-hidden transition-all duration-300 hover:border-slate-700"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <span className="font-medium text-slate-200 pr-4">{faq.q}</span>
                  <ChevronDown
                    className={cn(
                      "w-5 h-5 text-slate-500 shrink-0 transition-transform duration-300",
                      openFaq === i && "rotate-180"
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300",
                    openFaq === i ? "max-h-40" : "max-h-0"
                  )}
                >
                  <p className="px-4 pb-4 text-slate-400 text-sm leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 pb-24">
        <div className="max-w-4xl mx-auto relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 border border-blue-500/10 p-8 sm:p-12 text-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            Ready to ace your next interview?
          </h2>
          <p className="text-slate-300 text-lg mb-8 max-w-xl mx-auto">
            Join thousands of candidates who landed their dream jobs with InterviewMinds.
            Start practicing today — no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to={isSignedIn ? "/interview" : "/sign-in"}>
              <Button className="h-12 px-8 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/20">
                Start Practicing Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="https://texfolio.vercel.app" target="_blank">
              <Button variant="outline" className="h-12 px-8 text-base border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
                <Headphones className="w-4 h-4 mr-2" />
                Talk to Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
