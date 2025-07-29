import Image from "next/image"

interface AgentCoverProps {
  imageUrl: string
  size?: "small" | "default" | "large"
}

const sizeConfig = {
  small: { width: 100, height: 150, scale: "scale-75" },
  default: { width: 130, height: 195, scale: "scale-100" },
  large: { width: 520, height: 780, scale: "scale-100" }
}

export function AgentCover({ imageUrl, size = "default" }: AgentCoverProps) {
  const { width, height, scale } = sizeConfig[size]
  
  return (
    <div className={`book-item group ${scale}`}>
      <div className="book-cover">
        <div className="book-inside"></div>
        <div className="book-image-wrapper">
          <Image
            src={imageUrl || "/placeholder.svg"}
            alt="Book Cover"
            width={width}
            height={height}
            className="book-image"
          />
          <div className="book-effect"></div>
          <div className="book-light"></div>
        </div>
      </div>
    </div>
  )
} 