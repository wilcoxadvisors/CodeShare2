import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import HeroSection from '../components/sections/HeroSection';
import ChecklistSection from '../components/sections/ChecklistSection';
import ServicesSection from '../components/sections/ServicesSection';
import BlogSection from '../components/sections/BlogSection';
import TestimonialsSection from '../components/sections/TestimonialsSection';
import AboutSection from '../components/sections/AboutSection';
import ContactSection from '../components/sections/ContactSection';
import ChatWidget from '../components/common/ChatWidget';
import { useUI } from '../contexts/UIContext';

interface HomeProps {
  setShowConsultationForm?: (show: boolean) => void;
}

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  category: string;
  image: string;
}

const Home: React.FC<HomeProps> = ({ setShowConsultationForm }) => {
  const { isChatOpen, setIsChatOpen } = useUI();
  const [showChecklistForm, setShowChecklistForm] = useState(false);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);

  const handleConsultClick = () => {
    if (setShowConsultationForm) {
      setShowConsultationForm(true);
    }
  };

  // Simulating dashboard data that would normally come from an API
  const dashboardData = {
    hero: { 
      headline: "Financial Expertise for Your Business Success", 
      subtext: "Professional accounting and financial services tailored for small businesses. We handle the numbers so you can focus on growth." 
    },
    about: "At Wilcox Advisors, we specialize in financial solutions for small businesses. From startups to growing companies, we provide the expertise you need to succeed—built to scale with you every step of the way.",
  };

  // This would normally fetch from an API
  useEffect(() => {
    // Simulating API fetch for blog posts
    // In a real implementation, this would make an API call to get blog posts
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main content */}
      <HeroSection onConsultClick={handleConsultClick} />
      <ChecklistSection setShowChecklistForm={setShowChecklistForm} />
      <ServicesSection />
      <BlogSection blogPosts={blogPosts} />
      <TestimonialsSection />
      <AboutSection aboutText={dashboardData.about} />
      <ContactSection />
      
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