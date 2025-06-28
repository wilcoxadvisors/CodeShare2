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
import { CurrencyInput } from "./CurrencyInput";

// Interface for batch journal entry lines
interface BatchLine {
  originalRow: number;
  accountCode: string;
  description: string;
  debit: string;
  credit: string;
  dimensions: { [key: string]: string };
}

// Interface for validation errors
interface ValidationError {
  type: string;
  message: string;
  originalRow: number;
  field: string;
  dimensionId?: number;
  value?: string;
}

// Interface for AI suggestions
interface AISuggestion {
  type: string;
  message: string;
  originalRow: number;
  action: any;
  confidence: number;
}

interface BatchEntryLinesTableProps {
  lines: BatchLine[];
  accounts: AccountType[];
  entities: any[];
  dimensions: any[];
  errors: ValidationError[];
  suggestions: AISuggestion[];
  onCellUpdate: (lineIndex: number, field: string, value: string) => void;
  onCreateDimensionValue: (data: { dimensionId: number; name: string; code: string }) => void;
  onAcceptSuggestion: (lineIndex: number, action: any) => void;
}

export function BatchEntryLinesTable({
  lines,
  accounts,
  entities,
  dimensions,
  errors,
  suggestions,
  onCellUpdate,
  onCreateDimensionValue,
  onAcceptSuggestion,
}: BatchEntryLinesTableProps) {
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [accountPopoverOpen, setAccountPopoverOpen] = useState<Record<string, boolean>>({});
  const [tagPopoverOpen, setTagPopoverOpen] = useState<Record<string, boolean>>({});
  const [expandedDimensions, setExpandedDimensions] = useState<Record<number, boolean>>({});
  const [dimensionSearchQuery, setDimensionSearchQuery] = useState("");

  // Get error for specific cell
  const getErrorForCell = (row: number, field: string) => {
    return errors.find(e => e.originalRow === row && e.field === field);
  };

  // Get suggestion for specific cell
  const getSuggestionForCell = (row: number) => {
    return suggestions.find(s => s.originalRow === row);
  };

  // Build account hierarchy
  const buildAccountHierarchy = (searchTerm: string = "") => {
    const filtered = searchTerm
      ? accounts.filter(
          (account) =>
            account.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            account.accountCode?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : accounts;

    const parentAccounts = filtered.filter((account) => !account.parentId);
    const childAccounts = filtered.filter((account) => account.parentId);

    const buildTree = (parent: AccountType): AccountType & { children: (AccountType & { children: any[] })[] } => {
      const children = childAccounts
        .filter((child) => child.parentId === parent.id)
        .map(buildTree);
      
      return { ...parent, children };
    };

    return parentAccounts.map(buildTree);
  };

  // Filter dimensions based on search
  const filteredDimensions = useMemo(() => {
    if (!dimensionSearchQuery) return dimensions || [];
    
    return dimensions.filter((dim: any) => {
      const dimensionMatches = dim.name?.toLowerCase().includes(dimensionSearchQuery.toLowerCase()) ||
                               dim.code?.toLowerCase().includes(dimensionSearchQuery.toLowerCase());
      
      const valueMatches = dim.values?.some((val: any) =>
        val.name?.toLowerCase().includes(dimensionSearchQuery.toLowerCase()) ||
        val.code?.toLowerCase().includes(dimensionSearchQuery.toLowerCase())
      );
      
      return dimensionMatches || valueMatches;
    });
  }, [dimensions, dimensionSearchQuery]);

  // Auto-expand dimensions that have matching values
  React.useEffect(() => {
    if (dimensionSearchQuery) {
      const newExpanded: Record<number, boolean> = {};
      filteredDimensions.forEach((dim: any) => {
        const hasMatchingValues = dim.values?.some((val: any) =>
          val.name?.toLowerCase().includes(dimensionSearchQuery.toLowerCase()) ||
          val.code?.toLowerCase().includes(dimensionSearchQuery.toLowerCase())
        );
        if (hasMatchingValues) {
          newExpanded[dim.id] = true;
        }
      });
      setExpandedDimensions(prev => ({ ...prev, ...newExpanded }));
    }
  }, [dimensionSearchQuery, filteredDimensions]);

  // Render account tree
  const renderAccountTree = (accountsTree: any[], level: number = 0) => {
    return accountsTree.map((account) => (
      <div key={account.id}>
        {account.children && account.children.length > 0 ? (
          <div>
            <CommandItem
              onSelect={() => {
                setExpandedAccounts(prev => ({
                  ...prev,
                  [account.id]: !prev[account.id]
                }));
              }}
              className={`cursor-pointer pl-${level * 4 + 2}`}
            >
              <div className="flex items-center w-full">
                {expandedAccounts[account.id] ? (
                  <ChevronDown className="mr-2 h-4 w-4" />
                ) : (
                  <ChevronRight className="mr-2 h-4 w-4" />
                )}
                <span className="font-medium">{account.accountCode} - {account.name}</span>
              </div>
            </CommandItem>
            {expandedAccounts[account.id] && renderAccountTree(account.children, level + 1)}
          </div>
        ) : (
          <CommandItem
            key={account.id}
            onSelect={() => {
              const lineIndex = parseInt(accountPopoverOpen.lineIndex || '0');
              onCellUpdate(lineIndex, 'accountCode', account.accountCode);
              setAccountPopoverOpen({});
              setSearchQuery("");
            }}
            className={`cursor-pointer pl-${level * 4 + 8}`}
          >
            <div className="flex items-center justify-between w-full">
              <span>{account.accountCode} - {account.name}</span>
              <Check className="h-4 w-4 opacity-0" />
            </div>
          </CommandItem>
        )}
      </div>
    ));
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-6 py-3">
        <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div className="col-span-3">Account</div>
          <div className="col-span-2">Entity Code</div>
          <div className="col-span-2">Description</div>
          <div className="col-span-1">Debit</div>
          <div className="col-span-1">Credit</div>
          <div className="col-span-3">Tags</div>
        </div>
      </div>

      <div className="bg-white divide-y divide-gray-200">
        {lines.map((line, index) => {
          const accountError = getErrorForCell(line.originalRow, 'AccountCode');
          const suggestion = getSuggestionForCell(line.originalRow);
          
          return (
            <div key={index} className="px-6 py-4">
              <div className="grid grid-cols-12 gap-4 items-start">
                {/* Account Column */}
                <div className="col-span-3">
                  <Popover
                    open={accountPopoverOpen[`line_${index}`] || false}
                    onOpenChange={(open) => {
                      setAccountPopoverOpen(prev => ({
                        ...prev,
                        [`line_${index}`]: open,
                        lineIndex: index.toString()
                      }));
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
                        className={`w-full justify-between ${accountError ? "border-red-500" : ""}`}
                      >
                        {line.accountCode || "Select account..."}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 max-w-[90vw] p-0" side="bottom" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Search accounts..."
                          value={searchQuery}
                          onValueChange={setSearchQuery}
                        />
                        <CommandList className="max-h-64 overflow-y-auto">
                          <CommandEmpty>No accounts found.</CommandEmpty>
                          <CommandGroup>
                            {renderAccountTree(buildAccountHierarchy(searchQuery))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {accountError && (
                    <p className="text-xs text-red-600 mt-1">{accountError.message}</p>
                  )}
                </div>

                {/* Entity Code Column */}
                <div className="col-span-2">
                  <Select
                    value={entities?.find(e => e.code === line.entityCode)?.code || ""}
                    onValueChange={(value) => {
                      const entity = entities?.find(e => e.code === value);
                      if (entity) {
                        onCellUpdate(index, 'entityCode', entity.code);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select entity..." />
                    </SelectTrigger>
                    <SelectContent>
                      {entities?.map((entity) => (
                        <SelectItem key={entity.id} value={entity.code}>
                          {entity.code} - {entity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description Column */}
                <div className="col-span-2">
                  <Input
                    value={line.description}
                    onChange={(e) => onCellUpdate(index, 'description', e.target.value)}
                    placeholder="Description..."
                  />
                </div>

                {/* Debit Column */}
                <div className="col-span-1">
                  <CurrencyInput
                    value={line.debit}
                    onChange={(value) => onCellUpdate(index, 'debit', value)}
                    placeholder="0.00"
                  />
                </div>

                {/* Credit Column */}
                <div className="col-span-1">
                  <CurrencyInput
                    value={line.credit}
                    onChange={(value) => onCellUpdate(index, 'credit', value)}
                    placeholder="0.00"
                  />
                </div>

                {/* Tags Column */}
                <div className="col-span-3">
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(line.dimensions).map(([dimKey, dimValue]) => {
                      const dimError = getErrorForCell(line.originalRow, dimKey);
                      return (
                        <Badge
                          key={dimKey}
                          variant={dimError ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {dimKey}: {dimValue}
                          {dimError && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="ml-2 h-4 px-1 text-xs"
                              onClick={() => {
                                if (dimError.dimensionId && dimError.value) {
                                  onCreateDimensionValue({
                                    dimensionId: dimError.dimensionId,
                                    name: dimError.value,
                                    code: dimError.value.toUpperCase()
                                  });
                                }
                              }}
                            >
                              Approve & Create
                            </Button>
                          )}
                        </Badge>
                      );
                    })}
                    
                    <Popover
                      open={tagPopoverOpen[`line_${index}`] || false}
                      onOpenChange={(open) => {
                        setTagPopoverOpen(prev => ({
                          ...prev,
                          [`line_${index}`]: open
                        }));
                        if (!open) {
                          setDimensionSearchQuery("");
                          setExpandedDimensions({});
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Tag
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 max-w-[90vw] p-0" side="bottom" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Search dimensions..."
                            value={dimensionSearchQuery}
                            onValueChange={setDimensionSearchQuery}
                          />
                          <CommandList className="max-h-64 overflow-y-auto">
                            <CommandEmpty>No dimensions found.</CommandEmpty>
                            <CommandGroup>
                              {filteredDimensions.map((dimension: any) => (
                                <div key={dimension.id}>
                                  <CommandItem
                                    onSelect={() => {
                                      setExpandedDimensions(prev => ({
                                        ...prev,
                                        [dimension.id]: !prev[dimension.id]
                                      }));
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <div className="flex items-center w-full">
                                      {expandedDimensions[dimension.id] ? (
                                        <ChevronDown className="mr-2 h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="mr-2 h-4 w-4" />
                                      )}
                                      <span className="font-medium">{dimension.name}</span>
                                    </div>
                                  </CommandItem>
                                  {expandedDimensions[dimension.id] && dimension.values?.map((value: any) => (
                                    <CommandItem
                                      key={value.id}
                                      onSelect={() => {
                                        onCellUpdate(index, `dimensions.${dimension.name}`, value.code);
                                        setTagPopoverOpen({});
                                        setDimensionSearchQuery("");
                                      }}
                                      className="cursor-pointer pl-8"
                                    >
                                      <div className="flex items-center justify-between w-full">
                                        <span>{value.code} - {value.name}</span>
                                        <Check className="h-4 w-4 opacity-0" />
                                      </div>
                                    </CommandItem>
                                  ))}
                                </div>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Show errors and suggestions below the line */}
              {(suggestion || errors.some(e => e.originalRow === line.originalRow)) && (
                <div className="mt-2 space-y-1">
                  {suggestion && (
                    <div className="flex items-center justify-between p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <span className="text-yellow-800">{suggestion.message}</span>
                        <Badge variant="outline" className="text-yellow-700">
                          {Math.round(suggestion.confidence * 100)}% confidence
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs"
                        onClick={() => onAcceptSuggestion(index, suggestion.action)}
                      >
                        Accept
                      </Button>
                    </div>
                  )}
                  
                  {errors.filter(e => e.originalRow === line.originalRow).map((error, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded text-xs">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-red-800">
                          {error.field}: {error.message}
                        </span>
                      </div>
                      {error.type === 'DIMENSION_VALUE_NOT_FOUND' && error.dimensionId && error.value && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs"
                          onClick={() => {
                            onCreateDimensionValue({
                              dimensionId: error.dimensionId!,
                              name: error.value!,
                              code: error.value!.toUpperCase()
                            });
                          }}
                        >
                          Approve & Create
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}