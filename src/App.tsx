import { Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import GitHubLogin from "./pages/login/Login";
import GitHubCallback from "./pages/login/GithubCallback";
import CodeReviewWrapper from "./pages/reviewDetail/CodeReviewWrapper";
import Dashboard from "./pages/dashboard/Dashboard";

import "@/styles/globals.css";

const App = () => {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <main className="min-h-screen bg-background">
        <Routes>
          <Route path="/login" element={<GitHubLogin />} />
          <Route path="/github/callback" element={<GitHubCallback />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route
            path="/:owner/:repo/pull/:pullNumber"
            element={<CodeReviewWrapper />}
          />
        </Routes>
        <Toaster />
      </main>
    </ThemeProvider>
  );
};

export default App;
