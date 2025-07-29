import { AgentCover } from "@/modules/agents/ui/components/agent-cover";
import "@/modules/agents/ui/components/agent-cover.css"
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { caller } from "@/trpc/server";
import { MarketingCollateral } from "@/modules/agents/types";
import { Navbar } from "@/components/navbar";

interface Session {
  session_id: string;
  session_name: string;
  completion_criteria: string[];
}

interface AgentDetailPageProps {
  params: Promise<{
    agentId: string;
  }>;
}

export default async function AgentDetailPage({ params }: AgentDetailPageProps) {
    const { agentId } = await params;
    const agent = await caller.agentBlueprints.getOne({ id: agentId });

    if (!agent) {
        return <div>Agent not found</div>;
    }

    const marketingCollateral = agent.marketingCollateral as MarketingCollateral;
    const sessions = (agent.meetingTemplates as { sessions: Session[] })?.sessions || [];

    return (
    <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center px-4 md:px-6 lg:px-8 py-6">
            <div className="w-full max-w-4xl space-y-8">
                {/* Main Content */}
                <div className="bg-card rounded-3xl shadow-lg overflow-hidden">
                    <main className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-1 flex justify-center items-center">
                             <AgentCover imageUrl={marketingCollateral?.imageUrl ?? ""} size="large" />
                        </div>
                        <div className="md:col-span-2">
                            <h2 className="font-serif text-3xl lg:text-4xl font-normal text-card-foreground mb-2">{agent.name}</h2>
                            <p className="text-lg text-muted-foreground mb-6">by {marketingCollateral?.author}</p>
                            <p className="text-foreground/90 leading-relaxed mb-8">{agent.description}</p>
                            <Button size="lg" className="w-full md:w-auto" asChild>
                                <Link href="/meetings">Start Session</Link>
                            </Button>
                        </div>
                    </main>
                </div>

                {/* Sessions Section */}
                {sessions.length > 0 && (
                    <div className="bg-card rounded-3xl shadow-lg overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-serif font-normal text-card-foreground">
                                    Learning Journey
                                </h3>
                                <Badge variant="secondary" className="text-sm">
                                    {sessions.length} Sessions
                                </Badge>
                            </div>
                            <div className="grid gap-4">
                                {sessions.map((session, index) => (
                                    <Card key={session.session_id} className="border border-border/50 hover:border-border transition-colors">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                                                            {index + 1}
                                                        </div>
                                                        <CardTitle className="text-lg">{session.session_name}</CardTitle>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        {session.completion_criteria && session.completion_criteria.length > 0 && (
                                            <CardContent className="pt-0">
                                                <div className="space-y-2">
                                                    <h5 className="text-sm font-medium text-muted-foreground">What you&apos;ll achieve:</h5>
                                                    <ul className="space-y-1">
                                                        {session.completion_criteria.slice(0, 3).map((criteria, criteriaIndex) => (
                                                            <li key={criteriaIndex} className="text-sm text-foreground/80 flex items-start gap-2">
                                                                <span className="text-primary/60 mt-1">•</span>
                                                                <span>{criteria}</span>
                                                            </li>
                                                        ))}
                                                        {session.completion_criteria.length > 3 && (
                                                            <li className="text-sm text-muted-foreground italic">
                                                                +{session.completion_criteria.length - 3} more outcomes...
                                                            </li>
                                                        )}
                                                    </ul>
                                                </div>
                                            </CardContent>
                                        )}
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
} 