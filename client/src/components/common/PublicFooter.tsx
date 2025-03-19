import React from 'react';

const PublicFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-12">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <h2 className="text-xl font-bold mb-2">WILCOX ADVISORS</h2>
        <p className="text-blue-100 mb-6">Financial Solutions for Small Businesses</p>
        
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-3">Contact Us</h3>
            <p className="text-blue-100">123 Business Ave, Suite 200</p>
            <p className="text-blue-100">Charlotte, NC 28202</p>
            <p className="text-blue-100 mt-2">(704) 555-1234</p>
            <p className="text-blue-100">info@wilcoxadvisors.com</p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="#services" className="text-blue-100 hover:text-white transition-colors">Services</a></li>
              <li><a href="#blog" className="text-blue-100 hover:text-white transition-colors">Blog</a></li>
              <li><a href="#about" className="text-blue-100 hover:text-white transition-colors">About</a></li>
              <li><a href="#contact" className="text-blue-100 hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3">Business Hours</h3>
            <p className="text-blue-100">Monday - Friday: 9:00 AM - 5:00 PM</p>
            <p className="text-blue-100">Saturday - Sunday: Closed</p>
            <p className="text-blue-100 mt-2">Schedule a consultation anytime</p>
          </div>
        </div>
        
        <div className="border-t border-blue-700 pt-6">
          <p className="text-blue-100">
            &copy; {currentYear} Wilcox Advisors. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;