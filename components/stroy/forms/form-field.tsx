import type {
  ReactNode,
} from "react";

type Props = {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
};

export function FormField({
  label,
  description,
  error,
  required = false,
  children,
}: Props) {
  return (
    <label className="block">
      <span className="mb-2 block">
        <span className="flex items-center gap-1">
          <span className="text-sm font-semibold text-foreground">
            {label}
          </span>

          {required && (
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          )}
        </span>

        {description && (
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            {description}
          </span>
        )}
      </span>

      {children}

      {error && (
        <span className="mt-2 block text-sm font-medium text-destructive" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}
