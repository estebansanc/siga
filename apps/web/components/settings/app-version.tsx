"use client";

import { Button } from "@repo/ui/components/button";
import { CircleHelpIcon } from "lucide-react";
import { useState } from "react";

import { currentRelease, formatVersionLabel, releases } from "@/lib/releases";

import { ReleaseNotesDialog } from "./release-notes-dialog";

export function AppVersion() {
  const [showingNotes, setShowingNotes] = useState(false);

  return (
    <div className="text-muted-foreground flex items-center justify-center gap-1 pt-2 text-xs">
      <span>{formatVersionLabel(currentRelease)}</span>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Qué hay de nuevo"
        onClick={() => setShowingNotes(true)}
      >
        <CircleHelpIcon />
      </Button>
      <ReleaseNotesDialog open={showingNotes} onOpenChange={setShowingNotes} releases={releases} />
    </div>
  );
}
