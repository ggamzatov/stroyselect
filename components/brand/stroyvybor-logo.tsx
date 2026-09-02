import Image from "next/image";

type BrandLogoProps = {
  variant?: "horizontal" | "mark";
  inverse?: boolean;
  className?: string;
  alt?: string;
};

const LOGO_SRC = "/brand/stroyvybor-logo.png";
const MARK_SRC = "/brand/stroyvybor-mark.png";

export function StroyVyborLogo({
  variant = "horizontal",
  inverse = false,
  className = "",
  alt = "СтройВыбор",
}: BrandLogoProps) {
  const filterClass = inverse ? "brightness-0 invert" : "";

  if (variant === "mark") {
    return (
      <Image
        src={MARK_SRC}
        alt={alt}
        width={512}
        height={512}
        unoptimized
        className={["block h-auto max-w-full", filterClass, className].join(" ")}
      />
    );
  }

  return (
    <Image
      src={LOGO_SRC}
      alt={alt}
      width={645}
      height={92}
      unoptimized
      className={["block h-auto max-w-full", filterClass, className].join(" ")}
    />
  );
}
