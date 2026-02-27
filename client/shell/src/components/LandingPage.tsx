import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  ArrowRight,
  ClipboardList,
  SlidersHorizontal,
  BookOpen,
  Zap,
  ShieldCheck,
  Users,
  Clock,
  Pencil,
  Globe,
  MapPin,
  CalendarDays,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const TripWeaveLogo = () => (
  <svg
    width="42"
    height="16"
    viewBox="0 0 83 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <mask
      id="mask0_landing"
      style={{ maskType: "luminance" }}
      maskUnits="userSpaceOnUse"
      x="0"
      y="0"
      width="83"
      height="32"
    >
      <path d="M0 0H83V32H0V0Z" fill="white" />
    </mask>
    <g mask="url(#mask0_landing)">
      <path
        d="M19.6859 -0.00136721C16.4936 -0.00136721 13.3013 1.27863 11.0667 3.6253L3.61795 11.092C1.27692 13.332 0 16.532 0 19.732C0 26.452 5.42692 31.9986 12.2372 31.9986C15.4295 31.9986 18.6218 30.7186 20.8564 28.372L26.0705 23.1453L41.1808 7.99863C42.2449 6.93196 43.7346 6.29197 45.3308 6.29197C47.8846 6.29197 50.1192 7.99863 50.8641 10.3453L55.6526 5.5453C53.5244 2.13196 49.6936 -0.108032 45.3308 -0.108032C42.1385 -0.108032 38.9461 1.17197 36.7115 3.51863L16.4936 23.7853C15.4295 24.852 13.9397 25.492 12.3436 25.492C9.15128 25.492 6.49102 22.8253 6.49102 19.6253C6.49102 18.0253 7.12949 16.6386 8.19359 15.4653L15.6423 7.99863C16.7064 6.93196 18.1961 6.29197 19.7923 6.29197C22.3461 6.29197 24.5808 7.99863 25.3256 10.3453L30.1141 5.5453C27.8795 2.23863 24.0487 -0.00136721 19.6859 -0.00136721Z"
        fill="url(#paint0_landing)"
      />
      <path
        d="M41.9259 23.8917C40.8618 24.9584 39.3721 25.5984 37.7759 25.5984C35.2221 25.5984 32.9874 23.8917 32.2426 21.5451L27.4541 26.3451C29.5823 29.7584 33.4131 31.9984 37.7759 31.9984C40.9682 31.9984 44.1605 30.7184 46.3951 28.3717L66.6131 8.10508C67.6772 7.03841 69.1669 6.39841 70.7631 6.39841C73.9554 6.39841 76.6157 9.06508 76.6157 12.2651C76.6157 13.8651 75.9772 15.2517 74.9131 16.4251L67.4644 23.8917C66.4003 24.9584 64.9105 25.5984 63.3144 25.5984C60.7605 25.5984 58.5259 23.8917 57.781 21.5451L52.9926 26.3451C55.1208 29.7584 58.9515 31.9984 63.3144 31.9984C66.5067 31.9984 69.699 30.7184 71.9336 28.3717L79.3823 20.9051C81.7233 18.6651 83.0003 15.4651 83.0003 12.2651C83.0003 5.54508 77.5733 -0.00158691 70.7631 -0.00158691C67.5708 -0.00158691 64.3785 1.27841 62.1439 3.62508L41.9259 23.8917Z"
        fill="url(#paint1_landing)"
      />
    </g>
    <defs>
      <linearGradient
        id="paint0_landing"
        x1="27.8263"
        y1="-0.108032"
        x2="27.8263"
        y2="31.9986"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#13BFB0" />
        <stop offset="1" stopColor="#B9EEEA" />
      </linearGradient>
      <linearGradient
        id="paint1_landing"
        x1="55.2272"
        y1="-0.00158691"
        x2="55.2272"
        y2="31.9984"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#37BBAF" />
        <stop offset="1" stopColor="#A6EDE6" />
      </linearGradient>
    </defs>
  </svg>
);

const avatarColors = ["#0D9488", "#1e3a5f", "#115e59", "#6b7280"];

const steps: {
  number: string;
  label: string;
  title: string;
  icon: LucideIcon;
  description: string;
  bullets: string[];
}[] = [
  {
    number: "01",
    label: "DREAM & DISCOVER",
    title: "Pre-Itinerary",
    icon: ClipboardList,
    description:
      "Share your travel preferences, budget, dates, and interests. Our AI analyzes thousands of destinations, experiences, and hidden gems to surface the best options tailored just for you.",
    bullets: [
      "Smart destination suggestions",
      "Budget-aware planning",
      "Interest-based filtering",
      "Travel style matching",
    ],
  },
  {
    number: "02",
    label: "PLAN & CUSTOMIZE",
    title: "Itinerary Builder",
    icon: SlidersHorizontal,
    description:
      "Watch as AI weaves your perfect day-by-day itinerary in seconds. Select and customize activities, restaurants, and accommodations. Every detail is optimized for your schedule.",
    bullets: [
      "Day-by-day scheduling",
      "Route optimization",
      "Real-time adjustments",
      "Collaborative editing",
    ],
  },
  {
    number: "03",
    label: "RELIVE & SHARE",
    title: "Post-Itinerary",
    icon: BookOpen,
    description:
      "After your trip, TripWeave helps you organize and share your experience. Rate activities to improve future recommendations for you and the community.",
    bullets: [
      "Trip journal & photos",
      "Experience ratings",
      "Share with friends",
      "Smarter future trips",
    ],
  },
];

const features: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Generate complete itineraries in under 30 seconds with our advanced AI engine.",
  },
  {
    icon: ShieldCheck,
    title: "Trusted Sources",
    description:
      "Every recommendation is verified through real traveler reviews and local insights.",
  },
  {
    icon: Users,
    title: "Collaborative",
    description:
      "Plan together with friends and family. Share, vote, and finalize as a group.",
  },
  {
    icon: Clock,
    title: "Real-Time Updates",
    description:
      "Get live updates on weather, closures, and local events that may affect your plans.",
  },
  {
    icon: Pencil,
    title: "Fully Customizable",
    description:
      "Every itinerary is a starting point. Tweak, rearrange, and make it entirely yours.",
  },
  {
    icon: Globe,
    title: "200+ Destinations",
    description:
      "From bustling cities to remote islands, TripWeave covers destinations worldwide.",
  },
];

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero wrapper with teal gradient */}
      <div style={{ backgroundColor: "#FAFAF9" }}>
        {/* Navigation */}
        <nav className="flex items-center justify-between max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center gap-2">
            <TripWeaveLogo />
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              TripWeave
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a
              href="#how-it-works"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              How It Works
            </a>
            <a
              href="#features"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Features
            </a>
            <a
              href="#get-started"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Get Started
            </a>
          </div>

          <Link
            to="/pretrip"
            className="rounded-full px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: "#0D9488" }}
          >
            Start Planning
          </Link>
        </nav>

        {/* Hero Section */}
        <section className="flex flex-col items-center text-center max-w-3xl mx-auto px-6 pt-20 pb-24">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 mb-8"
            style={{
              borderColor: "#0D948833",
              backgroundColor: "#0D948810",
            }}
          >
            <Sparkles size={14} style={{ color: "#0D9488" }} />
            <span className="text-sm font-medium" style={{ color: "#0D9488" }}>
              AI-Powered Trip Planning
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight tracking-tight mb-6">
            Your perfect trip,
            <br />
            <span style={{ color: "#0D9488" }}>woven together</span> by AI
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-gray-500 max-w-xl mb-10 leading-relaxed">
            TripWeave crafts personalized itineraries from pre-trip research to
            post-trip memories. Tell us your dream destination and let our AI
            weave the ideal journey for you.
          </p>

          {/* CTA Buttons */}
          <div className="flex items-center gap-4 mb-12">
            <Link
              to="/pretrip"
              className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-base font-medium text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: "#0D9488" }}
            >
              Plan Your Trip
              <ArrowRight size={16} />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-7 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              See How It Works
            </a>
          </div>

          {/* Social Proof */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {avatarColors.map((color, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-white"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <span className="text-sm text-gray-500 font-medium">
              2,400+ trips planned this month
            </span>
          </div>
        </section>
      </div>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <p
            className="text-sm font-semibold tracking-widest uppercase mb-4"
            style={{ color: "#0D9488" }}
          >
            HOW IT WORKS
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Three steps to your perfect trip
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">
            From the first spark of inspiration to cherished memories, TripWeave
            guides you through every phase of your journey.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="rounded-2xl border border-gray-200 bg-white p-8"
              >
                <div className="flex items-start justify-between mb-6">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "#0D948815" }}
                  >
                    <Icon size={20} style={{ color: "#0D9488" }} />
                  </div>
                  <span className="text-4xl font-bold text-gray-200">
                    {step.number}
                  </span>
                </div>

                <p
                  className="text-xs font-semibold tracking-widest uppercase mb-2"
                  style={{ color: "#0D9488" }}
                >
                  {step.label}
                </p>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-5">
                  {step.description}
                </p>

                <ul className="space-y-2">
                  {step.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-center gap-2 text-sm text-gray-600"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: "#0D9488" }}
                      />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="py-20"
        style={{ backgroundColor: "#FAFAF9" }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p
              className="text-sm font-semibold tracking-widest uppercase mb-4"
              style={{ color: "#0D9488" }}
            >
              FEATURES
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything you need for
              <br />
              seamless travel
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Powerful tools designed to make trip planning effortless and
              enjoyable.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-gray-200 bg-white p-7"
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                    style={{ backgroundColor: "#0D948815" }}
                  >
                    <Icon size={20} style={{ color: "#0D9488" }} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section id="get-started" className="px-6 py-16">
        <div
          className="max-w-6xl mx-auto rounded-3xl px-8 py-16 text-center"
          style={{
            background:
              "linear-gradient(135deg, #1a2332 0%, #1e3a4a 50%, #0D9488 100%)",
          }}
        >
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <MapPin size={18} className="text-white/80" />
            </div>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <Globe size={18} className="text-white/80" />
            </div>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <CalendarDays size={18} className="text-white/80" />
            </div>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to weave your next
            <br />
            adventure?
          </h2>
          <p className="text-white/60 max-w-lg mx-auto mb-8 leading-relaxed">
            Join thousands of travelers who let AI handle the planning so they
            can focus on the experience. Your dream trip is just a few clicks
            away.
          </p>

          <div className="flex items-center justify-center gap-4 mb-6">
            <Link
              to="/pretrip"
              className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-base font-medium text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: "#0D9488" }}
            >
              Start Planning for Free
              <ArrowRight size={16} />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-base font-medium text-white/90 transition-colors hover:bg-white/10"
              style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
            >
              Watch Demo
            </a>
          </div>

          <p className="text-sm text-white/40">
            No credit card required. Free to get started.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
            {/* Brand */}
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <TripWeaveLogo />
                <span className="text-xl font-bold text-gray-900 tracking-tight">
                  TripWeave
                </span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                AI-powered trip planning that weaves together your perfect
                itinerary from start to finish.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Product
              </h4>
              <ul className="space-y-3">
                {["Features", "Pricing", "Integrations", "Changelog"].map(
                  (item) => (
                    <li key={item}>
                      <a
                        href="#"
                        className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        {item}
                      </a>
                    </li>
                  ),
                )}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Company
              </h4>
              <ul className="space-y-3">
                {["About", "Blog", "Careers", "Press"].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Resources
              </h4>
              <ul className="space-y-3">
                {["Help Center", "Community", "API Docs", "Status"].map(
                  (item) => (
                    <li key={item}>
                      <a
                        href="#"
                        className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        {item}
                      </a>
                    </li>
                  ),
                )}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Legal
              </h4>
              <ul className="space-y-3">
                {["Privacy", "Terms", "Cookies", "Licenses"].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-200">
          <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              &copy; 2026 TripWeave. All rights reserved.
            </p>
            <div className="flex items-center gap-3">
              {["X", "LI", "IG"].map((label) => (
                <a
                  key={label}
                  href="#"
                  className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-xs font-medium text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
