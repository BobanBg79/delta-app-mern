import React from 'react';
import { Pagination as BootstrapPagination } from 'react-bootstrap';

const Pagination = ({ 
  currentPage = 0, 
  totalPages = 0, 
  totalCount = 0, 
  pageSize = 20, 
  onPageChange,
  className = ''
}) => {
  // Don't render if there's only one page or no data
  if (totalPages <= 1) return null;

  const handlePageClick = (page) => {
    if (page !== currentPage && onPageChange) {
      onPageChange(page);
    }
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;
    
    // Calculate start and end page numbers to show
    let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(0, endPage - maxVisiblePages + 1);
    }

    // First page and ellipsis
    if (startPage > 0) {
      items.push(
        <BootstrapPagination.Item
          key="first"
          onClick={() => handlePageClick(0)}
          active={currentPage === 0}
        >
          1
        </BootstrapPagination.Item>
      );
      
      if (startPage > 1) {
        items.push(
          <BootstrapPagination.Ellipsis key="start-ellipsis" disabled />
        );
      }
    }

    // Page numbers
    for (let page = startPage; page <= endPage; page++) {
      items.push(
        <BootstrapPagination.Item
          key={page}
          active={page === currentPage}
          onClick={() => handlePageClick(page)}
        >
          {page + 1}
        </BootstrapPagination.Item>
      );
    }

    // Last page and ellipsis
    if (endPage < totalPages - 1) {
      if (endPage < totalPages - 2) {
        items.push(
          <BootstrapPagination.Ellipsis key="end-ellipsis" disabled />
        );
      }
      
      items.push(
        <BootstrapPagination.Item
          key="last"
          onClick={() => handlePageClick(totalPages - 1)}
          active={currentPage === totalPages - 1}
        >
          {totalPages}
        </BootstrapPagination.Item>
      );
    }

    return items;
  };

  const startRecord = currentPage * pageSize + 1;
  const endRecord = Math.min((currentPage + 1) * pageSize, totalCount);

  return (
    <div className={`d-flex justify-content-between align-items-center mt-3 ${className}`}>
      <div className="text-muted">
        Showing {startRecord} to {endRecord} of {totalCount} results
      </div>
      
      <BootstrapPagination className="mb-0">
        <BootstrapPagination.Prev
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage === 0}
        />
        
        {renderPaginationItems()}
        
        <BootstrapPagination.Next
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage === totalPages - 1}
        />
      </BootstrapPagination>
    </div>
  );
};

export default Pagination;