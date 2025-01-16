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

interface CodeAnalysis {
  suggestions: Array<{
    type: "improvement" | "warning" | "error";
    message: string;
    line?: number;
    severity: "low" | "medium" | "high";
  }>;
  quality_score: number;
  potential_issues: Array<{
    type: string;
    description: string;
    location?: {
      line: number;
      column: number;
    };
    severity: "low" | "medium" | "high";
  }>;
  metrics: {
    complexity: number;
    maintainability: number;
    duplication: number;
    testCoverage?: number;
  };
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
  const [analysis, setAnalysis] = useState<CodeAnalysis | null>(null);
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
      const response = await fetch("/api/analysis/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          language: getFileLanguage(selectedFile?.filename || ""),
        }),
      });

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const analysisData = await response.json();
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
  file: File | null;
  comments: Comment[];
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

  return (
    <ScrollArea className="h-full w-full rounded-md border">
      <div className="p-4 space-y-4">
        <pre className="whitespace-pre-wrap font-mono text-sm">
          {file?.patch || "No changes"}
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

interface AnalysisViewProps {
  analysis: CodeAnalysis | null;
  loading: boolean;
}

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

  const getSeverityColor = (severity: "low" | "medium" | "high") => {
    const colors = {
      low: "text-yellow-500",
      medium: "text-orange-500",
      high: "text-red-500",
    };
    return colors[severity];
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle>Code Quality Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Quality Score</p>
                <p className="text-2xl font-bold">
                  {analysis?.quality_score}/100
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Complexity</p>
                <p className="text-2xl font-bold">
                  {analysis?.metrics?.complexity}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Maintainability</p>
                <p className="text-2xl font-bold">
                  {analysis?.metrics?.maintainability}/100
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duplication</p>
                <p className="text-2xl font-bold">
                  {analysis?.metrics?.duplication}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analysis?.suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={`p-2 rounded-md border ${getSeverityColor(
                    suggestion?.severity
                  )}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{suggestion?.type}</span>
                    {suggestion?.line && (
                      <span className="text-sm text-muted-foreground">
                        Line {suggestion?.line}
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-1">{suggestion?.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Potential Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analysis?.potential_issues.map((issue, index) => (
                <div
                  key={index}
                  className={`p-2 rounded-md border ${getSeverityColor(
                    issue?.severity
                  )}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{issue?.type}</span>
                    {issue?.location && (
                      <span className="text-sm text-muted-foreground">
                        Line {issue?.location?.line}, Column{" "}
                        {issue?.location?.column}
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-1">{issue?.description}</p>
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
