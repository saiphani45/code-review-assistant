/* eslint-disable @typescript-eslint/no-explicit-any */
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const GitHubLogin = () => {
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/";

  const handleLogin = () => {
    const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const REDIRECT_URI = import.meta.env.VITE_GITHUB_REDIRECT_URI;

    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&scope=repo user`;

    // Store the redirect path
    localStorage.setItem("redirectPath", from);

    window.location.href = githubUrl;
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-center mb-8">
          Code Review Assistant
        </h1>
        <Button onClick={handleLogin} className="w-full">
          Login with GitHub
        </Button>
      </div>
    </div>
  );
};

export default GitHubLogin;
