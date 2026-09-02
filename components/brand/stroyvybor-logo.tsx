/* eslint-disable @next/next/no-img-element */

type BrandLogoProps = {
  variant?: "horizontal" | "mark";
  inverse?: boolean;
  className?: string;
  alt?: string;
};

const LOGO_SRC = "/brand/stroyvybor-logo-v3.png";
const MARK_SRC = "/brand/stroyvybor-mark-v3.png";

export function StroyVyborLogo({
  variant = "horizontal",
  inverse = false,
  className = "",
  alt = "СтройВыбор",
}: BrandLogoProps) {
  const filterClass = inverse ? "brightness-0 invert" : "";
  const commonClassName = ["block shrink-0 object-contain", filterClass, className].join(" ");

  if (variant === "mark") {
    return (
      <img
        src={MARK_SRC}
        alt={alt}
        width={512}
        height={512}
        loading="eager"
        decoding="sync"
        draggable={false}
        className={commonClassName}
        style={{ height: "auto" }}
      />
    );
  }

  return (
    <img
      src={LOGO_SRC}
      alt={alt}
      width={645}
      height={92}
      loading="eager"
      decoding="sync"
      draggable={false}
      className={commonClassName}
      style={{ height: "auto" }}
    />
  );
}
