import React from 'react';

const AboutSection = () => {
  const teamMembers = [
    {
      id: 1,
      name: 'Jessica Wilcox, CPA',
      role: 'Founder & CEO',
      bio: 'With over 20 years of experience in financial advisory and accounting, Jessica founded Wilcox Advisors to provide innovative financial solutions to growing businesses.',
      image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 2,
      name: 'Michael Chen, MBA',
      role: 'Chief Financial Strategist',
      bio: 'Michael brings extensive experience in business financial planning and strategy development, helping clients optimize operations and achieve sustainable growth.',
      image: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 3,
      name: 'Sarah Johnson, CPA',
      role: 'Tax Advisory Director',
      bio: 'Sarah specializes in complex tax planning strategies for businesses across diverse industries, ensuring compliance while maximizing tax advantages for our clients.',
      image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 4,
      name: 'David Rodriguez, CFA',
      role: 'Wealth Management Lead',
      bio: 'David helps clients build and preserve wealth through comprehensive investment strategies, retirement planning, and risk management solutions.',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80'
    }
  ];

  return (
    <section id="about" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">About Us</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Wilcox Advisors is a premier financial advisory firm dedicated to helping businesses achieve their financial goals with strategic guidance and personalized solutions.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-16">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Story</h3>
            <p className="text-gray-600 mb-6">
              Founded in 2005, Wilcox Advisors emerged from a vision to transform how businesses approach financial management. We recognized that traditional accounting services often failed to provide the strategic insights that modern businesses need to thrive in a competitive landscape.
            </p>
            <p className="text-gray-600 mb-6">
              What began as a small practice has grown into a comprehensive financial advisory firm serving clients across diverse industries. Our growth has been fueled by our commitment to excellence, innovation, and building lasting relationships with our clients.
            </p>
            <p className="text-gray-600">
              Today, we combine technical expertise with business acumen to deliver solutions that address the complete financial picture of your organization. Our integrated approach encompasses accounting, tax optimization, financial planning, and strategic advisory services.
            </p>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Approach</h3>
            <div className="space-y-6">
              <div className="flex">
                <div className="flex-shrink-0 mr-4">
                  <div className="h-12 w-12 rounded-full bg-blue-800 flex items-center justify-center text-white font-bold text-xl">
                    1
                  </div>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">Understand</h4>
                  <p className="text-gray-600">
                    We take time to thoroughly understand your business, industry challenges, and financial goals before recommending any solutions.
                  </p>
                </div>
              </div>
              <div className="flex">
                <div className="flex-shrink-0 mr-4">
                  <div className="h-12 w-12 rounded-full bg-blue-800 flex items-center justify-center text-white font-bold text-xl">
                    2
                  </div>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">Analyze</h4>
                  <p className="text-gray-600">
                    Our team analyzes your current financial position, identifies opportunities for improvement, and evaluates potential strategies.
                  </p>
                </div>
              </div>
              <div className="flex">
                <div className="flex-shrink-0 mr-4">
                  <div className="h-12 w-12 rounded-full bg-blue-800 flex items-center justify-center text-white font-bold text-xl">
                    3
                  </div>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">Implement</h4>
                  <p className="text-gray-600">
                    We work alongside you to implement tailored solutions that address your specific needs and align with your long-term vision.
                  </p>
                </div>
              </div>
              <div className="flex">
                <div className="flex-shrink-0 mr-4">
                  <div className="h-12 w-12 rounded-full bg-blue-800 flex items-center justify-center text-white font-bold text-xl">
                    4
                  </div>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">Optimize</h4>
                  <p className="text-gray-600">
                    We continuously monitor performance, adapt to changing circumstances, and refine strategies to ensure optimal results.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Our Leadership Team</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {teamMembers.map((member) => (
            <div key={member.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <img 
                src={member.image} 
                alt={member.name} 
                className="w-full h-64 object-cover"
              />
              <div className="p-6">
                <h4 className="text-xl font-bold text-gray-900 mb-1">{member.name}</h4>
                <p className="text-blue-800 font-medium mb-3">{member.role}</p>
                <p className="text-gray-600 text-sm">{member.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;