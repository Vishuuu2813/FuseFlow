import React from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Zap,
  TrendingUp,
  ShieldCheck,
  Globe,
  Database,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight
} from 'lucide-react';

const LandingPage = () => {
  const features = [
    {
      icon: <Zap size={24} className="text-amber-400" />,
      title: 'Multi-Device Connection',
      desc: 'Connect multiple WhatsApp Business sessions concurrently. Scan QRs and start automated broadcasting instantly.'
    },
    {
      icon: <Sparkles size={24} className="text-emerald-400" />,
      title: 'AI Auto-Responder',
      desc: 'Train your agent using custom static databases or website crawlers. Auto-respond to customer inquiries with Gemini & OpenAI.'
    },
    {
      icon: <TrendingUp size={24} className="text-indigo-400" />,
      title: 'Campaign Broadcasting',
      desc: 'Import sheets, personalize variables, and dispatch bulk message campaigns with integrated anti-ban spacing delays.'
    },
    {
      icon: <Layers size={24} className="text-purple-400" />,
      title: 'Flexible CRM Pipelines',
      desc: 'Keep track of conversations, update customer pipeline stages, and assign custom labels to leads automatically.'
    }
  ];

  const pricing = [
    {
      name: 'Basic',
      price: '$29',
      period: '/mo',
      desc: 'Best for startups and growing single-operator businesses.',
      features: [
        '1 Active WhatsApp Device',
        '1,000 Contacts Storage',
        '5 Bulk Campaigns / mo',
        'Basic AI Auto-Replies',
        'Email Support'
      ],
      cta: 'Get Started',
      popular: false
    },
    {
      name: 'Professional',
      price: '$79',
      period: '/mo',
      desc: 'Optimized for customer support and marketing teams.',
      features: [
        '3 Active WhatsApp Devices',
        '10,000 Contacts Storage',
        'Unlimited Campaigns',
        'Gemini & OpenAI Fine-tuning',
        'Knowledge Base Website Crawlers',
        'Priority 24/7 Support'
      ],
      cta: 'Start Pro Trial',
      popular: true
    },
    {
      name: 'Enterprise',
      price: '$199',
      period: '/mo',
      desc: 'Built for high-volume sales agencies and large firms.',
      features: [
        '10 Active WhatsApp Devices',
        '50,000 Contacts Storage',
        'Unlimited Campaigns',
        'Custom Webhooks & API Access',
        'Dedicated IP Infrastructure',
        'Dedicated Account Manager'
      ],
      cta: 'Contact Enterprise',
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Decorative Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none opacity-20 blur-[150px] bg-gradient-to-tr from-emerald-500 via-indigo-600 to-transparent z-0"></div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/5 backdrop-blur-md bg-slate-950/70 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-400 to-indigo-500 text-slate-950 font-black text-lg">
              WF
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">WhatsFlow</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="https://github.com/Vishuuu2813/FuseFlow" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Documentation</a>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login" className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors">
              Log in
            </Link>
            <Link to="/signup" className="px-5 py-2.5 rounded-xl bg-white text-slate-950 text-sm font-bold hover:bg-slate-200 transition-colors shadow-lg shadow-white/5">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-20 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-semibold mb-6">
          <Sparkles size={12} /> WhatsApp Automation Redefined
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-tight">
          Automate WhatsApp Marketing & Support with{' '}
          <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 bg-clip-text text-transparent">
            AI Auto-Replies
          </span>
        </h1>
        <p className="text-slate-400 max-w-2xl text-lg mt-6 leading-relaxed">
          Broadcasting bulk campaigns, managing customer pipelines, and training AI bots using your business documents. All connected in under 2 minutes.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mt-10">
          <Link to="/signup" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-all">
            Start Free Trial <ArrowRight size={18} />
          </Link>
          <Link to="/login" className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-white/10 hover:bg-white/5 font-bold flex items-center justify-center gap-2 transition-colors">
            Go to Dashboard <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Robust Built-In Capabilities</h2>
          <p className="text-slate-500 text-sm mt-2">Everything required to automate your customer loops at scale.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feat, idx) => (
            <div key={idx} className="backdrop-blur-md bg-slate-900/20 border border-white/5 rounded-3xl p-8 hover:border-white/10 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center mb-6">
                {feat.icon}
              </div>
              <h3 className="font-bold text-lg text-slate-200">{feat.title}</h3>
              <p className="text-slate-400 text-sm mt-3 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Cards */}
      <section id="pricing" className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Simple, Transparent Pricing</h2>
          <p className="text-slate-500 text-sm mt-2">Choose the volume limits that fit your organization best.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {pricing.map((plan, idx) => (
            <div
              key={idx}
              className={`relative backdrop-blur-md rounded-3xl p-8 flex flex-col justify-between border ${
                plan.popular
                  ? 'bg-gradient-to-b from-indigo-950/20 to-slate-950/20 border-indigo-500/30 shadow-2xl shadow-indigo-500/5'
                  : 'bg-slate-900/10 border-white/5'
              }`}
            >
              {plan.popular && (
                <span className="absolute top-4 right-6 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
                  Most Popular
                </span>
              )}

              <div>
                <h3 className="text-xl font-bold text-slate-200">{plan.name}</h3>
                <p className="text-slate-500 text-xs mt-2">{plan.desc}</p>
                <div className="flex items-baseline gap-1 mt-6 mb-8">
                  <span className="text-4xl font-extrabold text-slate-100">{plan.price}</span>
                  <span className="text-slate-500 text-sm">{plan.period}</span>
                </div>

                <ul className="flex flex-col gap-4 border-t border-white/5 pt-6">
                  {plan.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-3 text-slate-400 text-xs font-medium">
                      <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <Link
                  to="/signup"
                  className={`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                    plan.popular
                      ? 'bg-indigo-500 hover:bg-indigo-600 text-slate-950'
                      : 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-slate-950 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500 text-slate-950 font-black text-sm">
              WF
            </div>
            <span className="font-bold text-sm text-slate-300">WhatsFlow</span>
          </div>

          <p className="text-slate-600 text-xs">&copy; 2026 WhatsFlow Inc. All rights reserved.</p>

          <div className="flex gap-6 text-xs text-slate-500">
            <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
