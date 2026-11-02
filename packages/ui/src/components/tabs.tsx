"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@repo/ui/lib/utils";

function Tabs({ className, orientation = "horizontal", ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn("group/tabs data-horizontal:flex-col flex gap-2", className)}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-start rounded-lg group-data-horizontal/tabs:max-w-full group-data-horizontal/tabs:overflow-x-auto group-data-horizontal/tabs:scroll-px-8 group-data-horizontal/tabs:[scrollbar-width:none] group-data-horizontal/tabs:[&::-webkit-scrollbar]:hidden p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 pointer-coarse:group-data-horizontal/tabs:h-12 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const FADE_SIZE = "2rem";

function fadeMask(hiddenAtStart: boolean, hiddenAtEnd: boolean) {
  if (!hiddenAtStart && !hiddenAtEnd) return undefined;
  const start = hiddenAtStart ? `transparent, #000 ${FADE_SIZE}` : "#000, #000";
  const end = hiddenAtEnd ? `#000 calc(100% - ${FADE_SIZE}), transparent` : "#000, #000";
  const gradient = `linear-gradient(to right, ${start}, ${end})`;
  return { maskImage: gradient, WebkitMaskImage: gradient };
}

function TabsList({
  className,
  variant = "default",
  style,
  ref,
  onClick,
  onFocus,
  onScroll,
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = React.useState({ start: false, end: false });

  const updateHidden = React.useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const start = list.scrollLeft > 1;
    const end = list.scrollLeft + list.clientWidth < list.scrollWidth - 1;
    setHidden((current) =>
      current.start === start && current.end === end ? current : { start, end },
    );
  }, []);

  React.useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const resizeObserver = new ResizeObserver(updateHidden);
    const observeTabs = () => {
      resizeObserver.disconnect();
      resizeObserver.observe(list);
      Array.from(list.children).forEach((child) => resizeObserver.observe(child));
      updateHidden();
    };
    const mutationObserver = new MutationObserver(observeTabs);
    mutationObserver.observe(list, { childList: true });
    observeTabs();
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [updateHidden]);

  const revealTab = (target: EventTarget) => {
    const tab = (target as HTMLElement).closest<HTMLElement>('[role="tab"]');
    tab?.scrollIntoView({ inline: "nearest", block: "nearest" });
  };

  return (
    <TabsPrimitive.List
      ref={(node) => {
        listRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      data-slot="tabs-list"
      data-variant={variant}
      data-fade-start={hidden.start ? "" : undefined}
      data-fade-end={hidden.end ? "" : undefined}
      className={cn(tabsListVariants({ variant }), className)}
      style={{ ...fadeMask(hidden.start, hidden.end), ...style }}
      onScroll={(event) => {
        onScroll?.(event);
        updateHidden();
      }}
      onClick={(event) => {
        onClick?.(event);
        revealTab(event.target);
      }}
      onFocus={(event) => {
        onFocus?.(event);
        revealTab(event.target);
      }}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "text-foreground/60 group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 dark:text-muted-foreground dark:hover:text-foreground group-data-[variant=default]/tabs-list:data-active:shadow-sm group-data-[variant=line]/tabs-list:data-active:shadow-none pointer-coarse:min-h-11 pointer-coarse:min-w-11 relative inline-flex h-[calc(100%-1px)] flex-[1_0_auto] items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium transition-all focus-visible:outline-1 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        "group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent group-data-[variant=line]/tabs-list:bg-transparent",
        "data-active:bg-background data-active:text-foreground dark:data-active:border-field dark:data-active:bg-input/30 dark:data-active:text-foreground",
        "after:bg-foreground group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100 after:absolute after:opacity-0 after:transition-opacity",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
