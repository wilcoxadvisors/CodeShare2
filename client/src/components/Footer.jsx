import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">WILCOX ADVISORS</h2>
          <p className="text-sm text-gray-300 mb-6">
            Financial Solutions for Small Businesses
          </p>
          
          <div className="flex flex-wrap justify-center gap-8 mb-8">
            <div>
              <h3 className="text-sm font-semibold uppercase mb-3">Services</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="#services" className="hover:text-white transition-colors">Bookkeeping</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">Financial Reporting</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">Cash Flow Management</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">Business Planning</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold uppercase mb-3">Company</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="#about" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#testimonials" className="hover:text-white transition-colors">Client Stories</a></li>
                <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="/login" className="hover:text-white transition-colors">Client Login</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold uppercase mb-3">Connect</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="#contact" className="hover:text-white transition-colors">info@wilcoxadvisors.com</a></li>
                <li><a href="#contact" className="hover:text-white transition-colors">(555) 123-4567</a></li>
                <li><a href="#contact" className="hover:text-white transition-colors">123 Financial St, Suite 100</a></li>
                <li><a href="#contact" className="hover:text-white transition-colors">New York, NY 10001</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-blue-700 pt-6">
            <p className="text-sm text-gray-300">
              &copy; {currentYear} Wilcox Advisors. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;