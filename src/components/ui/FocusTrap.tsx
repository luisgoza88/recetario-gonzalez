"use client";

import FocusTrapReact from "focus-trap-react";
import { ReactNode } from "react";

interface FocusTrapProps {
  active: boolean;
  children: ReactNode;
}

/**
 * Wrapper around focus-trap-react for modal focus trapping.
 * Activate when modal is open, deactivate when closed.
 */
export default function FocusTrap({ active, children }: FocusTrapProps) {
  return (
    <FocusTrapReact
      active={active}
      focusTrapOptions={{
        returnFocusOnDeactivate: true,
        escapeDeactivates: false, // Let modals handle Escape themselves
        allowOutsideClick: true,
        fallbackFocus: '[role="dialog"]',
      }}
    >
      {children}
    </FocusTrapReact>
  );
}
