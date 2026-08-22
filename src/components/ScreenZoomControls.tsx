import React, { useState, useEffect, useRef } from "react";
import { toKhNum } from "../lib/constants";

export const ZOOM_PRESETS = [50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200];

interface ScreenZoomControlsProps {
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  onShowToast?: (msg: string, type?: "success" | "error" | "info") => void;
  variant?: "header" | "floating" | "both";
}

export function ScreenZoomControls({
  zoomLevel,
  setZoomLevel,
  onShowToast,
  variant = "both",
}: ScreenZoomControlsProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFloatingMinimized, setIsFloatingMinimized] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Monitor fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Close dropdown menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  // Zoom in by 10%
  const handleZoomIn = () => {
    setZoomLevel((prev) => {
      const next = Math.min(200, Math.round((prev + 10) / 5) * 5);
      if (onShowToast) {
        onShowToast(`🔍 ពង្រីកធំអេក្រង់: ${toKhNum(next)}%`, "info");
      }
      return next;
    });
  };

  // Zoom out by 10%
  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(50, Math.round((prev - 10) / 5) * 5);
      if (onShowToast) {
        onShowToast(`🔍 ពង្រីកតូចអេក្រង់: ${toKhNum(next)}%`, "info");
      }
      return next;
    });
  };

  // Reset zoom to 100%
  const handleResetZoom = () => {
    setZoomLevel(100);
    setIsMenuOpen(false);
    if (onShowToast) {
      onShowToast("↺ កំណត់ទំហំអេក្រង់ដើម: ១០០%", "info");
    }
  };

  // Set specific preset
  const handleSetPreset = (preset: number) => {
    setZoomLevel(preset);
    setIsMenuOpen(false);
    if (onShowToast) {
      onShowToast(`🔍 ទំហំអេក្រង់: ${toKhNum(preset)}%`, "info");
    }
  };

  // Toggle Fullscreen mode
  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          if (onShowToast) onShowToast("⛶ បានបើកម៉ូតពេញអេក្រង់ (Fullscreen)", "success");
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          if (onShowToast) onShowToast("⛶ បានបិទម៉ូតពេញអេក្រង់", "info");
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle failed:", err);
    }
  };

  return (
    <>
      {/* 1. Header Toolbar Widget */}
      {(variant === "header" || variant === "both") && (
        <div className="relative flex items-center gap-0.5 bg-slate-800/90 dark:bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 text-[11px] shadow-xs select-none" ref={menuRef}>
          {/* Zoom Out Button (desktop only to save mobile header space) */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 50}
            className="hidden sm:flex w-5 h-5 items-center justify-center rounded bg-slate-700/60 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition font-black text-xs"
            title="ពង្រីកតូចអេក្រង់ (Zoom Out - 10%) · Shortcut: Ctrl + -"
            aria-label="Zoom Out"
          >
            ➖
          </button>

          {/* Current Zoom Indicator & Dropdown Trigger */}
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className={`px-1.5 py-0.5 rounded flex items-center gap-1 font-extrabold text-[10px] cursor-pointer transition ${
              zoomLevel === 100
                ? "bg-slate-700/80 text-amber-300 hover:bg-slate-700"
                : "bg-amber-500 text-slate-950 font-black shadow-xs hover:bg-amber-400"
            }`}
            title="ជ្រើសរើសទំហំអេក្រង់ Zoom In / Zoom Out (ចុចដើម្បីបើកម៉ឺនុយទំហំ)"
          >
            <span>🔍</span>
            <span>{toKhNum(zoomLevel)}%</span>
            <span className="text-[8px] opacity-70">▾</span>
          </button>

          {/* Zoom In Button (desktop only) */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 200}
            className="hidden sm:flex w-5 h-5 items-center justify-center rounded bg-slate-700/60 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition font-black text-xs"
            title="ពង្រីកធំអេក្រង់ (Zoom In + 10%) · Shortcut: Ctrl + +"
            aria-label="Zoom In"
          >
            ➕
          </button>

          {/* Reset button if not 100% */}
          {zoomLevel !== 100 && (
            <button
              type="button"
              onClick={handleResetZoom}
              className="hidden sm:flex w-5 h-5 items-center justify-center rounded bg-slate-700 hover:bg-amber-600 text-amber-300 hover:text-white transition cursor-pointer text-[10px] font-bold"
              title="កំណត់ទំហំដើម ១០០% (Reset 100%) · Shortcut: Ctrl + 0"
            >
              ↺
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className={`w-5 h-5 flex items-center justify-center rounded transition cursor-pointer text-[10px] ${
              isFullscreen
                ? "bg-emerald-600 text-white"
                : "bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white"
            }`}
            title={isFullscreen ? "បិទពេញអេក្រង់ (Exit Fullscreen)" : "ពេញអេក្រង់ (Toggle Fullscreen)"}
          >
            {isFullscreen ? "🗗" : "⛶"}
          </button>

          {/* Zoom Presets & Slider Popover */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-3 z-50 text-slate-800 dark:text-slate-100 space-y-3 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-1.5 font-black text-xs text-slate-900 dark:text-white">
                  <span>🔍</span>
                  <span>កម្រិតទំហំអេក្រង់ (Screen Zoom)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-1"
                >
                  ✕
                </button>
              </div>

              {/* Slider Control */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px]">ទំហំជាក់ស្តែង:</span>
                  <span className="text-blue-600 dark:text-blue-400 font-black text-sm">
                    {toKhNum(zoomLevel)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="200"
                  step="5"
                  value={zoomLevel}
                  onChange={(e) => setZoomLevel(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                  <span>៥០% (តូច)</span>
                  <span>១០០% (ដើម)</span>
                  <span>២០០% (ធំ)</span>
                </div>
              </div>

              {/* Preset Chips */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  ទំហំកំណត់រហ័ស (Quick Presets):
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {ZOOM_PRESETS.map((preset) => {
                    const isSelected = zoomLevel === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleSetPreset(preset)}
                        className={`py-1 px-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                          isSelected
                            ? "bg-blue-600 text-white font-black shadow-xs"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        {toKhNum(preset)}%
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons: Reset & Fullscreen */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition cursor-pointer text-center"
                >
                  ↺ ទំហំដើម (១០០%)
                </button>
                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-[11px] transition cursor-pointer text-center flex items-center justify-center gap-1"
                >
                  <span>{isFullscreen ? "🗗" : "⛶"}</span>
                  <span>{isFullscreen ? "បិទពេញអេក្រង់" : "ពេញអេក្រង់"}</span>
                </button>
              </div>

              {/* Shortcut tips footer */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-1.5 text-[9px] text-slate-500 dark:text-slate-400 space-y-0.5 font-medium">
                <div>⌨️ <strong className="text-slate-700 dark:text-slate-300">Ctrl + +</strong> : ពង្រីកធំ (+10%)</div>
                <div>⌨️ <strong className="text-slate-700 dark:text-slate-300">Ctrl + -</strong> : ពង្រីកតូច (-10%)</div>
                <div>⌨️ <strong className="text-slate-700 dark:text-slate-300">Ctrl + 0</strong> : កំណត់ទំហំដើម (100%)</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Floating Bottom Screen Quick Zoom Bar */}
      {(variant === "floating" || variant === "both") && (
        <div className="fixed bottom-4 right-4 z-40 no-print">
          {isFloatingMinimized ? (
            <button
              type="button"
              onClick={() => setIsFloatingMinimized(false)}
              className="bg-slate-900/90 hover:bg-slate-900 text-amber-300 border border-slate-700/80 rounded-full p-2.5 shadow-xl hover:scale-105 active:scale-95 transition cursor-pointer flex items-center gap-1.5 text-xs font-black backdrop-blur-xs"
              title="បើកផ្ទាំង Zoom អេក្រង់"
            >
              <span>🔍</span>
              <span>{toKhNum(zoomLevel)}%</span>
            </button>
          ) : (
            <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white border border-slate-700/80 rounded-2xl p-1.5 shadow-2xl backdrop-blur-md flex items-center gap-1.5 text-xs select-none transition-all">
              {/* Drag / Title Grip */}
              <div className="pl-1.5 pr-0.5 flex items-center gap-1 text-[11px] font-bold text-amber-300">
                <span>🔍</span>
                <span className="font-extrabold">{toKhNum(zoomLevel)}%</span>
              </div>

              {/* Quick Out */}
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 50}
                className="w-7 h-7 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-90 text-slate-200 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition font-black text-sm cursor-pointer shadow-2xs"
                title="ពង្រីកតូច (Zoom Out)"
              >
                ➖
              </button>

              {/* Quick In */}
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 200}
                className="w-7 h-7 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-90 text-slate-200 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition font-black text-sm cursor-pointer shadow-2xs"
                title="ពង្រីកធំ (Zoom In)"
              >
                ➕
              </button>

              {/* Reset if not 100% */}
              {zoomLevel !== 100 && (
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="px-2 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] transition cursor-pointer shadow-xs"
                  title="កំណត់ទំហំដើម ១០០%"
                >
                  ↺ 100%
                </button>
              )}

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={handleToggleFullscreen}
                className={`w-7 h-7 flex items-center justify-center rounded-xl transition cursor-pointer text-xs ${
                  isFullscreen
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                }`}
                title={isFullscreen ? "បិទពេញអេក្រង់" : "ពេញអេក្រង់ (Fullscreen)"}
              >
                {isFullscreen ? "🗗" : "⛶"}
              </button>

              {/* Minimize Float */}
              <button
                type="button"
                onClick={() => setIsFloatingMinimized(true)}
                className="w-5 h-5 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-[10px] transition cursor-pointer ml-0.5"
                title="បង្រួមផ្ទាំង Zoom"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
