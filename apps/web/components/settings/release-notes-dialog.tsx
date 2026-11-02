"use client";

import { Button } from "@repo/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/ui/components/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { ChevronDownIcon } from "lucide-react";

import { formatDate } from "@/lib/dates";
import { formatVersionName, type Release } from "@/lib/releases";

const formatReleaseDate = (release: Release) => formatDate(`${release.date}T00:00:00`);

function ReleaseChanges({ release }: { release: Release }) {
  if (release.changes.length === 0) {
    return <p className="text-muted-foreground text-sm">Sin cambios registrados.</p>;
  }
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {release.changes.map((change) => (
        <li key={change}>{change}</li>
      ))}
    </ul>
  );
}

function CurrentRelease({ release }: { release: Release }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-medium">{formatVersionName(release)}</h3>
        <span className="text-muted-foreground text-xs">{formatReleaseDate(release)}</span>
      </div>
      <ReleaseChanges release={release} />
    </section>
  );
}

function PreviousRelease({ release }: { release: Release }) {
  return (
    <Collapsible>
      <CollapsibleTrigger
        render={<Button variant="ghost" size="sm" className="group -ml-2 w-full justify-start" />}
      >
        <ChevronDownIcon className="group-data-panel-open:rotate-180 transition-transform" />
        {formatVersionName(release)}
        <span className="text-muted-foreground ml-auto text-xs font-normal">
          {formatReleaseDate(release)}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <ReleaseChanges release={release} />
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ReleaseNotesDialog({
  open,
  onOpenChange,
  releases,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  releases: Release[];
}) {
  const [current, ...previous] = releases;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Qué hay de nuevo</DialogTitle>
          <DialogDescription>Qué cambió en cada versión del sistema.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60dvh]">
          <div className="flex flex-col gap-4 pr-3">
            {current ? <CurrentRelease release={current} /> : null}
            {previous.length > 0 ? (
              <div className="flex flex-col gap-1 border-t pt-3">
                <p className="text-muted-foreground text-xs">Versiones anteriores</p>
                {previous.map((release) => (
                  <PreviousRelease key={formatVersionName(release)} release={release} />
                ))}
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
