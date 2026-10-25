import { Children, isValidElement, type ReactNode } from 'react';
import {
  OverlayRoot,
  OverlayTrigger,
  LongPressTrigger,
  OverlayContent,
  AlertDialogContent as NativeAlertDialogContent,
  DropdownMenuContent as NativeMenuContent,
  type OverlayProps,
} from './_overlay';
/** Aria trigger components own the popup root; Base/Radix expose that root separately. */
function Trigger({
  children,
  hold = false,
  delay,
  ...props
}: OverlayProps & { hold?: boolean; delay?: number }) {
  const parts = Children.toArray(children);
  if (parts.length !== 2 || !isValidElement(parts[0]) || !isValidElement(parts[1]))
    throw Error('Aria native triggers require an activator and popup content.');
  const Activator = hold ? LongPressTrigger : OverlayTrigger;
  return (
    <OverlayRoot {...props}>
      <Activator asChild {...(hold && delay !== undefined ? { delayLongPress: delay } : {})}>
        {parts[0]}
      </Activator>
      {parts[1]}
    </OverlayRoot>
  );
}
export const AlertDialogTrigger = Trigger;
export const DialogTrigger = Trigger;
export const DropdownMenuTrigger = Trigger;
export const PopoverTrigger = Trigger;
export function TooltipTrigger(props: OverlayProps & { delay?: number }) {
  return <Trigger {...props} hold />;
}
export const AlertDialog = NativeAlertDialogContent;
export const AlertDialogContent = NativeAlertDialogContent;
export const Dialog = OverlayContent;
export const DialogContent = OverlayContent;
export const Popover = OverlayContent;
export const PopoverContent = OverlayContent;
export const Tooltip = OverlayContent;
export const TooltipContent = OverlayContent;
export const DropdownMenu = NativeMenuContent;
export const DropdownMenuContent = NativeMenuContent;
export {
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogMedia,
  AlertDialogAction,
  AlertDialogCancel,
  TooltipProvider,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuShortcut,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuRadioGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from './_overlay';

export { DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose } from './dialog';
