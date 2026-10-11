import React from "react";

export interface FormRowProps {
  label: React.ReactNode;
  children: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  "data-align-group"?: string;
}

/**
 * FormRow: Accessible, consistent form field wrapper.
 */
export function FormRow({
  label,
  children,
  hint,
  error,
  required = false,
  className = "",
  "data-align-group": dataAlignGroup,
}: FormRowProps) {
  return (
    <div
      data-align-group={dataAlignGroup}
      className={`flex flex-col gap-1.5 w-full ${className}`}
    >
      <div className="flex justify-between items-baseline">
        <label className="text-xs font-bold text-text">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
        {hint && <span className="text-xs text-secondary">{hint}</span>}
      </div>

      {children}

      {error && (
        <span role="alert" className="text-xs font-semibold text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
