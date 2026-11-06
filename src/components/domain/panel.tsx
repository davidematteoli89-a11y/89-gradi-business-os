import { cn } from "@/lib/utils";

export function Panel({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("panel", className)} {...props} />;
}

export function PanelHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-5 pt-5 sm:px-6", className)}>
      <div className="min-w-0">
        <h2 className="text-[17px] leading-6 font-semibold tracking-[-0.01em]">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({ title, description, action, className }: { title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-start gap-2 px-5 py-10 sm:px-6", className)}>
      <span aria-hidden className="mb-1 size-3 rounded-full border-2 border-brand" />
      <p className="font-medium">{title}</p>
      {description ? <p className="max-w-[52ch] text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
