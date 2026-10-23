import { Dialog as Root, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../web/dialog';
import { Button } from '../web/button';
import type { ComponentProps } from 'react';
import type { Dialog as NativeDialog } from './dialog';
export function Dialog({ open, onOpenChange, title, description, children, triggerLabel }: ComponentProps<typeof NativeDialog>) { return <Root open={open} onOpenChange={onOpenChange}><DialogTrigger render={<Button />}>{triggerLabel}</DialogTrigger><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle>{description && <DialogDescription>{description}</DialogDescription>}</DialogHeader>{children}</DialogContent></Root>; }
