import Link from "next/link"
import { headers } from "next/headers"
// import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
import { AgentCover } from "@/modules/agents/ui/components/agent-cover"
import { MeetingCover } from "@/modules/meetings/ui/components/meeting-cover"
import { caller } from "@/trpc/server"
import { auth } from "@/lib/auth"
import { Navbar } from "@/components/navbar"
import Aurora from "@/components/aurora"

import "@/modules/agents/ui/components/agent-cover.css"
import "@/modules/meetings/ui/components/meeting-cover.css"
import { MarketingCollateral } from "@/modules/agents/types"

export default async function LandingPage() {
  // Check authentication
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Get blueprints for non-authenticated users
  const { items: agentBlueprints } = await caller.agentBlueprints.getMany({})
  const sampleAgents = agentBlueprints.slice(0, 3)
  const noteworthyAgents = agentBlueprints.slice(3, 8)

  // Get meetings for authenticated users
  let userMeetings = null;
  if (session?.user) {
    try {
      userMeetings = await caller.meetings.getMany({ 
        page: 1, 
        pageSize: 20,
        // Get all meetings to show in horizontal scroll
      });
    } catch (error) {
      console.error("Failed to fetch user meetings:", error);
    }
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Aurora Background */}
      <div className="fixed inset-0 z-0">
        <Aurora
          colorStops={["#c96442", "#e9e6dc", "#faf9f5"]}
          blend={0.4}
          amplitude={0.6}
          speed={0.4}
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        <Navbar />
        <div className="flex justify-center items-center px-4 md:px-6 lg:px-8">
          <div className="w-full max-w-4xl bg-card/80 backdrop-blur-sm rounded-3xl shadow-lg overflow-hidden">
        <main className="pb-8">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 mb-6 md:mb-10">
              <div className="flex flex-col justify-center">
                <h2 className="font-serif text-3xl lg:text-4xl xl:text-5xl font-normal text-card-foreground mb-5 pt-8 md:pt-12">
                  Unlock your potential through conversations with books
                </h2>
                <p className="text-muted-foreground mb-8 font-medium text-base lg:text-lg">
                  Elevate your skills and accelerate your growth by having direct conversations with the world&apos;s greatest minds through their books.
                </p>
                {/* <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search books on leadership, strategy..."
                    className="pl-10 pr-4 py-2.5 bg-muted border-0 rounded-full text-foreground text-sm"
                  />
                </div> */}
              </div>
              <div className="flex flex-col justify-center items-center md:items-end min-h-[250px]">
                <div className="relative w-full max-w-md lg:max-w-lg">
                  <div className="flex justify-center md:justify-end space-x-4 items-end mb-2 relative z-10">
                    {sampleAgents.map((blueprint) => (
                      <Link
                        href={`/agent/${blueprint.id}`}
                        key={blueprint.id}
                      >
                        <div className="w-[130px] h-[195px]">
                          <AgentCover
                            imageUrl={
                              (
                                blueprint.marketingCollateral as MarketingCollateral
                              )?.imageUrl ?? ""
                            }
                          />
                        </div>
                      </Link>
                    ))}
                  </div>
                  <div className="h-4 md:h-5 bg-muted rounded-sm shadow-[0_4px_8px_rgba(0,0,0,0.2),_inset_0_1px_2px_rgba(255,255,255,0.3)] w-full"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="px-6">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-2xl font-serif font-normal text-card-foreground">
                {session?.user ? "Your Learning Journey" : "Noteworthy"}
              </h2>
              {session?.user && userMeetings && userMeetings.items.length > 0 ? (
                <Link href="/meetings">
                  <Button variant="ghost" size="sm" className="text-sm">
                    View All →
                  </Button>
                </Link>
              ) : null}
            </div>

            {/* Authenticated User - Show Meetings */}
            {session?.user ? (
              userMeetings && userMeetings.items.length > 0 ? (
                <div className="relative">
                  <div className="flex overflow-x-auto gap-x-4 pb-4 scrollbar-hide">
                    <div className="flex gap-x-4 min-w-max">
                      {userMeetings.items.map((meeting) => (
                        <Link
                          key={meeting.id}
                          href={`/meetings/${meeting.id}`}
                          className="flex-shrink-0"
                        >
                          <div className="flex flex-col items-center text-center">
                            <div className="mb-2">
                              <MeetingCover
                                meetingName={meeting.name}
                                agentName={meeting.agent.name}
                                status={meeting.status}
                                startedAt={meeting.startedAt || null}
                              />
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full text-accent-foreground hover:bg-primary hover:text-primary-foreground font-medium text-[10px] sm:text-xs px-3 py-1 h-auto"
                            >
                              {meeting.status === "upcoming" ? "Start" : 
                               meeting.status === "completed" ? "Review" : 
                               meeting.status === "active" ? "Join" : "View"}
                            </Button>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                  {/* Scroll gradient hints */}
                  <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-card/80 to-transparent pointer-events-none" />
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    You haven&apos;t started any conversations yet.
                  </p>
                  <Link href="/agents">
                    <Button>
                      Browse Learning Programs
                    </Button>
                  </Link>
                </div>
              )
            ) : (
              /* Non-authenticated users - Show Noteworthy Blueprints */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-8">
                {noteworthyAgents.map((blueprint) => (
                  <div
                    key={blueprint.id}
                    className="flex flex-col items-center text-center"
                  >
                    <Link href={`/agent/${blueprint.id}`} className="mb-3">
                      <div className="w-[130px] h-[195px]">
                        <AgentCover
                          imageUrl={
                            (
                              blueprint.marketingCollateral as MarketingCollateral
                            )?.imageUrl ?? ""
                          }
                        />
                      </div>
                    </Link>
                    <h4 className="font-semibold text-xs sm:text-sm mb-0.5 text-foreground truncate w-full px-2">
                      {blueprint.name}
                    </h4>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 truncate w-full px-2">
                      {
                        (
                          blueprint.marketingCollateral as MarketingCollateral
                        )?.author
                      }
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full text-accent-foreground hover:bg-primary hover:text-primary-foreground font-medium text-[10px] sm:text-xs px-3 py-1 h-auto"
                    >
                      Explore
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
          </div>
        </div>
      </div>
    </div>
  )
} 