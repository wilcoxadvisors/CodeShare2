import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import LoginModal from '../components/LoginModal.tsx';
import HeroSection from '../components/sections/HeroSection.tsx';
import ChecklistSection from '../components/sections/ChecklistSection.tsx';
import ServicesSection from '../components/sections/ServicesSection.tsx';
import BlogSection from '../components/sections/BlogSection.tsx';
import TestimonialsSection from '../components/sections/TestimonialsSection.tsx';
import AboutSection from '../components/sections/AboutSection.tsx';
import ContactSection from '../components/sections/ContactSection.tsx';
import ChatWidget from '../components/common/ChatWidget.tsx';
import { useUI } from '../contexts/UIContext.tsx';

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  category: string;
  image: string;
}

const Home: React.FC = () => {
  const { isChatOpen, setIsChatOpen } = useUI();
  const [showChecklistForm, setShowChecklistForm] = useState(false);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);

  // Simulating dashboard data that would normally come from an API
  const dashboardData = {
    about: "At Wilcox Advisors, we specialize in financial solutions for small businesses. From startups to growing companies, we provide the expertise you need to succeed—built to scale with you every step of the way.",
  };

  // This would normally fetch from an API
  useEffect(() => {
    // Simulating API fetch for blog posts
    // In a real implementation, this would make an API call to get blog posts
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main content with padding for fixed header */}
      <div className="pt-16">
        <HeroSection />
        <ChecklistSection setShowChecklistForm={setShowChecklistForm} />
        <ServicesSection />
        <BlogSection blogPosts={blogPosts} />
        <TestimonialsSection />
        <AboutSection aboutText={dashboardData.about} />
        <ContactSection />
      </div>
      
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
      
      {/* Login Modal */}
      <LoginModal />
    </div>
  );
};

export default Home;