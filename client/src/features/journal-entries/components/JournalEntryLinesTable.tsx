import React, { useState, useMemo } from "react";
import { X, Plus, ChevronDown, ChevronRight, Tag, Tags, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { AccountType } from "@shared/schema";


interface DimensionTag {
  dimensionId: number;
  dimensionValueId: number;
  dimensionName?: string;
  dimensionValueName?: string;
}

interface JournalLine {
  id?: number;
  _key?: string;
  accountId: string;
  entityCode: string;
  description: string;
  debit: string;
  credit: string;
  tags: DimensionTag[];
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
  lines: JournalLine[];
  setLines: React.Dispatch<React.SetStateAction<JournalLine[]>>;
  accounts: Account[];
  entities?: Entity[];
  dimensions?: Dimension[];
  fieldErrors: Record<string, string>;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

export function JournalEntryLinesTable({
  lines,
  setLines,
  accounts,
  entities = [],
  dimensions = [],
  fieldErrors,
  totalDebit,
  totalCredit,
  isBalanced,
}: JournalEntryLinesTableProps) {
  // Ensure dimensions is always an array
  const safeDimensions = React.useMemo(() => {
    return Array.isArray(dimensions) ? dimensions : [];
  }, [dimensions]);
  // State for search and expansion
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedAccounts, setExpandedAccounts] = useState<Record<number, boolean>>({});
  const [accountPopoverOpen, setAccountPopoverOpen] = useState<Record<string, boolean>>({});
  const [tagPopoverOpen, setTagPopoverOpen] = useState<Record<string, boolean>>({});
  const [dimensionSearchQuery, setDimensionSearchQuery] = useState("");
  const [expandedDimensions, setExpandedDimensions] = useState<Record<number, boolean>>({});

  // Create hierarchical account structure
  const accountTree = useMemo(() => {
    const tree: Account[] = [];
    const accountMap: Record<number, Account & { children: Account[] }> = {};

    // First pass: create map with children arrays
    accounts.forEach((account) => {
      accountMap[account.id] = { ...account, children: [] };
    });

    // Second pass: build tree structure
    accounts.forEach((account) => {
      if (account.parentId && accountMap[account.parentId]) {
        accountMap[account.parentId].children.push(accountMap[account.id]);
      } else {
        tree.push(accountMap[account.id]);
      }
    });

    return tree;
  }, [accounts]);

  // Filter accounts based on search
  const filteredAccountTree = useMemo(() => {
    if (!searchQuery) return accountTree;

    const searchLower = searchQuery.toLowerCase();
    const filterTree = (accounts: Account[]): Account[] => {
      return accounts.filter((account: any) => {
        const matchesSearch = 
          account.accountCode?.toLowerCase().includes(searchLower) ||
          account.name?.toLowerCase().includes(searchLower);
        
        const hasMatchingChild = account.children && filterTree(account.children).length > 0;
        
        if (matchesSearch || hasMatchingChild) {
          // Auto-expand if this account or its children match
          if (hasMatchingChild) {
            setExpandedAccounts(prev => ({ ...prev, [account.id]: true }));
          }
          return true;
        }
        
        return false;
      });
    };

    return filterTree(accountTree);
  }, [accountTree, searchQuery]);

  // Filter dimensions based on search
  const filteredDimensions = useMemo(() => {
    if (!dimensionSearchQuery) return safeDimensions;

    const searchLower = dimensionSearchQuery.toLowerCase();
    return safeDimensions.filter((dimension) => {
      const matchesName = dimension.name?.toLowerCase().includes(searchLower);
      const hasMatchingValues = dimension.values?.some((value) =>
        value.name?.toLowerCase().includes(searchLower)
      );
      
      // Auto-expand if dimension has matching values
      if (hasMatchingValues) {
        setExpandedDimensions(prev => ({ ...prev, [dimension.id]: true }));
      }
      
      return matchesName || hasMatchingValues;
    });
  }, [safeDimensions, dimensionSearchQuery]);

  // Combined expansion state for accounts (search + manual)
  const combinedExpansions = useMemo(() => {
    return { ...expandedAccounts };
  }, [expandedAccounts]);

  const addLine = () => {
    const newLine: JournalLine = {
      _key: `new-${Date.now()}`,
      accountId: "",
      entityCode: entities.length > 0 ? entities[0].code : "",
      description: "",
      debit: "",
      credit: "",
      tags: [],
    };
    setLines([...lines, newLine]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return; // Keep at least one line
    const newLines = lines.filter((_, i) => i !== index);
    setLines(newLines);
  };

  const updateLine = (index: number, field: keyof JournalLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const updateLineTags = (lineIndex: number, tags: DimensionTag[]) => {
    const newLines = [...lines];
    newLines[lineIndex] = { ...newLines[lineIndex], tags };
    setLines(newLines);
  };

  // Render hierarchical account tree
  const renderAccountTree = (account: any, depth: number, lineIndex: number): React.ReactNode => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = combinedExpansions[account.id] || false;
    const isSelectable = !hasChildren; // Only leaf nodes are selectable

    return (
      <div key={account.id}>
        <div
          className={`flex items-center py-2 px-2 hover:bg-accent cursor-pointer ${
            depth > 0 ? `ml-${depth * 4}` : ""
          }`}
          style={{ marginLeft: `${depth * 16}px` }}
          onClick={() => {
            if (hasChildren) {
              setExpandedAccounts(prev => ({
                ...prev,
                [account.id]: !prev[account.id]
              }));
            } else if (isSelectable) {
              updateLine(lineIndex, "accountId", account.id.toString());
              setAccountPopoverOpen(prev => ({ ...prev, [`line_${lineIndex}`]: false }));
            }
          }}
        >
          {hasChildren && (
            <div className="mr-2">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          )}
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className={`text-sm ${hasChildren ? "font-medium" : ""}`}>
                {account.accountCode} - {account.name}
              </span>
              {isSelectable && lines[lineIndex]?.accountId === account.id.toString() && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {account.children.map((child: any) => 
              renderAccountTree(child, depth + 1, lineIndex)
            )}
          </div>
        )}
      </div>
    );
  };

  // Render dimension tree for tags
  const renderDimensionTree = (dimension: Dimension, lineIndex: number): React.ReactNode => {
    const isExpanded = expandedDimensions[dimension.id] || false;
    const currentTags = lines[lineIndex]?.tags || [];

    return (
      <div key={dimension.id}>
        {/* Dimension Header */}
        <div
          className="flex items-center py-2 px-2 hover:bg-accent cursor-pointer"
          onClick={() => {
            setExpandedDimensions(prev => ({
              ...prev,
              [dimension.id]: !prev[dimension.id]
            }));
          }}
        >
          <div className="mr-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
          <span className="text-sm font-medium">{dimension.name}</span>
        </div>

        {/* Dimension Values */}
        {isExpanded && (
          <div className="ml-6">
            {dimension.values?.map((value) => {
              const isSelected = currentTags.some((tag: DimensionTag) => tag.dimensionValueId === value.id);
              
              return (
                <div
                  key={value.id}
                  className="flex items-center py-1 px-2 hover:bg-accent cursor-pointer"
                  onClick={() => {
                    let newTags: DimensionTag[];
                    
                    if (isSelected) {
                      // Remove this tag
                      newTags = currentTags.filter((tag: DimensionTag) => tag.dimensionValueId !== value.id);
                    } else {
                      // Remove any existing tag for this dimension, then add the new one
                      const otherDimensionTags = currentTags.filter((tag: DimensionTag) => tag.dimensionId !== dimension.id);
                      const newTag: DimensionTag = {
                        dimensionId: dimension.id,
                        dimensionValueId: value.id,
                        dimensionName: dimension.name,
                        dimensionValueName: value.name,
                      };
                      newTags = [...otherDimensionTags, newTag];
                    }
                    
                    updateLineTags(lineIndex, newTags);
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm">{value.name}</span>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const difference = totalDebit - totalCredit;

  // Calculate entity balances locally
  const entityBalances = useMemo(() => {
    const entityCodesArray = lines.map((line) => line.entityCode);
    const filteredCodes = entityCodesArray.filter(Boolean);
    const uniqueEntityCodes: string[] = [];
    
    filteredCodes.forEach(code => {
      if (code && uniqueEntityCodes.indexOf(code) === -1) {
        uniqueEntityCodes.push(code);
      }
    });

    if (uniqueEntityCodes.length <= 1) {
      return [];
    }

    return uniqueEntityCodes.map((entityCode) => {
      const entityLines = lines.filter((line) => line.entityCode === entityCode);
      const entityDebit = entityLines.reduce(
        (sum, line) => sum + (parseFloat(line.debit) || 0),
        0,
      );
      const entityCredit = entityLines.reduce(
        (sum, line) => sum + (parseFloat(line.credit) || 0),
        0,
      );
      const entityDifference = entityDebit - entityCredit;

      return {
        entityCode,
        debit: entityDebit,
        credit: entityCredit,
        difference: entityDifference,
        balanced: Math.abs(entityDifference) < 0.01,
      };
    });
  }, [lines]);

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
        {lines.map((line, index) => (
          <div key={line._key || line.id || index} className="grid grid-cols-1 md:grid-cols-7 gap-4 p-4 border rounded bg-gray-50">
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
                      const selectedAccount = accounts.find(acc => acc.id.toString() === line.accountId);
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
              <Select 
                value={line.entityCode} 
                onValueChange={(value) => updateLine(index, "entityCode", value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.code}>
                      {entity.code} - {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium">Description *</label>
              <Input 
                value={line.description} 
                onChange={(e) => updateLine(index, "description", e.target.value)}
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
                value={line.debit}
                onChange={(e) => updateLine(index, "debit", e.target.value)}
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
                value={line.credit}
                onChange={(e) => updateLine(index, "credit", e.target.value)}
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
                  {(line.tags || []).map((tag: DimensionTag, tagIndex: number) => (
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
                          const newTags = line.tags.filter((_: any, i: number) => i !== tagIndex);
                          updateLineTags(index, newTags);
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
              {lines.length > 1 && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeLine(index)}
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