export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">404 - Page Not Found</h1>
        <p className="mb-4">The page you are looking for does not exist.</p>
        <a href="/scores" className="text-blue-600 hover:underline">Return to Scorecard</a>
      </div>
    </div>
  );
} 