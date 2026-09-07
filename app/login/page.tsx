"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const { status } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const error = params.get("error");

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="field-label mb-3">Gemstone Division</p>
        <h1 className="font-display italic text-4xl text-paper mb-2">
          Reconciliation Register
        </h1>
        <p className="text-paper/50 text-sm mb-10 leading-relaxed">
          Sign in with the Google account your admin registered for you to
          record today's stock count.
        </p>

        {error && (
          <div className="border border-rust/50 bg-rust/10 text-rust text-sm rounded px-4 py-3 mb-6">
            This account isn't registered for the reconciliation register.
            Ask your admin to add you.
          </div>
        )}

        <button onClick={() => signIn("google", { callbackUrl: "/dashboard" })} className="btn-primary w-full">
          Continue with Google
        </button>
      </div>
    </main>
  );
}
