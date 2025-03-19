import React, { useState, useEffect } from 'react';

const Header = ({ setShowLoginModal }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled ? 'bg-blue-800 py-2 shadow-md' : 'bg-transparent py-4'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <a href="/" className="flex items-center">
              <img
                src="/images/logo.svg" 
                alt="Wilcox Advisors" 
                className="h-10 w-auto"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                }}
              />
              <span className="text-white text-xl font-bold ml-2">WILCOX ADVISORS</span>
            </a>
          </div>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-8 text-white items-center">
            <a href="/#services" className="hover:text-blue-200 transition-colors">Services</a>
            <a href="/#about" className="hover:text-blue-200 transition-colors">About</a>
            <a href="/#contact" className="hover:text-blue-200 transition-colors">Contact</a>
            <button
              onClick={() => setShowLoginModal(true)}
              className="bg-white text-blue-800 px-4 py-2 rounded-md font-medium hover:bg-gray-100 transition-colors"
            >
              Client Login
            </button>
          </nav>
          
          {/* Mobile Nav Toggle */}
          <button 
            className="md:hidden text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>
      
      {/* Mobile Nav Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-blue-800 mt-2 px-4 py-5">
          <nav className="flex flex-col space-y-4 text-white text-center">
            <a 
              href="/#services" 
              className="hover:text-blue-200 transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Services
            </a>
            <a 
              href="/#about" 
              className="hover:text-blue-200 transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              About
            </a>
            <a 
              href="/#contact" 
              className="hover:text-blue-200 transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Contact
            </a>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                setShowLoginModal(true);
              }}
              className="bg-white text-blue-800 px-4 py-2 rounded-md font-medium hover:bg-gray-100 transition-colors"
            >
              Client Login
            </button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;