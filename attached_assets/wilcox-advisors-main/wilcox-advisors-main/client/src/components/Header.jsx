// src/components/Header.jsx - Improved mobile responsiveness
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function Header({ setShowLoginModal }) {
  const { isLoggedIn, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Add scroll effect for better mobile UX
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLoginClick = () => {
    setShowLoginModal(true);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  const handleSectionClick = (section) => {
    if (window.location.pathname === '/') {
      document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(`/#${section}`);
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav 
      className={`bg-white shadow-md sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'py-2' : 'py-4'
      }`} 
      role="navigation" 
      aria-label="Main navigation"
    >
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link to="/" className="text-xl md:text-2xl text-blue-800 font-bold hover:text-blue-900 transition duration-200" aria-label="Home">
              WILCOX ADVISORS
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4 lg:space-x-8">
            <button 
              onClick={() => handleSectionClick('services')} 
              className="text-gray-700 hover:text-blue-800 font-medium px-2 py-1" 
              aria-label="Services section"
            >
              Services
            </button>
            <button 
              onClick={() => handleSectionClick('blog')} 
              className="text-gray-700 hover:text-blue-800 font-medium px-2 py-1" 
              aria-label="Blog section"
            >
              Blog
            </button>
            <button 
              onClick={() => handleSectionClick('about')} 
              className="text-gray-700 hover:text-blue-800 font-medium px-2 py-1" 
              aria-label="About section"
            >
              About
            </button>
            <button 
              onClick={() => handleSectionClick('contact')} 
              className="text-gray-700 hover:text-blue-800 font-medium px-2 py-1" 
              aria-label="Contact section"
            >
              Contact
            </button>
            {isLoggedIn ? (
              <>
                <Link 
                  to={isAdmin ? '/admin-dashboard' : '/client-dashboard'} 
                  className="px-4 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-900 transition duration-200" 
                  aria-label={isAdmin ? "Admin Dashboard" : "Client Dashboard"}
                >
                  Dashboard
                </Link>
                <button 
                  onClick={handleLogout} 
                  className="text-gray-700 hover:text-blue-800 font-medium" 
                  aria-label="Logout"
                >
                  Logout
                </button>
              </>
            ) : (
              <button 
                onClick={handleLoginClick} 
                className="px-4 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-900 transition duration-200" 
                aria-label="Login"
              >
                Login
              </button>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              className="text-gray-700 hover:text-blue-800 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md" 
              aria-label="Toggle mobile menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        <div className={`md:hidden transition-all duration-300 overflow-hidden ${isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="py-3 space-y-2 bg-white" role="menu">
            <button 
              onClick={() => handleSectionClick('services')} 
              className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-800 rounded-md" 
              aria-label="Services section"
            >
              Services
            </button>
            <button 
              onClick={() => handleSectionClick('blog')} 
              className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-800 rounded-md" 
              aria-label="Blog section"
            >
              Blog
            </button>
            <button 
              onClick={() => handleSectionClick('about')} 
              className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-800 rounded-md" 
              aria-label="About section"
            >
              About
            </button>
            <button 
              onClick={() => handleSectionClick('contact')} 
              className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-800 rounded-md" 
              aria-label="Contact section"
            >
              Contact
            </button>
            {isLoggedIn ? (
              <>
                <Link 
                  to={isAdmin ? '/admin-dashboard' : '/client-dashboard'} 
                  className="block w-full text-left px-4 py-3 bg-blue-800 text-white rounded-md hover:bg-blue-900" 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  aria-label={isAdmin ? "Admin Dashboard" : "Client Dashboard"}
                >
                  Dashboard
                </Link>
                <button 
                  onClick={handleLogout} 
                  className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-800 rounded-md" 
                  aria-label="Logout"
                >
                  Logout
                </button>
              </>
            ) : (
              <button 
                onClick={handleLoginClick} 
                className="block w-full text-left px-4 py-3 bg-blue-800 text-white rounded-md hover:bg-blue-900"
                aria-label="Login"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Header;
