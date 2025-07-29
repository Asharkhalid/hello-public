"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { 
  ClockArrowUpIcon, 
  LoaderIcon, 
  CircleCheckIcon, 
  CircleXIcon 
} from "lucide-react";

import "./meeting-cover.css";

interface MeetingCoverProps {
  meetingName: string;
  agentName: string;
  status: "upcoming" | "active" | "completed" | "processing" | "cancelled" | "failed";
  startedAt?: Date | null;
  size?: "small" | "large";
  className?: string;
}

const statusConfig = {
  upcoming: {
    icon: ClockArrowUpIcon,
    color: "bg-yellow-500/20 text-yellow-800 border-yellow-500/30",
    bgColor: "from-yellow-100 to-yellow-200",
  },
  active: {
    icon: LoaderIcon,
    color: "bg-blue-500/20 text-blue-800 border-blue-500/30",
    bgColor: "from-blue-100 to-blue-200",
  },
  completed: {
    icon: CircleCheckIcon,
    color: "bg-emerald-500/20 text-emerald-800 border-emerald-500/30",
    bgColor: "from-emerald-100 to-emerald-200",
  },
  processing: {
    icon: LoaderIcon,
    color: "bg-gray-500/20 text-gray-800 border-gray-500/30",
    bgColor: "from-gray-100 to-gray-200",
  },
  cancelled: {
    icon: CircleXIcon,
    color: "bg-red-500/20 text-red-800 border-red-500/30",
    bgColor: "from-red-100 to-red-200",
  },
  failed: {
    icon: CircleXIcon,
    color: "bg-red-500/20 text-red-800 border-red-500/30",
    bgColor: "from-red-100 to-red-200",
  },
};

export const MeetingCover = ({
  meetingName,
  agentName,
  status,
  startedAt,
  size = "small",
  className,
}: MeetingCoverProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;
  const isLarge = size === "large";

  return (
    <div className={cn(
      "meeting-book-item group",
      isLarge && "large",
      className
    )}>
      {/* Glow effect */}
      <div className="meeting-book-glow" />
      
      {/* 3D Book structure */}
      <div className="meeting-book-cover">
        {/* Book inside pages */}
        <div className="meeting-book-inside" />
        
        {/* Main book content */}
        <div className={cn(
          "meeting-book-content bg-gradient-to-br flex flex-col justify-between p-3",
          config.bgColor
        )}>
          {/* Status badge */}
          <div className="flex justify-center">
            <Badge
              variant="outline"
              className={cn(
                "text-xs px-2 py-1 flex items-center gap-1",
                config.color
              )}
            >
              <Icon className={cn(
                "w-3 h-3",
                status === "processing" && "animate-spin"
              )} />
              {status}
            </Badge>
          </div>

          {/* Meeting info */}
          <div className="flex-1 flex flex-col justify-center text-center space-y-2">
            <h3
              className={cn(
                "font-semibold text-gray-800 leading-tight",
                isLarge ? "text-sm" : "text-xs"
              )}
            >
              {meetingName}
            </h3>
            
            <p
              className={cn(
                "text-gray-600 font-medium",
                isLarge ? "text-xs" : "text-[10px]"
              )}
            >
              with {agentName}
            </p>

            {startedAt && (
              <p
                className={cn(
                  "text-gray-500",
                  isLarge ? "text-xs" : "text-[10px]"
                )}
              >
                {format(startedAt, "MMM d, yyyy")}
              </p>
            )}
          </div>

          {/* Bottom decorative element */}
          <div className="h-1 bg-gray-300/50 rounded-full"></div>
          
          {/* Light reflection effect */}
          <div className="meeting-book-light" />
        </div>
      </div>
    </div>
  );
};