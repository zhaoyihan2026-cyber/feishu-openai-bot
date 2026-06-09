import {
  CircleAlert,
  Clock3,
  Inbox,
  LoaderCircle,
  Rows3,
} from "lucide-react";
import type { ReactNode } from "react";

export type ModuleStateVariant =
  | "loading"
  | "error"
  | "empty"
  | "delayed"
  | "partial";

interface ModuleStateProps {
  variant: ModuleStateVariant;
  title: string;
  message?: string;
  action?: ReactNode;
  className?: string;
}

const icons = {
  loading: LoaderCircle,
  error: CircleAlert,
  empty: Inbox,
  delayed: Clock3,
  partial: Rows3,
} satisfies Record<ModuleStateVariant, typeof CircleAlert>;

export function ModuleState({
  variant,
  title,
  message,
  action,
  className,
}: ModuleStateProps) {
  const Icon = icons[variant];
  const role = variant === "error" ? "alert" : "status";
  const classes = ["module-state", `module-state--${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={classes}
      role={role}
      aria-live={variant === "error" ? "assertive" : "polite"}
      aria-busy={variant === "loading" ? "true" : undefined}
    >
      <Icon className="module-state-icon" aria-hidden="true" />
      <div className="module-state-copy">
        <h2>{title}</h2>
        {message ? <p>{message}</p> : null}
      </div>
      {action ? <div className="module-state-action">{action}</div> : null}
    </section>
  );
}
