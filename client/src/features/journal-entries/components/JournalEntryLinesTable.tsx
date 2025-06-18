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
  dimensionValues?: DimensionValue[];
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

  // Render hierarchical account tree
  const renderAccountTree = (accounts: (Account & { children: any[] })[], level = 0, lineIndex: number) => {
    return accounts.map((account) => {
      const hasChildren = account.children.length > 0;
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
          
          {/* Render children if expanded */}
          {hasChildren && isExpanded && (
            <div>
              {renderAccountTree(account.children, level + 1, lineIndex)}
            </div>
          )}
        </div>
      );
    });
  };

  // Safeguard: Ensure dimensions is always an array
  const safeDimensions = Array.isArray(dimensions) ? dimensions : [];
  
  console.log("ARCHITECT_DEBUG_LINES_TABLE_DIMENSIONS:", safeDimensions);
  console.log("ARCHITECT_DEBUG_LINES_TABLE_FIRST_DIM_VALUES:", safeDimensions[0]?.values);

  return (
    <div className="overflow-x-auto mb-4">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Account
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Entity Code
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Description
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Debit
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Credit
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Tags
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-gray-200">
          {lines.map((line, index) => (
            <tr key={line.id || line._key}>
              <td className="px-6 py-4 whitespace-nowrap">
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
                    <PopoverContent className="w-[500px] p-0" side="bottom" align="start">
                      <div className="border-b px-3 py-2">
                        <div className="flex items-center border rounded-md px-3">
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
                      </div>
                      <div className="max-h-[400px] overflow-y-auto">
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

              <td className="px-6 py-4 whitespace-nowrap">
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

              <td className="px-6 py-4 whitespace-nowrap">
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

              <td className="px-6 py-4 whitespace-nowrap">
                <Input
                  type="number"
                  step="0.01"
                  value={line.debit}
                  onChange={(e) =>
                    handleLineChange(index, "debit", e.target.value)
                  }
                  placeholder="0.00"
                  className={`w-full ${fieldErrors[`line_${index}_debit`] ? "border-red-500" : ""}`}
                />
                {fieldErrors[`line_${index}_debit`] && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {fieldErrors[`line_${index}_debit`]}
                  </p>
                )}
              </td>

              <td className="px-6 py-4 whitespace-nowrap">
                <Input
                  type="number"
                  step="0.01"
                  value={line.credit}
                  onChange={(e) =>
                    handleLineChange(index, "credit", e.target.value)
                  }
                  placeholder="0.00"
                  className={`w-full ${fieldErrors[`line_${index}_credit`] ? "border-red-500" : ""}`}
                />
                {fieldErrors[`line_${index}_credit`] && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {fieldErrors[`line_${index}_credit`]}
                  </p>
                )}
              </td>

              <td className="px-6 py-4 whitespace-nowrap">
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
                    <PopoverContent className="w-80 p-0">
                      <div className="p-4">
                        <h4 className="font-semibold text-sm mb-3">Add Dimension Tags</h4>
                        <div className="space-y-3">
                          {safeDimensions.map((dimension) => (
                            <div key={dimension.id} className="space-y-2">
                              <div className="text-sm font-medium text-gray-700">
                                {dimension.name}
                              </div>
                              <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
                                {dimension.dimensionValues?.map((value: DimensionValue) => {
                                  const isSelected = line.tags?.some(
                                    tag => tag.dimensionId === dimension.id && tag.dimensionValueId === value.id
                                  );
                                  
                                  return (
                                    <Button
                                      key={value.id}
                                      variant={isSelected ? "default" : "ghost"}
                                      size="sm"
                                      className="justify-start text-xs h-7"
                                      onClick={() => {
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
                                    >
                                      {isSelected && <Check className="h-3 w-3 mr-1" />}
                                      {value.name}
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
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
                    className="px-6 py-2 text-right text-xs font-medium text-gray-900"
                  >
                    Entity {balance.entityCode}:
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                    DR:{" "}
                    {balance.debit.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
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
  );
}