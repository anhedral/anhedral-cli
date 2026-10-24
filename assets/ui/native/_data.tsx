import { useMemo, useState, type ReactNode } from 'react';
import { ScrollView, type ViewProps } from 'react-native';
import { Box, LabelText, Muted, row, useControllable } from './_core';
import { Button, type ButtonProps } from './button';
import { Input } from './input';
import { Checkbox } from './_controls';
export const ScrollArea = ({ children, ...props }: React.ComponentProps<typeof ScrollView>) => (
  <ScrollView {...props}>{children}</ScrollView>
);
export const ScrollBar = () => null; // Native ScrollView owns the platform scrollbar.
export const Table = ({ children, ...props }: React.ComponentProps<typeof ScrollView>) => (
  <ScrollView horizontal accessibilityLabel="Table" {...props}>
    <Box>{children}</Box>
  </ScrollView>
);
export const TableHeader = Box;
export const TableBody = Box;
export const TableFooter = Box;
export const TableRow = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={row([{ flexWrap: 'nowrap' }, style])} />
);
export const TableHead = ({ style, ...props }: React.ComponentProps<typeof LabelText>) => (
  <LabelText
    accessibilityRole="header"
    {...props}
    style={[{ fontWeight: '600', minWidth: 120, padding: 8 }, style]}
  />
);
export const TableCell = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={[{ minWidth: 120, padding: 8, flex: 1 }, style]} />
);
export const TableCaption = Muted;
export const Pagination = ({ style, ...props }: ViewProps) => (
  <Box accessibilityLabel="Pagination" {...props} style={row(style)} />
);
export const PaginationContent = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={row(style)} />
);
export const PaginationItem = Box;
export const PaginationLink = ({ isActive, ...props }: ButtonProps & { isActive?: boolean }) => (
  <Button
    variant={isActive ? 'outline' : 'ghost'}
    {...props}
    accessibilityState={{ selected: !!isActive, disabled: !!props.disabled }}
  />
);
export const PaginationPrevious = ({
  children = 'Previous',
  ...props
}: Omit<ButtonProps, 'children'> & { children?: ReactNode }) => (
  <Button {...props} accessibilityLabel={props.accessibilityLabel ?? 'Previous page'}>
    {children}
  </Button>
);
export const PaginationNext = ({
  children = 'Next',
  ...props
}: Omit<ButtonProps, 'children'> & { children?: ReactNode }) => (
  <Button {...props} accessibilityLabel={props.accessibilityLabel ?? 'Next page'}>
    {children}
  </Button>
);
export const PaginationEllipsis = () => <Muted accessibilityLabel="More pages">…</Muted>;
export type DataColumn<T> = {
  id: string;
  header: string;
  accessor: (row: T) => string | number | boolean | null;
  cell?: (row: T) => ReactNode;
  sortable?: boolean;
};
export function DataTable<T>({
  data,
  columns,
  getRowId,
  pageSize = 10,
  selectedRowIds,
  defaultSelectedRowIds = [],
  onSelectionChange,
  searchable = true,
  emptyText = 'No results',
}: {
  data: readonly T[];
  columns: readonly DataColumn<T>[];
  getRowId: (row: T) => string;
  pageSize?: number;
  selectedRowIds?: string[];
  defaultSelectedRowIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  searchable?: boolean;
  emptyText?: string;
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ id: string; descending: boolean } | null>(null);
  const [page, setPage] = useState(0);
  const [selection, setSelection] = useControllable(
    selectedRowIds,
    defaultSelectedRowIds,
    onSelectionChange,
  );
  const size = Math.max(1, Math.floor(pageSize) || 10);
  const filtered = useMemo(() => {
    const rows = data.filter((item) =>
      columns.some((column) =>
        String(column.accessor(item) ?? '')
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase()),
      ),
    );
    const column = sort && columns.find((item) => item.id === sort.id);
    return column
      ? [...rows].sort((a, b) => {
          const first = column.accessor(a);
          const second = column.accessor(b);
          return (
            (typeof first === 'number' && typeof second === 'number'
              ? first - second
              : String(first ?? '').localeCompare(String(second ?? ''))) *
            (sort?.descending ? -1 : 1)
          );
        })
      : rows;
  }, [data, columns, query, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * size, (current + 1) * size);
  return (
    <Box>
      {searchable && (
        <Input
          accessibilityLabel="Filter rows"
          value={query}
          onChangeText={(next) => {
            setQuery(next);
            setPage(0);
          }}
        />
      )}
      <Table>
        <TableHeader>
          <TableRow>
            {onSelectionChange && <TableHead>Selected</TableHead>}
            {columns.map((column) => (
              <Button
                key={column.id}
                variant="ghost"
                disabled={column.sortable === false}
                accessibilityLabel={`${column.header}${sort?.id === column.id ? (sort.descending ? ', descending' : ', ascending') : ', unsorted'}`}
                onPress={() => {
                  setSort({
                    id: column.id,
                    descending: sort?.id === column.id && !sort.descending,
                  });
                  setPage(0);
                }}
              >
                {column.header}
              </Button>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((item) => {
            const id = getRowId(item);
            return (
              <TableRow key={id}>
                {onSelectionChange && (
                  <Checkbox
                    accessibilityLabel={`Select row ${id}`}
                    checked={selection.includes(id)}
                    onCheckedChange={(checked) =>
                      setSelection(
                        checked ? [...selection, id] : selection.filter((key) => key !== id),
                      )
                    }
                  />
                )}
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    accessibilityLabel={`${column.header}: ${String(column.accessor(item) ?? '')}`}
                  >
                    {column.cell?.(item) ?? String(column.accessor(item) ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
          {!visible.length && <Muted accessibilityLiveRegion="polite">{emptyText}</Muted>}
        </TableBody>
      </Table>
      <Pagination>
        <PaginationPrevious disabled={current === 0} onPress={() => setPage(current - 1)} />
        <LabelText accessibilityLiveRegion="polite">
          {current + 1} / {pages}
        </LabelText>
        <PaginationNext disabled={current === pages - 1} onPress={() => setPage(current + 1)} />
      </Pagination>
    </Box>
  );
}
