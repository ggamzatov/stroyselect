/* eslint-disable @next/next/no-img-element */

type BrandLogoProps = {
  variant?: "horizontal" | "mark";
  inverse?: boolean;
  className?: string;
  alt?: string;
};

const LOGO_SRC = "/brand/stroyvybor-logo-hq.png";
const MARK_SRC = "/brand/stroyvybor-mark-hq.png";

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
        data-brand-logo="mark"
        data-brand-quality="hq"
        src={MARK_SRC}
        alt={alt}
        width={1898}
        height={1056}
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
      data-brand-logo="horizontal"
      data-brand-quality="hq"
      src={LOGO_SRC}
      alt={alt}
      width={1306}
      height={266}
      loading="eager"
      decoding="sync"
      draggable={false}
      className={commonClassName}
      style={{ height: "auto" }}
    />
  );
}
