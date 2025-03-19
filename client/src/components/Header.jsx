import React from 'react';
import { Link } from 'wouter';

const Header = ({ onLoginClick }) => {
  return (
    <header className="py-4 px-6 bg-white shadow-sm">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-[#1E3A8A]">
          WILCOX ADVISORS
        </Link>
        
        <nav className="hidden md:flex space-x-8">
          <Link 
            href="/services" 
            className="text-gray-700 hover:text-[#1E3A8A] transition-colors"
          >
            Services
          </Link>
          <Link 
            href="/blog" 
            className="text-gray-700 hover:text-[#1E3A8A] transition-colors"
          >
            Blog
          </Link>
          <Link 
            href="/about" 
            className="text-gray-700 hover:text-[#1E3A8A] transition-colors"
          >
            About
          </Link>
          <Link 
            href="/contact" 
            className="text-gray-700 hover:text-[#1E3A8A] transition-colors"
          >
            Contact
          </Link>
          <button
            onClick={onLoginClick}
            className="bg-[#1E3A8A] text-white px-4 py-2 rounded hover:bg-blue-800 transition-colors"
          >
            Login
          </button>
        </nav>
        
        <div className="md:hidden">
          <button className="text-gray-700 hover:text-[#1E3A8A]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;