import React from 'react';

const AboutSection = () => {
  const teamMembers = [
    {
      id: 1,
      name: 'Sarah Wilcox',
      role: 'Founder & CEO',
      image: null, // We'll use a placeholder for now
      bio: 'With over 20 years of accounting and financial advisory experience, Sarah founded Wilcox Advisors with a vision to empower small businesses through strategic financial guidance.'
    },
    {
      id: 2,
      name: 'Michael Chen',
      role: 'Senior Tax Advisor',
      image: null,
      bio: 'Michael specializes in tax planning and compliance for small businesses, with expertise in minimizing tax liabilities while ensuring full regulatory compliance.'
    },
    {
      id: 3,
      name: 'Jessica Rodriguez',
      role: 'Financial Controller',
      image: null,
      bio: 'Jessica brings 15 years of experience in financial reporting and analysis, helping clients transform financial data into actionable business insights.'
    },
    {
      id: 4,
      name: 'David Thompson',
      role: 'Business Advisory Lead',
      image: null,
      bio: 'David focuses on strategic planning and growth initiatives, helping businesses identify opportunities and develop sustainable growth strategies.'
    }
  ];

  const companyValues = [
    {
      title: 'Excellence',
      description: 'We strive for excellence in every aspect of our service, maintaining the highest standards of professionalism and accuracy.'
    },
    {
      title: 'Integrity',
      description: 'We operate with complete transparency and ethical standards, building long-term relationships based on trust and reliability.'
    },
    {
      title: 'Empowerment',
      description: 'We go beyond numbers to help clients understand their financial position and make informed business decisions.'
    },
    {
      title: 'Innovation',
      description: 'We continuously adopt new technologies and methodologies to provide cutting-edge financial solutions.'
    }
  ];

  return (
    <section id="about" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">About Wilcox Advisors</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Founded in 2008, Wilcox Advisors has grown to become a trusted financial partner for small businesses across diverse industries. Our team of experienced professionals is committed to your business success.
          </p>
        </div>
        
        {/* Our Story Section */}
        <div className="flex flex-col md:flex-row items-center mb-20">
          <div className="md:w-1/2 md:pr-12 mb-8 md:mb-0">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Story</h3>
            <p className="text-gray-600 mb-6">
              Wilcox Advisors began with a simple mission: to provide small businesses with the same level of financial expertise and guidance typically available only to large corporations. Sarah Wilcox founded the company after recognizing that many small business owners were struggling to manage their finances while trying to grow their businesses.
            </p>
            <p className="text-gray-600 mb-6">
              Starting with just three clients, we've grown to serve over 200 businesses across the country. Our growth has been built on delivering exceptional results and forming genuine partnerships with our clients. We take pride in becoming an extension of your team, invested in your success.
            </p>
            <p className="text-gray-600">
              Today, we continue to expand our services while maintaining our core focus: empowering small businesses with strategic financial guidance and comprehensive accounting services.
            </p>
          </div>
          <div className="md:w-1/2">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-md text-center">
                  <span className="block text-3xl font-bold text-blue-800 mb-2">15+</span>
                  <span className="text-sm text-gray-600">Years of Experience</span>
                </div>
                <div className="bg-blue-50 p-4 rounded-md text-center">
                  <span className="block text-3xl font-bold text-blue-800 mb-2">200+</span>
                  <span className="text-sm text-gray-600">Businesses Served</span>
                </div>
                <div className="bg-blue-50 p-4 rounded-md text-center">
                  <span className="block text-3xl font-bold text-blue-800 mb-2">18</span>
                  <span className="text-sm text-gray-600">Team Members</span>
                </div>
                <div className="bg-blue-50 p-4 rounded-md text-center">
                  <span className="block text-3xl font-bold text-blue-800 mb-2">12</span>
                  <span className="text-sm text-gray-600">Industry Specializations</span>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4">What Makes Us Different</h4>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-800 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600">Proactive approach to financial management</span>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-800 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600">Customized solutions for your specific industry</span>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-800 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600">Cutting-edge technology with a human touch</span>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-800 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600">Transparent, predictable pricing structure</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        {/* Our Values */}
        <div className="mb-20">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Our Core Values</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {companyValues.map((value, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-md">
                <h4 className="text-xl font-bold text-blue-800 mb-3">{value.title}</h4>
                <p className="text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Team Members */}
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Our Leadership Team</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map(member => (
              <div key={member.id} className="bg-white rounded-lg overflow-hidden shadow-md">
                <div className="bg-gray-200 h-60 flex items-center justify-center">
                  {member.image ? (
                    <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-3xl font-bold text-gray-500">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h4 className="text-xl font-bold text-gray-900 mb-1">{member.name}</h4>
                  <p className="text-blue-800 font-medium mb-4">{member.role}</p>
                  <p className="text-gray-600 text-sm">{member.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;