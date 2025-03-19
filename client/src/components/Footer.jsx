import React from 'react';
import { Link } from 'wouter';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  const footerLinks = {
    services: [
      { text: 'Bookkeeping', href: '/#services' },
      { text: 'Tax Planning', href: '/#services' },
      { text: 'Financial Reporting', href: '/#services' },
      { text: 'Business Advisory', href: '/#services' },
      { text: 'Audit Support', href: '/#services' }
    ],
    company: [
      { text: 'About Us', href: '/#about' },
      { text: 'Our Team', href: '/#about' },
      { text: 'Testimonials', href: '/#testimonials' },
      { text: 'Careers', href: '/#about' },
      { text: 'Privacy Policy', href: '/privacy' }
    ],
    resources: [
      { text: 'Blog', href: '/blog' },
      { text: 'Financial Tools', href: '/tools' },
      { text: 'FAQs', href: '/faqs' },
      { text: 'Tax Calendar', href: '/tax-calendar' }
    ],
    contact: [
      { text: 'Contact Us', href: '/#contact' },
      { text: 'Support', href: '/support' },
      { text: 'Client Portal', href: '/login' }
    ]
  };
  
  return (
    <footer className="bg-gray-900 text-white pt-16 pb-6">
      <div className="container mx-auto px-4">
        {/* Footer content grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Company information */}
          <div className="lg:col-span-2">
            <div className="text-2xl font-bold mb-4">
              Wilcox<span className="text-blue-400">Advisors</span>
            </div>
            <p className="text-gray-400 mb-4 max-w-md">
              Empowering small businesses with strategic financial guidance and expert accounting services to achieve sustainable growth and success.
            </p>
            <div className="flex space-x-4">
              {/* LinkedIn */}
              <a href="#" className="bg-gray-800 p-2 rounded-full hover:bg-blue-800 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z" />
                </svg>
              </a>
              {/* Twitter/X */}
              <a href="#" className="bg-gray-800 p-2 rounded-full hover:bg-blue-800 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                </svg>
              </a>
              {/* Facebook */}
              <a href="#" className="bg-gray-800 p-2 rounded-full hover:bg-blue-800 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                </svg>
              </a>
              {/* Instagram */}
              <a href="#" className="bg-gray-800 p-2 rounded-full hover:bg-blue-800 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            </div>
          </div>
          
          {/* Footer links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Services</h3>
            <ul className="space-y-2">
              {footerLinks.services.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.href} 
                    className="text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    {link.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.href} 
                    className="text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    {link.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-2">
              {footerLinks.contact.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.href} 
                    className="text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    {link.text}
                  </a>
                </li>
              ))}
            </ul>
            
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Contact Info</h3>
              <p className="text-gray-400">123 Financial Street, Suite 100</p>
              <p className="text-gray-400">New York, NY 10001</p>
              <p className="text-gray-400 mt-2">(555) 123-4567</p>
              <p className="text-gray-400">info@wilcoxadvisors.com</p>
            </div>
          </div>
        </div>
        
        {/* Bottom footer */}
        <div className="border-t border-gray-800 pt-6 mt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm mb-4 md:mb-0">
              &copy; {currentYear} Wilcox Advisors. All rights reserved.
            </p>
            <div className="flex space-x-4">
              <Link href="/privacy">
                <a className="text-gray-500 text-sm hover:text-blue-400">Privacy Policy</a>
              </Link>
              <Link href="/terms">
                <a className="text-gray-500 text-sm hover:text-blue-400">Terms of Service</a>
              </Link>
              <Link href="/sitemap">
                <a className="text-gray-500 text-sm hover:text-blue-400">Sitemap</a>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;