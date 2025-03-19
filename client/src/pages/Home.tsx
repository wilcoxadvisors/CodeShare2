import React from 'react';
import { MessageCircle } from 'lucide-react';
import HeroSection from '../components/sections/HeroSection';
import ServicesSection from '../components/sections/ServicesSection';
import AboutSection from '../components/sections/AboutSection';
import TestimonialsSection from '../components/sections/TestimonialsSection';
import ContactSection from '../components/sections/ContactSection';
import StatsSection from '../components/sections/StatsSection';
import TrustedBySection from '../components/sections/TrustedBySection';
import WhyChooseUsSection from '../components/sections/WhyChooseUsSection';
import LeadershipSection from '../components/sections/LeadershipSection';
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
    <div className="flex flex-col min-h-screen">
      {/* Main content */}
      <main>
        {/* Hero Section */}
        <HeroSection onConsultClick={handleConsultClick} />
        
        {/* Stats Cards */}
        <StatsSection />
        
        {/* Trusted By */}
        <TrustedBySection />
        
        {/* Services */}
        <ServicesSection />
        
        {/* Why Choose Us */}
        <WhyChooseUsSection />
        
        {/* Testimonials */}
        <TestimonialsSection />
        
        {/* Leadership Team */}
        <LeadershipSection />
        
        {/* About */}
        <AboutSection />
        
        {/* Contact */}
        <ContactSection />
      </main>
      
      {/* Footer would go here */}
      
      {/* Chat Widget */}
      <ChatWidget isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      
      {/* Chat button */}
      <button 
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-800 text-white p-4 rounded-full shadow-lg z-40 hover:bg-blue-900 transition-colors"
        style={{ display: isChatOpen ? 'none' : 'block' }}
        aria-label="Open chat"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );
};

export default Home;