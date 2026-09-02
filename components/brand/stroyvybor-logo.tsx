type BrandLogoProps = {
  variant?: "horizontal" | "mark";
  inverse?: boolean;
  className?: string;
  alt?: string;
};

const LOGO_SRC = "/brand/stroyvybor-logo.png?v=20260902-2";
const MARK_SRC = "/brand/stroyvybor-mark.png?v=20260902-2";

export function StroyVyborLogo({
  variant = "horizontal",
  inverse = false,
  className = "",
  alt = "СтройВыбор",
}: BrandLogoProps) {
  const filterClass = inverse ? "brightness-0 invert" : "";

  if (variant === "mark") {
    return (
      <img
        src={MARK_SRC}
        alt={alt}
        width={512}
        height={512}
        decoding="async"
        className={["block h-auto max-w-full object-contain", filterClass, className].join(" ")}
      />
    );
  }

  return (
    <img
      src={LOGO_SRC}
      alt={alt}
      width={645}
      height={92}
      decoding="async"
      className={["block h-auto max-w-full object-contain", filterClass, className].join(" ")}
    />
  );
}
