import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { useLocation } from 'wouter';
import { useUI } from '../../contexts/UIContext';

const PublicHeader: React.FC = () => {
  const [location] = useLocation();
  const { setShowLoginModal } = useUI();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Handle scroll events to adjust header styling
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      if (scrollTop > 50) {
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
  
  return (
    <header className={`bg-white fixed w-full z-50 transition-all duration-200 ${isScrolled ? 'shadow-md py-2' : 'py-4'}`}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <a href="/" className="text-xl md:text-2xl font-bold text-[#1E3A8A]">
            WILCOX ADVISORS
          </a>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a 
              href="#services" 
              className={`text-gray-700 hover:text-[#1E3A8A] transition-colors ${location === '#services' ? 'text-[#1E3A8A]' : ''}`}
            >
              Services
            </a>
            <a 
              href="#blog" 
              className={`text-gray-700 hover:text-[#1E3A8A] transition-colors ${location === '#blog' ? 'text-[#1E3A8A]' : ''}`}
            >
              Blog
            </a>
            <a 
              href="#about" 
              className={`text-gray-700 hover:text-[#1E3A8A] transition-colors ${location === '#about' ? 'text-[#1E3A8A]' : ''}`}
            >
              About
            </a>
            <a 
              href="#contact" 
              className={`text-gray-700 hover:text-[#1E3A8A] transition-colors ${location === '#contact' ? 'text-[#1E3A8A]' : ''}`}
            >
              Contact
            </a>
            <button 
              onClick={() => setShowLoginModal(true)}
              className="bg-[#1E3A8A] text-white px-5 py-2 rounded hover:bg-[#1E40AF] transition-colors"
            >
              Login
            </button>
          </nav>
          
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-gray-700 focus:outline-none"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4">
            <nav className="flex flex-col py-3 space-y-2">
              <a 
                href="#services" 
                className={`text-gray-700 hover:text-[#1E3A8A] py-2 ${location === '#services' ? 'text-[#1E3A8A]' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Services
              </a>
              <a 
                href="#blog" 
                className={`text-gray-700 hover:text-[#1E3A8A] py-2 ${location === '#blog' ? 'text-[#1E3A8A]' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Blog
              </a>
              <a 
                href="#about" 
                className={`text-gray-700 hover:text-[#1E3A8A] py-2 ${location === '#about' ? 'text-[#1E3A8A]' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </a>
              <a 
                href="#contact" 
                className={`text-gray-700 hover:text-[#1E3A8A] py-2 ${location === '#contact' ? 'text-[#1E3A8A]' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact
              </a>
              <button 
                onClick={() => {
                  setShowLoginModal(true);
                  setMobileMenuOpen(false);
                }}
                className="bg-[#1E3A8A] text-white px-5 py-2 rounded hover:bg-[#1E40AF] transition-colors w-full text-left mt-2"
              >
                Login
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default PublicHeader;