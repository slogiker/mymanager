import { useState } from 'react';
import AccessibilityDrawer from './AccessibilityDrawer';

export default function FloatingAccessibilityButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-6 bottom-6 z-40 p-3.5 rounded-full bg-red-600 hover:bg-red-500 border border-red-500/80 shadow-[0_0_25px_-5px_rgba(239,68,68,0.5)] text-white hover:scale-105 active:scale-95 transition-all duration-300 group focus:outline-none focus:ring-4 focus:ring-red-500/30"
        aria-label="Open accessibility settings"
        title="Accessibility Settings"
      >
        <svg
          className="w-6 h-6 transition-transform duration-300 group-hover:rotate-6"
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
