import React, { cloneElement, isValidElement } from "react";
import { AlertLine } from "@/components/ui/alert-line";

export interface FormRowProps {
  label: React.ReactNode;
  children: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  htmlFor?: string;
  "data-align-group"?: string;
}

/**
 * FormRow: Accessible, consistent form field wrapper. The error has the id `<htmlFor>-error`; a direct `<input>`
 * child is described by it (aria-describedby). A wrapper around the input must set aria-describedby itself.
 */
export function FormRow({
  label,
  children,
  hint,
  error,
  required = false,
  className = "",
  htmlFor,
  "data-align-group": dataAlignGroup,
}: FormRowProps) {
  const errorId = htmlFor && error ? `${htmlFor}-error` : undefined;
  const described = (child: React.ReactElement<{ "aria-describedby"?: string }>) => {
    const own = child.props["aria-describedby"];
    return [own, errorId].filter(Boolean).join(" ") || undefined;
  };

  return (
    <div
      data-align-group={dataAlignGroup}
      className={`flex flex-col gap-2 w-full ${className}`}
    >
      <div className="flex justify-between items-baseline">
        <label htmlFor={htmlFor} className="text-xs font-bold text-text">
          {label}
          {required && <span className="text-destructive-text ml-0.5">*</span>}
        </label>
        {hint && <span className="text-xs text-secondary">{hint}</span>}
      </div>

      {isValidElement<{ "aria-describedby"?: string }>(children) && children.type === "input"
        ? cloneElement(children, { "aria-describedby": described(children) })
        : children}

      <AlertLine show={!!error} gap={2} as="span" id={errorId} className="text-xs font-semibold text-destructive-text">
        {error}
      </AlertLine>
    </div>
  );
}
