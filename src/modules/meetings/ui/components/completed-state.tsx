import Link from "next/link";
import {
  SparklesIcon,
  FileTextIcon,
  BookOpenTextIcon,
  ClockFadingIcon,
} from "lucide-react";
import { format } from "date-fns";

import { GeneratedAvatar } from "@/components/generated-avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { MeetingGetOne } from "../../types";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";
import { Transcript } from "./transcript";
import { MeetingSummary } from "./meeting-summary";

interface Props {
  data: MeetingGetOne;
}

export const CompletedState = ({ data }: Props) => {
  return (
    <div className="flex flex-col gap-y-4">
      <Tabs defaultValue="summary">
        <div className="bg-card rounded-lg border px-3">
          <ScrollArea>
             <TabsList className="p-0 bg-card justify-start rounded-none h-13">
                <TabsTrigger
                  value="summary"
                  className="text-muted-foreground rounded-none bg-card data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-b-primary data-[state=active]:text-card-foreground h-full hover:text-card-foreground"
                >
                  <BookOpenTextIcon />
                  Summary
                </TabsTrigger>
                <TabsTrigger
                  value="transcript"
                  className="text-muted-foreground rounded-none bg-card data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-b-primary data-[state=active]:text-card-foreground h-full hover:text-card-foreground"
                >
                  <FileTextIcon />
                  Transcript
                </TabsTrigger>
             </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
        <TabsContent value="transcript">
          <Transcript meetingId={data.id} />
        </TabsContent>
        <TabsContent value="summary">
          <div className="bg-card rounded-lg border">
            <div className="px-4 py-5 gap-y-5 flex flex-col col-span-5">
              <h2 className="text-2xl font-medium capitalize text-card-foreground">{data.name}</h2>
              <div className="flex gap-x-2 items-center">
                <Link
                  href={`/agents/${data.agent.id}`}
                  className="flex items-center gap-x-2 underline underline-offset-4 capitalize"
                >
                  <GeneratedAvatar
                    variant="botttsNeutral"
                    seed={data.agent.name}
                    className="size-5"
                  />
                  {data.agent.name}
                </Link>{" "}
                <p>{data.startedAt ? format(data.startedAt, "PPP") : ""}</p>
              </div>
              <div className="flex gap-x-2 items-center">
                <SparklesIcon className="size-4" />
                <p>General summary</p>
              </div>
              <Badge
                variant="outline"
                className="flex items-center gap-x-2 [&>svg]:size-4"
              >
                <ClockFadingIcon className="text-blue-700" />
                {data.duration ? formatDuration(data.duration) : "No duration"}
              </Badge>
              <MeetingSummary summary={data.summary || ""} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
