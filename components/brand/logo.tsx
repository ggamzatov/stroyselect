type LogoProps = {
  variant?: "horizontal" | "mark"
  inverse?: boolean
  className?: string
  alt?: string
}

const HORIZONTAL_LOGO_SRC = "/brand/stroyvybor-logo.svg"
const MARK_LOGO_SRC = "/brand/stroyvybor-mark-hq.png"

/**
 * Canonical StroySelect brand asset. The horizontal logo is the supplied SVG
 * (645 × 92), keeping application shells crisp at every density.
 */
export function Logo({
  variant = "horizontal",
  inverse = false,
  className = "",
  alt = "СтройВыбор",
}: LogoProps) {
  const filterClass = inverse ? "brightness-0 invert" : ""
  const commonClassName = ["block shrink-0 object-contain", filterClass, className]
    .filter(Boolean)
    .join(" ")

  if (variant === "mark") {
    return (
      <img
        data-brand-logo="mark"
        data-brand-quality="hq"
        src={MARK_LOGO_SRC}
        alt={alt}
        width={1898}
        height={1056}
        loading="eager"
        decoding="sync"
        draggable={false}
        className={commonClassName}
        style={{ height: "auto" }}
      />
    )
  }

  return (
    <img
      data-brand-logo="horizontal"
      data-brand-quality="vector"
      src={HORIZONTAL_LOGO_SRC}
      alt={alt}
      width={645}
      height={92}
      loading="eager"
      decoding="sync"
      draggable={false}
      className={commonClassName}
      style={{ height: "auto" }}
    />
  )
}

export type { LogoProps }
