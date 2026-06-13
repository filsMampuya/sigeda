"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, X } from "lucide-react";

import { cn } from "@/lib/utils";

type LongTextProps = {
  className?: string;
  emptyFallback?: ReactNode;
  label?: string;
  value?: string | null;
};

type OverlayPosition = {
  left: number;
  top: number;
  width: number;
};

const NORMAL_THRESHOLD = 40;
const TOOLTIP_THRESHOLD = 80;
const FOCUS_THRESHOLD = 180;
const DRAWER_THRESHOLD = 280;
const TOOLTIP_WIDTH = 360;
const LOCAL_FOCUS_WIDTH = 640;
const VIEWPORT_MARGIN = 16;
const LOCAL_FOCUS_GAP = 8;

export function LongText({ className, emptyFallback = "-", label = "Contenu complet", value }: LongTextProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [overlayPosition, setOverlayPosition] = useState<OverlayPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const normalized = typeof value === "string" ? value.trim() : "";
  const length = useMemo(() => Array.from(normalized).length, [normalized]);
  const lineCount = useMemo(() => normalized.split(/\r?\n/).filter(Boolean).length, [normalized]);
  const isNormal = length < NORMAL_THRESHOLD;
  const useTooltip = length >= NORMAL_THRESHOLD && length <= TOOLTIP_THRESHOLD && lineCount <= 2;
  const useDrawer = length > DRAWER_THRESHOLD || lineCount > 4;
  const useLocalFocus = !isNormal && !useTooltip && !useDrawer;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const shouldRenderFloatingLayer = tooltipOpen || focusOpen;

    if (!shouldRenderFloatingLayer || useDrawer) {
      return;
    }

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const width = Math.min(
        useTooltip ? TOOLTIP_WIDTH : LOCAL_FOCUS_WIDTH,
        viewportWidth - VIEWPORT_MARGIN * 2
      );
      const left = clamp(rect.left, VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN);
      const desiredHeight = useTooltip
        ? Math.min(180, Math.max(80, viewportHeight * 0.22))
        : Math.min(360, Math.max(160, viewportHeight * 0.48));
      const spaceBelow = viewportHeight - rect.bottom - VIEWPORT_MARGIN;
      const spaceAbove = rect.top - VIEWPORT_MARGIN;
      const placeAbove = spaceBelow < desiredHeight && spaceAbove > spaceBelow;
      const top = placeAbove
        ? Math.max(VIEWPORT_MARGIN, rect.top - desiredHeight - LOCAL_FOCUS_GAP)
        : Math.min(viewportHeight - desiredHeight - VIEWPORT_MARGIN, rect.bottom + LOCAL_FOCUS_GAP);

      setOverlayPosition({ left, top, width });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [focusOpen, tooltipOpen, useDrawer, useTooltip]);

  useEffect(() => {
    if (!tooltipOpen && !focusOpen && !drawerOpen) {
      document.body.style.removeProperty("overflow");
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTooltipOpen(false);
        setFocusOpen(false);
        setDrawerOpen(false);
      }
    };

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      if (triggerRef.current?.contains(target) || overlayRef.current?.contains(target)) {
        return;
      }

      setTooltipOpen(false);
      setFocusOpen(false);
      setDrawerOpen(false);
    };

    if (useDrawer || drawerOpen) {
      document.body.style.overflow = "hidden";
    }

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      if (!drawerOpen) {
        document.body.style.removeProperty("overflow");
      }
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [drawerOpen, focusOpen, tooltipOpen, useDrawer]);

  if (!normalized) {
    return <span className={cn("block text-slate-500", className)}>{emptyFallback}</span>;
  }

  if (isNormal) {
    return <span className={cn("block whitespace-normal break-words text-slate-900", className)}>{normalized}</span>;
  }

  const modeHint = useTooltip
    ? "Survoler pour afficher le contenu complet"
    : useDrawer
      ? "Cliquer pour ouvrir le panneau detaille"
      : "Cliquer pour agrandir la cellule";

  const triggerClassName = cn(
    "block w-full truncate text-left text-slate-900 transition hover:text-brand-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 focus-visible:ring-offset-2",
    className
  );

  const localFocusStyle: CSSProperties | undefined = overlayPosition
    ? {
        left: overlayPosition.left,
        top: overlayPosition.top,
        width: overlayPosition.width
      }
    : undefined;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={() => {
          if (useTooltip) {
            setTooltipOpen(true);
          }
        }}
        onMouseLeave={() => {
          if (useTooltip) {
            setTooltipOpen(false);
          }
        }}
        onFocus={() => {
          if (useTooltip) {
            setTooltipOpen(true);
          }
        }}
        onBlur={() => {
          if (useTooltip) {
            setTooltipOpen(false);
          }
        }}
        onClick={() => {
          if (useTooltip) {
            setTooltipOpen((current) => !current);
            return;
          }

          if (useDrawer) {
            setDrawerOpen(true);
            return;
          }

          setFocusOpen((current) => !current);
        }}
        className={triggerClassName}
        title={modeHint}
        aria-label={label}
      >
        {normalized}
      </button>
      {mounted && useTooltip && tooltipOpen && overlayPosition
        ? createPortal(
            <div
              ref={overlayRef}
              style={localFocusStyle}
              className="fixed z-[110] rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-[0_12px_28px_rgba(15,23,42,0.16)]"
              role="tooltip"
              aria-label={label}
            >
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">
                {normalized}
              </p>
            </div>,
            document.body
          )
        : null}
      {mounted && useLocalFocus && focusOpen && overlayPosition
        ? createPortal(
            <div
              ref={overlayRef}
              style={localFocusStyle}
              className="fixed z-[110] max-h-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
              role="dialog"
              aria-label={label}
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
                  <p className="mt-1 text-xs text-slate-500">Focus local de la cellule</p>
                </div>
                <div className="flex items-center gap-2">
                  {length > FOCUS_THRESHOLD ? (
                    <button
                      type="button"
                      onClick={() => {
                        setFocusOpen(false);
                        setDrawerOpen(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Ouvrir
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setFocusOpen(false)}
                    className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="max-h-[290px] overflow-auto px-4 py-3">
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">
                  {normalized}
                </p>
              </div>
            </div>,
            document.body
          )
        : null}
      {mounted && drawerOpen
        ? createPortal(
            <div className="fixed inset-0 z-[120] flex justify-end bg-slate-950/35">
              <button
                type="button"
                aria-label="Fermer"
                className="flex-1 cursor-default"
                onClick={() => {
                  setTooltipOpen(false);
                  setFocusOpen(false);
                  setDrawerOpen(false);
                }}
              />
              <div
                ref={overlayRef}
                className="flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-[-20px_0_50px_rgba(15,23,42,0.16)]"
              >
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
                    <h3 className="mt-1 text-lg font-semibold text-brand-navy">Valeur complete</h3>
                    <p className="mt-1 text-xs text-slate-500">Affichage etendu pour contenu volumineux</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTooltipOpen(false);
                      setFocusOpen(false);
                      setDrawerOpen(false);
                    }}
                    className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-auto px-5 py-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="whitespace-pre-wrap break-all text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">
                      {normalized}
                    </p>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
