import React, { useState, useMemo } from "react";
import {
  X,
  Plus,
  ChevronDown,
  ChevronRight,
  Tags,
  Check,
} from "lucide-react";
import { UseFormReturn, FieldArrayWithId } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { AccountType, type JournalEntryFormData } from "@shared/schema";

interface DimensionTag {
  dimensionId: number;
  dimensionValueId: number;
  dimensionName?: string;
  dimensionValueName?: string;
}

interface Account {
  id: number;
  accountCode: string;
  name: string;
  entityId: number;
  type: AccountType;
  description: string | null;
  active: boolean;
  createdAt?: Date;
  subtype?: string | null;
  isSubledger?: boolean;
  subledgerType?: string | null;
  parentId?: number | null;
  [key: string]: any;
}

interface Entity {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  active: boolean;
}

interface EntityBalance {
  entityCode: string;
  debit: number;
  credit: number;
  difference: number;
  balanced: boolean;
}

interface Dimension {
  id: number;
  name: string;
  code?: string;
  description?: string | null;
  active: boolean;
  values: DimensionValue[];
}

interface DimensionValue {
  id: number;
  dimensionId: number;
  name: string;
  code?: string;
  description?: string | null;
  active: boolean;
}

interface JournalEntryLinesTableProps {
  form: UseFormReturn<JournalEntryFormData>;
  fields: FieldArrayWithId<JournalEntryFormData, "lines", "id">[];
  accounts: Account[];
  entities?: Entity[];
  dimensions?: Dimension[];
  append: (value: any) => void;
  remove: (index: number) => void;
  updateLineTags: (lineIndex: number, tags: DimensionTag[]) => void;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  entityBalances: EntityBalance[];
}

export function JournalEntryLinesTable({
  form,
  fields,
  accounts,
  entities = [],
  dimensions = [],
  append,
  remove,
  updateLineTags,
  totalDebit,
  totalCredit,
  isBalanced,
  entityBalances,
}: JournalEntryLinesTableProps) {
  const [expandedAccounts, setExpandedAccounts] = useState<Record<number, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [tagPopoverOpen, setTagPopoverOpen] = useState<Record<string, boolean>>({});
  const [accountPopoverOpen, setAccountPopoverOpen] = useState<Record<string, boolean>>({});
  const [expandedDimensions, setExpandedDimensions] = useState<Record<number, boolean>>({});
  const [dimensionSearchQuery, setDimensionSearchQuery] = useState("");

  // Calculate difference
  const difference = totalDebit - totalCredit;

  // Toggle function for dimension expansion
  const toggleDimensionExpansion = (dimensionId: number) => {
    setExpandedDimensions(prev => ({ ...prev, [dimensionId]: !prev[dimensionId] }));
  };

  // Build hierarchical account tree
  const accountTree = useMemo(() => {
    const accountMap = new Map<number, Account & { children: (Account & { children: any[] })[] }>();
    const rootAccounts: (Account & { children: any[] })[] = [];

    // Initialize all accounts with children array
    accounts.forEach(account => {
      accountMap.set(account.id, { ...account, children: [] });
    });

    // Build tree structure
    accounts.forEach(account => {
      const accountWithChildren = accountMap.get(account.id)!;
      if (account.parentId) {
        const parent = accountMap.get(account.parentId);
        if (parent) {
          parent.children.push(accountWithChildren);
        } else {
          rootAccounts.push(accountWithChildren);
        }
      } else {
        rootAccounts.push(accountWithChildren);
      }
    });

    return rootAccounts;
  }, [accounts]);

  // Filter accounts based on search query
  const filteredAccountTree = useMemo(() => {
    if (!searchQuery.trim()) return accountTree;

    const filterAccounts = (accounts: any[]): any[] => {
      return accounts.reduce((filtered, account) => {
        const matchesSearch = 
          account.accountCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          account.name.toLowerCase().includes(searchQuery.toLowerCase());

        const filteredChildren = filterAccounts(account.children);

        if (matchesSearch || filteredChildren.length > 0) {
          filtered.push({
            ...account,
            children: filteredChildren
          });
        }

        return filtered;
      }, []);
    };

    return filterAccounts(accountTree);
  }, [accountTree, searchQuery]);

  // Auto-expand parents when search matches children
  const autoExpandedAccounts = useMemo(() => {
    if (!searchQuery.trim()) return {};
    
    const expansions: Record<number, boolean> = {};
    
    const expandParentsWithMatchingChildren = (accounts: any[]) => {
      accounts.forEach(account => {
        if (account.children.length > 0) {
          const hasMatchingChild = account.children.some((child: any) => 
            child.accountCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
            child.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
          
          if (hasMatchingChild) {
            expansions[account.id] = true;
          }
          
          expandParentsWithMatchingChildren(account.children);
        }
      });
    };
    
    expandParentsWithMatchingChildren(filteredAccountTree);
    return expansions;
  }, [filteredAccountTree, searchQuery]);

  // Combine manual and auto expansions
  const combinedExpansions = { ...expandedAccounts, ...autoExpandedAccounts };

  // Filter dimensions based on search query
  const filteredDimensions = useMemo(() => {
    if (!dimensionSearchQuery.trim()) {
      return dimensions.filter(dim => dim.values && dim.values.length > 0);
    }

    return dimensions.filter(dimension => {
      if (!dimension.values || dimension.values.length === 0) return false;
      
      const dimensionMatches = dimension.name.toLowerCase().includes(dimensionSearchQuery.toLowerCase());
      const valueMatches = dimension.values.some(value => 
        value.name.toLowerCase().includes(dimensionSearchQuery.toLowerCase()) ||
        (value.code && value.code.toLowerCase().includes(dimensionSearchQuery.toLowerCase()))
      );
      
      return dimensionMatches || valueMatches;
    });
  }, [dimensions, dimensionSearchQuery]);

  // Render hierarchical dimension tree with react-hook-form integration
  const renderDimensionTree = (dimension: Dimension, lineIndex: number): React.ReactNode => {
    const isExpanded = expandedDimensions[dimension.id] || false;
    const hasValues = dimension.values && dimension.values.length > 0;

    if (!hasValues) return null;

    return (
      <div key={dimension.id}>
        {/* Dimension Header */}
        <CommandItem
          className="flex items-center gap-2 cursor-pointer font-medium"
          onSelect={() => toggleDimensionExpansion(dimension.id)}
        >
          <span className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </span>
          <span className="text-sm font-medium">
            {dimension.name}
          </span>
        </CommandItem>

        {/* Dimension Values */}
        {isExpanded && (
          <>
            {dimension.values.map((value) => {
              const currentTags = form.watch(`lines.${lineIndex}.tags`) || [];
              const isSelected = currentTags.some((tag: DimensionTag) => tag.dimensionValueId === value.id);

              return (
                <CommandItem
                  key={value.id}
                  className="flex items-center gap-2 cursor-pointer pl-8"
                  onSelect={() => {
                    // Get current tags from form state
                    const currentTags = form.getValues(`lines.${lineIndex}.tags`) || [];

                    let newTags;
                    if (isSelected) {
                      // REMOVE the tag if it's already selected
                      newTags = currentTags.filter((tag: DimensionTag) => tag.dimensionValueId !== value.id);
                    } else {
                      // ADD the tag, ensuring only one value per dimension
                      const otherDimensionTags = currentTags.filter((tag: DimensionTag) => tag.dimensionId !== dimension.id);
                      newTags = [
                        ...otherDimensionTags,
                        {
                          dimensionId: dimension.id,
                          dimensionValueId: value.id,
                          dimensionName: dimension.name,
                          dimensionValueName: value.name
                        }
                      ];
                    }

                    // Update the form state with the new array of tags
                    form.setValue(`lines.${lineIndex}.tags`, newTags);
                  }}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm">
                      {value.name}
                    </span>
                    {value.code && (
                      <span className="text-xs text-gray-500 font-mono">
                        ({value.code})
                      </span>
                    )}
                    <Check 
                      className={`ml-auto h-4 w-4 ${
                        isSelected ? "opacity-100" : "opacity-0"
                      }`} 
                    />
                  </div>
                </CommandItem>
              );
            })}
          </>
        )}
      </div>
    );
  };

  // Add line function using react-hook-form append
  const addLine = () => {
    const newLine = {
      _key: `new-${Date.now()}`,
      accountId: "",
      entityCode: entities.length > 0 ? entities[0].code : "",
      description: "",
      debit: "",
      credit: "",
      tags: [],
    };
    append(newLine);
  };

  // Render hierarchical account tree with react-hook-form integration
  const renderAccountTree = (account: any, depth: number, lineIndex: number): React.ReactNode => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = combinedExpansions[account.id] || false;
    const isSelectable = !hasChildren; // Only leaf nodes are selectable

    return (
      <div key={account.id}>
        <CommandItem
          className={`flex items-center gap-2 ${isSelectable ? 'cursor-pointer' : 'cursor-default'}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onSelect={() => {
            if (isSelectable) {
              // Use react-hook-form setValue to update the account
              form.setValue(`lines.${lineIndex}.accountId`, account.id.toString());
              // Close the popover
              setAccountPopoverOpen(prev => ({ ...prev, [`line_${lineIndex}`]: false }));
            } else {
              // Toggle expansion for parent nodes
              setExpandedAccounts(prev => ({ ...prev, [account.id]: !prev[account.id] }));
            }
          }}
          disabled={!isSelectable}
        >
          {hasChildren && (
            <span className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-gray-600 flex-shrink-0">
                {account.accountCode}
              </span>
              <span className="text-sm truncate">
                {account.name}
              </span>
              {isSelectable && (
                <Check 
                  className={`ml-auto h-4 w-4 ${
                    form.watch(`lines.${lineIndex}.accountId`) === account.id.toString() 
                      ? "opacity-100" 
                      : "opacity-0"
                  }`} 
                />
              )}
            </div>
          </div>
        </CommandItem>

        {hasChildren && isExpanded && (
          <>
            {account.children.map((child: any) => 
              renderAccountTree(child, depth + 1, lineIndex)
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Journal Entry Lines</h3>
        <Button type="button" onClick={addLine}>
          <Plus className="h-4 w-4 mr-2" />
          Add Line
        </Button>
      </div>

      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-1 md:grid-cols-7 gap-4 p-4 border rounded bg-gray-50">
            {/* Account Selection */}
            <div>
              <label className="text-sm font-medium">Account *</label>
              <Popover 
                open={accountPopoverOpen[`line_${index}`] || false}
                onOpenChange={(open) => 
                  setAccountPopoverOpen(prev => ({ ...prev, [`line_${index}`]: open }))
                }
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between mt-1"
                    type="button"
                  >
                    {(() => {
                      const selectedAccountId = form.watch(`lines.${index}.accountId`);
                      const selectedAccount = accounts.find(acc => acc.id.toString() === selectedAccountId);
                      return selectedAccount 
                        ? `${selectedAccount.accountCode} - ${selectedAccount.name}`
                        : "Select account...";
                    })()}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search accounts..." 
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>No accounts found.</CommandEmpty>
                      <CommandGroup>
                        {filteredAccountTree.map((account) => 
                          renderAccountTree(account, 0, index)
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Entity Code */}
            <div>
              <label className="text-sm font-medium">Entity</label>
              <select 
                {...form.register(`lines.${index}.entityCode`)} 
                className="w-full p-2 border rounded mt-1"
              >
                {entities.map((entity) => (
                  <option key={entity.id} value={entity.code}>
                    {entity.code} - {entity.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium">Description *</label>
              <Input 
                {...form.register(`lines.${index}.description`)} 
                className="mt-1"
                placeholder="Line description"
              />
            </div>

            {/* Debit */}
            <div>
              <label className="text-sm font-medium">Debit</label>
              <Input
                type="number"
                step="0.01"
                {...form.register(`lines.${index}.debit`)}
                className="mt-1"
                placeholder="0.00"
              />
            </div>

            {/* Credit */}
            <div>
              <label className="text-sm font-medium">Credit</label>
              <Input
                type="number"
                step="0.01"
                {...form.register(`lines.${index}.credit`)}
                className="mt-1"
                placeholder="0.00"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="text-sm font-medium">Tags</label>
              <div className="mt-1 space-y-2">
                {/* Display existing tags */}
                <div className="flex flex-wrap gap-1">
                  {(form.watch(`lines.${index}.tags`) || []).map((tag: DimensionTag, tagIndex: number) => (
                    <Badge 
                      key={`${tag.dimensionId}-${tag.dimensionValueId}`}
                      variant="secondary" 
                      className="text-xs"
                    >
                      {tag.dimensionName}: {tag.dimensionValueName}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => {
                          const currentTags = form.getValues(`lines.${index}.tags`) || [];
                          const newTags = currentTags.filter((_: any, i: number) => i !== tagIndex);
                          form.setValue(`lines.${index}.tags`, newTags);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
                
                {/* Add Tags Button */}
                <Popover 
                  open={tagPopoverOpen[`line_${index}`] || false}
                  onOpenChange={(open) => 
                    setTagPopoverOpen(prev => ({ ...prev, [`line_${index}`]: open }))
                  }
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Tags className="h-4 w-4 mr-2" />
                      Add Tags
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Search dimensions..." 
                        value={dimensionSearchQuery}
                        onValueChange={setDimensionSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>No dimensions found.</CommandEmpty>
                        <CommandGroup>
                          {filteredDimensions.map((dimension) => 
                            renderDimensionTree(dimension, index)
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Remove Button */}
            <div className="flex items-end">
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => remove(index)}
                  className="w-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Balance Summary */}
      <div className="mt-4 p-4 bg-gray-50 rounded border">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium">Total Debit:</span> ${totalDebit.toFixed(2)}
          </div>
          <div>
            <span className="font-medium">Total Credit:</span> ${totalCredit.toFixed(2)}
          </div>
          <div className={isBalanced ? "text-green-600" : "text-red-600"}>
            <span className="font-medium">
              {isBalanced ? "✓ Balanced" : "⚠ Not Balanced"}
            </span>
            {!isBalanced && (
              <div className="text-xs">
                Difference: ${Math.abs(difference).toFixed(2)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Entity Balances */}
      {entityBalances.length > 0 && (
        <div className="mt-4 p-4 bg-blue-50 rounded border">
          <h4 className="text-sm font-medium mb-2">Entity Balances (Intercompany)</h4>
          <div className="space-y-1">
            {entityBalances.map((balance) => (
              <div key={balance.entityCode} className="text-xs grid grid-cols-4 gap-2">
                <div className="font-medium">{balance.entityCode}</div>
                <div>Debit: ${balance.debit.toFixed(2)}</div>
                <div>Credit: ${balance.credit.toFixed(2)}</div>
                <div className={balance.balanced ? "text-green-600" : "text-orange-600"}>
                  {balance.balanced ? "✓ Balanced" : `Diff: $${Math.abs(balance.difference).toFixed(2)}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}