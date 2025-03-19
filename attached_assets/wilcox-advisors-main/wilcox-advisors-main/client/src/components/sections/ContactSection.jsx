// src/components/sections/ContactSection.jsx
import React from 'react';
import { useFormData } from '../../hooks/useFormData';
import axios from 'axios';

export default function ContactSection() {
  const [contactData, handleContactInputChange, _, resetContactForm] = useFormData({
    name: '', email: '', company: '', message: '',
  });

  const isContactValid = () => 
    Object.values(contactData).every(value => value.trim() !== '');

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!isContactValid()) return alert('Please fill out all required fields.');
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/contact`, contactData);
      alert('Thank you for your message! We will get back to you soon.');
      resetContactForm();
    } catch (error) {
      alert('Submission failed. Please try again.');
    }
  };

  return (
    <section id="contact" className="py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <h2 className="text-3xl font-bold text-blue-800 mb-10 text-center">Contact Us</h2>
        <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto">
          <p className="text-gray-700 mb-6 text-center">
            Have questions about our services? Send us a message and we'll get back to you as soon as possible.
          </p>
          <form onSubmit={handleContactSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Your Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="name"
                value={contactData.name}
                onChange={handleContactInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Email Address <span className="text-red-500">*</span></label>
              <input
                type="email"
                name="email"
                value={contactData.email}
                onChange={handleContactInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Company <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="company"
                value={contactData.company}
                onChange={handleContactInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Message <span className="text-red-500">*</span></label>
              <textarea
                name="message"
                value={contactData.message}
                onChange={handleContactInputChange}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-800 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-900 transition duration-200"
              disabled={!isContactValid()}
            >
              Send Message
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
