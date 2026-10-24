import type { ComponentProps } from 'react';
import { Dialog as LegacyDialog } from './_legacy-dialog';
import { OverlayRoot, type OverlayProps } from './_overlay';
export function Dialog(props: OverlayProps | ComponentProps<typeof LegacyDialog>) {
  return 'triggerLabel' in props ? <LegacyDialog {...props} /> : <OverlayRoot {...props} />;
}
export {
  OverlayTrigger as DialogTrigger,
  OverlayContent as DialogContent,
  OverlayClose as DialogClose,
  OverlayTitle as DialogTitle,
  OverlayDescription as DialogDescription,
  OverlayHeader as DialogHeader,
  OverlayFooter as DialogFooter,
} from './_overlay';
