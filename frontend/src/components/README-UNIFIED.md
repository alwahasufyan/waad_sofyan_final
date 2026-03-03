# Unified List Pages Components

## Overview

This directory contains the unified components for all List Pages in the system.

## Components

### 1. **PdfDownloadButton**
Single button for downloading PDF reports from backend.

```jsx
<PdfDownloadButton
  module="members"
  filters={tableState.columnFilters}
  sorting={tableState.sorting}
/>
```

### 2. **UnifiedPageHeader**
Standardized page header with PDF button and actions.

```jsx
<UnifiedPageHeader
  title="Members"
  subtitle="Manage insurance members"
  icon={PeopleAltIcon}
  pdfModule="members"
  pdfFilters={tableState.columnFilters}
  pdfSorting={tableState.sorting}
  onAddClick={() => navigate('/members/add')}
/>
```

### 3. **GenericDataTable**
UI-only table component with filtering, sorting, and pagination.

```jsx
<GenericDataTable
  columns={columns}
  data={data?.content || []}
  totalCount={data?.totalElements || 0}
  isLoading={isLoading}
  tableState={tableState}
/>
```

## Hooks

### **useTableState**
Manages table state (pagination, sorting, filtering).

```jsx
const tableState = useTableState({
  initialPageSize: 10,
  defaultSort: { field: 'createdAt', direction: 'desc' }
});
```

## Architecture

```
UnifiedPageHeader
    ↓
GenericDataTable
    ↓
Backend API
```

## Rules

- ✅ GenericDataTable = UI only
- ✅ PDF button in header only
- ✅ Backend-driven PDF generation
- ❌ NO Excel export
- ❌ NO frontend PDF generation

## Documentation

- [Architecture Guide](../../../UNIFIED-LIST-PAGES-ARCHITECTURE.md)
- [Quick Reference](../../../QUICK-REFERENCE.md)
- [Implementation Report](../../../UNIFIED-SYSTEM-IMPLEMENTATION-REPORT.md)

## Template

Copy [UnifiedListPageTemplate.jsx](../templates/UnifiedListPageTemplate.jsx) for new list pages.
