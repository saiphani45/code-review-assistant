import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const GitHubCallback = () => {
  const navigate = useNavigate();
  const hasCalledApi = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      // If we've already made the API call, don't do it again
      if (hasCalledApi.current) {
        return;
      }

      const code = new URLSearchParams(window.location.search).get("code");
      if (!code) {
        navigate("/login");
        return;
      }

      try {
        // Mark that we're making the API call
        hasCalledApi.current = true;

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/auth/github`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ code }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        localStorage.setItem("token", data.token);
        navigate("/dashboard");
      } catch (err) {
        console.error("Authentication error:", err);
        navigate("/login");
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p>Completing login...</p>
      </div>
    </div>
  );
};

export default GitHubCallback;
