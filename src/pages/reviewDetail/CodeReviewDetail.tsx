/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  GitPullRequest,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Loader2,
  GitBranch,
  GitCommit,
  AlertTriangle,
  CheckCircle,
  Zap,
} from "lucide-react";
import { githubApi } from "@/services/api";

// Complete Type Definitions
interface User {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
}

interface Comment {
  id: number;
  user: User;
  body: string;
  created_at: string;
  updated_at: string;
  line?: number;
  path?: string;
  position?: number;
  commit_id?: string;
  in_reply_to_id?: number;
}

interface File {
  sha: string;
  filename: string;
  status: "added" | "modified" | "removed" | "renamed" | "changed";
  additions: number;
  deletions: number;
  changes: number;
  blob_url: string;
  raw_url: string;
  contents_url: string;
  patch?: string;
  previous_filename?: string;
}

interface PullRequest {
  id: number;
  number: number;
  state: "open" | "closed" | "merged";
  locked: boolean;
  title: string;
  user: User;
  body: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  merge_commit_sha: string | null;
  assignee: User | null;
  assignees: User[];
  requested_reviewers: User[];
  labels: Array<{
    id: number;
    name: string;
    color: string;
  }>;
  draft: boolean;
  head: {
    ref: string;
    sha: string;
    user: User;
    repo: {
      id: number;
      name: string;
      full_name: string;
    };
  };
  base: {
    ref: string;
    sha: string;
    user: User;
    repo: {
      id: number;
      name: string;
      full_name: string;
    };
  };
}

interface AnalysisSuggestion {
  type: "quality" | "practice" | "bug" | "performance" | "security";
  content: string;
  confidence: number;
  improvement?: string;
  codeExample?: string;
  severity: "low" | "medium" | "high";
  lineNumbers?: number[];
}

interface ComplexityMetrics {
  lines: number;
  functions: number;
  classes: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  duplicateCodePercentage: number;
}

interface AnalysisResponse {
  aiSuggestions: AnalysisSuggestion[];
  complexity: ComplexityMetrics;
  timestamp: string;
}

interface AnalysisViewProps {
  analysis: AnalysisResponse | null;
  loading: boolean;
}

interface ReviewAction {
  action: "approve" | "request-changes" | "comment";
  body?: string;
}

interface Props {
  owner: string;
  repo: string;
  pullRequest: PullRequest;
}

// Main Component
const CodeReviewDetail: React.FC<Props> = ({ owner, repo, pullRequest }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newComment, setNewComment] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (pullRequest?.number) {
      fetchPullRequestDetails();
    }
  }, [pullRequest, owner, repo]);

  const fetchPullRequestDetails = async () => {
    try {
      setLoading(true);
      const [filesData, commentsData] = await Promise.all([
        githubApi.getPullRequestFiles(owner, repo, pullRequest.number),
        githubApi.getPullRequestComments(owner, repo, pullRequest.number),
      ]);

      setFiles(filesData);
      setComments(commentsData);

      if (filesData.length > 0) {
        setSelectedFile(filesData[0]);
        analyzeCode(filesData[0].patch || "");
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch pull request details",
      });
    } finally {
      setLoading(false);
    }
  };

  const analyzeCode = async (code: string) => {
    if (!code) return;

    try {
      setAnalysisLoading(true);
      const analysisData = await githubApi.analyze(
        code,
        getFileLanguage(selectedFile?.filename || "")
      );
      setAnalysis(analysisData);
    } catch (error) {
      console.log("error", error);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "Could not analyze the code",
      });
    } finally {
      setAnalysisLoading(false);
    }
  };

  const submitComment = async (lineNumber?: number) => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch(
        `/api/github/repos/${owner}/${repo}/pulls/${pullRequest?.number}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            body: newComment,
            path: selectedFile?.filename,
            line: lineNumber,
            commit_id: pullRequest?.head?.sha,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to submit comment");
      }

      const comment = await response.json();
      setComments((prev) => [...prev, comment]);
      setNewComment("");

      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to post comment",
      });
    }
  };

  const getFileLanguage = (filename: string): string => {
    const extension = filename?.split(".").pop()?.toLowerCase() || "";
    const languageMap: Record<string, string> = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      py: "python",
      rb: "ruby",
      java: "java",
      go: "go",
      php: "php",
      cs: "csharp",
      cpp: "cpp",
      c: "c",
      rs: "rust",
      swift: "swift",
      kt: "kotlin",
    };
    return languageMap[extension] || "plaintext";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] p-4">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <GitPullRequest className="h-6 w-6" />
            <div>
              <h1 className="text-xl font-semibold">{pullRequest?.title}</h1>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <GitBranch className="h-4 w-4" />
                <span>{pullRequest?.head?.ref}</span>
                <span>→</span>
                <span>{pullRequest?.base?.ref}</span>
                <GitCommit className="h-4 w-4 ml-2" />
                <span>{pullRequest?.head?.sha.slice(0, 7)}</span>
              </div>
            </div>
          </div>
          <ReviewActions pullRequest={pullRequest} />
        </div>
      </div>

      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={20} minSize={15}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Changed Files</CardTitle>
              <CardDescription>
                {files?.length} files (
                {files?.reduce((acc, file) => acc + file?.additions, 0)}{" "}
                additions,{" "}
                {files?.reduce((acc, file) => acc + file?.deletions, 0)}{" "}
                deletions)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-16rem)]">
                <div className="space-y-2">
                  {files.map((file) => (
                    <Button
                      key={file?.filename}
                      variant={
                        selectedFile?.filename === file?.filename
                          ? "secondary"
                          : "ghost"
                      }
                      className="w-full justify-start text-sm"
                      onClick={() => {
                        setSelectedFile(file);
                        if (file?.patch) {
                          analyzeCode(file?.patch);
                        }
                      }}
                    >
                      <FileStatusBadge status={file?.status} className="mr-2" />
                      <div className="flex flex-col items-start overflow-hidden">
                        <span className="truncate w-full">
                          {file?.filename.split("/").pop()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          +{file?.additions} -{file?.deletions}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={80}>
          <Card className="h-full">
            <CardContent>
              <Tabs defaultValue="diff" className="h-[calc(100vh-20rem)]">
                <TabsList>
                  <TabsTrigger value="diff">Diff View</TabsTrigger>
                  <TabsTrigger value="analysis">
                    Analysis
                    {analysisLoading && (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="conversation">Conversation</TabsTrigger>
                </TabsList>

                <TabsContent value="diff" className="h-full mt-2">
                  <DiffView
                    file={selectedFile}
                    comments={comments}
                    onComment={submitComment}
                    newComment={newComment}
                    setNewComment={setNewComment}
                  />
                </TabsContent>

                <TabsContent value="analysis" className="h-full mt-2">
                  <AnalysisView analysis={analysis} loading={analysisLoading} />
                </TabsContent>

                <TabsContent value="conversation" className="h-full mt-2">
                  <ConversationView
                    comments={comments}
                    onComment={(body) => submitComment(undefined)}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

// Subcomponents
interface FileStatusBadgeProps {
  status: File["status"];
  className?: string;
}

const FileStatusBadge: React.FC<FileStatusBadgeProps> = ({
  status,
  className,
}) => {
  const variants: Record<
    File["status"],
    {
      variant: "default" | "destructive" | "outline" | "secondary";
      label: string;
    }
  > = {
    added: { variant: "secondary", label: "Added" },
    modified: { variant: "outline", label: "Modified" },
    removed: { variant: "destructive", label: "Removed" },
    renamed: { variant: "outline", label: "Renamed" },
    changed: { variant: "outline", label: "Changed" },
  };

  const badgeInfo = variants[status];

  return (
    <Badge variant={badgeInfo?.variant} className={className}>
      {badgeInfo?.label}
    </Badge>
  );
};

interface DiffViewProps {
  file: {
    patch?: string;
    filename?: string;
  } | null;
  comments: Array<{
    id: number;
    path?: string;
    user: {
      login: string;
      avatar_url: string;
    };
    created_at: string;
    body: string;
  }>;
  onComment: (lineNumber?: number) => Promise<void>;
  newComment: string;
  setNewComment: (comment: string) => void;
}

const DiffView: React.FC<DiffViewProps> = ({
  file,
  comments,
  onComment,
  newComment,
  setNewComment,
}) => {
  if (!file) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a file to view changes
      </div>
    );
  }

  const renderDiffLine = (line: string) => {
    if (line.startsWith("+")) {
      return (
        <div className="bg-green-950/10 text-green-900 dark:bg-green-950/30 dark:text-green-400 w-full">
          {line}
        </div>
      );
    } else if (line.startsWith("-")) {
      return (
        <div className="bg-red-950/10 text-red-900 dark:bg-red-950/30 dark:text-red-400 w-full">
          {line}
        </div>
      );
    } else if (line.startsWith("@@ ")) {
      return (
        <div className="bg-blue-950/10 text-blue-900 dark:bg-blue-950/30 dark:text-blue-400 w-full">
          {line}
        </div>
      );
    }
    return <div>{line}</div>;
  };

  const diffLines = file.patch?.split("\n") || [];

  return (
    <ScrollArea className="h-full w-full rounded-md border">
      <div className="p-4 space-y-4">
        <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
          {diffLines.map((line, index) => (
            <React.Fragment key={index}>{renderDiffLine(line)}</React.Fragment>
          ))}
        </pre>

        {comments
          .filter((comment) => comment?.path === file?.filename)
          .map((comment) => (
            <Card key={comment?.id} className="ml-4">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <img
                    src={comment?.user?.avatar_url}
                    alt={comment?.user?.login}
                    className="h-6 w-6 rounded-full"
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {comment?.user?.login}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(comment?.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{comment?.body}</p>
              </CardContent>
            </Card>
          ))}

        <Card>
          <CardContent className="pt-4">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e?.target?.value)}
              placeholder="Add a comment..."
              className="min-h-[100px]"
            />
            <div className="mt-2 flex justify-end">
              <Button
                onClick={() => onComment(undefined)}
                disabled={!newComment?.trim()}
              >
                Submit Comment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};

const AnalysisView: React.FC<AnalysisViewProps> = ({ analysis, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a file to view analysis
      </div>
    );
  }

  const getSeverityColor = (severity: AnalysisSuggestion["severity"]) => {
    switch (severity) {
      case "high":
        return "text-red-500";
      case "medium":
        return "text-orange-500";
      case "low":
        return "text-yellow-500";
    }
  };

  const getSeverityIcon = (severity: AnalysisSuggestion["severity"]) => {
    switch (severity) {
      case "high":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "medium":
        return <Zap className="h-5 w-5 text-orange-500" />;
      case "low":
        return <CheckCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getComplexityStatus = (metric: string, value: number) => {
    const thresholds = {
      cyclomaticComplexity: { warning: 10, critical: 20 },
      maintainabilityIndex: { warning: 65, critical: 50 },
      functions: { warning: 10, critical: 20 },
      classes: { warning: 5, critical: 10 },
      lines: { warning: 300, critical: 500 },
      duplicateCodePercentage: { warning: 10, critical: 20 },
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return "normal";

    if (value >= threshold.critical)
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    if (value >= threshold.warning)
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Code Metrics
              <Badge variant="outline">
                {new Date(analysis.timestamp).toLocaleString()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(analysis.complexity).map(([metric, value]) => (
                <div
                  key={metric}
                  className={`p-4 rounded-lg ${getComplexityStatus(
                    metric,
                    value
                  )}`}
                >
                  <p className="text-sm font-medium capitalize">
                    {metric.replace(/([A-Z])/g, " $1")}
                  </p>
                  <p className="text-2xl font-bold">
                    {metric.includes("Percentage")
                      ? `${value.toFixed(1)}%`
                      : value}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analysis Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysis.aiSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {getSeverityIcon(suggestion.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium capitalize">
                          {suggestion.type}
                        </span>
                        <Badge
                          variant="outline"
                          className={getSeverityColor(suggestion.severity)}
                        >
                          {suggestion.severity} severity
                        </Badge>
                        <Badge variant="outline">
                          {(suggestion.confidence * 100).toFixed(0)}% confidence
                        </Badge>
                      </div>
                      <p className="text-sm mb-2">{suggestion.content}</p>
                      {suggestion.improvement && (
                        <div className="mt-2 p-3 rounded bg-muted">
                          <p className="text-sm font-medium mb-1">
                            Suggested Improvement:
                          </p>
                          <p className="text-sm">{suggestion.improvement}</p>
                        </div>
                      )}
                      {suggestion.codeExample && (
                        <pre className="mt-2 p-3 rounded bg-muted overflow-x-auto">
                          <code className="text-sm">
                            {suggestion.codeExample}
                          </code>
                        </pre>
                      )}
                      {suggestion.lineNumbers && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Affected lines: {suggestion.lineNumbers.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};

interface ConversationViewProps {
  comments: Comment[];
  onComment: (body: string) => Promise<void>;
}

const ConversationView: React.FC<ConversationViewProps> = ({
  comments,
  onComment,
}) => {
  const [newComment, setNewComment] = useState("");

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        {comments
          .filter((comment) => !comment?.line && !comment?.path)
          .map((comment) => (
            <Card key={comment?.id}>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <img
                    src={comment?.user?.avatar_url}
                    alt={comment?.user?.login}
                    className="h-8 w-8 rounded-full"
                  />
                  <div>
                    <p className="font-medium">{comment?.user?.login}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(comment?.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p>{comment?.body}</p>
              </CardContent>
            </Card>
          ))}

        <Card>
          <CardContent className="pt-4">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e?.target?.value)}
              placeholder="Add to the conversation..."
              className="min-h-[100px]"
            />
            <div className="mt-2 flex justify-end">
              <Button
                onClick={async () => {
                  if (newComment?.trim()) {
                    await onComment(newComment);
                    setNewComment("");
                  }
                }}
                disabled={!newComment?.trim()}
              >
                Submit
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};

interface ReviewActionsProps {
  pullRequest: PullRequest;
}

const ReviewActions: React.FC<ReviewActionsProps> = ({ pullRequest }) => {
  const { toast } = useToast();

  const submitReview = async (action: ReviewAction["action"]) => {
    try {
      const response = await fetch(
        `/api/github/repos/${pullRequest?.base?.repo?.owner?.login}/${pullRequest?.base?.repo?.name}/pulls/${pullRequest?.number}/reviews`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ event: action }),
        }
      );

      if (!response.ok) throw new Error("Failed to submit review");

      toast({
        title: "Review submitted",
        description: `Review ${action} successfully`,
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit review",
      });
    }
  };

  return (
    <div className="flex gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" onClick={() => submitReview("approve")}>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Approve</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              onClick={() => submitReview("request-changes")}
            >
              <XCircle className="h-4 w-4 text-red-500" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Request Changes</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" onClick={() => submitReview("comment")}>
              <MessageSquare className="h-4 w-4 text-blue-500" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Comment</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default CodeReviewDetail;
