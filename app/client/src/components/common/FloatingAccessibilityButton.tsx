import { useState } from 'react';
import AccessibilityDrawer from './AccessibilityDrawer';

export default function FloatingAccessibilityButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-40 rounded-full border border-red-500/80 bg-red-600 p-3 text-white shadow-[0_0_25px_-5px_rgba(239,68,68,0.5)] transition-all duration-300 group hover:scale-105 hover:bg-red-500 active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-500/30 sm:right-6 sm:bottom-6 sm:p-3.5"
        aria-label="Open accessibility settings"
        title="Accessibility Settings"
      >
        <svg
          className="h-5 w-5 transition-transform duration-300 group-hover:rotate-6 sm:h-6 sm:w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {/* Universal Accessibility / Person Icon */}
          <circle cx="12" cy="4" r="2" strokeWidth={2.2} />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.2}
            d="M4 8h16M12 8v13m-4-7l4 7 4-7"
          />
        </svg>
      </button>

      <AccessibilityDrawer isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
