import React from 'react';
import { useNavigate } from 'react-router-dom';
import logo from './PopSeat_Logo.png';
import './Legal.css';

const Privacy = () => {
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
        <h1>Privacy Policy</h1>
        <p>Last updated: {new Date().toLocaleDateString()}</p>

        <h2>1. Information We Collect</h2>
        <p>
          We collect information you provide directly to us, such as when you create an account, update your profile, use the interactive features of our services, or communicate with us.
        </p>

        <h2>2. How We Use Your Information</h2>
        <p>
          We use the information we collect to provide, maintain, and improve our services, to process transactions, to send you related information, and to monitor and analyze trends, usage, and activities in connection with our services.
        </p>

        <h2>3. Sharing of Information</h2>
        <p>
          We may share personal information with vendors, consultants, and other service providers who need access to such information to carry out work on our behalf. We do not sell your personal data.
        </p>

        <h2>4. Security</h2>
        <p>
          We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.
        </p>

        <h2>5. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at support@popseat.com.
        </p>
      </main>
      <footer className="legal-footer">
        © {new Date().getFullYear()} PopSeat. All rights reserved.
      </footer>
    </div>
  );
};

export default Privacy;
