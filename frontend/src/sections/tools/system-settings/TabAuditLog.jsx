import { useMemo, useState } from 'react';

// material-ui
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';

// third-party
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender
} from '@tanstack/react-table';

// project imports
import MainCard from 'components/MainCard';
import ScrollX from 'components/ScrollX';
import { CSVExport } from 'components/third-party/react-table';

// icons
import { FileTextOutlined, SafetyOutlined, UserOutlined, DatabaseOutlined, CaretUpOutlined, CaretDownOutlined } from '@ant-design/icons';

// ==============================|| MOCK DATA ||============================== //

const actions = [
  { type: 'LOGIN', icon: SafetyOutlined, color: 'success' },
  { type: 'LOGOUT', icon: SafetyOutlined, color: 'default' },
  { type: 'CREATE_CLAIM', icon: FileTextOutlined, color: 'primary' },
  { type: 'UPDATE_CLAIM', icon: FileTextOutlined, color: 'info' },
  { type: 'DELETE_CLAIM', icon: FileTextOutlined, color: 'error' },
  { type: 'CREATE_MEMBER', icon: UserOutlined, color: 'primary' },
  { type: 'UPDATE_SETTINGS', icon: DatabaseOutlined, color: 'warning' },
  { type: 'EXPORT_DATA', icon: FileTextOutlined, color: 'info' }
];

const users = ['admin@tba-waad.ly', 'doctor@clinic.ly', 'staff@hospital.ly', 'manager@tba-waad.ly'];
const modules = ['Authentication', 'Claims', 'Members', 'Settings', 'Reports'];
const ips = ['192.168.1.10', '10.0.0.25', '172.16.0.5', '192.168.1.100'];

const generateMockData = () => {
  const data = [];
  for (let i = 0; i < 50; i++) {
    const action = actions[Math.floor(Math.random() * actions.length)];
    data.push({
      id: i + 1,
      timestamp: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
      user: users[Math.floor(Math.random() * users.length)],
      action: action.type,
      actionIcon: action.icon,
      actionColor: action.color,
      module: modules[Math.floor(Math.random() * modules.length)],
      ipAddress: ips[Math.floor(Math.random() * ips.length)],
      status: Math.random() > 0.1 ? 'success' : 'failed'
    });
  }
  return data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

// ==============================|| AUDIT LOG TABLE ||============================== //

export default function TabAuditLog() {
  const [data] = useState(generateMockData());
  const [globalFilter, setGlobalFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('');

  const columns = useMemo(
    () => [
      {
        header: 'Timestamp',
        accessorKey: 'timestamp',
        cell: ({ getValue }) => {
          const date = new Date(getValue());
          return (
            <Stack>
              <span>{date.toLocaleDateString('en-GB')}</span>
              <span style={{ fontSize: '0.75rem', color: '#666' }}>{date.toLocaleTimeString('en-GB')}</span>
            </Stack>
          );
        }
      },
      {
        header: 'User',
        accessorKey: 'user'
      },
      {
        header: 'Action',
        accessorKey: 'action',
        cell: ({ row }) => {
          const Icon = row.original.actionIcon;
          return <Chip icon={<Icon />} label={row.original.action.replace(/_/g, ' ')} color={row.original.actionColor} size="small" />;
        }
      },
      {
        header: 'Module',
        accessorKey: 'module'
      },
      {
        header: 'IP Address',
        accessorKey: 'ipAddress'
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ getValue }) => (
          <Chip label={getValue()} color={getValue() === 'success' ? 'success' : 'error'} size="small" variant="outlined" />
        )
      }
    ],
    []
  );

  const filteredData = useMemo(() => {
    let filtered = data;

    // Module filter
    if (moduleFilter !== 'all') {
      filtered = filtered.filter((row) => row.module === moduleFilter);
    }

    // User filter
    if (userFilter) {
      filtered = filtered.filter((row) => row.user.toLowerCase().includes(userFilter.toLowerCase()));
    }

    return filtered;
  }, [data, moduleFilter, userFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      globalFilter
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10
      }
    }
  });

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <MainCard
          title="Audit Log"
          content={false}
          secondary={
            <Stack direction="row" spacing={2}>
              <CSVExport data={filteredData} filename="audit-log.csv" />
            </Stack>
          }
        >
          {/* Filters */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ p: 3, pb: 0 }}>
            <TextField
              fullWidth
              select
              label="Filter by Module"
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              size="small"
            >
              <MenuItem value="all">All Modules</MenuItem>
              {modules.map((module) => (
                <MenuItem key={module} value={module}>
                  {module}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              label="Search by User"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              placeholder="Search user email..."
              size="small"
            />

            <TextField
              fullWidth
              label="Global Search"
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search all fields..."
              size="small"
            />
          </Stack>

          {/* Table */}
          <ScrollX>
            <Stack>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          onClick={header.column.getToggleSortingHandler()}
                          style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            borderBottom: '2px solid #f0f0f0',
                            cursor: header.column.getCanSort() ? 'pointer' : 'default',
                            userSelect: 'none',
                            fontWeight: 600
                          }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center">
                            <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                            {header.column.getIsSorted() ? (
                              header.column.getIsSorted() === 'desc' ? (
                                <CaretDownOutlined />
                              ) : (
                                <CaretUpOutlined />
                              )
                            ) : null}
                          </Stack>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                        No audit log entries found
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} style={{ padding: '12px 16px' }}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center" sx={{ p: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                  </span>
                  <span style={{ color: '#999' }}>
                    ({filteredData.length} {filteredData.length === 1 ? 'entry' : 'entries'})
                  </span>
                </Stack>

                <Stack direction="row" spacing={1}>
                  <TextField
                    select
                    size="small"
                    value={table.getState().pagination.pageSize}
                    onChange={(e) => table.setPageSize(Number(e.target.value))}
                    sx={{ width: '120px' }}
                  >
                    {[10, 25, 50, 100].map((size) => (
                      <MenuItem key={size} value={size}>
                        Show {size}
                      </MenuItem>
                    ))}
                  </TextField>

                  <Stack direction="row" spacing={0.5}>
                    <button
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        background: '#fff',
                        cursor: table.getCanPreviousPage() ? 'pointer' : 'not-allowed',
                        borderRadius: '4px'
                      }}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        background: '#fff',
                        cursor: table.getCanNextPage() ? 'pointer' : 'not-allowed',
                        borderRadius: '4px'
                      }}
                    >
                      Next
                    </button>
                  </Stack>
                </Stack>
              </Stack>
            </Stack>
          </ScrollX>
        </MainCard>
      </Grid>
    </Grid>
  );
}
