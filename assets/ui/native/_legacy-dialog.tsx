import type { ReactNode } from 'react';
import { Box } from './_core';
import {
  OverlayRoot,
  OverlayTrigger,
  OverlayContent,
  OverlayTitle,
  OverlayDescription,
  OverlayClose,
} from './_overlay';
/** The original simple Dialog API delegates to the same native overlay contract. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  triggerLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  triggerLabel: string;
}) {
  return (
    <OverlayRoot open={open} onOpenChange={onOpenChange}>
      <OverlayTrigger>{triggerLabel}</OverlayTrigger>
      <OverlayContent>
        <OverlayTitle>{title}</OverlayTitle>
        {description && <OverlayDescription>{description}</OverlayDescription>}
        <Box>{children}</Box>
        <OverlayClose variant="outline">Close</OverlayClose>
      </OverlayContent>
    </OverlayRoot>
  );
}
