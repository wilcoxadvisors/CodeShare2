import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import EntitySelector from "./EntitySelector";

// Define our validation schema for consolidation groups with enhanced validation
const consolidationGroupSchema = z.object({
  name: z.string().min(2, { message: "Group name must be at least 2 characters." }),
  description: z.string().optional(),
  currency: z.string().min(1, { message: "Currency is required." }),
  entityIds: z.array(z.number()).min(1, { message: "Select at least one entity." }),
});

interface ConsolidationGroup {
  id: number;
  name: string;
  description: string | null;
  entityIds: number[];        // Entity IDs from junction table
  ownerId: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

interface ConsolidationSetupProps {
  entities: any[];
}

export default function ConsolidationSetup({ entities = [] }: ConsolidationSetupProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("create");
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);

  // Fetch consolidation groups
  const { data: groups = [], refetch: refetchGroups } = useQuery<ConsolidationGroup[]>({
    queryKey: ['/api/consolidation-groups'],
    retry: 1,
  });

  // Form for creating/editing consolidation groups
  const form = useForm<z.infer<typeof consolidationGroupSchema>>({
    resolver: zodResolver(consolidationGroupSchema),
    defaultValues: {
      name: "",
      description: "",
      currency: "USD",
      entityIds: [],
    },
  });

  // Reset form to create new group
  const resetForm = () => {
    form.reset({
      name: "",
      description: "",
      currency: "USD",
      entityIds: [],
    });
    setEditingGroupId(null);
    setActiveTab("create");
  };

  // Load a group for editing
  const editGroup = (group: ConsolidationGroup) => {
    form.reset({
      name: group.name,
      description: group.description || "",
      currency: group.currency,
      // Use the entityIds from junction table
      entityIds: group.entityIds || [],
    });
    setEditingGroupId(group.id);
    setActiveTab("create");
  };

  // Submit the form to create or update a consolidation group
  const onSubmit = async (data: z.infer<typeof consolidationGroupSchema>) => {
    try {
      if (editingGroupId) {
        // Update existing group
        await apiRequest(`/api/consolidation-groups/${editingGroupId}`, {
          method: 'PUT',
          data,
        });
        toast({
          title: "Success",
          description: "Consolidation group updated successfully.",
        });
      } else {
        // Create new group
        await apiRequest('/api/consolidation-groups', {
          method: 'POST',
          data,
        });
        toast({
          title: "Success",
          description: "Consolidation group created successfully.",
        });
      }

      // Invalidate queries and reset form
      queryClient.invalidateQueries({ queryKey: ['/api/consolidation-groups'] });
      resetForm();
      refetchGroups();
      setActiveTab("manage");
    } catch (error: any) {
      console.error("Error saving consolidation group:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save consolidation group.",
        variant: "destructive",
      });
    }
  };

  // Delete a consolidation group
  const deleteGroup = async (groupId: number) => {
    if (!confirm("Are you sure you want to delete this consolidation group?")) {
      return;
    }

    try {
      await apiRequest(`/api/consolidation-groups/${groupId}`, {
        method: 'DELETE',
      });
      
      toast({
        title: "Success",
        description: "Consolidation group deleted successfully.",
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/consolidation-groups'] });
      refetchGroups();
    } catch (error: any) {
      console.error("Error deleting consolidation group:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete consolidation group.",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <Tabs defaultValue="create" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="create" className="font-medium">
            {editingGroupId ? "Edit Group" : "Create Group"}
          </TabsTrigger>
          <TabsTrigger value="manage">Manage Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {editingGroupId ? "Edit Consolidation Group" : "Create Consolidation Group"}
              </CardTitle>
              <CardDescription>
                {editingGroupId
                  ? "Update the details of your consolidation group"
                  : "Create a new group for consolidated reporting"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Group Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Corporate Group" {...field} />
                          </FormControl>
                          <FormDescription>
                            A descriptive name for this consolidation group
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="USD">USD - US Dollar</SelectItem>
                              <SelectItem value="EUR">EUR - Euro</SelectItem>
                              <SelectItem value="GBP">GBP - British Pound</SelectItem>
                              <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                              <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                              <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            The reporting currency for consolidated statements
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="A description of the consolidation group purpose..."
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Optional description of the consolidation group's purpose
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />
                  <h3 className="text-lg font-medium">Select Entities to Include</h3>

                  {entities.length === 0 ? (
                    <div className="text-center p-6 border rounded-lg bg-muted/50">
                      <h3 className="text-lg font-medium mb-2">No Entities Available</h3>
                      <p className="text-muted-foreground mb-4">
                        You need to create at least one entity before you can set up consolidation groups.
                      </p>
                      <Button variant="outline" onClick={() => window.location.href = '/client-onboarding'}>
                        Add Entities
                      </Button>
                    </div>
                  ) : (
                    <FormField
                      control={form.control}
                      name="entityIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <EntitySelector
                              entities={entities}
                              selectedEntityIds={field.value}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormDescription>
                            Select the business entities to include in this consolidation group
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="flex justify-end space-x-2">
                    {editingGroupId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetForm}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button type="submit" disabled={entities.length === 0}>
                      {editingGroupId ? "Update Group" : "Create Group"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-6 mt-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium">Your Consolidation Groups</h2>
              <Button variant="outline" size="sm" onClick={resetForm}>
                Create New Group
              </Button>
            </div>

            {groups && groups.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {groups.map(group => (
                  <Card key={group.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/50 pb-2">
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <CardDescription>
                        {group.description || "No description"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="grid gap-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Entities:</span>
                          <span className="font-medium">{group.entityIds?.length || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Currency:</span>
                          <span className="font-medium">{group.currency}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Created:</span>
                          <span className="font-medium">
                            {new Date(group.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="mt-4 space-x-2 flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => editGroup(group)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteGroup(group.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6 pb-6">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">
                      No consolidation groups found. Create your first group to get started.
                    </p>
                    <Button onClick={() => setActiveTab("create")}>
                      Create Consolidation Group
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}