export const CancelledState = () => {
  return (
    <div className="bg-card rounded-lg px-4 py-5 flex flex-col gap-y-8 items-center justify-center">
      <img src="/cancelled.svg" alt="Cancelled" className="size-20" />
      <div className="flex flex-col gap-y-2 items-center justify-center">
        <h2 className="text-xl font-medium text-card-foreground">Meeting cancelled</h2>
        <p className="text-muted-foreground text-center">
          This meeting has been cancelled
        </p>
      </div>
    </div>
  )
}