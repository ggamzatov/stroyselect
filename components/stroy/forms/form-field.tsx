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
    <div>
      <div className="mb-2">
        <div className="flex items-center gap-1">
          <p className="text-sm font-semibold text-foreground">
            {label}
          </p>

          {required && (
            <span className="text-destructive">
              *
            </span>
          )}
        </div>

        {description && (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {children}

      {error && (
        <p className="mt-2 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}