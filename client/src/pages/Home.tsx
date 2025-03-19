import React from 'react';
import HeroSection from '../components/sections/HeroSection';
import ServicesSection from '../components/sections/ServicesSection';
import AboutSection from '../components/sections/AboutSection';
import TestimonialsSection from '../components/sections/TestimonialsSection';
import ContactSection from '../components/sections/ContactSection';
import ChatWidget from '../components/common/ChatWidget';
import { useUI } from '../contexts/UIContext';

interface HomeProps {
  setShowConsultationForm?: (show: boolean) => void;
}

const Home: React.FC<HomeProps> = ({ setShowConsultationForm }) => {
  const { isChatOpen, setIsChatOpen } = useUI();

  const handleConsultClick = () => {
    if (setShowConsultationForm) {
      setShowConsultationForm(true);
    }
  };

  return (
    <div>
      <HeroSection onConsultClick={handleConsultClick} />
      <ServicesSection />
      <AboutSection />
      <TestimonialsSection />
      <ContactSection />
      <ChatWidget isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      
      {/* Chat button */}
      <button 
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-800 text-white p-4 rounded-full shadow-lg z-40 hover:bg-blue-900 transition-colors"
        style={{ display: isChatOpen ? 'none' : 'block' }}
        aria-label="Open chat"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>
    </div>
  );
};

export default Home;