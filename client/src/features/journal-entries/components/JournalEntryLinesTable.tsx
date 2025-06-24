import React, { useState, useMemo } from "react";
import {
  X,
  Plus,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Tag,
  Tags,
  Check,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { AccountType } from "@shared/schema";
import { safeParseAmount } from "../utils/lineFormat";
import { CurrencyInput } from "./CurrencyInput";

// Interface for journal entry lines
interface JournalLine {
  id?: number;
  _key?: string;
  accountId: string;
  entityCode: string;
  description: string;
  debit: string;
  credit: string;
  tags?: DimensionTag[];
}

interface DimensionTag {
  dimensionId: number;
  dimensionValueId: number;
  dimensionName?: string;
  dimensionValueName?: string;
}

interface DimensionValue {
  id: number;
  name: string;
  code?: string;
  description?: string;
}

interface Dimension {
  id: number;
  name: string;
  description?: string;
  values?: DimensionValue[];
  dimensionValues?: DimensionValue[]; // Keep for backward compatibility
}

// Account interface
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

interface ExpandedState {
  [accountId: number]: boolean;
}

interface JournalEntryLinesTableProps {
  lines: JournalLine[];
  setLines: React.Dispatch<React.SetStateAction<JournalLine[]>>;
  accounts: Account[];
  entities?: Entity[];
  dimensions?: Dimension[];
  fieldErrors: Record<string, string>;
  isBalanced: boolean;
  totalDebit: number;
  totalCredit: number;
}

export function JournalEntryLinesTable({
  lines,
  setLines,
  accounts,
  entities = [],
  dimensions = [],
  fieldErrors,
  isBalanced,
  totalDebit,
  totalCredit,
}: JournalEntryLinesTableProps) {
  // State for line item management
  const [expandedAccounts, setExpandedAccounts] = useState<ExpandedState>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [tagPopoverOpen, setTagPopoverOpen] = useState<Record<string, boolean>>({});
  const [accountPopoverOpen, setAccountPopoverOpen] = useState<Record<string, boolean>>({});
  const [expandedDimensions, setExpandedDimensions] = useState<Record<number, boolean>>({});
  const [dimensionSearchQuery, setDimensionSearchQuery] = useState("");

  // Initialize expanded state
  const initializeExpandedState = (): ExpandedState => {
    const state: ExpandedState = {};
    accounts.forEach((account) => {
      state[account.id] = false;
    });
    return state;
  };

  // Calculate difference
  const difference = totalDebit - totalCredit;

  // Calculate entity balances for intercompany validation
  const entityBalances = useMemo(() => {
    const entityCodesArray = lines.map((line) => line.entityCode);
    const uniqueEntityCodes = entityCodesArray.filter(
      (code, index) => entityCodesArray.indexOf(code) === index,
    );

    if (uniqueEntityCodes.length <= 1) {
      return [];
    }

    return uniqueEntityCodes.map((entityCode) => {
      const entityLines = lines.filter((line) => line.entityCode === entityCode);
      const entityDebit = entityLines.reduce(
        (sum, line) => sum + safeParseAmount(line.debit),
        0,
      );
      const entityCredit = entityLines.reduce(
        (sum, line) => sum + safeParseAmount(line.credit),
        0,
      );
      const entityDifference = entityDebit - entityCredit;

      return {
        entityCode,
        debit: entityDebit,
        credit: entityCredit,
        difference: entityDifference,
        balanced: Math.abs(entityDifference) < 0.001,
      };
    });
  }, [lines]);

  // Toggle function for dimension expansion
  const toggleDimensionExpansion = (dimensionId: number) => {
    setExpandedDimensions(prev => ({ ...prev, [dimensionId]: !prev[dimensionId] }));
  };

  // Handler functions
  const handleLineChange = (index: number, field: string, value: string) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

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
    setLines((prev) => [...prev, newLine]);
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLineTags = (lineIndex: number, newTags: DimensionTag[]) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[lineIndex] = { ...updated[lineIndex], tags: newTags };
      return updated;
    });
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

  // Filter and search in hierarchical structure
  const filteredAccountTree = useMemo(() => {
    if (!searchQuery.trim()) {
      return accountTree;
    }

    const lowerQuery = searchQuery.toLowerCase();
    
    const filterRecursive = (account: Account & { children: any[] }): (Account & { children: any[] }) | null => {
      const matchesSearch = 
        account.accountCode.toLowerCase().includes(lowerQuery) ||
        account.name.toLowerCase().includes(lowerQuery);

      const filteredChildren = account.children
        .map(child => filterRecursive(child))
        .filter(Boolean) as (Account & { children: any[] })[];

      // Include account if it matches search OR has matching children
      if (matchesSearch || filteredChildren.length > 0) {
        return { ...account, children: filteredChildren };
      }

      return null;
    };

    return accountTree
      .map(account => filterRecursive(account))
      .filter(Boolean) as (Account & { children: any[] })[];
  }, [accountTree, searchQuery]);

  // Auto-expand parents when searching
  const autoExpandedAccounts = useMemo(() => {
    if (!searchQuery.trim()) {
      return {};
    }

    const expanded: ExpandedState = {};
    
    const expandParents = (account: Account & { children: any[] }) => {
      if (account.children.length > 0) {
        expanded[account.id] = true;
        account.children.forEach(child => expandParents(child));
      }
    };

    filteredAccountTree.forEach(account => expandParents(account));
    return expanded;
  }, [filteredAccountTree, searchQuery]);

  // Get combined expanded state (manual + auto-expanded from search)
  const combinedExpandedState = useMemo(() => {
    return { ...expandedAccounts, ...autoExpandedAccounts };
  }, [expandedAccounts, autoExpandedAccounts]);

  // Toggle account expansion
  const toggleAccountExpansion = (accountId: number) => {
    setExpandedAccounts(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  // Fixed recursive rendering to prevent infinite expansion
  const renderAccountTree = (accounts: (Account & { children: any[] })[], level = 0, lineIndex: number): React.ReactNode[] => {
    if (level > 10) { // Prevent infinite recursion
      console.warn("Maximum account tree depth reached");
      return [];
    }

    return accounts.map((account) => {
      const hasChildren = account.children && account.children.length > 0;
      const isExpanded = combinedExpandedState[account.id];
      const isSelected = lines[lineIndex]?.accountId === account.id.toString();
      const canSelect = !hasChildren; // Only leaf accounts are selectable
      
      return (
        <div key={account.id}>
          {/* Parent/Child Account Item */}
          <div
            className={`flex items-center px-2 py-1.5 hover:bg-gray-50 cursor-pointer ${canSelect ? 'hover:bg-blue-50' : 'hover:bg-gray-100'}`}
            onClick={() => {
              if (hasChildren) {
                toggleAccountExpansion(account.id);
              } else {
                handleLineChange(lineIndex, "accountId", account.id.toString());
                setAccountPopoverOpen(prev => ({
                  ...prev,
                  [`line_${lineIndex}`]: false
                }));
              }
            }}
          >
            {/* Indentation for hierarchy */}
            <div style={{ width: level * 16 }} />
            
            {/* Expand/Collapse chevron for parent accounts */}
            {hasChildren && (
              <div className="flex items-center justify-center w-4 h-4 mr-1">
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-gray-400" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-gray-400" />
                )}
              </div>
            )}
            
            {/* Account content */}
            <div className="flex-1 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={`font-medium text-sm ${hasChildren ? 'text-gray-700 font-semibold' : 'text-gray-900'}`}>
                  {account.accountCode}
                </span>
                <span className="text-gray-400">-</span>
                <span className={`text-sm ${hasChildren ? 'text-gray-600 font-medium' : 'text-gray-700'}`}>
                  {account.name}
                </span>
              </div>
              
              {/* Selection indicator for leaf accounts */}
              {canSelect && isSelected && (
                <Check className="h-4 w-4 text-blue-600" />
              )}
            </div>
          </div>
          
          {/* Render children if expanded - with proper null check */}
          {hasChildren && isExpanded && account.children && (
            renderAccountTree(account.children, level + 1, lineIndex)
          )}
        </div>
      );
    });
  };

  // Safeguard: Ensure dimensions is always an array and filter empty dimensions
  const safeDimensions = Array.isArray(dimensions) ? dimensions : [];
  const filteredDimensions = safeDimensions.filter(dimension => dimension.values && dimension.values.length > 0);

  // Intelligent filtering based on search query
  const searchFilteredDimensions = useMemo(() => {
    if (!dimensionSearchQuery.trim()) {
      return filteredDimensions;
    }

    const query = dimensionSearchQuery.toLowerCase();
    return filteredDimensions.map(dimension => {
      const matchingValues = dimension.values?.filter(value => 
        value.name.toLowerCase().includes(query) || 
        (value.code && value.code.toLowerCase().includes(query))
      ) || [];

      return matchingValues.length > 0 ? {
        ...dimension,
        values: matchingValues
      } : null;
    }).filter((dimension): dimension is NonNullable<typeof dimension> => dimension !== null);
  }, [filteredDimensions, dimensionSearchQuery]);

  // Auto-expansion for search results
  const autoExpandedDimensions = useMemo(() => {
    if (!dimensionSearchQuery.trim()) {
      return {};
    }

    const autoExpanded: Record<number, boolean> = {};
    searchFilteredDimensions.forEach(dimension => {
      if (dimension) {
        autoExpanded[dimension.id] = true;
      }
    });
    return autoExpanded;
  }, [searchFilteredDimensions, dimensionSearchQuery]);

  // Combined expansion state
  const combinedExpandedDimensions = useMemo(() => ({
    ...expandedDimensions,
    ...autoExpandedDimensions
  }), [expandedDimensions, autoExpandedDimensions]);

  return (
    <div className="mb-4">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Account
            </th>
            <th
              scope="col"
              className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Entity Code
            </th>
            <th
              scope="col"
              className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Description
            </th>
            <th
              scope="col"
              className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Debit
            </th>
            <th
              scope="col"
              className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Credit
            </th>
            <th
              scope="col"
              className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Tags
            </th>
            <th scope="col" className="relative px-2 sm:px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-gray-200">
          {lines.map((line, index) => (
            <tr key={line.id || line._key}>
              <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
                <div>
                  {/* Hierarchical Account Selector */}
                  <Popover
                    open={accountPopoverOpen[`line_${index}`] || false}
                    onOpenChange={(open) => {
                      setAccountPopoverOpen(prev => ({
                        ...prev,
                        [`line_${index}`]: open
                      }));
                      // Reset expanded state and search query when dropdown is closed
                      if (!open) {
                        setExpandedAccounts({});
                        setSearchQuery("");
                      } else {
                        // Collapse all on first open unless something is selected
                        if (!line.accountId) {
                          setExpandedAccounts({});
                        }
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={`w-full justify-between ${fieldErrors[`line_${index}_accountId`] ? "border-red-500" : ""}`}
                      >
                        {line.accountId &&
                        accounts.some(
                          (account) =>
                            account.id.toString() === line.accountId,
                        )
                          ? `${accounts.find((account) => account.id.toString() === line.accountId)?.accountCode} - ${accounts.find((account) => account.id.toString() === line.accountId)?.name}`
                          : "Select account..."}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 max-w-[90vw] p-0" side="bottom" align="start" sideOffset={5} avoidCollisions={true}>
                      <div className="border-b px-3 py-2">
                        <div className="flex items-center border rounded-md px-3 mb-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 text-gray-400 mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                          <input
                            type="text"
                            placeholder="Search accounts..."
                            className="flex-1 py-2 bg-transparent outline-none text-sm"
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                            }}
                          />
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs h-6 px-2"
                            onClick={() => {
                              const allExpanded: Record<number, boolean> = {};
                              accounts.forEach(account => {
                                if (account.parentId === null) { // Only expand top-level accounts
                                  allExpanded[account.id] = true;
                                }
                              });
                              setExpandedAccounts(allExpanded);
                            }}
                          >
                            Expand All
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs h-6 px-2"
                            onClick={() => setExpandedAccounts({})}
                          >
                            Collapse All
                          </Button>
                        </div>
                      </div>
                      <div>
                        {filteredAccountTree.length === 0 ? (
                          <div className="px-3 py-4 text-center text-sm text-gray-500">
                            No accounts found
                          </div>
                        ) : (
                          <div className="py-2">
                            {renderAccountTree(filteredAccountTree, 0, index)}
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {fieldErrors[`line_${index}_accountId`] && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {fieldErrors[`line_${index}_accountId`]}
                    </p>
                  )}
                </div>
              </td>

              <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
                <Select
                  value={line.entityCode}
                  onValueChange={(value) =>
                    handleLineChange(index, "entityCode", value)
                  }
                >
                  <SelectTrigger
                    className={`w-full ${fieldErrors[`line_${index}_entityCode`] ? "border-red-500" : ""}`}
                  >
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
                {fieldErrors[`line_${index}_entityCode`] && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {fieldErrors[`line_${index}_entityCode`]}
                  </p>
                )}
              </td>

              <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
                <Input
                  type="text"
                  value={line.description}
                  onChange={(e) =>
                    handleLineChange(index, "description", e.target.value)
                  }
                  placeholder="Line description"
                  className={`w-full ${fieldErrors[`line_${index}_description`] ? "border-red-500" : ""}`}
                />
                {fieldErrors[`line_${index}_description`] && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {fieldErrors[`line_${index}_description`]}
                  </p>
                )}
              </td>

              <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
                <CurrencyInput
                  value={line.debit}
                  onChange={(value) => handleLineChange(index, "debit", value)}
                  className={`w-full ${fieldErrors[`line_${index}_debit`] ? "border-red-500" : ""}`}
                  placeholder="0.00"
                />
                {fieldErrors[`line_${index}_debit`] && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {fieldErrors[`line_${index}_debit`]}
                  </p>
                )}
              </td>

              <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
                <CurrencyInput
                  value={line.credit}
                  onChange={(value) => handleLineChange(index, "credit", value)}
                  className={`w-full ${fieldErrors[`line_${index}_credit`] ? "border-red-500" : ""}`}
                  placeholder="0.00"
                />
                {fieldErrors[`line_${index}_credit`] && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {fieldErrors[`line_${index}_credit`]}
                  </p>
                )}
              </td>

              <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
                <div className="flex flex-wrap gap-1 items-center">
                  {line.tags && line.tags.length > 0 && 
                    line.tags.map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="secondary" className="text-xs flex items-center gap-1">
                        {tag.dimensionName}: {tag.dimensionValueName}
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-red-600" 
                          onClick={() => {
                            const newTags = line.tags?.filter((_, i) => i !== tagIndex) || [];
                            updateLineTags(index, newTags);
                          }}
                        />
                      </Badge>
                    ))
                  }
                  
                  {/* Add Tag Button with Popover */}
                  <Popover 
                    open={tagPopoverOpen[`line_${index}`] || false}
                    onOpenChange={(open) => {
                      setTagPopoverOpen(prev => ({
                        ...prev,
                        [`line_${index}`]: open
                      }));
                      // Reset expanded state and search query when dropdown is closed
                      if (!open) {
                        setExpandedDimensions({});
                        setDimensionSearchQuery("");
                      } else {
                        // Collapse all on first open unless tags are already selected
                        if (!line.tags || line.tags.length === 0) {
                          setExpandedDimensions({});
                        }
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-6 px-2 text-xs flex items-center gap-1"
                      >
                        <Tags className="h-3 w-3" />
                        Add Tag
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 max-w-[90vw] p-0">
                      <Command>
                        <div className="border-b px-3 py-2">
                          <CommandInput 
                            placeholder="Search dimension values..." 
                            value={dimensionSearchQuery}
                            onValueChange={setDimensionSearchQuery}
                            className="mb-2"
                          />
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-xs h-6 px-2"
                              onClick={() => {
                                const allExpanded: Record<number, boolean> = {};
                                filteredDimensions.forEach(dimension => {
                                  allExpanded[dimension.id] = true;
                                });
                                setExpandedDimensions(allExpanded);
                              }}
                            >
                              Expand All
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-xs h-6 px-2"
                              onClick={() => setExpandedDimensions({})}
                            >
                              Collapse All
                            </Button>
                          </div>
                        </div>
                        <CommandList className="max-h-48">
                          {searchFilteredDimensions.map((dimension) => {
                            if (!dimension) return null;
                            
                            const isExpanded = combinedExpandedDimensions[dimension.id];
                            return (
                              <div key={dimension.id}>
                                {/* Dimension header (non-selectable parent) */}
                                <div
                                  className="flex items-center px-2 py-2 text-sm cursor-pointer hover:bg-gray-100"
                                  onClick={() => toggleDimensionExpansion(dimension.id)}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 mr-2" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 mr-2 transform -rotate-90" />
                                  )}
                                  <span className="font-medium">{dimension.name}</span>
                                </div>
                                
                                {/* Dimension values (selectable children) */}
                                {isExpanded && dimension.values?.map((value: DimensionValue) => {
                                  const isSelected = line.tags?.some(
                                    tag => tag.dimensionId === dimension.id && tag.dimensionValueId === value.id
                                  );
                                  
                                  return (
                                    <CommandItem
                                      key={value.id}
                                      onSelect={() => {
                                        const existingTags = line.tags || [];
                                        
                                        if (isSelected) {
                                          // Remove tag
                                          const newTags = existingTags.filter(
                                            tag => !(tag.dimensionId === dimension.id && tag.dimensionValueId === value.id)
                                          );
                                          updateLineTags(index, newTags);
                                        } else {
                                          // Add tag (remove any existing tag for this dimension first)
                                          const newTags = existingTags.filter(
                                            tag => tag.dimensionId !== dimension.id
                                          );
                                          newTags.push({
                                            dimensionId: dimension.id,
                                            dimensionValueId: value.id,
                                            dimensionName: dimension.name,
                                            dimensionValueName: value.name
                                          });
                                          updateLineTags(index, newTags);
                                        }
                                      }}
                                      className="pl-8 text-sm"
                                    >
                                      {isSelected && <Check className="h-3 w-3 mr-2" />}
                                      {value.name}
                                    </CommandItem>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </td>

              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  className="text-red-600 hover:text-red-900"
                  onClick={() => removeLine(index)}
                  aria-label="Remove line"
                >
                  <X className="h-5 w-5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr>
            <td colSpan={6} className="px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={addLine}
                className="inline-flex items-center"
              >
                <Plus className="-ml-0.5 mr-2 h-4 w-4" />
                Add Line
              </Button>
            </td>
          </tr>

          <tr className="bg-gray-50">
            <td
              colSpan={3}
              className="px-6 py-4 text-right text-sm font-medium text-gray-900"
            >
              Totals:
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              {totalDebit.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              {totalCredit.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </td>
            <td className="px-6 py-4"></td>
          </tr>

          <tr className="bg-gray-50">
            <td
              colSpan={3}
              className="px-6 py-4 text-right text-sm font-medium text-gray-900"
            >
              Difference:
            </td>
            <td
              colSpan={2}
              className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isBalanced ? "text-green-600" : "text-red-600"}`}
            >
              {difference.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </td>
            <td className="px-6 py-4"></td>
          </tr>

          {/* Entity Balance Summary Section - Intercompany Validation */}
          {entityBalances.length > 1 && (
            <>
              <tr className="bg-gray-100">
                <td
                  colSpan={6}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Entity Balance Summary (Intercompany)
                </td>
              </tr>
              {entityBalances.map((balance: EntityBalance) => (
                <tr key={balance.entityCode} className="bg-gray-50">
                  <td
                    colSpan={2}
                    className="px-2 sm:px-6 py-2 text-right text-xs font-medium text-gray-900"
                  >
                    Entity {balance.entityCode}:
                  </td>
                  <td className="px-2 sm:px-6 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                    DR:{" "}
                    {balance.debit.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-2 sm:px-6 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                    CR:{" "}
                    {balance.credit.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td
                    colSpan={2}
                    className={`px-6 py-2 whitespace-nowrap text-xs font-medium ${balance.balanced ? "text-green-600" : "text-red-600"}`}
                  >
                    {balance.balanced
                      ? "Balanced"
                      : `Difference: ${balance.difference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </td>
                </tr>
              ))}
            </>
          )}
        </tfoot>
        </table>
      </div>
    </div>
  );
}