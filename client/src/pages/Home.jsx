import React from 'react';
import HeroSection from '../components/sections/HeroSection';
import ServicesSection from '../components/sections/ServicesSection';
import TestimonialsSection from '../components/sections/TestimonialsSection';
import AboutSection from '../components/sections/AboutSection';
import ContactSection from '../components/sections/ContactSection';
import ChecklistSection from '../components/sections/ChecklistSection';
import ChatWidget from '../components/common/ChatWidget';

const Home = ({ setShowConsultationForm }) => {
  return (
    <main>
      <HeroSection />
      <ChecklistSection />
      <ServicesSection />
      <TestimonialsSection />
      <AboutSection />
      <ContactSection />
      <ChatWidget />
    </main>
  );
};

export default Home;