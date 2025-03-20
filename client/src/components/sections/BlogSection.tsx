import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'wouter';

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  category: string;
  image: string;
}

interface BlogSectionProps {
  blogPosts?: BlogPost[];
}

const BlogSection: React.FC<BlogSectionProps> = ({ blogPosts }) => {
  const defaultBlogPosts: BlogPost[] = [
    {
      id: 1,
      title: 'Strategic Tax Planning for Small Business Growth',
      excerpt: 'Discover how proactive tax planning strategies can help small businesses maximize cash flow and fuel growth opportunities.',
      date: 'March 12, 2023',
      author: 'Sarah Johnson',
      category: 'Tax Planning',
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 2,
      title: 'Financial Reporting: Turning Numbers into Actionable Insights',
      excerpt: 'Learn how well-designed financial reports can provide the intelligence needed for better business decision-making.',
      date: 'February 28, 2023',
      author: 'Michael Chen',
      category: 'Financial Reporting',
      image: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 3,
      title: 'Building a Resilient Business Through Financial Planning',
      excerpt: 'Explore how comprehensive financial planning can help your business weather economic uncertainties and capitalize on opportunities.',
      date: 'January 15, 2023',
      author: 'Jessica Wilcox',
      category: 'Financial Planning',
      image: 'https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80'
    }
  ];

  const displayPosts = blogPosts || defaultBlogPosts;

  return (
    <section id="blog" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Financial Insights Blog</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Expert perspectives and practical advice on the financial topics that matter most to growing businesses.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {displayPosts.map((post) => (
            <div key={post.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="h-48 overflow-hidden">
                <img 
                  src={post.image} 
                  alt={post.title} 
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center mb-2">
                  <span className="text-sm font-medium text-blue-800 bg-blue-100 px-2 py-1 rounded">
                    {post.category}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">{post.date}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{post.title}</h3>
                <p className="text-gray-600 mb-4">{post.excerpt}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">By {post.author}</span>
                  <Link 
                    to="/blog" 
                    className="text-blue-800 font-medium flex items-center hover:underline"
                  >
                    Read More
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-16 text-center">
          <Link 
            to="/blog" 
            className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-blue-800 bg-white hover:bg-gray-50 transition-colors"
          >
            View All Articles
            <ChevronRight className="h-5 w-5 ml-2" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BlogSection;