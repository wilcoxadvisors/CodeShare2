import { useState } from "react";
import { useClient } from "../contexts/ClientContext";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ClientSelector() {
  const { clients, currentClient, setCurrentClient, isLoading } = useClient();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter clients based on search query
  const filteredClients = clients.filter(client => {
    const query = searchQuery.toLowerCase();
    return (
      client.name?.toLowerCase().includes(query) ||
      client.code?.toLowerCase().includes(query)
    );
  });

  // Handle client selection
  const handleSelectClient = (client: any) => {
    console.log("Selected client:", client.name, client.id);
    setCurrentClient(client);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select client"
          className="w-[200px] justify-between"
          disabled={isLoading}
        >
          {currentClient ? currentClient.name : "Select client"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search clients..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>No clients found.</CommandEmpty>
            <CommandGroup>
              {filteredClients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.id.toString()}
                  onSelect={() => handleSelectClient(client)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentClient?.id === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{client.name}</span>
                    {client.code && (
                      <span className="text-xs text-muted-foreground">{client.code}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}