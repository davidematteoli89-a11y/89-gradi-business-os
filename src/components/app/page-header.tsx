import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className={cn("mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-[28px] leading-9 font-semibold tracking-[-0.025em] sm:text-[32px] sm:leading-10">{title}</h1>
        {description ? <p className="mt-1 max-w-[62ch] text-[15px] text-muted-foreground">{description}</p> : null}
        {children}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
