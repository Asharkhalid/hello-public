import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"

interface Props {
  meetingId: string;
}

export const ActiveState = ({
  meetingId,
}: Props) => {
  const router = useRouter();

  return (
    <div className="bg-card rounded-lg px-4 py-5 flex flex-col gap-y-8 items-center justify-center">
      <img src="/upcoming.svg" alt="Active" className="size-20" />
      <div className="flex flex-col gap-y-2 items-center justify-center">
        <h2 className="text-xl font-medium text-card-foreground">Meeting in progress</h2>
        <p className="text-muted-foreground text-center">
          This meeting is currently active. Click below to join.
        </p>
      </div>
      <Button
        onClick={() => router.push(`/call/${meetingId}`)}
        className="w-fit"
      >
        Join Meeting
      </Button>
    </div>
  )
}