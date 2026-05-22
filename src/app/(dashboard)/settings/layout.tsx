import { SettingsNav } from "~/components/settings/SettingsNav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 text-slate-950 md:flex-row">
      <aside className="w-full shrink-0 md:w-60">
        <div className="md:sticky md:top-6">
          <SettingsNav />
        </div>
      </aside>
      <section className="min-w-0 flex-1">{children}</section>
    </div>
  );
}
