"use client";

// Small reusable UI primitives: buttons, form fields, cards, chips, dialogs.

import Link from "next/link";
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { X } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variantClass: Record<Variant, string> = {
  primary: "bg-palm-700 text-white hover:bg-palm-800 disabled:bg-palm-200",
  secondary: "border border-sand-300 bg-white text-ink hover:bg-sand-100 disabled:text-muted",
  ghost: "text-palm-800 hover:bg-palm-50 disabled:text-muted",
  danger: "bg-rose-700 text-white hover:bg-rose-800 disabled:bg-rose-200",
};

export function buttonClass(variant: Variant = "secondary", size: "md" | "sm" = "md"): string {
  return `inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:cursor-not-allowed ${
    size === "md" ? "min-h-11 px-4 text-sm" : "min-h-11 px-3 text-sm"
  } ${variantClass[variant]}`;
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "md" | "sm" }
>(function Button({ variant = "secondary", size = "md", className = "", type = "button", ...props }, ref) {
  return <button ref={ref} type={type} className={`${buttonClass(variant, size)} ${className}`} {...props} />;
});

export function IconButton({
  label,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-sand-100 hover:text-ink disabled:opacity-30 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/** Internal link styled as a button. */
export function LinkButton({
  href,
  variant = "secondary",
  children,
  className = "",
}: {
  href: string;
  variant?: Variant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`${buttonClass(variant)} ${className}`}>
      {children}
    </Link>
  );
}

/**
 * External/action link (tel:, wa.me, maps). Renders a disabled button with
 * the reason when there is no href.
 */
export function ActionLink({
  href,
  children,
  disabledReason,
  variant = "secondary",
  className = "",
}: {
  href: string | undefined;
  children: ReactNode;
  disabledReason: string;
  variant?: Variant;
  className?: string;
}) {
  if (!href) {
    return (
      <button type="button" disabled title={disabledReason} aria-label={`${disabledReason}`} className={`${buttonClass(variant)} opacity-50 ${className}`}>
        {children}
      </button>
    );
  }
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      className={`${buttonClass(variant)} ${className}`}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-sand-200 bg-white p-4 ${className}`}>{children}</section>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-palm-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-sand-300 bg-white/60 p-6 text-center">
      {icon && <div className="mx-auto mb-2 flex justify-center text-palm-600">{icon}</div>}
      <p className="font-medium text-ink">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

const chipTone = {
  green: "bg-palm-100 text-palm-900",
  amber: "bg-amber-100 text-amber-900",
  gray: "bg-sand-100 text-muted",
  red: "bg-rose-100 text-rose-900",
  blue: "bg-sky-100 text-sky-900",
} as const;

export type ChipTone = keyof typeof chipTone;

export function Chip({ tone = "gray", children }: { tone?: ChipTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${chipTone[tone]}`}>
      {children}
    </span>
  );
}

export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-full bg-sand-100"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div className="h-full rounded-full bg-palm-600 transition-[width]" style={{ width: `${percent}%` }} />
    </div>
  );
}

// ---- Form fields ----

const inputClass =
  "block w-full min-w-0 max-w-full min-h-11 rounded-xl border border-sand-300 bg-white px-3 py-2 text-base text-ink placeholder:text-muted/70 focus:border-palm-500 focus:outline-none focus-visible:outline-palm-500 aria-[invalid=true]:border-rose-600";

type FieldProps = { label: string; hint?: ReactNode; error?: string; className?: string };

function FieldWrap({
  id,
  label,
  hint,
  error,
  className = "",
  children,
}: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({
  label,
  hint,
  error,
  className,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <FieldWrap id={id} label={label} hint={hint} error={error} className={className}>
      <input
        id={id}
        className={inputClass}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...props}
      />
    </FieldWrap>
  );
}

export function TextArea({
  label,
  hint,
  error,
  className,
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <FieldWrap id={id} label={label} hint={hint} error={error} className={className}>
      <textarea
        id={id}
        rows={3}
        className={inputClass}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...props}
      />
    </FieldWrap>
  );
}

export function SelectField({
  label,
  hint,
  error,
  className,
  options,
  ...props
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  const id = useId();
  return (
    <FieldWrap id={id} label={label} hint={hint} error={error} className={className}>
      <select id={id} className={inputClass} aria-invalid={error ? true : undefined} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldWrap>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-5 shrink-0 accent-palm-700"
      />
      <label htmlFor={id} className="text-sm">
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </label>
    </div>
  );
}

// ---- Dialogs ----

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-xl overflow-hidden rounded-2xl bg-sand-50 p-0 text-ink shadow-2xl"
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-sand-200 bg-white px-4 py-2">
            <h2 id={titleId} className="text-lg font-semibold text-palm-900">
              {title}
            </h2>
            <IconButton label="Close" onClick={onClose}>
              <X size={20} aria-hidden />
            </IconButton>
          </div>
          <div className="overflow-y-auto px-4 py-4">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-sand-200 bg-white px-4 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-ink">{message}</div>
    </Dialog>
  );
}

export function Notice({ tone = "amber", children }: { tone?: "amber" | "green" | "gray"; children: ReactNode }) {
  const cls =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-950"
      : tone === "green"
        ? "border-palm-200 bg-palm-50 text-palm-900"
        : "border-sand-200 bg-sand-100 text-muted";
  return <div className={`rounded-xl border px-3 py-2 text-sm ${cls}`}>{children}</div>;
}
