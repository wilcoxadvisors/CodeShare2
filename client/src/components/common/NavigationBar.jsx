import React, { useState, useEffect } from 'react';

const NavigationBar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  return (
    <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
      isScrolled ? 'bg-white shadow-md py-2' : 'bg-transparent py-4'
    }`}>
      <div className="container mx-auto px-4 flex justify-between items-center">
        {/* Logo */}
        <a href="#" className="flex items-center">
          <span className={`text-2xl font-bold ${isScrolled ? 'text-blue-800' : 'text-white'}`}>
            Wilcox Advisors
          </span>
        </a>
        
        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-8">
          <a 
            href="#services" 
            className={`text-sm font-medium hover:text-blue-500 transition-colors ${
              isScrolled ? 'text-gray-800' : 'text-white'
            }`}
          >
            Services
          </a>
          <a 
            href="#about" 
            className={`text-sm font-medium hover:text-blue-500 transition-colors ${
              isScrolled ? 'text-gray-800' : 'text-white'
            }`}
          >
            About
          </a>
          <a 
            href="#testimonials" 
            className={`text-sm font-medium hover:text-blue-500 transition-colors ${
              isScrolled ? 'text-gray-800' : 'text-white'
            }`}
          >
            Testimonials
          </a>
          <a 
            href="#contact" 
            className={`text-sm font-medium hover:text-blue-500 transition-colors ${
              isScrolled ? 'text-gray-800' : 'text-white'
            }`}
          >
            Contact
          </a>
          <a 
            href="/login" 
            className="bg-blue-800 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Client Login
          </a>
        </div>
        
        {/* Mobile menu button */}
        <button 
          onClick={toggleMobileMenu}
          className="md:hidden focus:outline-none"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-6 w-6 ${isScrolled ? 'text-gray-800' : 'text-white'}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} 
            />
          </svg>
        </button>
      </div>
      
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white shadow-lg">
          <div className="container mx-auto px-4 py-3 space-y-3">
            <a 
              href="#services" 
              className="block text-gray-800 hover:text-blue-500 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Services
            </a>
            <a 
              href="#about" 
              className="block text-gray-800 hover:text-blue-500 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              About
            </a>
            <a 
              href="#testimonials" 
              className="block text-gray-800 hover:text-blue-500 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Testimonials
            </a>
            <a 
              href="#contact" 
              className="block text-gray-800 hover:text-blue-500 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Contact
            </a>
            <a 
              href="/login" 
              className="block bg-blue-800 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Client Login
            </a>
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavigationBar;