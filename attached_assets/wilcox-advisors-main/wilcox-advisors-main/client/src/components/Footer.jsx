import React from 'react';

function Footer() {
  return (
    <footer className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-8" role="contentinfo" aria-label="Footer">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <h3 className="text-xl font-bold mb-3">Wilcox Advisors</h3>
        <p className="text-blue-100 mb-6">Professional financial services tailored for small businesses.</p>
        
        <div className="border-t border-blue-700 pt-4">
          <p className="text-sm text-blue-100">© 2025 Wilcox Advisors. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
