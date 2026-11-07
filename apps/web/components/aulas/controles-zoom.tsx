import { alejarZoom, acercarZoom, describirZoom, zoomMaximo, zoomMinimo } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import { RotateCcwIcon, ZoomInIcon, ZoomOutIcon } from "lucide-react";

type ControlesZoomProps = {
  zoom: number;
  onChange: (zoom: number) => void;
  conRestablecer?: boolean;
};

export function ControlesZoom({ zoom, onChange, conRestablecer = false }: ControlesZoomProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground mr-1 text-sm tabular-nums" aria-live="polite">
        {describirZoom(zoom)}
      </span>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        aria-label="Alejar"
        disabled={zoom <= zoomMinimo}
        onClick={() => onChange(alejarZoom(zoom))}
      >
        <ZoomOutIcon />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        aria-label="Acercar"
        disabled={zoom >= zoomMaximo}
        onClick={() => onChange(acercarZoom(zoom))}
      >
        <ZoomInIcon />
      </Button>
      {conRestablecer ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={zoom === zoomMinimo}
          onClick={() => onChange(zoomMinimo)}
        >
          <RotateCcwIcon />
          Restablecer
        </Button>
      ) : null}
    </div>
  );
}
