import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { apiRequest } from '../../lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { 
  Calendar, 
  CalendarDays,
  Code,
  Download, 
  Eye, 
  ExternalLink, 
  FileImage,
  FileText, 
  Filter,
  LayoutTemplate,
  Pencil, 
  Plus, 
  Search,
  Sparkles, 
  Trash2,
  UserCheck,
  UserCog,
  Users
} from 'lucide-react';

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

type BlogPostFormValues = z.infer<typeof blogPostSchema>;

const BlogContentManager: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Blog post state
  const [selectedBlogPost, setSelectedBlogPost] = useState<BlogPost | null>(null);
  const [isBlogPostEditSheetOpen, setIsBlogPostEditSheetOpen] = useState(false);
  const [blogPostToDelete, setBlogPostToDelete] = useState<BlogPost | null>(null);
  const [isBlogPostDeleteDialogOpen, setIsBlogPostDeleteDialogOpen] = useState(false);
  const [blogCategory, setBlogCategory] = useState<string>("all");
  const [tabView, setTabView] = useState<'published' | 'drafts'>('published');

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
    select: (data: any) => data.data || []
  });
    
  // Create blog categories list for filtering
  const categoriesSet = new Set(blogPosts.filter(post => post.category).map(post => post.category as string));
  const categories = ['all', ...Array.from(categoriesSet)];
  
  // Filter blog posts by status (draft/published) and category
  const draftPosts = blogPosts.filter(post => post.status === 'draft');
  const publishedPosts = blogPosts.filter(post => post.status === 'published');
  
  // Further filter by category
  const filteredBlogPosts = tabView === 'published'
    ? (blogCategory === 'all'
        ? publishedPosts
        : publishedPosts.filter(post => post.category === blogCategory))
    : (blogCategory === 'all'
        ? draftPosts
        : draftPosts.filter(post => post.category === blogCategory));

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

  // Handle blog post preview
  const previewBlogPost = (slug: string) => {
    window.open(`/blog/${slug}`, '_blank');
  };

  if (isBlogLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isBlogError) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Content</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Failed to load blog content. Please try again later.</p>
            <p className="text-sm text-muted-foreground">{String(blogError)}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Blog Posts Manager */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b">
          <div>
            <h3 className="text-xl font-semibold">Blog Posts</h3>
            <p className="text-sm text-muted-foreground mt-1">Manage and publish your blog content</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleNewBlogPostClick} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add New Post
            </Button>
            <Button onClick={() => window.open('/blog', '_blank')} variant="outline" size="sm">
              <Eye className="mr-2 h-4 w-4" />
              View Blog
            </Button>
          </div>
        </div>

        {/* Enhanced Draft/Published tabs */}
        <Tabs value={tabView} onValueChange={(value) => setTabView(value as 'published' | 'drafts')} className="w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 bg-muted/20 p-4 rounded-md">
            <TabsList className="mb-0 bg-background/80">
              <TabsTrigger value="published" className="flex items-center gap-2 data-[state=active]:bg-primary/10">
                <Eye className="h-4 w-4" />
                Published Posts
              </TabsTrigger>
              <TabsTrigger value="drafts" className="flex items-center gap-2 data-[state=active]:bg-primary/10">
                <FileText className="h-4 w-4" />
                Draft Posts
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" /> 
                Filter by category:
              </div>
              <select 
                className="border rounded px-3 py-1.5 text-sm bg-background min-w-[140px] focus:ring-1 focus:ring-primary"
                value={blogCategory}
                onChange={(e) => setBlogCategory(e.target.value)}
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <TabsContent value="published" className="m-0">
            {tabView === 'published' && filteredBlogPosts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="mb-4 text-muted-foreground">No published blog posts found in this category.</p>
                  <Button onClick={handleNewBlogPostClick} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Blog Post
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Blog Posts Table View */}
                <div className="rounded-md border overflow-hidden mb-6">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[250px]">Title</TableHead>
                          <TableHead className="w-[100px]">Status</TableHead>
                          <TableHead className="w-[150px]">Category</TableHead>
                          <TableHead className="w-[100px]">Slug</TableHead>
                          <TableHead className="w-[120px]">Published</TableHead>
                          <TableHead className="w-[150px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tabView === 'published' && filteredBlogPosts.map(post => (
                          <TableRow key={post.id}>
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span>{post.title}</span>
                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {post.excerpt || post.content.substring(0, 100)}...
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge>Published</Badge>
                            </TableCell>
                            <TableCell>
                              {post.category || <span className="text-muted-foreground text-xs">Uncategorized</span>}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              <span className="truncate block max-w-[100px]" title={post.slug}>
                                {post.slug}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs">
                                {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 'Not published'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button onClick={() => previewBlogPost(post.slug)} size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button onClick={() => handleEditBlogPostClick(post)} size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button onClick={() => handleDeleteBlogPostClick(post)} size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Enhanced Card grid view for published posts */}
                <div>
                  <h3 className="text-md font-medium mb-4 flex items-center gap-2">
                    <LayoutTemplate className="h-4 w-4" />
                    Visual Content Layout
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tabView === 'published' && filteredBlogPosts.map(post => (
                      <Card key={post.id} className="flex flex-col h-full overflow-hidden transition-all duration-200 hover:shadow-md">
                        <CardHeader className="px-4 py-3 pb-2 border-b">
                          <div className="flex justify-between items-start">
                            <div>
                              {post.category && (
                                <Badge variant="outline" className="mb-2 text-xs capitalize">
                                  {post.category}
                                </Badge>
                              )}
                              <CardTitle className="line-clamp-2 text-base">{post.title}</CardTitle>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <Badge variant="default" className="text-xs">
                                  Published
                                </Badge>
                                {post.readTime && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> {post.readTime} read
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button 
                                onClick={() => previewBlogPost(post.slug)} 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 hover:bg-primary/10"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">Preview</span>
                              </Button>
                              <Button 
                                onClick={() => handleEditBlogPostClick(post)} 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 hover:bg-primary/10"
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                              <Button 
                                onClick={() => handleDeleteBlogPostClick(post)} 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 hover:bg-destructive/10 text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="px-4 py-3 flex-grow">
                          {post.imageUrl && (
                            <div className="mb-3 rounded-md overflow-hidden h-32 bg-muted/50 border">
                              <div className="text-xs text-muted-foreground p-2 bg-muted/25 h-full flex items-center justify-center">
                                <FileImage className="h-4 w-4 mr-1" /> 
                                <span className="truncate max-w-[200px]">{post.imageUrl.split('/').pop()}</span>
                              </div>
                            </div>
                          )}
                          {post.excerpt ? (
                            <p className="text-sm line-clamp-3 text-muted-foreground">{post.excerpt}</p>
                          ) : (
                            <div className="prose prose-sm max-w-none">
                              <p className="line-clamp-3 text-sm text-muted-foreground">{post.content}</p>
                            </div>
                          )}
                          
                          {(post.metaTitle || post.metaDescription) && (
                            <div className="mt-3 pt-3 border-t">
                              <h4 className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                                <Search className="h-3 w-3" /> SEO Metadata
                              </h4>
                              {post.metaTitle && (
                                <p className="text-xs line-clamp-1 text-muted-foreground">
                                  <span className="font-medium">Title:</span> {post.metaTitle}
                                </p>
                              )}
                              {post.metaDescription && (
                                <p className="text-xs line-clamp-1 text-muted-foreground">
                                  <span className="font-medium">Description:</span> {post.metaDescription}
                                </p>
                              )}
                            </div>
                          )}
                        </CardContent>
                        <CardFooter className="text-xs text-muted-foreground border-t pt-3 px-4 pb-3 mt-auto bg-muted/10">
                          <div className="flex justify-between w-full">
                            <span className="flex items-center gap-1" title={post.slug}>
                              <Code className="h-3 w-3" /> 
                              <span className="truncate max-w-[100px]">{post.slug}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 
                               new Date(post.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="drafts" className="m-0">
            {tabView === 'drafts' && filteredBlogPosts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="mb-4 text-muted-foreground">No draft blog posts found in this category.</p>
                  <Button onClick={handleNewBlogPostClick} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Draft Post
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Blog Draft Posts Table View */}
                <div className="rounded-md border overflow-hidden mb-6">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[250px]">Title</TableHead>
                          <TableHead className="w-[100px]">Status</TableHead>
                          <TableHead className="w-[150px]">Category</TableHead>
                          <TableHead className="w-[100px]">Slug</TableHead>
                          <TableHead className="w-[120px]">Updated</TableHead>
                          <TableHead className="w-[150px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tabView === 'drafts' && filteredBlogPosts.map(post => (
                          <TableRow key={post.id}>
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span>{post.title}</span>
                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {post.excerpt || post.content.substring(0, 100)}...
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">Draft</Badge>
                            </TableCell>
                            <TableCell>
                              {post.category || <span className="text-muted-foreground text-xs">Uncategorized</span>}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              <span className="truncate block max-w-[100px]" title={post.slug}>
                                {post.slug}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs">
                                {new Date(post.updatedAt).toLocaleDateString()}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button onClick={() => handleEditBlogPostClick(post)} size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button onClick={() => handleDeleteBlogPostClick(post)} size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Enhanced Card grid view for draft posts */}
                <div>
                  <h3 className="text-md font-medium mb-4 flex items-center gap-2">
                    <LayoutTemplate className="h-4 w-4" />
                    Visual Draft Layout
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tabView === 'drafts' && filteredBlogPosts.map(post => (
                      <Card key={post.id} className="flex flex-col h-full overflow-hidden transition-all duration-200 hover:shadow-md border-dashed">
                        <CardHeader className="px-4 py-3 pb-2 border-b">
                          <div className="flex justify-between items-start">
                            <div>
                              {post.category && (
                                <Badge variant="outline" className="mb-2 text-xs capitalize">
                                  {post.category}
                                </Badge>
                              )}
                              <CardTitle className="line-clamp-2 text-base">{post.title}</CardTitle>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  Draft
                                </Badge>
                                {post.readTime && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> {post.readTime} read
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button 
                                onClick={() => handleEditBlogPostClick(post)} 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 hover:bg-primary/10"
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                              <Button 
                                onClick={() => handleDeleteBlogPostClick(post)} 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 hover:bg-destructive/10 text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="px-4 py-3 flex-grow">
                          {post.imageUrl && (
                            <div className="mb-3 rounded-md overflow-hidden h-32 bg-muted/50 border">
                              <div className="text-xs text-muted-foreground p-2 bg-muted/25 h-full flex items-center justify-center">
                                <FileImage className="h-4 w-4 mr-1" /> 
                                <span className="truncate max-w-[200px]">{post.imageUrl.split('/').pop()}</span>
                              </div>
                            </div>
                          )}
                          {post.excerpt ? (
                            <p className="text-sm line-clamp-3 text-muted-foreground">{post.excerpt}</p>
                          ) : (
                            <div className="prose prose-sm max-w-none">
                              <p className="line-clamp-3 text-sm text-muted-foreground">{post.content}</p>
                            </div>
                          )}
                          
                          {(post.metaTitle || post.metaDescription) && (
                            <div className="mt-3 pt-3 border-t">
                              <h4 className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                                <Search className="h-3 w-3" /> SEO Metadata
                              </h4>
                              {post.metaTitle && (
                                <p className="text-xs line-clamp-1 text-muted-foreground">
                                  <span className="font-medium">Title:</span> {post.metaTitle}
                                </p>
                              )}
                              {post.metaDescription && (
                                <p className="text-xs line-clamp-1 text-muted-foreground">
                                  <span className="font-medium">Description:</span> {post.metaDescription}
                                </p>
                              )}
                            </div>
                          )}
                        </CardContent>
                        <CardFooter className="text-xs text-muted-foreground border-t pt-3 px-4 pb-3 mt-auto bg-muted/10">
                          <div className="flex justify-between w-full">
                            <span className="flex items-center gap-1" title={post.slug}>
                              <Code className="h-3 w-3" /> 
                              <span className="truncate max-w-[100px]">{post.slug}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {new Date(post.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Blog Subscribers Section */}
      <div className="mt-10 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b">
          <div>
            <h3 className="text-xl font-semibold">Blog Subscribers</h3>
            <p className="text-sm text-muted-foreground mt-1">Manage your blog subscriber list and engagement</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button size="sm" variant="secondary" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Create Campaign
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

        {/* Enhanced Subscriber list */}
        {!isSubscribersLoading && !isSubscribersError && blogSubscribers.length > 0 && (
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-md flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Subscriber List
                  </CardTitle>
                  <CardDescription>Manage your blog subscribers</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search subscribers..."
                    className="max-w-[180px] h-8 text-xs"
                  />
                  <select 
                    className="border rounded px-2 py-1 text-xs bg-background h-8"
                    defaultValue="all"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active Only</option>
                    <option value="pending">Pending Only</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[250px]">Email</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Industry</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead className="w-[120px]">Subscribed On</TableHead>
                        <TableHead className="w-[90px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {blogSubscribers.slice(0, 5).map(subscriber => (
                        <TableRow key={subscriber.id}>
                          <TableCell className="font-medium">{subscriber.email}</TableCell>
                          <TableCell>{subscriber.name || <span className="text-muted-foreground text-xs">Not provided</span>}</TableCell>
                          <TableCell>{subscriber.industry || <span className="text-muted-foreground text-xs">Not provided</span>}</TableCell>
                          <TableCell>
                            {subscriber.isActive ? (
                              <Badge className="bg-green-500 flex items-center w-fit gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-white/80"></span>
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-orange-500 flex items-center w-fit gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-orange-500/80"></span>
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {new Date(subscriber.createdAt).toLocaleDateString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive">
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              {blogSubscribers.length > 5 && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-xs text-muted-foreground">
                    Showing 5 of {blogSubscribers.length} subscribers
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

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
                        <Input placeholder="5 min" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormDescription>Estimated time to read</FormDescription>
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

      {/* Delete Post Confirmation Dialog */}
      <AlertDialog open={isBlogPostDeleteDialogOpen} onOpenChange={setIsBlogPostDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this blog post. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBlogPostConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteBlogPostMutation.isPending ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-current rounded-full"></span>
                  Deleting...
                </span>
              ) : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BlogContentManager;