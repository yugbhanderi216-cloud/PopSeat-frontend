import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import logo from "./PopSeat_Logo.png";

/* ─── one-shot in-view reveal ─── */
function useInView(threshold = 0.12) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

/* ─── ripple effect hook ─── */
function useRipple() {
  const handleClick = useCallback((e) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple-el';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;position:absolute;border-radius:50%;`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }, []);
  return handleClick;
}

/* ─── FAQ item ─── */
function FaqItem({ q, a, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`faq-item ${open ? 'open' : ''}`}
      onClick={() => setOpen(o => !o)}
      style={{ '--faq-delay': `${index * 65}ms` }}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && setOpen(o => !o)}
    >
      <div className="faq-q">
        <span>{q}</span>
        <span className={`faq-icon ${open ? 'faq-icon--open' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M3 6L8 11L13 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      <div className={`faq-a ${open ? 'faq-a--open' : ''}`}>
        <div className="faq-a-inner">{a}</div>
      </div>
    </div>
  );
}

/* ─── Pricing card ─── */
function PricingCard({ plan, subtitle, price, period, features, highlight, index }) {
  const navigate = useNavigate();
  const ripple = useRipple();
  return (
    <div
      className={`pricing-card ${highlight ? 'pricing-highlight' : ''}`}
      style={{ '--delay': `${index * 90}ms` }}
    >
      {highlight && (
        <div className="pricing-badge">
          <span className="badge-glow" />
          Most Popular
        </div>
      )}
      <div className="pricing-plan">{plan}</div>
      <div className="pricing-sub">{subtitle}</div>
      <div className="pricing-price">
        <span className="pricing-currency">₹</span>
        <span className="pricing-amount">{price}</span>
      </div>
      <div className="pricing-period">{period}</div>
      <div className="pricing-divider" />
      <ul className="pricing-features">
        {features.map((f, i) => (
          <li key={i}>
            <span className="check">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            {f}
          </li>
        ))}
      </ul>
      <button
        className={`pricing-cta ${highlight ? 'pricing-cta-highlight' : ''}`}
        onClick={(e) => { ripple(e); navigate('/login'); }}
      >
        Get Started
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════ */
const LandingPage = () => {
  const navigate = useNavigate();
  const ripple = useRipple();

  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setProgress] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('');
  const [activeTab, setActiveTab] = useState('owner');

  /* scroll: navbar + progress bar */
  useEffect(() => {
    const fn = () => {
      setScrolled(window.scrollY > 60);
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docH > 0 ? (window.scrollY / docH) * 100 : 0);
    };
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  /* active nav section via IntersectionObserver */
  useEffect(() => {
    const ids = ['features', 'how-it-works', 'demo', 'pricing', 'faq', 'about', 'contact'];
    const obs = ids.map(id => {
      const el = document.getElementById(id);
      if (!el) return null;
      const o = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveNav(id); },
        { threshold: 0.15, rootMargin: '-80px 0px -30% 0px' }
      );
      o.observe(el);
      return o;
    });
    return () => obs.forEach(o => o && o.disconnect());
  }, []);

  /* close mobile menu on outside click */
  useEffect(() => {
    const close = () => setMenuOpen(false);
    if (menuOpen) document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpen]);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
    setActiveNav(id);
  };

  /* section reveal refs */
  const [featRef, featIn] = useInView();
  const [stepsRef, stepsIn] = useInView();
  const [priceRef, priceIn] = useInView();
  const [demoRef, demoIn] = useInView();
  const [faqRef, faqIn] = useInView();

  const NAV = [
    ['features', 'Features'],
    ['how-it-works', 'How It Works'],
    ['pricing', 'Pricing'],
    ['demo', 'Demo'],
    ['faq', 'FAQ'],
    ['about', 'About'],
    ['contact', 'Contact'],
  ];

  const PLANS = [
    {
      plan: 'Basic', subtitle: '1 Theater', price: '800', period: 'per 30 days',
      features: ['Up to 1 cinema location', 'Unlimited worker accounts', 'QR seat ordering', 'Analytics dashboard'],
    },
    {
      plan: 'Standard', subtitle: '2 Theaters', price: '1,300', period: 'per 30 days',
      features: ['Up to 2 cinema locations', 'Unlimited worker accounts', 'QR seat ordering', 'Analytics dashboard'],
    },
    {
      plan: 'Pro', subtitle: '3 Theaters', price: '2,000', period: 'per 30 days',
      features: ['Up to 3 cinema locations', 'Unlimited worker accounts', 'QR seat ordering', 'Analytics dashboard'],
      highlight: true,
    },
    {
      plan: 'Enterprise', subtitle: '4 Theaters', price: '2,500', period: 'per 30 days',
      features: ['Up to 4 cinema locations', 'Unlimited worker accounts', 'QR seat ordering', 'Analytics dashboard'],
    },
  ];

  const FAQS = [
    { q: 'How does the QR ordering system work?', a: "Each seat has a unique QR code. When a customer scans it with their phone camera, they're taken directly to a digital menu personalised to that cinema. They can browse, add items to their cart, and place an order — all without leaving their seat. The order appears instantly on the worker dashboard." },
    { q: 'What payment methods are supported?', a: 'PopSeat integrates with Razorpay and PayU — supporting credit/debit cards, UPI, wallets, and net banking. All transactions are encrypted end-to-end. You can also enable cash-on-delivery for cinemas that prefer offline payment.' },
    { q: 'How long does setup take?', a: "Most cinemas are live within 24 hours. You sign up, upload your menu, print the QR codes we generate for each seat, and you're ready. No app download required for customers — it's entirely browser-based." },
    { q: 'Can I manage multiple theaters under one account?', a: 'Yes — depending on your plan you can manage 1 to 4 theater locations from a single owner dashboard. Each theater gets its own menu, QR codes, and analytics.' },
    { q: 'Can I customise the menu and pricing?', a: 'Absolutely. The Owner dashboard includes a full menu builder where you can add items, set prices, upload photos, toggle availability, and run time-based offers (e.g., Happy Hour combos).' },
  ];

  const DEMO_BARS = [
    { h: 40, v: '₹14k' }, { h: 65, v: '₹22k' }, { h: 50, v: '₹17k' },
    { h: 80, v: '₹28k' }, { h: 55, v: '₹19k' }, { h: 90, v: '₹31k' }, { h: 75, v: '₹24k' },
  ];

  return (
    <div className="lp-root">

      {/* ── scroll progress ── */}
      <div className="scroll-progress-bar" style={{ width: `${scrollProgress}%` }} />

      {/* ══════════ NAVBAR ══════════ */}
      <nav className={`lp-nav ${scrolled ? 'lp-nav--scrolled' : ''}`}>
        <div
          className="lp-logo"
          onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setActiveNav(''); }}
          role="button" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <img src={logo} alt="PopSeat Logo" className="lp-logo-img" />
          <span>PopSeat</span>
        </div>

        <ul className={`lp-nav-links ${menuOpen ? 'open' : ''}`}>
          {NAV.map(([id, label]) => (
            <li key={id}>
              <a
                className={activeNav === id ? 'nav-active' : ''}
                onClick={() => scrollTo(id)}
                role="button" tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && scrollTo(id)}
              >
                {label}
                {activeNav === id && <span className="nav-pip" />}
              </a>
            </li>
          ))}
          <li className="lp-nav-mobile-cta">
            <button className="btn-ghost-v" onClick={() => navigate('/login')}>Login</button>
            <button className="btn-primary-v" onClick={(e) => { ripple(e); navigate('/login'); }}>Get Started</button>
          </li>
        </ul>

        <div className="lp-nav-right">
          <button className="btn-ghost-v" onClick={() => navigate('/login')}>Login</button>
          <button className="btn-primary-v" onClick={(e) => { ripple(e); navigate('/login'); }}>Get Started →</button>
          <button
            className={`hamburger ${menuOpen ? 'hamburger--open' : ''}`}
            onClick={(e) => { e.stopPropagation(); setMenuOpen(m => !m); }}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* ══════════ HERO ══════════ */}
      <header className="lp-hero">
        <div className="hero-blob hero-blob--tl" />
        <div className="hero-blob hero-blob--br" />
        <div className="hero-blob hero-blob--center" />
        <div className="hero-grid-bg" />

        <div className="hero-inner">
          <div className="hero-pill">
            <span className="pill-dot" />
            Now live in 50+ cinemas across India
            <span className="pill-arrow">→</span>
          </div>

          <h1 className="hero-h1">
            Cinema food,<br />
            <span className="hero-gradient">delivered to your seat.</span>
          </h1>

          <p className="hero-sub">
            Customers scan a QR code at their seat, order in seconds, and enjoy the movie —
            no queues, no interruptions. Your staff gets live order alerts instantly.
          </p>

          <div className="hero-ctas">
            <button className="btn-primary-v btn-hero" onClick={(e) => { ripple(e); scrollTo('demo'); }}>
              See Live Preview <span className="btn-emoji">👀</span>
            </button>
            <button className="btn-outline-v btn-hero" onClick={() => scrollTo('how-it-works')}>
              How It Works
            </button>
          </div>

          <div className="hero-stats">
            {[
              ['12k+', 'Orders Delivered'],
              ['98%', 'Satisfaction Rate'],
              ['3 min', 'Avg. Delivery'],
              ['50+', 'Cinemas Live'],
            ].map(([num, label]) => (
              <div className="hero-stat" key={label}>
                <span className="stat-num">{num}</span>
                <span className="stat-label">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-wave">
          <svg viewBox="0 0 1440 64" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M0,32 C360,64 720,0 1080,32 C1260,48 1380,40 1440,32 L1440,64 L0,64 Z" fill="#F2F0FF" />
          </svg>
        </div>
      </header>

      {/* ══════════ TRUST MARQUEE ══════════ */}
      <section className="lp-trust">
        <p className="trust-label">Trusted by cinemas across India</p>
        <div className="trust-track">
          <div className="trust-inner">
            {['🎬 CineMax', '🍿 MovieTime', '🎟️ FilmCity', '📽️ ScreenHub', '🎞️ ReelBox', '🎭 CityPlex', '🎬 StarCinema', '🍿 BigScreen',
              '🎬 CineMax', '🍿 MovieTime', '🎟️ FilmCity', '📽️ ScreenHub', '🎞️ ReelBox', '🎭 CityPlex'].map((n, i) => (
                <span key={i} className="trust-logo">{n}</span>
              ))}
          </div>
        </div>
      </section>

      {/* ══════════ PROBLEM → SOLUTION ══════════ */}
      <section className="lp-problem">
        <div className="section-inner section-inner--center">
          <div className="section-tag">The Problem</div>
          <h2 className="section-h2">Cinema food is <em>broken.</em></h2>
          <p className="section-sub" style={{ marginBottom: '48px' }}>Every visit means the same frustrating experience.</p>

          <div className="problem-grid">
            {[
              { icon: '⏳', title: 'Endless Queues', desc: 'Customers wait 15–20 min at counters — and miss the movie.' },
              { icon: '😤', title: 'Missed Scenes', desc: 'Walking back and forth disrupts the entire movie experience.' },
              { icon: '🐌', title: 'Slow Service', desc: 'Staff juggle orders manually with no digital tracking.' },
              { icon: '📋', title: 'Revenue Leakage', desc: 'No data on peak times, best sellers, or customer patterns.' },
            ].map(({ icon, title, desc }) => (
              <div className="problem-card" key={title}>
                <span className="problem-icon">{icon}</span>
                <h4>{title}</h4>
                <p>{desc}</p>
              </div>
            ))}
          </div>

          <div className="solution-bridge">
            <div className="bridge-line" />
            <div className="bridge-label">✦ PopSeat fixes all of this ✦</div>
            <div className="bridge-line" />
          </div>

          <div className="solution-grid">
            {[
              { icon: '📱', title: 'Scan & Order in 30s', desc: 'Customers order from their seat — no app, just a browser.' },
              { icon: '⚡', title: 'Instant Alerts', desc: "Staff receive live orders on their dashboard the moment they're placed." },
              { icon: '🚀', title: '3× Faster Service', desc: 'Parallel digital orders eliminate bottlenecks at counters.' },
              { icon: '📊', title: 'Rich Analytics', desc: 'Owners see revenue, top items, peak hours — in real time.' },
            ].map(({ icon, title, desc }) => (
              <div className="solution-card" key={title}>
                <span className="solution-icon">{icon}</span>
                <h4>{title}</h4>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ FEATURES ══════════ */}
      <section id="features" className="lp-features" ref={featRef}>
        <div className="section-inner section-inner--center">
          <div className="section-tag">Features</div>
          <h2 className="section-h2">Everything your cinema needs.</h2>
          <p className="section-sub" style={{ marginBottom: '52px' }}>One platform. Three powerful dashboards. Zero complexity.</p>
          <div className={`features-grid ${featIn ? 'animate-in' : ''}`}>
            {[
              { icon: '📱', color: 'violet', title: 'QR Seat Ordering', desc: 'Each seat has a unique QR. Customers scan, browse the menu, and order — all from their phone browser, no app download required.', tags: ['Instant Setup', 'No App'] },
              { icon: '⚡', color: 'amber', title: 'Real-Time Dashboard', desc: "Workers see incoming orders the instant they're placed. Mark orders as preparing, ready, or delivered — all live.", tags: ['Live Updates', 'Status Tracking'] },
              { icon: '📊', color: 'green', title: 'Owner Analytics', desc: 'Deep insights: daily revenue, best-selling items, peak hour heatmaps, and seat-level order data to maximise upsells.', tags: ['Revenue Insights', 'Heatmaps'] },
              { icon: '🔐', color: 'blue', title: 'Multi-Role System', desc: 'Separate logins for owners, workers, and customers. Each role gets a purpose-built interface with the right permissions.', tags: ['3 Roles', 'Secure Access'] },
              { icon: '🎛️', color: 'pink', title: 'Menu Builder', desc: 'Add items, upload photos, set categories, toggle availability, and run time-limited combos — all from the owner panel.', tags: ['Drag & Drop', 'Live Edits'] },
              { icon: '🖨️', color: 'teal', title: 'QR Code Generator', desc: 'Generate and download print-ready QR codes for every seat in your cinema. New screen? Done in minutes.', tags: ['Print Ready', 'Bulk Export'] },
            ].map(({ icon, color, title, desc, tags }, i) => (
              <div className="feat-card" key={title} style={{ '--delay': `${i * 80}ms` }}>
                <div className={`feat-icon feat-icon--${color}`}>{icon}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
                <div className="feat-tags">
                  {tags.map(t => <span key={t} className={`feat-tag feat-tag--${color}`}>{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section id="how-it-works" className="lp-steps" ref={stepsRef}>
        <div className="section-inner section-inner--center">
          <div className="section-tag">How It Works</div>
          <h2 className="section-h2">Up and running in 3 steps.</h2>
          <p className="section-sub" style={{ marginBottom: '52px' }}>For your customer — it takes under 60 seconds.</p>

          <div className={`steps-row ${stepsIn ? 'animate-in' : ''}`}>
            {[
              { num: '01', icon: '📷', title: 'Scan the QR', desc: "Customer points their camera at the QR code on their seat. Opens the menu instantly in the browser — no app needed." },
              { num: '02', icon: '🛒', title: 'Order Food', desc: 'Browse the full menu, add items to cart, choose extras, and place the order with a single tap.' },
              { num: '03', icon: '🎬', title: 'Enjoy the Movie', desc: 'A worker receives the order alert, prepares it, and delivers it to the seat. Zero interruption.' },
            ].map(({ num, icon, title, desc }, i) => (
              <React.Fragment key={num}>
                <div className="step-card" style={{ '--delay': `${i * 120}ms` }}>
                  <div className="step-num">{num}</div>
                  <span className="step-icon-wrap">{icon}</span>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
                {i < 2 && (
                  <div className="step-connector">
                    <svg className="step-connector-arrow" width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
                      <path d="M5 11H17M17 11L12 6M17 11L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* ══════════ ANIMATED WORKFLOW ══════════ */}
          <div className={`workflow-anim-container ${stepsIn ? 'animate-in' : ''}`}>

            <div className="workflow-board">
              <div className="wf-bg-grid" />

              {/* NODE 1: CUSTOMER PHONE */}
              <div className="wf-node wf-client">
                <div className="wf-label">Customer 📱<br /><span>Seat D-4</span></div>
                <div className="wf-device-mockup phone-mockup">
                  <div className="phone-notch" />
                  <div className="phone-screen">
                    <div className="ph-header" />
                    <div className="ph-hero">
                      <div className="ph-hero-img" />
                      <div className="ph-hero-text" />
                    </div>
                    <div className="ph-items">
                      <div className="ph-item" />
                      <div className="ph-item ph-item-anim" />
                    </div>
                    <div className="ph-cta ph-cta-anim">Place Order</div>
                  </div>
                </div>
              </div>

              {/* PATH 1 */}
              <div className="wf-path path-1">
                <div className="wf-line" />
                <div className="wf-packet p1" />
                <div className="wf-packet p1" style={{ animationDelay: '1.2s' }} />
                <div className="wf-packet p1" style={{ animationDelay: '2.4s' }} />
              </div>

              {/* NODE 2: CLOUD */}
              <div className="wf-node wf-cloud">
                <div className="wf-label">PopSeat Cloud ⚡</div>
                <div className="cloud-ring">
                  <div className="cloud-core">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M13 10V3L4 14H11V21L20 10H13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="cloud-pulse" />
                  <div className="cloud-pulse" style={{ animationDelay: '1s' }} />
                </div>
              </div>

              {/* PATH 2 */}
              <div className="wf-path path-2">
                <div className="wf-line" />
                <div className="wf-packet p2" />
                <div className="wf-packet p2" style={{ animationDelay: '1.2s' }} />
                <div className="wf-packet p2" style={{ animationDelay: '2.4s' }} />
              </div>

              {/* NODE 3: WORKER DASHBOARD */}
              <div className="wf-node wf-worker">
                <div className="wf-label">Kitchen iPad 👨‍🍳<br /><span>Order Received</span></div>
                <div className="wf-device-mockup tablet-mockup">
                  <div className="tab-sidebar">
                    <div className="tab-menu-item" />
                    <div className="tab-menu-item" />
                    <div className="tab-menu-item" />
                  </div>
                  <div className="tab-main">
                    <div className="tab-header" />
                    <div className="tab-grid">
                      <div className="tab-card st-1" />
                      <div className="tab-card st-2" />
                      <div className="tab-card incoming-card" />
                      <div className="tab-card st-3" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ══════════ PRICING ══════════ */}
      <section id="pricing" className="lp-pricing" ref={priceRef}>
        <div className="section-inner section-inner--center">
          <div className="section-tag">Pricing</div>
          <h2 className="section-h2">Simple, transparent pricing.</h2>
          <p className="section-sub" style={{ marginBottom: '52px' }}>Plans billed per 30 days. Login to activate your cinema.</p>
          <div className={`pricing-grid ${priceIn ? 'animate-in' : ''}`}>
            {PLANS.map((p, i) => <PricingCard key={p.plan} {...p} index={i} />)}
          </div>
          <p className="pricing-note">
            🔒 Plans are available after login. Existing plan holders can upgrade anytime from the Owner dashboard.
          </p>
        </div>
      </section>

      {/* ══════════ DEMO ══════════ */}
      <section id="demo" className="lp-demo" ref={demoRef}>
        <div className="section-inner section-inner--center">
          <div className="section-tag">Live Demo</div>
          <h2 className="section-h2">See it in action.</h2>
          <p className="section-sub" style={{ marginBottom: '32px' }}>Switch between dashboards to explore every role.</p>

          <div className="demo-tabs">
            {[['owner', '👑', 'Owner'], ['worker', '⚡', 'Worker'], ['customer', '📱', 'Customer']].map(([k, emoji, l]) => (
              <button key={k} className={`demo-tab ${activeTab === k ? 'active' : ''}`} onClick={() => setActiveTab(k)}>
                <span className="demo-tab-emoji">{emoji}</span>
                <span>{l} Dashboard</span>
              </button>
            ))}
          </div>

          <div className={`demo-screen ${demoIn ? 'animate-in' : ''}`}>
            {/* window chrome */}
            <div className="demo-window-bar">
              <div className="demo-window-dots">
                <span className="dot dot--red" /><span className="dot dot--yellow" /><span className="dot dot--green" />
              </div>
              <div className="demo-window-title">
                {activeTab === 'owner' && 'PopSeat — Owner Dashboard'}
                {activeTab === 'worker' && 'PopSeat — Worker Dashboard'}
                {activeTab === 'customer' && 'Customer Ordering — Seat D-4'}
              </div>
              <div className="demo-window-live"><span className="live-dot" />LIVE</div>
            </div>

            <div className="demo-content">
              {/* OWNER */}
              {activeTab === 'owner' && (
                <div className="demo-mock demo-mock--owner">
                  <div className="demo-stats-row">
                    {[['₹24,500', "Today's Revenue", '+18%'], ['143', 'Orders Today', '+24'], ['4.8★', 'Avg Rating', '+0.2']].map(([v, l, d]) => (
                      <div className="demo-stat-box" key={l}>
                        <span className="demo-stat-val">{v}</span>
                        <span className="demo-stat-lbl">{l}</span>
                        <span className="demo-stat-delta">{d}</span>
                      </div>
                    ))}
                  </div>
                  <div className="demo-chart-area">
                    <div className="demo-chart-header">
                      <span className="demo-chart-label">Revenue — last 7 days</span>
                      <span className="demo-chart-total">₹1,24,200 total</span>
                    </div>
                    <div className="demo-bars">
                      {DEMO_BARS.map(({ h, v }, i) => (
                        <div key={i} className="demo-bar-wrap" style={{ '--bar-delay': `${i * 60}ms` }}>
                          <span className="demo-bar-val" style={{ opacity: h > 70 ? 1 : 0.55 }}>{v}</span>
                          <div className="demo-bar" style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }} />
                          <span className="demo-bar-day">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* WORKER */}
              {activeTab === 'worker' && (
                <div className="demo-mock demo-mock--worker">
                  <div className="worker-summary">
                    <div className="worker-count"><span>12</span>Active Orders</div>
                    <div className="worker-count worker-count--done"><span>87</span>Delivered Today</div>
                  </div>
                  <div className="worker-orders">
                    {[
                      { seat: 'A-5', items: 'Butter Popcorn (L), Coke', status: 'new', time: '2m ago' },
                      { seat: 'B-12', items: 'Nachos, Coffee', status: 'preparing', time: '5m ago' },
                      { seat: 'C-3', items: 'Veg Combo Meal', status: 'ready', time: '8m ago' },
                    ].map(({ seat, items, status, time }) => (
                      <div className="worker-order-card" key={seat}>
                        <div className="worker-seat-badge">Seat {seat}</div>
                        <div className="worker-items">{items}</div>
                        <div className="worker-time">{time}</div>
                        <div className={`worker-status worker-status--${status}`}>
                          {status === 'new' ? '🔔 New' : status === 'preparing' ? '🍳 Preparing' : '✅ Ready'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CUSTOMER */}
              {activeTab === 'customer' && (
                <div className="demo-mock demo-mock--customer">
                  <div className="cust-hero">
                    <div className="cust-cinema-name">🎬 CineMax — Hall 3</div>
                    <div className="cust-seat-badge">Seat D-4</div>
                  </div>
                  <div className="cust-category-bar">
                    {['All', 'Snacks', 'Drinks', 'Combos'].map((c, i) => (
                      <span key={c} className={`cust-cat ${i === 0 ? 'active' : ''}`}>{c}</span>
                    ))}
                  </div>
                  <div className="cust-items">
                    {[
                      { name: 'Butter Popcorn (L)', price: '₹150', emoji: '🍿', popular: true },
                      { name: 'Cold Coffee', price: '₹90', emoji: '☕', popular: false },
                      { name: 'Veg Combo', price: '₹220', emoji: '🌯', popular: true },
                    ].map(({ name, price, emoji, popular }) => (
                      <div className="cust-item" key={name}>
                        <span className="cust-emoji">{emoji}</span>
                        <div className="cust-item-info">
                          <span className="cust-name">{name}</span>
                          {popular && <span className="cust-popular">Popular</span>}
                        </div>
                        <span className="cust-price">{price}</span>
                        <button className="cust-add" onClick={() => { }}>+</button>
                      </div>
                    ))}
                  </div>
                  <div className="cust-cart-bar">
                    <div className="cust-cart-info">
                      <span className="cart-count">3 items</span>
                      <span className="cart-total">₹460</span>
                    </div>
                    <button
                      className="cust-order-btn"
                      onClick={e => {
                        const btn = e.currentTarget;
                        btn.textContent = '✔ Ordered!';
                        btn.classList.add('ordered');
                      }}
                    >
                      Place Order →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="demo-cta-row">
            <button className="btn-primary-v btn-large" onClick={(e) => { ripple(e); scrollTo('features'); }}>
              Explore All Features →
            </button>
          </div>
        </div>
      </section>

      {/* ══════════ TESTIMONIAL ══════════ */}
      <section className="lp-testimonial">
        <div className="section-inner">
          <div className="testimonial-card">
            <div className="quote-mark">"</div>
            <p className="testimonial-text">
              We switched to PopSeat six months ago. Counter queues dropped by 70%,
              our concession revenue went up 40%, and customers actually thank us now
              for the smooth experience. It paid for itself in the first week.
            </p>
            <div className="testimonial-footer">
              <div className="testimonial-author">
                <div className="author-avatar">RK</div>
                <div>
                  <strong>Rahul Kapoor</strong>
                  <span>Owner, FilmCity Multiplex · Mumbai</span>
                </div>
              </div>
              <div className="testimonial-stars">
                {[1, 2, 3, 4, 5].map(i => <span key={i} className="star">★</span>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ FAQ ══════════ */}
      <section id="faq" className="lp-faq" ref={faqRef}>
        <div className="section-inner section-inner--narrow">
          <div className="section-tag">FAQ</div>
          <h2 className="section-h2">Questions? We've got answers.</h2>
          <div className={`faq-list ${faqIn ? 'animate-in' : ''}`} style={{ marginTop: '40px' }}>
            {FAQS.map((f, i) => <FaqItem key={f.q} {...f} index={i} />)}
          </div>
        </div>
      </section>

      {/* ══════════ ABOUT ══════════ */}
      <section id="about" className="lp-about">
        <div className="section-inner section-inner--center">
          <div className="section-tag">About</div>
          <h2 className="section-h2">Built for modern cinemas</h2>
          <p className="section-sub">
            PopSeat helps cinemas eliminate queues, boost revenue, and deliver a seamless movie experience.
          </p>
          <div className="about-grid">
            {[
              { icon: '🎯', title: 'Our Mission', desc: 'Make cinema dining effortless with QR-based ordering that works everywhere.' },
              { icon: '🚀', title: 'Our Vision', desc: 'Become the standard operating system for cinema operations across India.' },
              { icon: '📊', title: 'Our Impact', desc: 'Helping theaters increase revenue and dramatically improve service speed.' },
            ].map(({ icon, title, desc }) => (
              <div className="about-card" key={title}>
                <div className="about-card-icon">{icon}</div>
                <h4>{title}</h4>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ CONTACT ══════════ */}
      <section id="contact" className="lp-contact">
        <div className="section-inner section-inner--center">
          <div className="section-tag">Contact</div>
          <h2 className="section-h2">Get in touch</h2>
          <p className="section-sub">
            Have questions or want to onboard your cinema? We respond within 2 hours.
          </p>
          <div className="contact-grid">
            <div className="contact-card">
              <div className="contact-icon">📧</div>
              <div className="contact-label">Email Us</div>
              <a href="mailto:support@popseat.com" className="contact-value">support@popseat.com</a>
            </div>
            <div className="contact-card">
              <div className="contact-icon">📞</div>
              <div className="contact-label">Call Us</div>
              <a href="tel:+919876543210" className="contact-value">+91 98765 43210</a>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ FINAL CTA ══════════ */}
      <section className="lp-final-cta">
        <div className="final-cta-blob final-cta-blob--1" />
        <div className="final-cta-blob final-cta-blob--2" />
        <div className="section-inner section-inner--center">
          <div className="final-cta-eyebrow">Join 50+ cinemas already live</div>
          <h2 className="final-cta-h2">Ready to transform your<br />cinema experience?</h2>
          <p className="final-cta-sub">Login to choose your plan and go live in under 24 hours.</p>
          <div className="final-cta-btns">
            <button className="btn-primary-v btn-xl" onClick={(e) => { ripple(e); navigate('/login'); }}>
              Login &amp; Get Started 🚀
            </button>
          </div>
          <p className="final-cta-note">No credit card required · Cancel anytime · Setup in 24 hours</p>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="lp-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="lp-logo footer-logo">
              <img src={logo} alt="PopSeat Logo" className="lp-logo-img footer-logo-img" />
              <span>PopSeat</span>
            </div>
            <p>Modern cinema food ordering — built for speed, delight, and revenue.</p>
            <div className="footer-badge">Made with ❤️ in India</div>
          </div>
          <div className="footer-links-group">
            <strong>Product</strong>
            <a onClick={() => scrollTo('features')} role="button" tabIndex={0}>Features</a>
            <a onClick={() => scrollTo('pricing')} role="button" tabIndex={0}>Pricing</a>
            <a onClick={() => scrollTo('demo')} role="button" tabIndex={0}>Demo</a>
          </div>
          <div className="footer-links-group">
            <strong>Company</strong>
            <a onClick={() => scrollTo('about')} role="button" tabIndex={0}>About</a>
            <a href="#">Blog</a>
            <a href="#">Careers</a>
          </div>
          <div className="footer-links-group">
            <strong>Support</strong>
            <a onClick={() => scrollTo('faq')} role="button" tabIndex={0}>FAQ</a>
            <a onClick={() => scrollTo('contact')} role="button" tabIndex={0}>Contact</a>
            <a onClick={() => navigate('/privacy')} role="button" tabIndex={0}>Privacy Policy</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} PopSeat. All rights reserved.</span>
          <span className="footer-bottom-right">
            <a onClick={() => navigate('/terms')} role="button" tabIndex={0}>Terms</a>
            <a onClick={() => navigate('/privacy')} role="button" tabIndex={0}>Privacy</a>
            <a href="#">Cookies</a>
          </span>
        </div>
      </footer>

      {/* ══════════ MOBILE STICKY CTA ══════════ */}
      <div className="mobile-sticky-cta">
        <button className="btn-primary-v" onClick={(e) => { ripple(e); navigate('/login'); }}>
          🚀 Login &amp; Get Started
        </button>
      </div>

    </div>
  );
};

export default LandingPage;