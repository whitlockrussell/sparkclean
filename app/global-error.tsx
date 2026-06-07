"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Something went wrong
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            An unexpected error occurred. Our team has been notified.
          </p>
          <button
            onClick={reset}
            className="bg-teal-500 hover:bg-teal-600 text-white font-medium px-6 py-2 rounded-lg transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
