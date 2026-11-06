"use client";

import { CircleCheck, Info, LoaderCircle, OctagonX, TriangleAlert } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheck className="size-4 text-[var(--olive)]" />,
        info: <Info className="size-4" />,
        warning: <TriangleAlert className="size-4 text-[var(--amber)]" />,
        error: <OctagonX className="size-4 text-primary" />,
        loading: <LoaderCircle className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--ink)",
          "--normal-text": "var(--paper)",
          "--normal-border": "var(--ink)",
          "--border-radius": "14px",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
