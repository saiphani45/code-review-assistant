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
import { useToast } from "@/hooks/use-toast";
import {
  GitPullRequest,
  MessageSquare,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// Types
interface User {
  login: string;
  avatar_url: string;
}

interface Comment {
  id: number;
  user: User;
  body: string;
  created_at: string;
  line?: number;
  path?: string;
}

interface File {
  filename: string;
  status: "added" | "modified" | "removed";
  patch?: string;
  contents_url: string;
}

interface PullRequest {
  number: number;
  title: string;
  user: User;
  body: string;
  state: string;
}

interface ReviewAction {
  action: "approve" | "request-changes" | "comment";
  body?: string;
}

interface Props {
  pullRequest: PullRequest;
}

// Main Component
const CodeReviewDetail: React.FC<Props> = ({ pullRequest }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (pullRequest?.number) {
      fetchPullRequestDetails();
    }
  }, [pullRequest]);

  const fetchPullRequestDetails = async () => {
    try {
      setLoading(true);
      const [filesRes, commentsRes] = await Promise.all([
        fetch(`/api/github/pulls/${pullRequest.number}/files`),
        fetch(`/api/github/pulls/${pullRequest.number}/comments`),
      ]);

      const [filesData, commentsData] = await Promise.all([
        filesRes.json() as Promise<File[]>,
        commentsRes.json() as Promise<Comment[]>,
      ]);

      setFiles(filesData);
      setComments(commentsData);
      if (filesData.length > 0) {
        setSelectedFile(filesData[0]);
      }
    } catch (error) {
      console.log(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch pull request details",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] p-4">
      <ResizablePanelGroup direction="horizontal">
        {/* File Tree Panel */}
        <ResizablePanel defaultSize={20} minSize={15}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Changed Files</CardTitle>
              <CardDescription>{files.length} files changed</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-12rem)]">
                <div className="space-y-2">
                  {files.map((file) => (
                    <Button
                      key={file.filename}
                      variant={
                        selectedFile?.filename === file.filename
                          ? "secondary"
                          : "ghost"
                      }
                      className="w-full justify-start text-sm"
                      onClick={() => setSelectedFile(file)}
                    >
                      <FileStatusBadge status={file.status} className="mr-2" />
                      <span className="truncate">
                        {file.filename.split("/").pop()}
                      </span>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </ResizablePanel>

        <ResizableHandle />

        {/* Main Content Panel */}
        <ResizablePanel defaultSize={80}>
          <Card className="h-full">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <GitPullRequest className="h-5 w-5" />
                  {selectedFile?.filename}
                </CardTitle>
                <ReviewActions pullRequest={pullRequest} />
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="diff" className="h-[calc(100vh-16rem)]">
                <TabsList>
                  <TabsTrigger value="diff">Diff View</TabsTrigger>
                  <TabsTrigger value="suggestions">AI Suggestions</TabsTrigger>
                  <TabsTrigger value="discussion">Discussion</TabsTrigger>
                </TabsList>

                <TabsContent value="diff" className="h-full mt-2">
                  <DiffView
                    file={selectedFile}
                    comments={comments.filter(
                      (c) => c.path === selectedFile?.filename
                    )}
                  />
                </TabsContent>

                <TabsContent value="suggestions" className="h-full mt-2">
                  <AISuggestions file={selectedFile} />
                </TabsContent>

                <TabsContent value="discussion" className="h-full mt-2">
                  <Discussion comments={comments} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

// Sub-components
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
  };

  const badgeInfo = variants[status];

  return (
    <Badge variant={badgeInfo.variant} className={className}>
      {badgeInfo.label}
    </Badge>
  );
};

interface DiffViewProps {
  file: File | null;
  comments: Comment[];
}

const DiffView: React.FC<DiffViewProps> = ({ file, comments }) => {
  if (!file) return null;

  return (
    <ScrollArea className="h-full w-full rounded-md border">
      <div className="p-4 space-y-4">
        <pre className="whitespace-pre-wrap font-mono text-sm">
          {file.patch || "No changes"}
        </pre>
        {comments.map((comment) => (
          <Card key={comment.id} className="ml-4">
            <CardHeader>
              <CardTitle className="text-sm">{comment.user.login}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{comment.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};

interface AISuggestionsProps {
  file: File | null;
}

const AISuggestions: React.FC<AISuggestionsProps> = ({ file }) => {
  if (!file) return null;

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle>AI Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p>AI suggestions will appear here</p>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};

interface DiscussionProps {
  comments: Comment[];
}

const Discussion: React.FC<DiscussionProps> = ({ comments }) => {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        {comments.map((comment) => (
          <Card key={comment.id}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <img
                  src={comment.user.avatar_url}
                  alt={comment.user.login}
                  className="h-8 w-8 rounded-full"
                />
                <div>
                  <CardTitle className="text-sm">
                    {comment.user.login}
                  </CardTitle>
                  <CardDescription>
                    {new Date(comment.created_at).toLocaleString()}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>{comment.body}</CardContent>
          </Card>
        ))}
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
        `/api/github/pulls/${pullRequest.number}/reviews`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        }
      );

      if (!response.ok) throw new Error("Failed to submit review");

      toast({
        title: "Review submitted",
        description: `Review ${action} successfully`,
      });
    } catch (error) {
      console.log(error);
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
