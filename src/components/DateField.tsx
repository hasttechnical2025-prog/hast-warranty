"use client";

import React, { useRef } from "react";

interface DateFieldProps {
  value: string; // ISO date string (YYYY-MM-DD) or empty
  onChange: (val: string) => void;
  label?: string;
  className?: string;
}

export function DateField({ value, onChange, label, className = "" }: DateFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Format YYYY-MM-DD to DD/MM/YYYY
  const formatDisplay = (dateStr: string) => {
    if (!dateStr) return "Chọn ngày";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const handleDisplayClick = () => {
    if (inputRef.current) {
      // Trigger native date picker
      try {
        inputRef.current.showPicker();
      } catch (e) {
        inputRef.current.focus();
      }
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <div className="relative w-full">
        {/* Visual Overlay Field: Shows DD/MM/YYYY */}
        <div
          onClick={handleDisplayClick}
          className="w-full flex items-center justify-between px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 cursor-pointer shadow-sm text-sm"
        >
          <span>{formatDisplay(value)}</span>
          <svg
            className="h-5 w-5 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>

        {/* Hidden Native Input overlaid on top, opacity-0, but clickable */}
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}
