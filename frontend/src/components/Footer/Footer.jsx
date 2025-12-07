import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-spacer" aria-hidden="true" />
      <div className="footer-inner">
        <div className="footer-left">
          <span className="brand">Work Life Balancer</span>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <a className="footer-link" href="/about">About Us</a>
          <a className="footer-link" href="mailto:support@worklifebalancer.app">Contact</a>
          <a className="footer-link" href="/privacy" rel="noopener">Privacy</a>
          <a className="footer-link" href="/terms" rel="noopener">Terms</a>
        </nav>
      </div>
      <div className="footer-info">
        <p className="footer-contact">Email: nithinarcade2005@gmail.com</p>
        <p className="footer-copy">© {new Date().getFullYear()} Work Life Balancer. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
