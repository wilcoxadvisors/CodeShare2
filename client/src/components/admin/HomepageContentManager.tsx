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
  FileX,
  LayoutTemplate,
  ListChecks,
  Quote,
  Info,
  DollarSign,
  Mail,
  Search,
  ArrowDownUp
} from 'lucide-react';

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

type HomepageContentFormValues = z.infer<typeof homepageContentSchema>;

const HomepageContentManager: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<string>("all");
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<HomepageContent | null>(null);
  const [contentToDelete, setContentToDelete] = useState<HomepageContent | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch all homepage content
  const { 
    data: homepageContents = [], 
    isLoading, 
    isError, 
    error 
  } = useQuery<HomepageContent[]>({
    queryKey: ['/api/content/homepage'],
    select: (data: any) => data.data || []
  });

  // Create homepage sections list for tabs
  const sectionsSet = new Set(homepageContents.map(content => content.section));
  const sections = ['all', ...Array.from(sectionsSet)];

  // Filter homepage contents by active section
  const filteredContents = activeSection === 'all'
    ? homepageContents
    : homepageContents.filter(content => content.section === activeSection);

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

  // Preview website function
  const previewWebsite = () => {
    window.open('/', '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Content</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Failed to load homepage content. Please try again later.</p>
            <p className="text-sm text-muted-foreground">{String(error)}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b">
        <div>
          <h3 className="text-xl font-semibold">Homepage Sections</h3>
          <p className="text-sm text-muted-foreground mt-1">Manage and organize your website's homepage content</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={previewWebsite} variant="outline" size="sm" className="mr-2">
            <Eye className="mr-2 h-4 w-4" />
            Preview Site
          </Button>
          <Button onClick={handleNewContentClick} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add New Section
          </Button>
        </div>
      </div>

      {/* Content section table view with enhanced tabs */}
      <div className="rounded-md border shadow-sm">
        <div className="p-4 bg-muted/30 border-b">
          <Tabs value={activeSection} onValueChange={setActiveSection}>
            <TabsList className="mb-0 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {sections.map(section => (
                <TabsTrigger key={section} value={section} className="flex items-center">
                  {section === 'hero' && <LayoutTemplate className="h-4 w-4 mr-2" />}
                  {section === 'features' && <ListChecks className="h-4 w-4 mr-2" />}
                  {section === 'testimonials' && <Quote className="h-4 w-4 mr-2" />}
                  {section === 'about' && <Info className="h-4 w-4 mr-2" />}
                  {section === 'pricing' && <DollarSign className="h-4 w-4 mr-2" />}
                  {section === 'contact' && <Mail className="h-4 w-4 mr-2" />}
                  {section.charAt(0).toUpperCase() + section.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {filteredContents.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mb-4 flex justify-center">
              <FileX className="h-12 w-12 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-medium mb-2">No content found</h3>
            <p className="mb-6 text-muted-foreground max-w-md mx-auto">
              There are no content entries for the {activeSection} section yet. 
              Create your first content block to get started.
            </p>
            <Button onClick={handleNewContentClick} className="gap-2">
              <Plus className="h-4 w-4" />
              Add {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} Content
            </Button>
          </div>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Section</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[100px]">Order</TableHead>
                  <TableHead className="w-[100px]">Image</TableHead>
                  <TableHead className="w-[200px]">Last Updated</TableHead>
                  <TableHead className="w-[150px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContents.map(content => (
                  <TableRow key={content.id}>
                    <TableCell className="font-medium">{content.section}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{content.title}</span>
                        <span className="text-xs text-muted-foreground line-clamp-1">{content.content}</span>
                      </div>
                    </TableCell>
                    <TableCell>{content.displayOrder}</TableCell>
                    <TableCell>
                      {content.imageUrl ? (
                        <Badge variant="outline" className="truncate max-w-[100px]">
                          <FileImage className="h-3 w-3 mr-1" />
                          <span className="truncate">{content.imageUrl.split('/').pop()}</span>
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs flex items-center">
                        <CalendarDays className="h-3 w-3 mr-1" />
                        {new Date(content.updatedAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button onClick={() => handleEditClick(content)} size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => handleDeleteClick(content)} size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Enhanced Card Grid View */}
      <div>
        <h3 className="text-md font-medium mb-4 flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4" />
          Visual Content Layout
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContents.map(content => (
            <Card key={content.id} className="flex flex-col overflow-hidden transition-all duration-200 hover:shadow-md">
              <CardHeader className="px-4 py-3 pb-2 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge variant="outline" className="mb-2 text-xs capitalize">
                      {content.section}
                    </Badge>
                    <CardTitle className="line-clamp-2 text-base">{content.title}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      onClick={() => handleEditClick(content)} 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0 hover:bg-primary/10"
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button 
                      onClick={() => handleDeleteClick(content)} 
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
                {content.imageUrl && (
                  <div className="mb-3 rounded-md overflow-hidden h-32 bg-muted/50 border">
                    <div className="text-xs text-muted-foreground p-2 bg-muted/25 h-full flex items-center justify-center">
                      <FileImage className="h-4 w-4 mr-1" /> 
                      <span className="truncate max-w-[200px]">{content.imageUrl.split('/').pop()}</span>
                    </div>
                  </div>
                )}
                <div className="prose prose-sm max-w-none">
                  <p className="line-clamp-3 text-sm text-muted-foreground">{content.content}</p>
                </div>
                {(content.metaTitle || content.metaDescription) && (
                  <div className="mt-3 pt-3 border-t">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                      <Search className="h-3 w-3" /> SEO Metadata
                    </h4>
                    {content.metaTitle && (
                      <p className="text-xs line-clamp-1 text-muted-foreground">
                        <span className="font-medium">Title:</span> {content.metaTitle}
                      </p>
                    )}
                    {content.metaDescription && (
                      <p className="text-xs line-clamp-1 text-muted-foreground">
                        <span className="font-medium">Description:</span> {content.metaDescription}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground border-t pt-3 px-4 pb-3 mt-auto bg-muted/10">
                <div className="flex justify-between w-full">
                  <span className="whitespace-nowrap flex items-center gap-1">
                    <ArrowDownUp className="h-3 w-3" />
                    Order: {content.displayOrder}
                  </span>
                  <span className="whitespace-nowrap flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {new Date(content.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this content. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? (
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

export default HomepageContentManager;