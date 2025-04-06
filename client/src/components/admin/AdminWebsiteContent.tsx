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
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
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

const AdminWebsiteContent: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<string>("all");
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<HomepageContent | null>(null);
  const [contentToDelete, setContentToDelete] = useState<HomepageContent | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch all homepage content
  const { data: homepageContents = [], isLoading, isError, error } = useQuery<HomepageContent[]>({
    queryKey: ['/api/content/homepage'],
    select: (data: any) => data.data || []
  });

  // Create sections list for tabs 
  const sections = ['all', ...new Set(homepageContents.map(content => content.section))];

  // Filter contents by active section
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
      <div className="p-8">
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Website Content Management</h2>
          <p className="text-muted-foreground">Manage content displayed on your website</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleNewContentClick} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add New Content
          </Button>
          <Button onClick={previewWebsite} variant="outline" size="sm">
            <Eye className="mr-2 h-4 w-4" />
            Preview Site
          </Button>
        </div>
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
    </div>
  );
};

export default AdminWebsiteContent;