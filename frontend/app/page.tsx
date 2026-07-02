import { AppShell } from "@/components/app-shell";

export default function Home() {
  return (
    <AppShell>
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-screen-2xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border bg-card p-6 text-center">
          <p className="max-w-md text-sm font-medium text-muted-foreground">
            OrderMatch Lab frontend scaffold is ready for the next phase.
          </p>
        </div>
      </main>
    </AppShell>
  );
}
