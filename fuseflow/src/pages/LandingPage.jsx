import React from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Zap,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight
} from 'lucide-react';
import brandLogo from '../assets/Icon.png';

const LandingPage = () => {
  const features = [
    {
      icon: <Zap size={24} className="text-indigo-600" />,
      title: 'Multi-Device Connection',
      desc: 'Connect multiple WhatsApp Business sessions concurrently. Scan QRs and start automated broadcasting instantly.'
    },
    {
      icon: <Sparkles size={24} className="text-indigo-600" />,
      title: 'AI Auto-Responder',
      desc: 'Train your agent using custom static databases or website crawlers. Auto-respond to customer inquiries with Gemini & OpenAI.'
    },
    {
      icon: <TrendingUp size={24} className="text-indigo-600" />,
      title: 'Campaign Broadcasting',
      desc: 'Import sheets, personalize variables, and dispatch bulk message campaigns with integrated anti-ban spacing delays.'
    },
    {
      icon: <Layers size={24} className="text-indigo-600" />,
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
    <div className="min-h-screen bg-slate-50 text-slate-800 overflow-x-hidden font-sans selection:bg-indigo-100 selection:text-indigo-800">
      
      {/* Decorative Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none opacity-40 blur-[150px] bg-slate-100/50 z-0"></div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-slate-200/80 backdrop-blur-md bg-white/70 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={brandLogo} alt="FuseFlow Logo" className="w-10 h-10 object-contain" />
            <span className="font-extrabold text-xl tracking-tight text-slate-900">FuseFlow</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-500">
            <a href="#features" className="hover:text-indigo-650 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-indigo-650 transition-colors">Pricing</a>
            <a href="https://github.com/Vishuuu2813/FuseFlow" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-650 transition-colors">Documentation</a>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login" className="px-4 py-2 text-sm font-bold text-slate-655 hover:text-indigo-650 transition-colors">
              Log in
            </Link>
            <Link to="/signup" className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/10">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-20 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold mb-6">
          <Sparkles size={12} /> WhatsApp Automation Redefined
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-tight text-slate-900">
          Automate WhatsApp Marketing & Support with{' '}
          <span className="text-indigo-600">
            AI Auto-Replies
          </span>
        </h1>
        <p className="text-slate-500 max-w-2xl text-lg mt-6 leading-relaxed font-medium">
          Broadcasting bulk campaigns, managing customer pipelines, and training AI bots using your business documents. All connected in under 2 minutes.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mt-10">
          <Link to="/signup" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 hover:scale-[1.01] transition-all">
            Start Free Trial <ArrowRight size={18} />
          </Link>
          <Link to="/login" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white border border-slate-200 hover:bg-slate-55 text-slate-700 font-bold flex items-center justify-center gap-2 transition-colors">
            Go to Dashboard <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-slate-200">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-slate-900">Robust Built-In Capabilities</h2>
          <p className="text-slate-500 text-sm mt-2 font-medium">Everything required to automate your customer loops at scale.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feat, idx) => (
            <div key={idx} className="bg-white border border-slate-200/80 rounded-3xl p-8 hover:border-indigo-300 shadow-sm transition-all">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-6 text-indigo-600">
                {feat.icon}
              </div>
              <h3 className="font-extrabold text-lg text-slate-800">{feat.title}</h3>
              <p className="text-slate-500 text-sm mt-3 leading-relaxed font-semibold">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Cards */}
      <section id="pricing" className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-slate-200">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-slate-900">Simple, Transparent Pricing</h2>
          <p className="text-slate-550 text-sm mt-2 font-semibold">Choose the volume limits that fit your organization best.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {pricing.map((plan, idx) => (
            <div
              key={idx}
              className={`relative rounded-3xl p-8 flex flex-col justify-between border ${
                plan.popular
                  ? 'bg-white border-indigo-500 shadow-xl shadow-indigo-500/5'
                  : 'bg-white border-slate-200/80'
              }`}
            >
              {plan.popular && (
                <span className="absolute top-4 right-6 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-extrabold uppercase tracking-wider">
                  Most Popular
                </span>
              )}

              <div>
                <h3 className="text-xl font-extrabold text-slate-800">{plan.name}</h3>
                <p className="text-slate-400 text-xs mt-2 font-semibold">{plan.desc}</p>
                <div className="flex items-baseline gap-1 mt-6 mb-8">
                  <span className="text-4xl font-extrabold text-indigo-850">{plan.price}</span>
                  <span className="text-slate-400 text-sm font-semibold">{plan.period}</span>
                </div>

                <ul className="flex flex-col gap-4 border-t border-slate-100 pt-6">
                  {plan.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-3 text-slate-605 text-xs font-bold">
                      <ShieldCheck size={16} className="text-indigo-600 shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <Link
                  to="/signup"
                  className={`w-full py-3.5 rounded-xl font-extrabold text-xs flex items-center justify-center transition-all cursor-pointer ${
                    plan.popular
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
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
      <footer className="relative z-10 border-t border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <img src={brandLogo} alt="FuseFlow Logo" className="w-8 h-8 object-contain" />
            <span className="font-extrabold text-sm text-slate-900">FuseFlow</span>
          </div>

          <p className="text-slate-450 text-xs font-semibold">&copy; 2026 FuseFlow Inc. All rights reserved.</p>

          <div className="flex gap-6 text-xs text-slate-400 font-semibold">
            <a href="#" className="hover:text-indigo-650 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-indigo-650 transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
