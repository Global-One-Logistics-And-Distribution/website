import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    const isChunkLoadError = 
      error?.message?.includes("Failed to fetch dynamically imported module") || 
      error?.message?.includes("Importing a module script failed");
      
    if (isChunkLoadError) {
      const lastReload = sessionStorage.getItem("vite-chunk-reload");
      const now = Date.now();
      // Only reload if we haven't reloaded in the last 10 seconds to prevent infinite loops
      if (!lastReload || now - parseInt(lastReload) > 10000) {
        sessionStorage.setItem("vite-chunk-reload", now.toString());
        window.location.reload();
        return { hasError: true, reloading: true };
      }
    }
    return { hasError: true, reloading: false };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false });
    window.location.href = "/";
  };

  render() {
    if (this.state.reloading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 p-8">
          <div className="text-center text-slate-500">Updating application...</div>
        </div>
      );
    }
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 p-8">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold mb-2 text-slate-900 dark:text-slate-100">
              Something went wrong
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={this.handleReset}
              className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
            >
              Go to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
