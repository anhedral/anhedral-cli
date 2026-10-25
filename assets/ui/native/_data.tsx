import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ScrollView, StyleSheet, type ViewProps } from 'react-native';
import { Box, LabelText, Muted, row, useControllable, plainText, nativeComponent } from './_core';
import { Button, LinkButton, type NativeControlButtonProps as ButtonProps } from './button';
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
export function TableHeader({ children, style, ...props }: ViewProps) {
  const directColumns = Children.toArray(children).some(
    (child) => isValidElement(child) && nativeComponent(child.type) === TableHead,
  );
  return (
    <Box
      {...props}
      style={[directColumns && { flexDirection: 'row', alignItems: 'center' }, style]}
    >
      {children}
    </Box>
  );
}
export const TableBody = Box;
export const TableFooter = Box;
export const TableRow = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={row([{ flexWrap: 'nowrap' }, style])} />
);
export const TableHead = ({ style, ...props }: React.ComponentProps<typeof LabelText>) => (
  <LabelText
    accessibilityRole="header"
    {...props}
    style={[
      {
        fontWeight: '600',
        minWidth: StyleSheet.flatten(style)?.width == null ? 120 : 0,
        padding: 8,
      },
      style,
    ]}
  />
);
export const TableCell = ({ colSpan = 1, style, ...props }: ViewProps & { colSpan?: number }) => (
  <Box
    {...props}
    style={[
      {
        minWidth: StyleSheet.flatten(style)?.width == null ? 120 * Math.max(1, colSpan) : 0,
        padding: 8,
        ...(StyleSheet.flatten(style)?.width == null ? { flex: Math.max(1, colSpan) } : {}),
      },
      style,
    ]}
  />
);
export const TableCaption = Muted;
type PageState = { page: number; maximum: number; set: (page: number) => void };
const PageContext = createContext<PageState | null>(null);
function pageOptions(children: ReactNode, pages: number[] = [], active: { page?: number } = {}) {
  Children.forEach(children, (child) => {
    if (!isValidElement<{ children?: ReactNode; page?: number; isActive?: boolean }>(child)) return;
    if (nativeComponent(child.type) === PaginationLink) {
      const value = child.props.page ?? Number(plainText(child.props.children));
      if (Number.isInteger(value) && value > 0) {
        pages.push(value);
        if (child.props.isActive) active.page = value;
      }
    }
    pageOptions(child.props.children, pages, active);
  });
  return { pages, active: active.page };
}
export function Pagination({
  children,
  style,
  page,
  defaultPage,
  onPageChange,
  pageCount,
  ...props
}: ViewProps & {
  page?: number;
  defaultPage?: number;
  pageCount?: number;
  onPageChange?: (page: number) => void;
}) {
  const authored = pageOptions(children),
    maximum = pageCount ?? (authored.pages.length ? Math.max(...authored.pages) : Infinity);
  const [current, set] = useControllable(page, defaultPage ?? authored.active ?? 1, onPageChange);
  const bounded = Math.min(maximum, Math.max(1, current));
  return (
    <PageContext.Provider
      value={{ page: bounded, maximum, set: (page) => set(Math.min(maximum, Math.max(1, page))) }}
    >
      <Box
        accessibilityLabel="Pagination"
        accessibilityValue={{
          min: 1,
          now: bounded,
          ...(Number.isFinite(maximum) ? { max: maximum } : {}),
        }}
        {...props}
        style={row(style)}
      >
        {children}
      </Box>
    </PageContext.Provider>
  );
}
export const PaginationContent = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={row(style)} />
);
export const PaginationItem = Box;
type PageButtonProps = ButtonProps & {
  href?: string;
  onNavigate?: React.ComponentProps<typeof LinkButton>['onNavigate'];
  onError?: React.ComponentProps<typeof LinkButton>['onError'];
};
function PageButton({
  href,
  onPress,
  onNavigate,
  onError,
  activate,
  ...props
}: PageButtonProps & { activate?: () => void }) {
  if (href && href !== '#')
    return (
      <LinkButton
        nativePreset={false}
        {...props}
        href={href}
        onPress={onPress}
        onNavigate={onNavigate}
        onError={onError}
      />
    );
  return (
    <Button
      nativePreset={false}
      {...props}
      onPress={(event) => {
        onPress?.(event);
        if (!event.isDefaultPrevented()) activate?.();
      }}
    />
  );
}
export function PaginationLink({
  isActive,
  page,
  children,
  ...props
}: PageButtonProps & { isActive?: boolean; page?: number }) {
  const state = useContext(PageContext),
    target = page ?? Number(plainText(children));
  const selected =
    state && Number.isInteger(target) && target > 0 ? state.page === target : !!isActive;
  return (
    <PageButton
      variant={selected ? 'outline' : 'ghost'}
      {...props}
      activate={() => {
        if (Number.isInteger(target) && target > 0) state?.set(target);
      }}
      accessibilityState={{ selected, disabled: !!props.disabled }}
    >
      {children}
    </PageButton>
  );
}
export function PaginationPrevious({
  children = 'Previous',
  ...props
}: Omit<PageButtonProps, 'children'> & { children?: ReactNode }) {
  const state = useContext(PageContext);
  return (
    <PageButton
      {...props}
      disabled={props.disabled ?? !!(state && state.page <= 1)}
      activate={() => state?.set(state.page - 1)}
      accessibilityLabel={props.accessibilityLabel ?? 'Previous page'}
    >
      {children}
    </PageButton>
  );
}
export function PaginationNext({
  children = 'Next',
  ...props
}: Omit<PageButtonProps, 'children'> & { children?: ReactNode }) {
  const state = useContext(PageContext);
  return (
    <PageButton
      {...props}
      disabled={props.disabled ?? !!(state && state.page >= state.maximum)}
      activate={() => state?.set(state.page + 1)}
      accessibilityLabel={props.accessibilityLabel ?? 'Next page'}
    >
      {children}
    </PageButton>
  );
}
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
                nativePreset={false}
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
