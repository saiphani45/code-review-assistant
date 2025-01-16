import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  GitPullRequest,
  Lock,
  Unlock,
  Search,
  Loader2,
  BarChart3,
  Users,
  Activity,
  GitFork,
  BookOpen,
  Bot,
  Command,
  Frame,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  GalleryVerticalEnd,
} from "lucide-react";
import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { githubApi } from "@/services/api";

// Sample data for sidebar navigation
const sidebarData = {
  user: {
    name: "John Doe",
    email: "john@example.com",
    avatar: "/avatars/user.jpg",
  },
  teams: [
    {
      name: "GitHub Team",
      logo: GitFork,
      plan: "Enterprise",
    },
    {
      name: "Dev Team",
      logo: Command,
      plan: "Pro",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: BarChart3,
      isActive: true,
      items: [
        {
          title: "Overview",
          url: "#",
        },
        {
          title: "Analytics",
          url: "#",
        },
      ],
    },
    {
      title: "Repository",
      url: "#",
      icon: GitFork,
      items: [
        {
          title: "All Repos",
          url: "#",
        },
        {
          title: "Settings",
          url: "#",
        },
      ],
    },
    {
      title: "Documentation",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Guides",
          url: "#",
        },
        {
          title: "API",
          url: "#",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Frontend",
      url: "#",
      icon: Frame,
    },
    {
      name: "Backend",
      url: "#",
      icon: Command,
    },
    {
      name: "Mobile",
      url: "#",
      icon: Map,
    },
  ],
};

const AppSidebar = ({ ...props }) => {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarData.navMain} />
        <NavProjects projects={sidebarData.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [repositories, setRepositories] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [pullRequests, setPullRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prLoading, setPrLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async () => {
    try {
      setLoading(true);
      const data = await githubApi.getRepos();
      const sortedRepos = Array.isArray(data)
        ? data.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        : [];
      setRepositories(sortedRepos);
    } catch (error) {
      console.error("Error fetching repositories:", error);
      setRepositories([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPullRequests = async (repo) => {
    try {
      setPrLoading(true);
      setSelectedRepo(repo);
      setPullRequests([]);
      const data = await githubApi.getPullRequests(repo.owner.login, repo.name);
      setPullRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching pull requests:", error);
      setPullRequests([]);
    } finally {
      setPrLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateString));
  };

  if (loading && !repositories.length) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#">Dashboard</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>
                      {selectedRepo ? selectedRepo.name : "Repositories"}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Repositories
                  </CardTitle>
                  <GitFork className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {repositories.length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Open Pull Requests
                  </CardTitle>
                  <GitPullRequest className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {pullRequests.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedRepo
                      ? `In ${selectedRepo.name}`
                      : "Select a repository"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Active Contributors
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Set(pullRequests.map((pr) => pr.user.login)).size}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Unique contributors
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Activity Rate
                  </CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {selectedRepo?.open_issues_count || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Open issues and PRs
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Repositories</CardTitle>
                  <CardDescription>
                    Select a repository to review pull requests
                  </CardDescription>
                  <div className="relative">
                    <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search repositories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[50vh]">
                    <div className="space-y-2">
                      {repositories
                        .filter((repo) =>
                          repo.name
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase())
                        )
                        .map((repo) => (
                          <Button
                            key={repo.id}
                            variant={
                              selectedRepo?.id === repo.id
                                ? "secondary"
                                : "ghost"
                            }
                            className="w-full justify-start text-left gap-2"
                            onClick={() => fetchPullRequests(repo)}
                          >
                            {repo.private ? (
                              <Lock className="h-4 w-4 flex-shrink-0" />
                            ) : (
                              <Unlock className="h-4 w-4 flex-shrink-0" />
                            )}
                            <div className="flex flex-col items-start flex-1 overflow-hidden">
                              <span className="font-medium truncate w-full">
                                {repo.name}
                              </span>
                              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                {repo.language && (
                                  <span className="flex items-center">
                                    <span className="w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
                                    {repo.language}
                                  </span>
                                )}
                                <span>{repo.open_issues_count} issues</span>
                                <span>
                                  Updated {formatDate(repo.updated_at)}
                                </span>
                              </div>
                              {repo.description && (
                                <span className="text-xs text-muted-foreground truncate w-full">
                                  {repo.description}
                                </span>
                              )}
                            </div>
                          </Button>
                        ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Pull Requests</CardTitle>
                  <CardDescription>
                    {selectedRepo
                      ? `Pull requests for ${selectedRepo.name}`
                      : "Select a repository to view pull requests"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[50vh]">
                    <div className="space-y-2">
                      {prLoading ? (
                        <div className="flex justify-center p-4">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : pullRequests.length === 0 && selectedRepo ? (
                        <div className="text-center text-muted-foreground p-4">
                          No pull requests found
                        </div>
                      ) : (
                        pullRequests.map((pr) => (
                          <Button
                            key={pr.id}
                            variant="outline"
                            className="w-full justify-start p-4"
                            onClick={() =>
                              navigate(
                                `/${selectedRepo.owner.login}/${selectedRepo.name}/pull/${pr.number}`
                              )
                            }
                          >
                            <GitPullRequest className="mr-2 h-4 w-4 flex-shrink-0" />
                            <div className="flex flex-col items-start flex-1 min-w-0">
                              <span className="font-medium truncate w-full">
                                {pr.title}
                              </span>
                              <div className="flex items-center text-xs text-muted-foreground space-x-2 w-full overflow-hidden">
                                <img
                                  src={pr.user.avatar_url}
                                  alt={pr.user.login}
                                  className="h-4 w-4 rounded-full"
                                />
                                <span className="truncate">
                                  {pr.user.login}
                                </span>
                                <span className="flex-shrink-0">•</span>
                                <span className="flex-shrink-0">
                                  #{pr.number}
                                </span>
                                <span className="flex-shrink-0">•</span>
                                <span className="flex-shrink-0">
                                  {formatDate(pr.created_at)}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {pr.head.ref} → {pr.base.ref}
                              </div>
                            </div>
                          </Button>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
};

export default Dashboard;
