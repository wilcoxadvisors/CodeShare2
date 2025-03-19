import React from 'react';

const AboutSection = () => {
  const teamMembers = [
    {
      id: 1,
      name: 'David Wilcox',
      role: 'Founder & Principal',
      bio: 'With over 20 years of experience in financial management, David founded Wilcox Advisors to provide strategic financial support to small businesses.',
      image: '/images/team/david.jpg'
    },
    {
      id: 2,
      name: 'Sarah Reynolds',
      role: 'Financial Director',
      bio: 'Sarah has spent 15 years helping businesses optimize their financial operations and implement efficient accounting systems.',
      image: '/images/team/sarah.jpg'
    },
    {
      id: 3,
      name: 'Michael Chen',
      role: 'Tax Specialist',
      bio: 'As a Certified Public Accountant, Michael specializes in tax planning and compliance for small to medium-sized businesses.',
      image: '/images/team/michael.jpg'
    }
  ];

  return (
    <section id="about" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">About Wilcox Advisors</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            We're a team of financial experts committed to helping small businesses thrive through 
            personalized accounting services and strategic financial guidance.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Story</h3>
            <p className="text-gray-600 mb-4">
              Founded in 2010, Wilcox Advisors began with a simple mission: to provide small businesses with the same 
              quality financial expertise that large corporations enjoy, but with personalized service tailored to each 
              client's unique needs.
            </p>
            <p className="text-gray-600 mb-4">
              We understand the challenges that small business owners face in managing finances while growing their 
              companies. Our team has helped hundreds of businesses streamline their accounting processes, make 
              strategic financial decisions, and achieve sustainable growth.
            </p>
            <p className="text-gray-600">
              Today, we continue to evolve our services to meet the changing needs of small businesses in an increasingly 
              digital economy, offering cloud-based solutions and data-driven insights.
            </p>
          </div>
          <div className="rounded-lg overflow-hidden shadow-xl">
            <div className="bg-gray-300 w-full h-72 flex items-center justify-center">
              <span className="text-gray-600 text-sm">Office Image</span>
            </div>
          </div>
        </div>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Our Leadership Team</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {teamMembers.map(member => (
            <div key={member.id} className="bg-white rounded-lg overflow-hidden shadow-md">
              <div className="bg-gray-300 w-full h-64 flex items-center justify-center">
                <span className="text-gray-600 text-sm">{member.name}</span>
              </div>
              <div className="p-6">
                <h4 className="text-xl font-bold text-gray-900">{member.name}</h4>
                <p className="text-blue-800 mb-3">{member.role}</p>
                <p className="text-gray-600">{member.bio}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Values</h3>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="p-6">
              <h4 className="text-xl font-bold text-blue-800 mb-2">Integrity</h4>
              <p className="text-gray-600">We maintain the highest standards of professional ethics and transparency in all our client relationships.</p>
            </div>
            <div className="p-6">
              <h4 className="text-xl font-bold text-blue-800 mb-2">Excellence</h4>
              <p className="text-gray-600">We are committed to delivering exceptional service and accurate financial guidance to every client.</p>
            </div>
            <div className="p-6">
              <h4 className="text-xl font-bold text-blue-800 mb-2">Partnership</h4>
              <p className="text-gray-600">We view ourselves as growth partners for our clients, invested in their long-term success and prosperity.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;