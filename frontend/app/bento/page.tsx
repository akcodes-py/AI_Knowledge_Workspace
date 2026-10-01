"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BentoRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="app-shell flex items-center justify-center min-h-screen">
      <div className="text-center text-muted text-sm">
        Redirecting to Workspace Home...
      </div>
    </div>
  );
}
