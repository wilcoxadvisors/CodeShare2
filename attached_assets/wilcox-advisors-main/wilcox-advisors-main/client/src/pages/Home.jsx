// src/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUI } from '../contexts/UIContext';
import HeroSection from '../components/sections/HeroSection';
import ChecklistSection from '../components/sections/ChecklistSection';
import ServicesSection from '../components/sections/ServicesSection';
import BlogSection from '../components/sections/BlogSection';
import TestimonialsSection from '../components/sections/TestimonialsSection';
import AboutSection from '../components/sections/AboutSection';
import ContactSection from '../components/sections/ContactSection';
import ChecklistModal from '../components/modals/ChecklistModal';
import ChatWidget from '../components/common/ChatWidget';

const servicesList = [
  { id: 'bookkeeping', title: 'Bookkeeping', description: 'Full-service bookkeeping including transaction coding and reconciliations' },
  { id: 'monthlyFinancials', title: 'Monthly Financial Package', description: 'Comprehensive monthly financial statements with analysis' },
  { id: 'cashFlow', title: 'Cash Flow Management', description: 'Detailed cash flow tracking and forecasting' },
  { id: 'customReporting', title: 'Custom Reporting', description: 'Tailored financial reports for your specific needs' },
  { id: 'budgeting', title: 'Budgeting & Forecasting', description: 'Development and monitoring of budgets and forecasts' },
  { id: 'controllerCFO', title: 'Outsourced Controller/CFO Services', description: 'Strategic financial oversight and planning tailored to your business' },
];

// Sample blog posts for fallback when API is unavailable
const fallbackBlogPosts = [
  {
    _id: '1',
    title: 'Essential Financial Best Practices for Small Businesses',
    content: '<p>Managing finances effectively is crucial for small business success. This post covers the fundamental practices every business owner should implement.</p>'
  },
  {
    _id: '2',
    title: 'Understanding Cash Flow Forecasting',
    content: '<p>Learn how to predict your business\'s financial future and make informed decisions with effective cash flow forecasting techniques.</p>'
  }
];

function Home({ setShowConsultationForm }) {
  const [showChecklistForm, setShowChecklistForm] = useState(false);
  const [blogPosts, setBlogPosts] = useState(fallbackBlogPosts);
  const { isChatOpen, setIsChatOpen } = useUI();

  const dashboardData = {
    hero: { 
      headline: "Financial Expertise for Your Business Success", 
      subtext: "Professional accounting and financial services tailored for small businesses. We handle the numbers so you can focus on growth." 
    },
    about: "At Wilcox Advisors, we specialize in financial solutions for small businesses. From startups to growing companies, we provide the expertise you need to succeed—built to scale with you every step of the way.",
  };

  useEffect(() => {
    fetchBlogPosts();
  }, []);

  const fetchBlogPosts = async () => {
    try {
      // Define your API URL - use environment variable if available
      const API_URL = process.env.REACT_APP_API_URL || 'https://wilcox-advisors-backend.onrender.com';
      
      const response = await axios.get(`${API_URL}/api/blog`);
      
      // Only update state if the response contains data
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        setBlogPosts(response.data);
      } else {
        console.log('Blog API returned empty data, using fallback content');
      }
    } catch (error) {
      console.error('Failed to fetch blog posts:', error);
      // Keep using fallback blog posts on error - no need to update state
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <HeroSection 
        dashboardData={dashboardData} 
        setShowConsultationForm={setShowConsultationForm} 
      />
      <ChecklistSection setShowChecklistForm={setShowChecklistForm} />
      <ServicesSection servicesList={servicesList} />
      <BlogSection blogPosts={blogPosts} />
      <TestimonialsSection />
      <AboutSection aboutText={dashboardData.about} />
      <ContactSection />
      {showChecklistForm && <ChecklistModal isOpen={showChecklistForm} onClose={() => setShowChecklistForm(false)} />}
      <ChatWidget isOpen={isChatOpen} setIsOpen={setIsChatOpen} />
    </div>
  );
}

export default Home;
