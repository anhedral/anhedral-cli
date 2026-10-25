import {
  Children,
  Fragment,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  type ReactNode,
  type ReactElement,
  type Ref,
} from 'react';
import { View, type ViewProps } from 'react-native';
import { LabelText, content, nativeComponent, plainText } from './_core';

import { isNativeTextContent } from './_description-list';

type Marker = 'decimal' | 'disc' | 'none';
const ListContext = createContext<{ marker: Marker; position: 'inside' | 'outside' } | null>(null);
type ListProps = ViewProps & {
  ref?: Ref<View>;
  start?: number;
  reversed?: boolean;
  marker?: Marker;
  markerPosition?: 'inside' | 'outside';
};
type ItemProps = ViewProps & { ref?: Ref<View>; value?: number; listOrdinal?: number };
function integer(value: number | undefined, fallback: number) {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value)) throw Error('Native list counters must be safe integers.');
  return value;
}
function NativeList({
  children,
  start,
  reversed = false,
  marker = 'disc',
  markerPosition = 'outside',
  ...props
}: ListProps) {
  const collect = (nodes: ReactNode): number =>
    Children.toArray(nodes).reduce<number>(
      (total, child) =>
        total +
        (isValidElement<{ children?: ReactNode }>(child)
          ? child.type === Fragment
            ? collect(child.props.children)
            : nativeComponent(child.type) === NativeListItem
              ? 1
              : 0
          : 0),
      0,
    );
  let ordinal = integer(start, reversed ? collect(children) : 1);
  const visit = (nodes: ReactNode): ReactNode =>
    Children.map(nodes, (child) => {
      if (!isValidElement<ItemProps>(child)) return child;
      if (child.type === Fragment)
        return cloneElement(child, { children: visit(child.props.children) });
      if (nativeComponent(child.type) !== NativeListItem) return child;
      const current = integer(child.props.value, ordinal);
      ordinal = current + (reversed ? -1 : 1);
      return cloneElement(child as ReactElement<ItemProps>, { listOrdinal: current });
    });
  return (
    <ListContext.Provider value={{ marker, position: markerPosition }}>
      <View role="list" {...props}>
        {visit(children)}
      </View>
    </ListContext.Provider>
  );
}
export function NativeOrderedList(props: ListProps) {
  return <NativeList marker="none" {...props} />;
}
export function NativeUnorderedList(props: ListProps) {
  return <NativeList marker="none" {...props} />;
}
export function NativeListItem({
  children,
  listOrdinal = 1,
  value: _value,
  style,
  ...props
}: ItemProps) {
  const context = useContext(ListContext);
  if (context === null)
    throw Error('Native list items require an owning ordered or unordered list.');
  const { marker, position } = context;
  const text = isNativeTextContent(children);
  return (
    <View
      accessible={isNativeTextContent(children)}
      accessibilityLabel={
        isNativeTextContent(children)
          ? `${marker === 'decimal' ? `${listOrdinal}. ` : ''}${plainText(children)}`
          : undefined
      }
      role="listitem"
      {...props}
      style={[{ flexDirection: 'row', alignItems: 'flex-start' }, style]}
    >
      {position === 'inside' && text ? (
        <LabelText>
          {marker === 'decimal' ? `${listOrdinal}. ` : marker === 'disc' ? '• ' : ''}
          {children}
        </LabelText>
      ) : (
        <>
          {marker !== 'none' && (
            <LabelText
              accessible={false}
              style={{ minWidth: 20, marginStart: position === 'outside' ? -20 : 0, paddingEnd: 4 }}
            >
              {marker === 'decimal' ? `${listOrdinal}.` : '•'}
            </LabelText>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>{content(children)}</View>
        </>
      )}
    </View>
  );
}
