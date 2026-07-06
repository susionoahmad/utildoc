import React, { useState } from 'react';
import { PRICING_PLANS } from '../data';
import { PricingPlan } from '../types';
import { 
  Check, X, Sparkles, HelpCircle, ShieldCheck, CreditCard, 
  User, Calendar, Lock, Loader2, CheckCircle2 
} from 'lucide-react';
import { SaaSDB } from '../lib/saasDb';

interface PricingPageProps {
  darkMode: boolean;
}

export default function PricingPage({ darkMode }: PricingPageProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('annually');
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [checkoutEmail, setCheckoutEmail] = useState('');
  
  // Checkout Modal states
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [checkoutStep, setCheckoutStep] = useState<'form' | 'loading' | 'success'>('form');

  // Pre-fill active email session
  const [isSessionLoggedIn, setIsSessionLoggedIn] = useState(false);
  React.useEffect(() => {
    const fetchSession = async () => {
      const session = await SaaSDB.getActiveUserSession();
      setIsSessionLoggedIn(!!(session && session.isLoggedIn));
      if (selectedPlan) {
        if (session && session.isLoggedIn) {
          setCheckoutEmail(session.email);
        } else {
          setCheckoutEmail('');
        }
      }
    };
    fetchSession();
  }, [selectedPlan]);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutStep('loading');
    
    // Determine final email
    const targetEmail = checkoutEmail.trim() || 'production-buyer@example.com';
    const planKey = selectedPlan.id as 'pro' | 'enterprise';
    const priceStr = billingCycle === 'annually' ? selectedPlan.priceAnnually : selectedPlan.priceMonthly;
    const amount = parseFloat(priceStr);
    const chosenGateway = Math.random() > 0.5 ? 'Stripe' : 'Midtrans';

    try {
      // 1. Call checkout API
      await SaaSDB.checkout(targetEmail, planKey, amount, chosenGateway);
      
      // 2. Set checkout success
      setCheckoutStep('success');
      
      // Dispatch storage event to notify other windows/components to reload session
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error(err);
      alert('Checkout transaction failed.');
      setCheckoutStep('form');
    }
  };

  const closeCheckout = () => {
    setSelectedPlan(null);
    setCheckoutStep('form');
    setCardNumber('');
    setCardHolder('');
    setExpiry('');
    setCvv('');
  };

  // FAQ List
  const faqs = [
    {
      q: 'How does client-side document processing work?',
      a: 'We utilize compiled WebAssembly (Wasm) engines running directly inside your browser tab. Your files are converted in local memory blocks—meaning they are never uploaded to our servers, keeping them 100% private and offline.'
    },
    {
      q: 'Can I cancel or change my plan anytime?',
      a: 'Absolutely! You can upgrade, downgrade, or cancel your Pro subscription from your account profile instantly. There are no lock-in periods or termination penalties.'
    },
    {
      q: 'Is there a file capacity restriction?',
      a: 'Free Starter tiers support up to 15 MB file pools. Our Professional plan unlocks up to 500 MB file limits, which easily handles extremely dense, high-resolution graphic dossiers or architectural floorplans.'
    },
    {
      q: 'What payment options are supported?',
      a: 'We support all major global credit card networks (Visa, Mastercard, Amex, Discover) along with fast mobile solutions like Apple Pay and Google Pay via secure sandboxes.'
    }
  ];

  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      
      {/* Header Info */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <h2 className="text-3xl sm:text-4xl font-serif font-light tracking-tight mb-4">
          Honest Pricing. <span className="italic font-normal">No Hidden Surprises.</span>
        </h2>
        <p className={`text-xs sm:text-sm font-serif max-w-lg mx-auto ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
          Choose the plan that suits your conversion requirements. Start free and unlock advanced AI features whenever you need them.
        </p>

        {/* Toggle Billing */}
        <div className={`mt-8 inline-flex p-1 rounded-none border ${
          darkMode ? 'bg-[#121211] border-stone-800' : 'bg-[#FAF9F5] border-[#e6e2d8]'
        }`}>
          <button
            id="billing-monthly-btn"
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-none text-[10px] font-sans font-bold uppercase tracking-widest transition-all ${
              billingCycle === 'monthly'
                ? darkMode ? 'bg-[#bfa15f] text-black' : 'bg-[#8c1d1a] text-white'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Monthly Billing
          </button>
          <button
            id="billing-annual-btn"
            onClick={() => setBillingCycle('annually')}
            className={`px-4 py-2 rounded-none text-[10px] font-sans font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
              billingCycle === 'annually'
                ? darkMode ? 'bg-[#bfa15f] text-black' : 'bg-[#8c1d1a] text-white'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <span>Annual Billing</span>
            <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-none font-bold uppercase tracking-wider ${
              billingCycle === 'annually'
                ? 'bg-black/10 text-black dark:bg-white/10 dark:text-white'
                : darkMode ? 'bg-stone-800 text-stone-300' : 'bg-stone-200 text-stone-700'
            }`}>
              Save 25%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-20" id="pricing-plans-grid">
        {PRICING_PLANS.map((plan) => {
          const isPro = plan.popular;
          const price = billingCycle === 'annually' ? plan.priceAnnually : plan.priceMonthly;
          
          return (
            <div
              key={plan.id}
              id={`plan-card-${plan.id}`}
              className={`relative rounded-none p-8 border flex flex-col justify-between transition-all duration-300 ${
                isPro
                  ? darkMode 
                    ? 'border-[#bfa15f] bg-[#1a1a19] shadow-xl shadow-black/35 scale-[1.02]' 
                    : 'border-[#8c1d1a] bg-[#FAF9F5] shadow-lg shadow-stone-200/50 scale-[1.02]'
                  : darkMode 
                    ? 'border-stone-800 bg-[#121211]/80' 
                    : 'border-[#e6e2d8] bg-[#FAF9F5]/20'
              }`}
            >
              {/* Featured Badge */}
              {isPro && (
                <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] uppercase tracking-widest font-sans font-extrabold px-3.5 py-1 rounded-none border ${
                  darkMode ? 'bg-[#bfa15f] text-black border-[#bfa15f]' : 'bg-[#8c1d1a] text-white border-[#8c1d1a]'
                }`}>
                  {plan.badge}
                </span>
              )}

              <div>
                {/* Title */}
                <h3 className="font-serif font-medium text-xl tracking-tight mb-2 italic">{plan.name}</h3>
                <p className={`text-xs font-serif mb-6 leading-relaxed ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>{plan.description}</p>
                
                {/* Price Display */}
                <div className="flex items-baseline mb-6 border-b border-dashed border-stone-800 dark:border-stone-800/60 pb-6">
                  <span className="text-3xl sm:text-4xl font-serif font-light tracking-tight">${price}</span>
                  <span className="text-stone-400 text-xs ml-1 font-sans uppercase tracking-wider">/month</span>
                  {billingCycle === 'annually' && price > 0 && (
                    <span className="text-[9px] text-emerald-500 font-mono font-bold ml-3 uppercase bg-emerald-500/5 border border-emerald-500/20 px-2 py-0.5 rounded-none">
                      Annually
                    </span>
                  )}
                </div>

                {/* Features checklist */}
                <ul className="space-y-4 mb-8 text-xs">
                  {plan.features.map((feat, index) => (
                    <li key={index} className="flex items-start gap-2.5">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`} />
                      <span className={`font-serif ${darkMode ? 'text-stone-300' : 'text-stone-700'}`}>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Purchase Button Action */}
              <div>
                <button
                  id={`choose-plan-${plan.id}`}
                  onClick={() => {
                    if (plan.priceMonthly === 0) {
                      alert('You are already using the Free Starter plan! Explore the utilities dashboard.');
                    } else {
                      setSelectedPlan(plan);
                    }
                  }}
                  className={`w-full py-3 rounded-none text-[10px] font-sans font-bold uppercase tracking-widest transition-all cursor-pointer ${
                    plan.priceMonthly === 0
                      ? darkMode 
                        ? 'bg-stone-800 text-stone-300 border border-stone-700/40 hover:bg-stone-700' 
                        : 'bg-stone-200/60 text-stone-600 hover:bg-stone-200'
                      : isPro
                        ? darkMode 
                          ? 'bg-[#bfa15f] text-black hover:opacity-90' 
                          : 'bg-[#8c1d1a] text-white hover:opacity-90'
                        : darkMode 
                          ? 'bg-stone-800 text-stone-200 border border-stone-700/40 hover:bg-stone-700' 
                          : 'bg-[#1c1c1a] text-white hover:bg-stone-800'
                  }`}
                >
                  {plan.priceMonthly === 0 ? 'Current Starter Plan' : `Get Started with ${plan.name.split(' ')[0]}`}
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* FAQ Accordion segment */}
      <div className="max-w-3xl mx-auto border-t border-dashed border-[#e6e2d8] dark:border-stone-800 pt-14">
        <h3 className="font-serif font-light text-2xl text-center mb-10">Frequently Asked Questions</h3>
        
        <div className="space-y-4" id="faq-accordion">
          {faqs.map((faq, index) => {
            const isActive = activeFaq === index;
            return (
              <div
                key={index}
                onClick={() => setActiveFaq(isActive ? null : index)}
                className={`p-5 rounded-none border cursor-pointer transition-all duration-200 ${
                  isActive 
                    ? darkMode ? 'border-[#bfa15f] bg-[#bfa15f]/5' : 'border-[#8c1d1a] bg-[#8c1d1a]/5' 
                    : darkMode ? 'border-stone-800 bg-[#121211]/50 hover:bg-[#181817]' : 'border-[#e6e2d8] bg-[#FAF9F5]/40 hover:bg-[#FAF9F5]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-serif font-bold flex items-center gap-3">
                    <HelpCircle className={`w-4 h-4 shrink-0 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`} />
                    {faq.q}
                  </h4>
                  <span className="text-xs text-stone-400 font-mono font-bold">{isActive ? '−' : '+'}</span>
                </div>
                
                {isActive && (
                  <p className={`text-xs mt-4 leading-relaxed border-t border-dashed border-[#e6e2d8] dark:border-stone-800 pt-4 font-serif ${
                    darkMode ? 'text-stone-400' : 'text-stone-600'
                  }`}>
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Checkout Modal Simulator */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xs" onClick={closeCheckout}></div>
          
          <div className={`relative w-full max-w-md rounded-none p-8 shadow-2xl border transition-all ${
            darkMode ? 'bg-[#181817] border-[#2c2c2a] text-white' : 'bg-white border-[#e6e2d8] text-stone-800'
          }`}>
            <div className="absolute top-4 right-4">
              <button onClick={closeCheckout} className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-white font-mono text-sm">✕</button>
            </div>

            {checkoutStep === 'form' ? (
              <form onSubmit={handleCheckoutSubmit} className="space-y-6">
                <div>
                  <div className={`p-2.5 border rounded-none w-fit mb-3 ${darkMode ? 'border-[#333331] text-[#bfa15f]' : 'border-[#e6e2d8] text-[#8c1d1a]'}`}>
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif font-medium text-xl tracking-tight">Secure Checkout</h3>
                  <p className="text-xs font-serif text-stone-500 mt-1">
                    Complete membership setup for <span className={`font-bold ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`}>{selectedPlan.name}</span>.
                  </p>
                </div>

                {/* Simulated Pricing summary */}
                <div className={`p-4 rounded-none border flex items-center justify-between ${
                  darkMode ? 'bg-[#121211] border-stone-800' : 'bg-[#FAF9F5] border-[#e6e2d8]'
                }`}>
                  <div>
                    <p className="text-xs font-serif font-bold">{selectedPlan.name} billing info</p>
                    <p className="text-[10px] font-serif text-stone-500 mt-0.5">Billed {billingCycle}</p>
                  </div>
                  <p className="text-lg font-serif font-light">
                    ${billingCycle === 'annually' ? selectedPlan.priceAnnually : selectedPlan.priceMonthly}
                    <span className="text-xs text-stone-400">/mo</span>
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Customer Billing Email */}
                  <div>
                    <label className="block text-[9px] uppercase font-sans font-bold tracking-widest text-stone-400 mb-1.5">
                      Customer Billing Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={checkoutEmail}
                      disabled={isSessionLoggedIn}
                      onChange={(e) => setCheckoutEmail(e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-none text-xs border focus:outline-none focus:ring-0 ${
                        darkMode ? 'bg-[#121211] border-stone-800 text-white' : 'bg-white border-stone-300 text-stone-800'
                      } ${isSessionLoggedIn ? 'opacity-70 cursor-not-allowed' : ''}`}
                    />
                    {isSessionLoggedIn && (
                      <span className="text-[9px] text-emerald-500 mt-1 block font-serif">✓ Logged-in session active</span>
                    )}
                  </div>

                  {/* Card holder */}
                  <div>
                    <label className="block text-[9px] uppercase font-sans font-bold tracking-widest text-stone-400 mb-1.5">
                      Cardholder Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        className={`w-full pl-9 pr-4 py-2.5 rounded-none text-xs border focus:outline-none focus:ring-0 ${
                          darkMode ? 'bg-[#121211] border-stone-800 text-white' : 'bg-white border-stone-300 text-stone-800'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Card Number */}
                  <div>
                    <label className="block text-[9px] uppercase font-sans font-bold tracking-widest text-stone-400 mb-1.5">
                      Card Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="4111 2222 3333 4444"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className={`w-full pl-9 pr-4 py-2.5 rounded-none text-xs border focus:outline-none focus:ring-0 ${
                          darkMode ? 'bg-[#121211] border-stone-800 text-white' : 'bg-white border-stone-300 text-stone-800'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Row Expiry + CVV */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] uppercase font-sans font-bold tracking-widest text-stone-400 mb-1.5">
                        Expiration
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required
                          placeholder="MM/YY"
                          value={expiry}
                          onChange={(e) => setExpiry(e.target.value)}
                          className={`w-full pl-9 pr-4 py-2.5 rounded-none text-xs border focus:outline-none focus:ring-0 ${
                            darkMode ? 'bg-[#121211] border-stone-800 text-white' : 'bg-white border-stone-300 text-stone-800'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase font-sans font-bold tracking-widest text-stone-400 mb-1.5">
                        CVV / CVC
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type="password"
                          required
                          maxLength={4}
                          placeholder="•••"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value)}
                          className={`w-full pl-9 pr-4 py-2.5 rounded-none text-xs border focus:outline-none focus:ring-0 ${
                            darkMode ? 'bg-[#121211] border-stone-800 text-white' : 'bg-white border-stone-300 text-stone-800'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-dashed border-stone-800 flex items-center justify-between text-[10px] font-serif text-stone-500">
                  <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Secure SSL connection</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCardHolder('Production Developer');
                      setCardNumber('4111 2222 3333 4444');
                      setExpiry('12/28');
                      setCvv('123');
                    }}
                    className={`hover:underline font-bold ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`}
                  >
                    Quick Autofill
                  </button>
                </div>

                <button
                  type="submit"
                  className={`w-full py-3 rounded-none text-[10px] font-sans font-bold uppercase tracking-widest transition-all ${
                    darkMode 
                      ? 'bg-[#bfa15f] text-black hover:opacity-90' 
                      : 'bg-[#8c1d1a] text-white hover:opacity-90'
                  }`}
                >
                  Confirm Subscription
                </button>
              </form>
            ) : checkoutStep === 'loading' ? (
              <div className="py-12 text-center flex flex-col items-center justify-center">
                <Loader2 className={`w-10 h-10 animate-spin mb-4 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`} />
                <h4 className="font-serif font-medium text-lg mb-1 italic">Authorizing Subscription Token</h4>
                <p className="text-[10px] font-mono text-stone-500">Please do not refresh the local workspace pipeline...</p>
              </div>
            ) : (
              <div className="py-10 text-center flex flex-col items-center justify-center">
                <div className={`w-12 h-12 border rounded-none flex items-center justify-center mx-auto mb-4 ${
                  darkMode ? 'border-[#333331] text-[#bfa15f]' : 'border-[#e6e2d8] text-[#8c1d1a]'
                }`}>
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-medium text-xl mb-1 italic">Pro Membership Activated!</h3>
                <p className="text-xs font-serif text-stone-500 mb-6">Your account profile has been successfully upgraded to {selectedPlan.name}.</p>
                
                <button
                  onClick={closeCheckout}
                  className={`px-6 py-2.5 rounded-none text-[10px] font-sans font-bold uppercase tracking-widest transition-all ${
                    darkMode 
                      ? 'bg-[#bfa15f] text-black hover:opacity-90' 
                      : 'bg-[#8c1d1a] text-white hover:opacity-90'
                  }`}
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
