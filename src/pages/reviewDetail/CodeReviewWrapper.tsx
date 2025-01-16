import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CodeReviewDetail from "./CodeReviewDetail";
import { Loader2 } from "lucide-react";
import { githubApi } from "@/services/api";

// This wrapper component handles fetching the pull request data
const CodeReviewWrapper = () => {
  const { owner, repo, pullNumber } = useParams();
  const [pullRequest, setPullRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPullRequest = async () => {
      if (!owner || !repo || !pullNumber) {
        setError("Missing required parameters");
        setLoading(false);
        return;
      }

      try {
        const data = await githubApi.getPullRequest(
          owner,
          repo,
          Number(pullNumber)
        );
        setPullRequest(data);
      } catch (err) {
        console.error("Error fetching pull request:", err);
        setError("Failed to fetch pull request details");
      } finally {
        setLoading(false);
      }
    };

    fetchPullRequest();
  }, [owner, repo, pullNumber]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !pullRequest) {
    return (
      <div className="flex items-center justify-center h-screen text-red-500">
        {error || "Failed to load pull request"}
      </div>
    );
  }

  return (
    <CodeReviewDetail owner={owner!} repo={repo!} pullRequest={pullRequest} />
  );
};

export default CodeReviewWrapper;
