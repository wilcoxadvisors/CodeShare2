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
              <select 
                {...form.register(`lines.${index}.accountId`)} 
                className="w-full p-2 border rounded mt-1"
              >
                <option value="">Select Account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountCode} - {account.name}
                  </option>
                ))}
              </select>
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
              <div className="mt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Tags className="h-4 w-4 mr-2" />
                  Add Tags
                </Button>
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