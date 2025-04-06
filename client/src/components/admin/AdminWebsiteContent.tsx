import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  CalendarDays,
  Code,
  Download, 
  Eye, 
  ExternalLink, 
  FileImage,
  FileText, 
  Pencil, 
  Plus, 
  Sparkles, 
  Trash2,
  UserCheck,
  UserCog,
  Users
} from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { apiRequest } from '../../lib/queryClient';

// Define the homepage content type based on the backend schema
interface HomepageContent {
  id: number;
  section: string;
  title: string;
  content: string;
  imageUrl: string | null;
  displayOrder: number;
  metaTitle: string | null;
  metaDescription: string | null;
  updatedAt: string;
  createdAt: string;
}

// Define blog post type
interface BlogPost {
  id: number;
  title: string;
  content: string;
  excerpt: string | null;
  slug: string;
  status: string;
  category: string | null;
  tags: string | null;
  imageUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  readTime: string | null;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
}

// Define blog subscriber type
interface BlogSubscriber {
  id: number;
  email: string;
  name: string | null;
  industry: string | null;
  isActive: boolean;
  createdAt: string;
  source: string | null;
  unsubscribeToken: string;
}

// Form schema for editing/creating homepage content
const homepageContentSchema = z.object({
  section: z.string().min(1, "Section name is required"),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  displayOrder: z.coerce.number().int().default(0),
  imageUrl: z.string().optional().nullable(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable()
});

// Form schema for editing/creating blog posts
const blogPostSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  content: z.string().min(1, "Content is required"),
  excerpt: z.string().optional().nullable(),
  status: z.string().default("draft"),
  category: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  readTime: z.string().optional().nullable(),
  publishedAt: z.string().optional().nullable()
});

type HomepageContentFormValues = z.infer<typeof homepageContentSchema>;
type BlogPostFormValues = z.infer<typeof blogPostSchema>;

const AdminWebsiteContent: React.FC = () => {
  const queryClient = useQueryClient();
  // Content type management
  const [contentType, setContentType] = useState<'homepage' | 'blog'>('homepage');
  
  // Homepage content state
  const [activeSection, setActiveSection] = useState<string>("all");
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<HomepageContent | null>(null);
  const [contentToDelete, setContentToDelete] = useState<HomepageContent | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Blog post state
  const [selectedBlogPost, setSelectedBlogPost] = useState<BlogPost | null>(null);
  const [isBlogPostEditSheetOpen, setIsBlogPostEditSheetOpen] = useState(false);
  const [blogPostToDelete, setBlogPostToDelete] = useState<BlogPost | null>(null);
  const [isBlogPostDeleteDialogOpen, setIsBlogPostDeleteDialogOpen] = useState(false);
  const [blogCategory, setBlogCategory] = useState<string>("all");

  // Fetch all homepage content
  const { 
    data: homepageContents = [], 
    isLoading: isHomepageLoading, 
    isError: isHomepageError, 
    error: homepageError 
  } = useQuery<HomepageContent[]>({
    queryKey: ['/api/content/homepage'],
    select: (data: any) => data.data || []
  });

  // Fetch all blog posts
  const {
    data: blogPosts = [],
    isLoading: isBlogLoading,
    isError: isBlogError,
    error: blogError
  } = useQuery<BlogPost[]>({
    queryKey: ['/api/blog/posts'],
    select: (data: any) => data.data || []
  });

  // Fetch blog subscribers
  const {
    data: blogSubscribers = [],
    isLoading: isSubscribersLoading,
    isError: isSubscribersError,
    error: subscribersError
  } = useQuery<BlogSubscriber[]>({
    queryKey: ['/api/blog/subscribers'],
    select: (data: any) => data.data || [],
    enabled: contentType === 'blog' // Only fetch when blog tab is active
  });
  
  // Create homepage sections list for tabs
  const sectionsSet = new Set(homepageContents.map(content => content.section));
  const sections = ['all', ...Array.from(sectionsSet)];

  // Filter homepage contents by active section
  const filteredContents = activeSection === 'all'
    ? homepageContents
    : homepageContents.filter(content => content.section === activeSection);
    
  // Create blog categories list for filtering
  const categoriesSet = new Set(blogPosts.filter(post => post.category).map(post => post.category as string));
  const categories = ['all', ...Array.from(categoriesSet)];
  
  // Filter blog posts by category
  const filteredBlogPosts = blogCategory === 'all'
    ? blogPosts
    : blogPosts.filter(post => post.category === blogCategory);

  // Create mutation for creating new content
  const createMutation = useMutation({
    mutationFn: (data: HomepageContentFormValues) => 
      apiRequest('/api/content/homepage', { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content/homepage'] });
      setIsEditSheetOpen(false);
      toast({
        title: "Success",
        description: "Content created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create content: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Update mutation for updating existing content
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: HomepageContentFormValues }) => 
      apiRequest(`/api/content/homepage/${id}`, { method: 'PUT', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content/homepage'] });
      setIsEditSheetOpen(false);
      toast({
        title: "Success",
        description: "Content updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update content: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Delete mutation for deleting content
  const deleteMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/content/homepage/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content/homepage'] });
      setIsDeleteDialogOpen(false);
      setContentToDelete(null);
      toast({
        title: "Success",
        description: "Content deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete content: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Form setup
  const form = useForm<HomepageContentFormValues>({
    resolver: zodResolver(homepageContentSchema),
    defaultValues: {
      section: "",
      title: "",
      content: "",
      displayOrder: 0,
      imageUrl: "",
      metaTitle: "",
      metaDescription: ""
    }
  });

  // Handle edit button click
  const handleEditClick = (content: HomepageContent) => {
    setSelectedContent(content);
    form.reset({
      section: content.section,
      title: content.title,
      content: content.content,
      displayOrder: content.displayOrder,
      imageUrl: content.imageUrl,
      metaTitle: content.metaTitle,
      metaDescription: content.metaDescription
    });
    setIsEditSheetOpen(true);
  };

  // Handle new content button click
  const handleNewContentClick = () => {
    setSelectedContent(null);
    form.reset({
      section: "",
      title: "",
      content: "",
      displayOrder: 0,
      imageUrl: "",
      metaTitle: "",
      metaDescription: ""
    });
    setIsEditSheetOpen(true);
  };

  // Handle form submission
  const onSubmit = (data: HomepageContentFormValues) => {
    if (selectedContent) {
      updateMutation.mutate({ id: selectedContent.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Handle delete button click
  const handleDeleteClick = (content: HomepageContent) => {
    setContentToDelete(content);
    setIsDeleteDialogOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (contentToDelete) {
      deleteMutation.mutate(contentToDelete.id);
    }
  };

  // Blog post form setup
  const blogPostForm = useForm<BlogPostFormValues>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: "",
      slug: "",
      content: "",
      excerpt: "",
      status: "draft",
      category: "",
      tags: "",
      imageUrl: "",
      metaTitle: "",
      metaDescription: "",
      readTime: "",
      publishedAt: ""
    }
  });

  // Blog post mutations
  const createBlogPostMutation = useMutation({
    mutationFn: (data: BlogPostFormValues) => 
      apiRequest('/api/blog/posts', { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blog/posts'] });
      setIsBlogPostEditSheetOpen(false);
      toast({
        title: "Success",
        description: "Blog post created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create blog post: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const updateBlogPostMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: BlogPostFormValues }) => 
      apiRequest(`/api/blog/posts/${id}`, { method: 'PUT', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blog/posts'] });
      setIsBlogPostEditSheetOpen(false);
      toast({
        title: "Success",
        description: "Blog post updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update blog post: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const deleteBlogPostMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/blog/posts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blog/posts'] });
      setIsBlogPostDeleteDialogOpen(false);
      setBlogPostToDelete(null);
      toast({
        title: "Success",
        description: "Blog post deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete blog post: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Handle blog post actions
  const handleNewBlogPostClick = () => {
    setSelectedBlogPost(null);
    blogPostForm.reset({
      title: "",
      slug: "",
      content: "",
      excerpt: "",
      status: "draft",
      category: "",
      tags: "",
      imageUrl: "",
      metaTitle: "",
      metaDescription: "",
      readTime: "",
      publishedAt: ""
    });
    setIsBlogPostEditSheetOpen(true);
  };

  const handleEditBlogPostClick = (post: BlogPost) => {
    setSelectedBlogPost(post);
    blogPostForm.reset({
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt || "",
      status: post.status,
      category: post.category || "",
      tags: post.tags || "",
      imageUrl: post.imageUrl || "",
      metaTitle: post.metaTitle || "",
      metaDescription: post.metaDescription || "",
      readTime: post.readTime || "",
      publishedAt: post.publishedAt || ""
    });
    setIsBlogPostEditSheetOpen(true);
  };

  const handleDeleteBlogPostClick = (post: BlogPost) => {
    setBlogPostToDelete(post);
    setIsBlogPostDeleteDialogOpen(true);
  };

  const handleDeleteBlogPostConfirm = () => {
    if (blogPostToDelete) {
      deleteBlogPostMutation.mutate(blogPostToDelete.id);
    }
  };

  const onBlogPostSubmit = (data: BlogPostFormValues) => {
    if (selectedBlogPost) {
      updateBlogPostMutation.mutate({ id: selectedBlogPost.id, data });
    } else {
      createBlogPostMutation.mutate(data);
    }
  };

  // Preview website function
  const previewWebsite = () => {
    window.open('/', '_blank');
  };

  // Handle blog post preview
  const previewBlogPost = (slug: string) => {
    window.open(`/blog/${slug}`, '_blank');
  };

  // Determine loading state
  const isLoading = isHomepageLoading || (contentType === 'blog' && isBlogLoading);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Determine error state
  const isError = (contentType === 'homepage' && isHomepageError) || 
                 (contentType === 'blog' && isBlogError);
  const errorMessage = contentType === 'homepage' ? homepageError : blogError;

  if (isError) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Content</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Failed to load {contentType} content. Please try again later.</p>
            <p className="text-sm text-muted-foreground">{String(errorMessage)}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Content Manager</h2>
          <p className="text-muted-foreground text-sm">Manage and publish website content</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={previewWebsite} variant="outline" size="sm" className="transition-all hover:shadow-md">
            <Eye className="mr-2 h-4 w-4" />
            Preview Site
          </Button>
        </div>
      </div>

      {/* Main content type tabs */}
      <Tabs value={contentType} onValueChange={(value) => setContentType(value as 'homepage' | 'blog')} className="w-full">
        <TabsList className="mb-6 w-full sm:w-auto grid grid-cols-2 sm:flex">
          <TabsTrigger value="homepage" className="flex items-center">
            <FileText className="h-4 w-4 mr-2 hidden sm:block" />
            Homepage Content
          </TabsTrigger>
          <TabsTrigger value="blog" className="flex items-center">
            <Pencil className="h-4 w-4 mr-2 hidden sm:block" />
            Blog Management
          </TabsTrigger>
        </TabsList>

        {/* Homepage Content Tab */}
        <TabsContent value="homepage" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Homepage Sections</h3>
            <Button onClick={handleNewContentClick} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add New Section
            </Button>
          </div>

          <Tabs value={activeSection} onValueChange={setActiveSection}>
            <TabsList className="mb-4">
              {sections.map(section => (
                <TabsTrigger key={section} value={section}>
                  {section.charAt(0).toUpperCase() + section.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeSection}>
              {filteredContents.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="mb-4 text-muted-foreground">No content found for this section.</p>
                    <Button onClick={handleNewContentClick} variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Content
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredContents.map(content => (
                    <Card key={content.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{content.title}</CardTitle>
                            <CardDescription>Section: {content.section}</CardDescription>
                          </div>
                          <div className="flex space-x-1">
                            <Button onClick={() => handleEditClick(content)} size="sm" variant="ghost">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button onClick={() => handleDeleteClick(content)} size="sm" variant="ghost" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm max-w-none">
                          <p className="line-clamp-3">{content.content}</p>
                        </div>
                        {content.imageUrl && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground">Image: {content.imageUrl}</p>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="text-xs text-muted-foreground border-t pt-4">
                        <div className="flex justify-between w-full">
                          <span>Order: {content.displayOrder}</span>
                          <span>Last updated: {new Date(content.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Blog Management Tab */}
        <TabsContent value="blog" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Blog Posts</h3>
            <Button onClick={handleNewBlogPostClick} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add New Post
            </Button>
          </div>

          <Tabs value={blogCategory} onValueChange={setBlogCategory}>
            <TabsList className="mb-4">
              {categories.map(category => (
                <TabsTrigger key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={blogCategory}>
              {filteredBlogPosts.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="mb-4 text-muted-foreground">No blog posts found in this category.</p>
                    <Button onClick={handleNewBlogPostClick} variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Blog Post
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBlogPosts.map(post => (
                    <Card key={post.id} className="flex flex-col h-full overflow-hidden transition-all duration-200 hover:shadow-md">
                      <CardHeader className="px-4 py-3 pb-2">
                        <div className="flex flex-col justify-between">
                          <div>
                            <CardTitle className="line-clamp-2 text-base">{post.title}</CardTitle>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <Badge variant={post.status === 'published' ? 'default' : 'outline'} className="text-xs">
                                {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                              </Badge>
                              {post.category && (
                                <span className="text-xs text-muted-foreground">
                                  {post.category}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-end gap-1 mt-2">
                            {post.status === 'published' && (
                              <Button onClick={() => previewBlogPost(post.slug)} size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button onClick={() => handleEditBlogPostClick(post)} size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button onClick={() => handleDeleteBlogPostClick(post)} size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 py-2 flex-grow">
                        {post.imageUrl && (
                          <div className="mb-2 rounded-md overflow-hidden h-24 bg-muted/50">
                            <div className="text-xs text-muted-foreground p-2 bg-muted/25 h-full flex items-center justify-center">
                              <FileImage className="h-4 w-4 mr-1" /> {post.imageUrl.split('/').pop()}
                            </div>
                          </div>
                        )}
                        {post.excerpt ? (
                          <p className="text-sm line-clamp-3">{post.excerpt}</p>
                        ) : (
                          <div className="prose prose-sm max-w-none">
                            <p className="line-clamp-3">{post.content}</p>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="text-xs text-muted-foreground border-t pt-2 px-4 pb-3 mt-auto">
                        <div className="flex flex-col sm:flex-row justify-between w-full gap-1">
                          <span className="truncate max-w-[120px]" title={post.slug}>
                            <Code className="h-3 w-3 inline mr-1" /> {post.slug}
                          </span>
                          <span className="whitespace-nowrap">
                            <CalendarDays className="h-3 w-3 inline mr-1" />
                            {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 
                             new Date(post.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Blog Subscribers Section */}
          <div className="mt-10">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Blog Subscribers</h3>
              <div className="mt-2 sm:mt-0">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export List
                </Button>
              </div>
            </div>
            
            {isSubscribersLoading ? (
              <div className="flex items-center justify-center h-40 bg-muted/20 rounded-md">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading subscriber data...</p>
                </div>
              </div>
            ) : isSubscribersError ? (
              <Card className="border-destructive/20">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4 text-destructive">
                    <div className="rounded-full bg-destructive/10 p-2">
                      <ExternalLink className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">Error Loading Subscribers</h4>
                      <p className="text-xs mt-1">{String(subscribersError)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Subscribers</p>
                        <h3 className="text-3xl font-bold mt-1">{blogSubscribers.length}</h3>
                      </div>
                      <div className="rounded-full bg-primary/10 p-2">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-green-500/5 border-green-500/20">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-muted-foreground">Active Subscribers</p>
                        <h3 className="text-3xl font-bold mt-1">{blogSubscribers.filter(sub => sub.isActive).length}</h3>
                      </div>
                      <div className="rounded-full bg-green-500/10 p-2">
                        <UserCheck className="h-5 w-5 text-green-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-orange-500/5 border-orange-500/20">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-muted-foreground">Pending Confirmation</p>
                        <h3 className="text-3xl font-bold mt-1">{blogSubscribers.filter(sub => !sub.isActive).length}</h3>
                      </div>
                      <div className="rounded-full bg-orange-500/10 p-2">
                        <UserCog className="h-5 w-5 text-orange-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit/Create Content Sheet */}
      <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
        <SheetContent className="sm:max-w-xl w-full">
          <SheetHeader>
            <SheetTitle>{selectedContent ? 'Edit Content' : 'Add New Content'}</SheetTitle>
            <SheetDescription>
              {selectedContent
                ? 'Update the content details below.'
                : 'Fill in the details to add new content to your website.'}
            </SheetDescription>
          </SheetHeader>

          <div className="py-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="section"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Section*</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., hero, about, services" {...field} />
                      </FormControl>
                      <FormDescription>The website section this content belongs to</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title*</FormLabel>
                      <FormControl>
                        <Input placeholder="Content title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content*</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Content text" className="min-h-[150px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/image.jpg" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormDescription>URL to an image (optional)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="displayOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Order</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>Controls the order of content within a section</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-medium">SEO Settings</h3>
                  
                  <FormField
                    control={form.control}
                    name="metaTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meta Title</FormLabel>
                        <FormControl>
                          <Input placeholder="SEO title" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormDescription>SEO title for this content (optional)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="metaDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meta Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="SEO description" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormDescription>SEO description for this content (optional)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditSheetOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) ? (
                      <span className="flex items-center">
                        <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-current rounded-full"></span>
                        Saving...
                      </span>
                    ) : (
                      selectedContent ? 'Update Content' : 'Create Content'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </SheetContent>
      </Sheet>

      {/* Blog Post Edit/Create Sheet */}
      <Sheet open={isBlogPostEditSheetOpen} onOpenChange={setIsBlogPostEditSheetOpen}>
        <SheetContent className="sm:max-w-xl w-full">
          <SheetHeader>
            <SheetTitle>{selectedBlogPost ? 'Edit Blog Post' : 'Create New Blog Post'}</SheetTitle>
            <SheetDescription>
              {selectedBlogPost
                ? 'Update the blog post details below.'
                : 'Fill in the details to create a new blog post.'}
            </SheetDescription>
          </SheetHeader>

          <div className="py-6">
            <Form {...blogPostForm}>
              <form onSubmit={blogPostForm.handleSubmit(onBlogPostSubmit)} className="space-y-4">
                <FormField
                  control={blogPostForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title*</FormLabel>
                      <FormControl>
                        <Input placeholder="Blog post title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={blogPostForm.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug*</FormLabel>
                      <FormControl>
                        <Input placeholder="url-friendly-slug" {...field} />
                      </FormControl>
                      <FormDescription>URL-friendly version of the title</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={blogPostForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content*</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Blog content" className="min-h-[200px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={blogPostForm.control}
                  name="excerpt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Excerpt</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Brief summary of the post" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormDescription>Short summary for previews</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={blogPostForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select 
                          value={field.value} 
                          onValueChange={field.onChange}
                          defaultValue="draft"
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={blogPostForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Finance, Tips" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={blogPostForm.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <Input placeholder="tax,retirement,investing" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormDescription>Comma-separated list of tags</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={blogPostForm.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Featured Image URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/image.jpg" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={blogPostForm.control}
                  name="readTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Read Time</FormLabel>
                      <FormControl>
                        <Input placeholder="5 min read" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={blogPostForm.control}
                  name="publishedAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Publish Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          {...field} 
                          value={field.value || ''} 
                          disabled={blogPostForm.getValues('status') !== 'published'}
                        />
                      </FormControl>
                      <FormDescription>Only applicable for published posts</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-medium">SEO Settings</h3>
                  
                  <FormField
                    control={blogPostForm.control}
                    name="metaTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meta Title</FormLabel>
                        <FormControl>
                          <Input placeholder="SEO title" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormDescription>SEO title for this post (optional)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={blogPostForm.control}
                    name="metaDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meta Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="SEO description" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormDescription>SEO description for this post (optional)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsBlogPostEditSheetOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createBlogPostMutation.isPending || updateBlogPostMutation.isPending}
                  >
                    {(createBlogPostMutation.isPending || updateBlogPostMutation.isPending) ? (
                      <span className="flex items-center">
                        <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-current rounded-full"></span>
                        Saving...
                      </span>
                    ) : (
                      selectedBlogPost ? 'Update Post' : 'Create Post'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </SheetContent>
      </Sheet>

      {/* Homepage Content Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the content "{contentToDelete?.title}". 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-current rounded-full"></span>
                  Deleting...
                </span>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Blog Post Delete Confirmation Dialog */}
      <AlertDialog open={isBlogPostDeleteDialogOpen} onOpenChange={setIsBlogPostDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the blog post "{blogPostToDelete?.title}". 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBlogPostConfirm}
              disabled={deleteBlogPostMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBlogPostMutation.isPending ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-current rounded-full"></span>
                  Deleting...
                </span>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminWebsiteContent;