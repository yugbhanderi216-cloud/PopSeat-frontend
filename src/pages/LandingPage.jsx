import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import logo from "./PopSeat_Logo.png";
/* ─── one-shot in-view reveal ─── */
function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

/* ─── FAQ accordion ─── */
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? 'open' : ''}`} onClick={() => setOpen(!open)}>
      <div className="faq-q">
        <span>{q}</span>
        <span className="faq-icon">{open ? '−' : '+'}</span>
      </div>
      {open && <div className="faq-a">{a}</div>}
    </div>
  );
}

/* ─── Pricing card ─── */
function PricingCard({ plan, subtitle, price, period, features, highlight }) {
  const navigate = useNavigate();
  return (
    <div className={`pricing-card ${highlight ? 'pricing-highlight' : ''}`}>
      {highlight && <div className="pricing-badge">Most Popular</div>}
      <div className="pricing-plan">{plan}</div>
      <div className="pricing-sub">{subtitle}</div>
      <div className="pricing-price">
        <span className="pricing-currency">₹</span>
        <span className="pricing-amount">{price}</span>
      </div>
      <div className="pricing-period">{period}</div>
      <ul className="pricing-features">
        {features.map((f, i) => (
          <li key={i}><span className="check">+</span>{f}</li>
        ))}
      </ul>
      <button
        className={`pricing-cta ${highlight ? 'pricing-cta-highlight' : ''}`}
        onClick={() => navigate('/login')}
      >
        Get Started
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════ */
const LandingPage = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('');
  const [activeTab, setActiveTab] = useState('owner');

  /* navbar shadow on scroll */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  /* active nav pill via IntersectionObserver */
  useEffect(() => {
    const ids = ['features', 'how-it-works', 'demo', 'pricing', 'faq', 'about', 'contact'];
    const obs = ids.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const o = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveNav(id); },
        { threshold: 0.15, rootMargin: '-80px 0px -30% 0px' }
      );
      o.observe(el);
      return o;
    });
    return () => obs.forEach((o) => o && o.disconnect());
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

  return (
    <div className="lp-root">

      {/* ══════════ NAVBAR ══════════ */}
      <nav className={`lp-nav ${scrolled ? 'lp-nav--scrolled' : ''}`}>
        <div
          className="lp-logo"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setActiveNav('');
          }}
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
              >
                {label}
                {activeNav === id && <span className="nav-pip" />}
              </a>
            </li>
          ))}
          <li className="lp-nav-mobile-cta">
            <button className="btn-ghost-v" onClick={() => navigate('/login')}>Login</button>
            <button className="btn-primary-v" onClick={() => navigate('/login')}>Get Started</button>
          </li>
        </ul>

        <div className="lp-nav-right">
          <button className="btn-ghost-v" onClick={() => navigate('/login')}>Login</button>
          <button className="btn-primary-v" onClick={() => navigate('/login')}>Get Started</button>
          <button
            className={`hamburger ${menuOpen ? 'hamburger--open' : ''}`}
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* ══════════ HERO — full width, no right column ══════════ */}
      <header className="lp-hero">
        <div className="hero-blob hero-blob--tl" />
        <div className="hero-blob hero-blob--br" />
        <div className="hero-dots-bg" />


        <div className="hero-inner">
          <div className="hero-pill">
            <span className="pill-dot" />
            Now live in 50+ cinemas across India
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
            <button className="btn-primary-v btn-hero" onClick={() => scrollTo('demo')}>
              See Live Preview 👀
            </button>
            <button className="btn-outline-v btn-hero" onClick={() => scrollTo('how-it-works')}>
              See How It Works
            </button>
          </div>

          <div className="hero-stats">
            {[
              ['12k+', 'Orders Delivered'],
              ['98%', 'Customer Satisfaction'],
              ['3 min', 'Avg. Delivery Time'],
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
          <svg viewBox="0 0 1440 56" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M0,28 C480,56 960,0 1440,28 L1440,56 L0,56 Z" fill="#F2F0FF" />
          </svg>
        </div>
      </header>

      {/* ══════════ TRUST MARQUEE ══════════ */}
      <section className="lp-trust">
        <p className="trust-label">Trusted by cinemas across India</p>
        <div className="trust-track">
          <div className="trust-inner">
            {['🎬 CineMax', '🍿 MovieTime', '🎟️ FilmCity', '📽️ ScreenHub', '🎞️ ReelBox', '🎭 CityPlex', '🎬 StarCinema', '🍿 BigScreen',
              '🎬 CineMax', '🍿 MovieTime', '🎟️ FilmCity', '📽️ ScreenHub'].map((n, i) => (
                <span key={i} className="trust-logo">{n}</span>
              ))}
          </div>
        </div>
      </section>

      {/* ══════════ PROBLEM → SOLUTION ══════════ */}
      <section className="lp-problem">
        <div className="section-inner">
          <div className="section-tag">The Problem</div>
          <h2 className="section-h2">Cinema food is <em>broken.</em></h2>
          <p className="section-sub">Every visit means the same frustrating experience.</p>

          <div className="problem-grid">
            {[
              { icon: '⏳', title: 'Endless Queues', desc: 'Customers wait 15–20 min at counters — and miss the movie.' },
              { icon: '😤', title: 'Missed Scenes', desc: 'Walking back and forth disrupts the entire movie experience.' },
              { icon: '🐌', title: 'Slow Service', desc: 'Staff juggle orders manually with no digital tracking.' },
              { icon: '📋', title: 'Revenue Leakage', desc: 'No data on peak times, best sellers, or customer patterns.' },
            ].map(({ icon, title, desc }) => (
              <div className="problem-card" key={title}>
                <div className="problem-icon">{icon}</div>
                <h4>{title}</h4>
                <p>{desc}</p>
              </div>
            ))}
          </div>

          <div className="solution-bridge">
            <div className="bridge-line" /><div className="bridge-label">✦ PopSeat fixes all of this ✦</div><div className="bridge-line" />
          </div>

          <div className="solution-grid">
            {[
              { icon: '📱', title: 'Scan & Order in 30s', desc: "Customers order from their seat — no app, just a browser." },
              { icon: '⚡', title: 'Instant Alerts', desc: "Staff receive live orders on their dashboard the moment they're placed." },
              { icon: '🚀', title: '3× Faster Service', desc: 'Parallel digital orders eliminate bottlenecks at counters.' },
              { icon: '📊', title: 'Rich Analytics', desc: 'Owners see revenue, top items, peak hours — in real time.' },
            ].map(({ icon, title, desc }) => (
              <div className="solution-card" key={title}>
                <div className="solution-icon">{icon}</div>
                <h4>{title}</h4>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ══════════ FEATURES ══════════ */}
      <section id="features" className="lp-features" ref={featRef}>
        <div className="section-inner">
          <div className="section-tag">Features</div>
          <h2 className="section-h2">Everything your cinema needs.</h2>
          <p className="section-sub">One platform. Three powerful dashboards. Zero complexity.</p>
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
                <h3>{title}</h3><p>{desc}</p>
                <div className="feat-tags">
                  {tags.map((t) => <span key={t} className={`feat-tag feat-tag--${color}`}>{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section id="how-it-works" className="lp-steps" ref={stepsRef}>
        <div className="section-inner">
          <div className="section-tag">How It Works</div>
          <h2 className="section-h2">Up and running in 3 steps.</h2>
          <p className="section-sub">For your customer — it takes under 60 seconds.</p>
          <div className={`steps-row ${stepsIn ? 'animate-in' : ''}`}>
            {[
              { num: '01', icon: '📷', title: 'Scan the QR', desc: "Customer points their camera at the QR code on their seat. Opens the menu instantly in the browser — no app needed." },
              { num: '02', icon: '🛒', title: 'Order Food', desc: 'Browse the full menu, add items to cart, choose extras, and place the order with a single tap.' },
              { num: '03', icon: '🎬', title: 'Enjoy the Movie', desc: 'A worker receives the order alert, prepares it, and delivers it to the seat. Zero interruption.' },
            ].map(({ num, icon, title, desc }, i) => (
              <React.Fragment key={num}>
                <div className="step-card" style={{ '--delay': `${i * 120}ms` }}>
                  <div className="step-num">{num}</div>
                  <div className="step-icon-wrap">{icon}</div>
                  <h3>{title}</h3><p>{desc}</p>
                </div>
                {i < 2 && <div className="step-arrow">→</div>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ PRICING ══════════ */}
      <section id="pricing" className="lp-pricing" ref={priceRef}>
        <div className="section-inner">
          <div className="section-tag">Pricing</div>
          <h2 className="section-h2">Simple, transparent pricing.</h2>
          <p className="section-sub">Plans billed per 30 days. Login to activate your cinema.</p>
          <div className={`pricing-grid ${priceIn ? 'animate-in' : ''}`}>
            {PLANS.map((p) => <PricingCard key={p.plan} {...p} />)}
          </div>
          <p className="pricing-note">
            🔒 Plans are available after login. Existing plan holders can upgrade anytime from the Owner dashboard.
          </p>
        </div>
      </section>

      {/* ══════════ DEMO ══════════ */}
      <section id="demo" className="lp-demo" ref={demoRef}>
        <div className="section-inner">
          <div className="section-tag">Live Demo</div>
          <h2 className="section-h2">See it in action.</h2>
          <p className="section-sub">Switch between dashboards to explore every role.</p>

          <div className="demo-tabs">
            {[['owner', '👑 Owner Dashboard'], ['worker', '⚡ Worker Dashboard'], ['customer', '📱 Customer View']].map(([k, l]) => (
              <button key={k} className={`demo-tab ${activeTab === k ? 'active' : ''}`} onClick={() => setActiveTab(k)}>{l}</button>
            ))}
          </div>

          <div className={`demo-screen ${demoIn ? 'animate-in' : ''}`}>
            {activeTab === 'owner' && (
              <div className="demo-mock demo-mock--owner">
                <div className="demo-mock-header"><span>PopSeat — Owner Dashboard</span><span className="demo-mock-dot" /></div>
                <div className="demo-stats-row">
                  {[['₹24,500', "Today's Revenue"], ['143', 'Orders Today'], ['4.8★', 'Avg Rating']].map(([v, l]) => (
                    <div className="demo-stat-box" key={l}><span className="demo-stat-val">{v}</span><span className="demo-stat-lbl">{l}</span></div>
                  ))}
                </div>
                <div className="demo-chart-area">
                  <div className="demo-chart-label">Revenue — last 7 days</div>
                  <div className="demo-bars">
                    {[40, 65, 50, 80, 55, 90, 75].map((h, i) => (
                      <div key={i} className="demo-bar-wrap">
                        <div className="demo-bar" style={{ height: `${h}%` }} />
                        <span className="demo-bar-day">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'worker' && (
              <div className="demo-mock demo-mock--worker">
                <div className="demo-mock-header"><span>PopSeat — Worker Dashboard</span><span className="demo-mock-dot" /></div>
                <div className="worker-orders">
                  {[{ seat: 'A-5', items: 'Butter Popcorn, Coke', status: 'new' }, { seat: 'B-12', items: 'Nachos, Coffee', status: 'preparing' }, { seat: 'C-3', items: 'Combo Meal', status: 'ready' }].map(({ seat, items, status }) => (
                    <div className="worker-order-card" key={seat}>
                      <div className="worker-seat">Seat {seat}</div>
                      <div className="worker-items">{items}</div>
                      <div className={`worker-status worker-status--${status}`}>
                        {status === 'new' ? '🔔 New' : status === 'preparing' ? '🍳 Preparing' : '✅ Ready'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === 'customer' && (
              <div className="demo-mock demo-mock--customer">
                <div className="demo-mock-header"><span>Customer Ordering — Seat D-4</span><span className="demo-mock-dot" /></div>
                <div className="cust-items">
                  {[{ name: 'Butter Popcorn (L)', price: '₹150', emoji: '🍿' }, { name: 'Cold Coffee', price: '₹90', emoji: '☕' }, { name: 'Veg Combo', price: '₹220', emoji: '🌯' }].map(({ name, price, emoji }) => (
                    <div className="cust-item" key={name}>
                      <span>{emoji}</span><span className="cust-name">{name}</span><span className="cust-price">{price}</span>
                      <button className="cust-add" onClick={() => alert('Added to cart')}>
                        +
                      </button>
                    </div>
                  ))}
                </div>
                <div className="cust-cart-bar">
                  <span>Cart · ₹460</span>
                  <button
                    className="cust-order-btn"
                    onClick={(e) => {
                      e.target.innerText = "✔ Ordered";
                      e.target.style.background = "#22c55e";
                    }}
                  >
                    Place Order →
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="demo-cta-row">
            <button className="btn-primary-v btn-large" onClick={() => scrollTo('features')}>
              Explore More →
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
            <div className="testimonial-author">
              <div className="author-avatar">RK</div>
              <div>
                <strong>Rahul Kapoor</strong>
                <span>Owner, FilmCity Multiplex · Mumbai</span>
              </div>
            </div>
            <div className="testimonial-stars">★★★★★</div>
          </div>
        </div>
      </section>

      {/* ══════════ FAQ ══════════ */}
      <section id="faq" className="lp-faq" ref={faqRef}>
        <div className="section-inner section-inner--narrow">
          <div className="section-tag">FAQ</div>
          <h2 className="section-h2">Questions? We've got answers.</h2>
          <div className={`faq-list ${faqIn ? 'animate-in' : ''}`}>
            {FAQS.map((f) => <FaqItem key={f.q} {...f} />)}
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

          {/* NEW GRID */}
          <div className="about-grid">
            <div className="about-card">
              <h4>🎯 Our Mission</h4>
              <p>Make cinema dining effortless with QR-based ordering.</p>
            </div>

            <div className="about-card">
              <h4>🚀 Our Vision</h4>
              <p>Become the standard operating system for cinemas.</p>
            </div>

            <div className="about-card">
              <h4>📊 Impact</h4>
              <p>Helping theaters increase revenue and improve service speed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ CONTACT ══════════ */}
      <section id="contact" className="lp-contact">
        <div className="section-inner section-inner--center">
          <div className="section-tag">Contact</div>
          <h2 className="section-h2">Get in touch</h2>
          <p className="section-sub">
            Have questions or want to onboard your cinema?
          </p>

          <div className="contact-box">
            <p>📧 support@popseat.com</p>
            <p>📞 +91 98765 43210</p>
          </div>
        </div>
      </section>


      {/* ══════════ FINAL CTA ══════════ */}
      <section className="lp-final-cta">
        <div className="final-cta-blob" />
        <div className="section-inner section-inner--center">
          <h2 className="final-cta-h2">Ready to transform your<br />cinema experience?</h2>
          <p className="final-cta-sub">Join 50+ cinemas already running PopSeat. Login to choose your plan and go live in 24 hours.</p>
          <div className="final-cta-btns single">
            <button className="btn-primary-v btn-xl" onClick={() => navigate('/login')}>
              Login & Get Started 🚀
            </button>
          </div>
          <p className="final-cta-note">No credit card required · Cancel anytime</p>
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
          </div>
          <div className="footer-links-group">
            <strong>Product</strong>
            <a onClick={() => scrollTo('features')}>Features</a>
            <a onClick={() => scrollTo('pricing')}>Pricing</a>
            <a onClick={() => scrollTo('demo')}>Demo</a>
          </div>
          <div className="footer-links-group">
            <strong>Company</strong>
            <a onClick={() => scrollTo('about')}>About</a><a href="#">Blog</a><a href="#">Careers</a>
          </div>
          <div className="footer-links-group">
            <strong>Support</strong>
            <a onClick={() => scrollTo('faq')}>FAQ</a>
            <a onClick={() => scrollTo('contact')}>Contact</a><a href="#">Privacy Policy</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} PopSeat. All rights reserved.</span>
          <span>Made with ❤️ for cinemas</span>
        </div>
      </footer>

      {/* ══════════ MOBILE STICKY CTA ══════════ */}
      <div className="mobile-sticky-cta">
        <button className="btn-primary-v" onClick={() => navigate('/login')}>🚀 Login &amp; Get Started</button>
      </div>

    </div>
  );
};

export default LandingPage;