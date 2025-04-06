import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  publishedAt: string;
  author: string;
  category: string;
  imageUrl?: string;
  slug: string;
}

interface BlogSectionProps {
  blogPosts?: BlogPost[];
}

const BlogSection: React.FC<BlogSectionProps> = () => {
  // Using react-query to fetch blog posts
  const { data, isLoading } = useQuery<{ success: boolean, posts: BlogPost[] }>({
    queryKey: ['/api/blog/posts'],
    queryFn: async () => {
      const res = await axios.get('/api/blog/posts');
      return res.data;
    }
  });

  const apiBlogPosts = data?.posts || [];
  
  // Default blog posts to use as fallback if no posts from API
  const defaultBlogPosts: BlogPost[] = [
    {
      id: 1,
      title: 'Strategic Tax Planning for Small Business Growth',
      excerpt: 'Discover how proactive tax planning strategies can help small businesses maximize cash flow and fuel growth opportunities.',
      publishedAt: '2023-03-12',
      author: 'Sarah Johnson',
      category: 'Tax Planning',
      imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80',
      slug: 'strategic-tax-planning'
    },
    {
      id: 2,
      title: 'Financial Reporting: Turning Numbers into Actionable Insights',
      excerpt: 'Learn how well-designed financial reports can provide the intelligence needed for better business decision-making.',
      publishedAt: '2023-02-28',
      author: 'Michael Chen',
      category: 'Financial Reporting',
      imageUrl: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80',
      slug: 'financial-reporting-insights'
    },
    {
      id: 3,
      title: 'Building a Resilient Business Through Financial Planning',
      excerpt: 'Explore how comprehensive financial planning can help your business weather economic uncertainties and capitalize on opportunities.',
      publishedAt: '2023-01-15',
      author: 'Jessica Wilcox',
      category: 'Financial Planning',
      imageUrl: 'https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80',
      slug: 'resilient-business-planning'
    }
  ];

  // Use API posts if available, otherwise fallback to defaults
  const displayPosts = apiBlogPosts.length > 0 ? apiBlogPosts : defaultBlogPosts;

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
          {isLoading ? (
            // Show loading skeleton
            Array(3).fill(0).map((_, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="h-48 bg-gray-200 animate-pulse"></div>
                <div className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2 animate-pulse"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-4 animate-pulse"></div>
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))
          ) : displayPosts.map((post) => (
            <div key={post.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="h-48 overflow-hidden">
                <img 
                  src={post.imageUrl || 'https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'} 
                  alt={post.title} 
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center mb-2">
                  <span className="text-sm font-medium text-blue-800 bg-blue-100 px-2 py-1 rounded">
                    {post.category}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    {new Date(post.publishedAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{post.title}</h3>
                <p className="text-gray-600 mb-4">{post.excerpt}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">By {post.author}</span>
                  <Link 
                    to={`/blog/${post.slug}`} 
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