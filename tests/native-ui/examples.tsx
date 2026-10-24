import React from 'react';
import * as UI from './.generated';
export const nativeExamples = {
  accordion: () => (
    <UI.Accordion type="single" collapsible>
      <UI.AccordionItem value="one">
        <UI.AccordionTrigger>Open</UI.AccordionTrigger>
        <UI.AccordionContent>Detail</UI.AccordionContent>
      </UI.AccordionItem>
    </UI.Accordion>
  ),
  alert: () => (
    <UI.Alert>
      <UI.AlertTitle>Notice</UI.AlertTitle>
      <UI.AlertDescription>Description</UI.AlertDescription>
    </UI.Alert>
  ),
  'alert-dialog': () => (
    <UI.AlertDialog defaultOpen>
      <UI.AlertDialogTrigger>Open</UI.AlertDialogTrigger>
      <UI.AlertDialogContent>
        <UI.AlertDialogTitle>Confirm</UI.AlertDialogTitle>
        <UI.AlertDialogAction>Accept</UI.AlertDialogAction>
        <UI.AlertDialogCancel>Cancel</UI.AlertDialogCancel>
      </UI.AlertDialogContent>
    </UI.AlertDialog>
  ),
  'aspect-ratio': () => <UI.AspectRatio ratio={16 / 9} testID="ratio" />,
  attachment: () => (
    <UI.Attachment name="sample.txt" progress={50} onOpen={() => {}} onRemove={() => {}} />
  ),
  avatar: () => (
    <UI.Avatar>
      <UI.AvatarFallback>AB</UI.AvatarFallback>
    </UI.Avatar>
  ),
  badge: () => <UI.Badge>Active</UI.Badge>,
  breadcrumb: () => (
    <UI.Breadcrumb>
      <UI.BreadcrumbLink onPress={() => {}}>Home</UI.BreadcrumbLink>
      <UI.BreadcrumbSeparator />
      <UI.BreadcrumbPage>Current</UI.BreadcrumbPage>
    </UI.Breadcrumb>
  ),
  bubble: () => (
    <UI.Bubble side="end">
      <UI.BubbleContent>Message</UI.BubbleContent>
    </UI.Bubble>
  ),
  button: () => <UI.Button>Action</UI.Button>,
  'button-group': () => (
    <UI.ButtonGroup>
      <UI.Button>One</UI.Button>
      <UI.Button>Two</UI.Button>
    </UI.ButtonGroup>
  ),
  calendar: () => <UI.Calendar defaultMonth={new Date(2024, 1, 1)} />,
  card: () => (
    <UI.Card>
      <UI.CardHeader>
        <UI.CardTitle>Title</UI.CardTitle>
        <UI.CardDescription>Detail</UI.CardDescription>
      </UI.CardHeader>
      <UI.CardContent>Body</UI.CardContent>
    </UI.Card>
  ),
  carousel: () => (
    <UI.Carousel>
      <UI.CarouselContent>
        <UI.CarouselItem>One</UI.CarouselItem>
        <UI.CarouselItem>Two</UI.CarouselItem>
      </UI.CarouselContent>
      <UI.CarouselPrevious>Previous</UI.CarouselPrevious>
      <UI.CarouselNext>Next</UI.CarouselNext>
    </UI.Carousel>
  ),
  chart: () => (
    <UI.Chart
      data={[
        { label: 'A', value: 4 },
        { label: 'B', value: 8 },
      ]}
    />
  ),
  checkbox: () => <UI.Checkbox accessibilityLabel="Accept">Accept</UI.Checkbox>,
  'code-block': () => <UI.CodeBlock code={'const value = "safe";\n'} />,
  collapsible: () => (
    <UI.Collapsible>
      <UI.CollapsibleTrigger>Open</UI.CollapsibleTrigger>
      <UI.CollapsibleContent>Detail</UI.CollapsibleContent>
    </UI.Collapsible>
  ),
  combobox: () => <UI.Combobox options={[{ value: 'a', label: 'Alpha' }]} />,
  command: () => (
    <UI.Command>
      <UI.CommandInput />
      <UI.CommandList>
        <UI.CommandEmpty>None</UI.CommandEmpty>
        <UI.CommandItem value="alpha">Alpha</UI.CommandItem>
      </UI.CommandList>
    </UI.Command>
  ),
  'context-menu': () => (
    <UI.ContextMenu defaultOpen>
      <UI.ContextMenuTrigger>Open</UI.ContextMenuTrigger>
      <UI.ContextMenuContent>
        <UI.ContextMenuItem>Item</UI.ContextMenuItem>
      </UI.ContextMenuContent>
    </UI.ContextMenu>
  ),
  'data-table': () => (
    <UI.DataTable
      data={[{ id: 'a', name: 'Alpha' }]}
      getRowId={(item) => item.id}
      columns={[{ id: 'name', header: 'Name', accessor: (item) => item.name }]}
    />
  ),
  'date-picker': () => <UI.DatePicker defaultValue={new Date(2024, 1, 1)} />,
  dialog: () => (
    <UI.Dialog defaultOpen>
      <UI.DialogTrigger>Open</UI.DialogTrigger>
      <UI.DialogContent>
        <UI.DialogTitle>Dialog</UI.DialogTitle>
        <UI.DialogClose>Close</UI.DialogClose>
      </UI.DialogContent>
    </UI.Dialog>
  ),
  direction: () => (
    <UI.DirectionProvider dir="rtl">
      <UI.Text>RTL</UI.Text>
    </UI.DirectionProvider>
  ),
  drawer: () => (
    <UI.Drawer defaultOpen>
      <UI.DrawerTrigger>Open</UI.DrawerTrigger>
      <UI.DrawerContent>
        <UI.DrawerTitle>Drawer</UI.DrawerTitle>
        <UI.DrawerClose>Close</UI.DrawerClose>
      </UI.DrawerContent>
    </UI.Drawer>
  ),
  'dropdown-menu': () => (
    <UI.DropdownMenu defaultOpen>
      <UI.DropdownMenuTrigger>Open</UI.DropdownMenuTrigger>
      <UI.DropdownMenuContent>
        <UI.DropdownMenuItem>Item</UI.DropdownMenuItem>
      </UI.DropdownMenuContent>
    </UI.DropdownMenu>
  ),
  empty: () => (
    <UI.Empty>
      <UI.EmptyTitle>Nothing here</UI.EmptyTitle>
      <UI.EmptyDescription>Add an item</UI.EmptyDescription>
    </UI.Empty>
  ),
  field: () => (
    <UI.Field invalid>
      <UI.FieldLabel>Email</UI.FieldLabel>
      <UI.FieldInput />
      <UI.FieldError>Invalid email</UI.FieldError>
    </UI.Field>
  ),
  'hover-card': () => (
    <UI.HoverCard defaultOpen>
      <UI.HoverCardTrigger>Preview</UI.HoverCardTrigger>
      <UI.HoverCardContent>Detail</UI.HoverCardContent>
    </UI.HoverCard>
  ),
  input: () => <UI.Input accessibilityLabel="Name" />,
  'input-group': () => (
    <UI.InputGroup>
      <UI.InputGroupAddon>
        <UI.InputGroupText>@</UI.InputGroupText>
      </UI.InputGroupAddon>
      <UI.InputGroupInput accessibilityLabel="Account" />
    </UI.InputGroup>
  ),
  'input-otp': () => (
    <UI.InputOTP maxLength={4}>
      <UI.InputOTPGroup>
        <UI.InputOTPSlot index={0} />
        <UI.InputOTPSlot index={1} />
      </UI.InputOTPGroup>
    </UI.InputOTP>
  ),
  item: () => (
    <UI.Item>
      <UI.ItemTitle>Item</UI.ItemTitle>
      <UI.ItemDescription>Detail</UI.ItemDescription>
    </UI.Item>
  ),
  kbd: () => <UI.Kbd>⌘ K</UI.Kbd>,
  label: () => <UI.Label>Label</UI.Label>,
  marker: () => (
    <UI.Marker>
      <UI.MarkerContent>Status changed</UI.MarkerContent>
    </UI.Marker>
  ),
  menubar: () => (
    <UI.Menubar>
      <UI.MenubarMenu defaultOpen>
        <UI.MenubarTrigger>File</UI.MenubarTrigger>
        <UI.MenubarContent>
          <UI.MenubarItem>Save</UI.MenubarItem>
        </UI.MenubarContent>
      </UI.MenubarMenu>
    </UI.Menubar>
  ),
  message: () => (
    <UI.Message from="user">
      <UI.MessageContent>Hello</UI.MessageContent>
      <UI.MessageTimestamp>Now</UI.MessageTimestamp>
    </UI.Message>
  ),
  'message-scroller': () => (
    <UI.MessageScroller>
      <UI.MessageScrollerContent>
        <UI.Text>Hello</UI.Text>
      </UI.MessageScrollerContent>
      <UI.MessageScrollerScrollButton />
    </UI.MessageScroller>
  ),
  'native-select': () => <UI.NativeSelect options={[{ value: 'a', label: 'Alpha' }]} />,
  'navigation-menu': () => (
    <UI.NavigationMenu>
      <UI.NavigationMenuList>
        <UI.NavigationMenuItem defaultOpen>
          <UI.NavigationMenuTrigger>Products</UI.NavigationMenuTrigger>
          <UI.NavigationMenuContent>
            <UI.NavigationMenuLink onPress={() => {}}>Product</UI.NavigationMenuLink>
          </UI.NavigationMenuContent>
        </UI.NavigationMenuItem>
      </UI.NavigationMenuList>
    </UI.NavigationMenu>
  ),
  pagination: () => (
    <UI.Pagination>
      <UI.PaginationPrevious disabled />
      <UI.PaginationLink isActive>1</UI.PaginationLink>
      <UI.PaginationNext />
    </UI.Pagination>
  ),
  popover: () => (
    <UI.Popover defaultOpen>
      <UI.PopoverTrigger>Open</UI.PopoverTrigger>
      <UI.PopoverContent>
        Detail<UI.PopoverClose>Close</UI.PopoverClose>
      </UI.PopoverContent>
    </UI.Popover>
  ),
  progress: () => <UI.Progress value={45} accessibilityLabel="Upload" />,
  questionnaire: () => (
    <UI.Questionnaire
      questions={[{ id: 'name', title: 'Name', type: 'text' }]}
      onComplete={() => {}}
    />
  ),
  'radio-group': () => (
    <UI.RadioGroup>
      <UI.RadioGroupItem value="a">Alpha</UI.RadioGroupItem>
    </UI.RadioGroup>
  ),
  resizable: () => (
    <UI.ResizablePanelGroup>
      <UI.ResizablePanel>Left</UI.ResizablePanel>
      <UI.ResizableHandle />
      <UI.ResizablePanel>Right</UI.ResizablePanel>
    </UI.ResizablePanelGroup>
  ),
  'scroll-area': () => (
    <UI.ScrollArea>
      <UI.Text>Scrollable</UI.Text>
      <UI.ScrollBar />
    </UI.ScrollArea>
  ),
  select: () => (
    <UI.Select defaultValue="a">
      <UI.SelectTrigger>
        <UI.SelectValue />
      </UI.SelectTrigger>
      <UI.SelectContent>
        <UI.SelectItem value="a">Alpha</UI.SelectItem>
      </UI.SelectContent>
    </UI.Select>
  ),
  separator: () => <UI.Separator decorative={false} />,
  sheet: () => (
    <UI.Sheet defaultOpen>
      <UI.SheetTrigger>Open</UI.SheetTrigger>
      <UI.SheetContent>
        <UI.SheetTitle>Sheet</UI.SheetTitle>
        <UI.SheetClose>Close</UI.SheetClose>
      </UI.SheetContent>
    </UI.Sheet>
  ),
  sidebar: () => (
    <UI.SidebarProvider defaultOpen>
      <UI.SidebarTrigger />
      <UI.Sidebar>
        <UI.SidebarHeader>Navigation</UI.SidebarHeader>
        <UI.SidebarMenu>
          <UI.SidebarMenuItem>
            <UI.SidebarMenuButton isActive>Home</UI.SidebarMenuButton>
          </UI.SidebarMenuItem>
        </UI.SidebarMenu>
      </UI.Sidebar>
    </UI.SidebarProvider>
  ),
  skeleton: () => <UI.Skeleton />,
  slider: () => <UI.Slider defaultValue={[20, 80]} />,
  spinner: () => <UI.Spinner />,
  switch: () => <UI.Switch accessibilityLabel="Notifications" />,
  table: () => (
    <UI.Table>
      <UI.TableHeader>
        <UI.TableRow>
          <UI.TableHead>Name</UI.TableHead>
        </UI.TableRow>
      </UI.TableHeader>
      <UI.TableBody>
        <UI.TableRow>
          <UI.TableCell>Alpha</UI.TableCell>
        </UI.TableRow>
      </UI.TableBody>
    </UI.Table>
  ),
  tabs: () => (
    <UI.Tabs defaultValue="a">
      <UI.TabsList>
        <UI.TabsTrigger value="a">Alpha</UI.TabsTrigger>
        <UI.TabsTrigger value="b">Beta</UI.TabsTrigger>
      </UI.TabsList>
      <UI.TabsContent value="a">First</UI.TabsContent>
      <UI.TabsContent value="b">Second</UI.TabsContent>
    </UI.Tabs>
  ),
  textarea: () => <UI.Textarea accessibilityLabel="Notes" />,
  toast: () => (
    <UI.ToastProvider>
      <UI.Toast message={{ id: 'saved', title: 'Saved', duration: 0 }} />
    </UI.ToastProvider>
  ),
  toggle: () => <UI.Toggle>Bold</UI.Toggle>,
  'toggle-group': () => (
    <UI.ToggleGroup type="multiple">
      <UI.ToggleGroupItem value="bold">Bold</UI.ToggleGroupItem>
    </UI.ToggleGroup>
  ),
  tooltip: () => (
    <UI.TooltipProvider>
      <UI.Tooltip defaultOpen>
        <UI.TooltipTrigger>Help</UI.TooltipTrigger>
        <UI.TooltipContent>Detail</UI.TooltipContent>
      </UI.Tooltip>
    </UI.TooltipProvider>
  ),
  trace: () => (
    <UI.Trace>
      <UI.TraceItem>
        <UI.TraceTrigger>Inspect</UI.TraceTrigger>
        <UI.TraceContent>Detail</UI.TraceContent>
      </UI.TraceItem>
    </UI.Trace>
  ),
  typography: () => <UI.TypographyH1>Heading</UI.TypographyH1>,
};
