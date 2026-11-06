"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, type LoginState } from "@/app/actions/auth";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="panel mt-8 space-y-4 p-6">
      <input type="hidden" name="next" value={next ?? "/"} />
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required className="mt-1.5" defaultValue={state.email} />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required className="mt-1.5" />
      </div>
      {state.message ? (
        <p role="alert" className="text-sm text-brand">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" /> : null}
        Accedi
      </Button>
    </form>
  );
}
