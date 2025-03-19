import React from 'react';
import HeroSection from '../components/sections/HeroSection';
import ChecklistSection from '../components/sections/ChecklistSection';
import ServicesSection from '../components/sections/ServicesSection';
import TestimonialsSection from '../components/sections/TestimonialsSection';
import BlogSection from '../components/sections/BlogSection';
import AboutSection from '../components/sections/AboutSection';
import ContactSection from '../components/sections/ContactSection';

const Home = ({ setShowConsultationForm }) => {
  return (
    <main className="min-h-screen">
      <HeroSection setShowConsultationForm={setShowConsultationForm} />
      <ChecklistSection />
      <ServicesSection />
      <TestimonialsSection />
      <BlogSection />
      <AboutSection />
      <ContactSection />
    </main>
  );
};

export default Home;