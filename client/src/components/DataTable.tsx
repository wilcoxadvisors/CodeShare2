import React, { useState } from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface Column {
  header: string;
  accessor: string;
  type: string;
  render?: (row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  isLoading?: boolean;
  pageSize?: number;
  pagination?: {
    currentPage: number;
    pageSize: number;
  };
  onPaginationChange?: (pagination: { currentPage: number, pageSize: number }) => void;
}

function DataTable({ 
  columns, 
  data, 
  isLoading = false, 
  pageSize = 10,
  pagination,
  onPaginationChange
}: DataTableProps) {
  // VERIFICATION STEP 3: Log DataTable component data
  console.log("VERIFICATION STEP 3: DataTable Component", {
    columnsCount: columns.length,
    columnsInfo: columns.map(col => ({ header: col.header, accessor: col.accessor })),
    dataCount: data.length,
    dataSample: data.slice(0, 3),
    timestamp: new Date().toISOString()
  });
  
  // Use internal state if no external pagination control is provided
  const [internalCurrentPage, setInternalCurrentPage] = useState(1);
  const [internalItemsPerPage, setInternalItemsPerPage] = useState(pageSize);
  
  // Use either controlled or uncontrolled pagination values
  const currentPage = pagination ? pagination.currentPage : internalCurrentPage;
  const itemsPerPage = pagination ? pagination.pageSize : internalItemsPerPage;
  
  // Handler for page changes that works with both controlled and uncontrolled modes
  const handlePageChange = (newPage: number) => {
    if (pagination && onPaginationChange) {
      // Controlled mode - notify parent
      onPaginationChange({
        currentPage: newPage,
        pageSize: itemsPerPage
      });
    } else {
      // Uncontrolled mode - update internal state
      setInternalCurrentPage(newPage);
    }
  };
  
  // Handler for page size changes
  const handlePageSizeChange = (newPageSize: number) => {
    if (pagination && onPaginationChange) {
      // Controlled mode - notify parent
      onPaginationChange({
        currentPage: 1, // Reset to page 1 when changing page size
        pageSize: newPageSize
      });
    } else {
      // Uncontrolled mode - update internal state
      setInternalItemsPerPage(newPageSize);
      setInternalCurrentPage(1); // Reset to page 1
    }
  };
  
  // Calculate pagination
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);
  
  const getFormattedValue = (row: any, column: Column) => {
    const value = row[column.accessor];
    
    if (column.render) {
      return column.render(row);
    }
    
    switch (column.type) {
      case 'date':
        return value 
          ? new Date(value).toLocaleDateString() 
          : '';
      case 'currency':
        return typeof value === 'number' 
          ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
          : '';
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        return value;
    }
  };
  
  if (isLoading) {
    return (
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }
  
  if (data.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="flex justify-center py-10">
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-8">
      <div className="overflow-x-auto max-h-[calc(100vh-280px)]">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {columns.map((column, index) => (
                <th 
                  key={index} 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getFormattedValue(row, column)}
                  </td>
                ))}
              </tr>
            ))}
            {/* Add empty rows to ensure minimal content when there's little data */}
            {paginatedData.length < 5 && [...Array(5 - paginatedData.length)].map((_, index) => (
              <tr key={`empty-${index}`} className="h-12">
                {columns.map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4 text-sm">&nbsp;</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              disabled={currentPage === 1}
              onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Next
            </button>
          </div>
          
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                <span className="font-medium">{Math.min(startIndex + itemsPerPage, data.length)}</span> of{' '}
                <span className="font-medium">{data.length}</span> results
              </p>
              
              <div className="flex items-center gap-2">
                <label htmlFor="perPage" className="text-sm text-gray-700">Per page:</label>
                <select
                  id="perPage"
                  value={itemsPerPage}
                  onChange={(e) => {
                    const newPageSize = parseInt(e.target.value);
                    handlePageSizeChange(newPageSize);
                  }}
                  className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>
            
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                    className={currentPage === 1 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                
                {[...Array(totalPages)].map((_, i) => {
                  // Show first page, last page, and pages around current page
                  if (
                    i === 0 ||
                    i === totalPages - 1 ||
                    (i >= currentPage - 2 && i <= currentPage)
                  ) {
                    return (
                      <PaginationItem key={i}>
                        <PaginationLink
                          onClick={() => handlePageChange(i + 1)}
                          isActive={currentPage === i + 1}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  } else if (
                    i === 1 && currentPage > 3 ||
                    i === totalPages - 2 && currentPage < totalPages - 2
                  ) {
                    return (
                      <PaginationItem key={i}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  return null;
                })}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                    className={currentPage === totalPages ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
