import { createContext, useContext, useId, useLayoutEffect, useMemo } from 'react';
import { NativePhysicalScope } from './_physical-scope';
export type NativeItemSize = 'default' | 'sm' | 'xs';
export type NativeItemOwner = {
  id: string;
  scope: string;
  size: NativeItemSize;
  hasDescription: boolean;
  update: (id: string) => void;
  remove: (id: string) => void;
};
export type NativeItemGroupOwner = {
  id: string;
  scope: string;
  update: (id: string, size: NativeItemSize) => void;
  remove: (id: string) => void;
};
export const NativeItemOwners = createContext<readonly NativeItemOwner[]>([]);
export const NativeItemGroups = createContext<readonly NativeItemGroupOwner[]>([]);
export function useNativeItemOwners() {
  const all = useContext(NativeItemOwners),
    scope = useContext(NativePhysicalScope);
  return all.filter((owner) => owner.scope === scope);
}
export function useNativeItemDescription() {
  const owners = useNativeItemOwners(),
    signature = owners.map((owner) => owner.id).join('|'),
    id = useId();
  const targets = useMemo(
    () => owners.map(({ update, remove }) => ({ update, remove })),
    [signature],
  );
  useLayoutEffect(() => {
    for (const target of targets) target.update(id);
    return () => {
      for (const target of targets) target.remove(id);
    };
  }, [id, targets]);
}
export function useNativeItemGroupSize(requestedSize: string | undefined) {
  const size =
    requestedSize === 'sm' || requestedSize === 'xs' || requestedSize === 'default'
      ? requestedSize
      : undefined;
  const groups = useContext(NativeItemGroups),
    scope = useContext(NativePhysicalScope),
    active = groups.filter((group) => group.scope === scope),
    signature = active.map((group) => group.id).join('|'),
    id = useId();
  const targets = useMemo(
    () => active.map(({ update, remove }) => ({ update, remove })),
    [signature],
  );
  useLayoutEffect(() => {
    if (size === undefined) return;
    for (const target of targets) target.update(id, size);
    return () => {
      for (const target of targets) target.remove(id);
    };
  }, [id, size, targets]);
}
