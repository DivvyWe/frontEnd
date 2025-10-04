// app/offline/page.js
export const metadata = { title: "Offline · Divsez" };

export default function OfflinePage() {
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold text-slate-900">You’re offline</h1>
      <p className="mt-2 text-sm text-slate-600">
        No internet connection. You can still open pages you’ve visited
        recently.
      </p>
      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
        Try again when you’re back online, or pull down to refresh.
      </div>
    </main>
  );
}
