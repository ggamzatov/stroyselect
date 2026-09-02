import Image from "next/image";

type BrandLogoProps = {
  variant?: "horizontal" | "mark";
  inverse?: boolean;
  className?: string;
  alt?: string;
};

const LOGO_SRC = "/brand/stroyvybor-logo.svg";
const MARK_SRC = "/brand/stroyvybor-mark.svg";

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
        width={169}
        height={92}
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
      className={["block h-auto max-w-full", filterClass, className].join(" ")}
    />
  );
}
