import React from "react";
import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Eye, Heart, Share2, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });

  if (isLoading || !summary) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Followers",
      value: summary.totalFollowers.toLocaleString(),
      icon: Users,
      description: "Across all platforms",
    },
    {
      title: "Total Views",
      value: summary.totalViews.toLocaleString(),
      icon: Eye,
      description: "Lifetime video views",
    },
    {
      title: "Total Engagements",
      value: summary.totalEngagements.toLocaleString(),
      icon: Heart,
      description: "Likes, comments, and shares",
    },
    {
      title: "Avg Engagement Rate",
      value: `${summary.averageEngagementRate.toFixed(2)}%`,
      icon: Activity,
      description: "Aggregated performance",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {summary.platformBreakdown.map((platform) => (
          <Card key={platform.platform} className="overflow-hidden">
            <div className={`h-2 w-full ${
              platform.platform === 'youtube' ? 'bg-[#FF0000]' :
              platform.platform === 'instagram' ? 'bg-[#E1306C]' : 'bg-[#1877F2]'
            }`} />
            <CardHeader>
              <CardTitle className="capitalize">{platform.platform}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center border-b border-border pb-2">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className={`text-sm font-medium ${platform.connected ? 'text-green-600' : 'text-red-500'}`}>
                  {platform.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-2">
                <span className="text-sm text-muted-foreground">Followers</span>
                <span className="text-sm font-medium">{platform.followers.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-2">
                <span className="text-sm text-muted-foreground">Content</span>
                <span className="text-sm font-medium">{platform.content.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Engagement Rate</span>
                <span className="text-sm font-medium">{platform.engagementRate.toFixed(2)}%</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
