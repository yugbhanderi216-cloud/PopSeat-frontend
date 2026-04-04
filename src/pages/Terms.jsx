import React from 'react';
import { useNavigate } from 'react-router-dom';
import logo from './PopSeat_Logo.png';
import './Legal.css';

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="legal-page">
      <header className="legal-header">
        <div className="legal-logo" onClick={() => navigate('/')}>
          <img src={logo} alt="PopSeat Logo" className="legal-logo-img" />
          <span>PopSeat</span>
        </div>
      </header>
      <main className="legal-content">
        <h1>Terms &amp; Conditions</h1>
        <p>Last updated: {new Date().toLocaleDateString()}</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using PopSeat, you agree to be bound by these Terms &amp; Conditions.
          If you do not agree to all the terms, then you may not access the service.
        </p>

        <h2>2. User Accounts</h2>
        <p>
          You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password.
          You agree not to disclose your password to any third party.
        </p>

        <h2>3. Subscription &amp; Payments</h2>
        <p>
          Some parts of the service are billed on a subscription basis. You will be billed in advance on a recurring and periodic basis depending on your plan selection.
        </p>

        <h2>4. Limitation of Liability</h2>
        <p>
          In no event shall PopSeat, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
        </p>

        <h2>5. Changes to Terms</h2>
        <p>
          We reserve the right, at our sole discretion, to modify or replace these Terms at any time. What constitutes a material change will be determined at our sole discretion.
        </p>
      </main>
      <footer className="legal-footer">
        © {new Date().getFullYear()} PopSeat. All rights reserved.
      </footer>
    </div>
  );
};

export default Terms;
