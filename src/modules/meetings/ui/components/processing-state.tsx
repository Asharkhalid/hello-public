export const ProcessingState = () => {
  return (
    <div className="bg-card rounded-lg px-4 py-5 flex flex-col gap-y-8 items-center justify-center">
      <img src="/processing.svg" alt="Processing" className="size-20" />
      <div className="flex flex-col gap-y-2 items-center justify-center">
        <h2 className="text-xl font-medium text-card-foreground">Processing meeting</h2>
        <p className="text-muted-foreground text-center">
          We are processing your meeting. This may take a few minutes.
        </p>
      </div>
    </div>
  )
}