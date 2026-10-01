import Link from "next/link";

export default function NotFound() {
  return (
    <div className="app-shell flex items-center justify-center min-h-screen text-center p-8">
      <div className="glass-card max-w-md w-full">
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <h2 className="text-xl font-semibold mb-4">Page Not Found</h2>
        <p className="text-muted text-sm mb-6">
          The requested page could not be found.
        </p>
        <Link href="/" className="btn btn-primary">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
