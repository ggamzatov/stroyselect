import Image from "next/image";

type BrandLogoProps = {
  variant?: "horizontal" | "mark";
  inverse?: boolean;
  className?: string;
  alt?: string;
};

const LOGO_SRC = "/brand/stroyvybor-logo.svg";

export function StroyVyborLogo({
  variant = "horizontal",
  inverse = false,
  className = "",
  alt = "СтройВыбор",
}: BrandLogoProps) {
  const filterClass = inverse ? "brightness-0 invert" : "";

  if (variant === "mark") {
    return (
      <span
        className={["relative inline-block aspect-[169/92] shrink-0 overflow-hidden", className].join(" ")}
        role="img"
        aria-label={alt}
      >
        <Image
          src={LOGO_SRC}
          alt=""
          aria-hidden="true"
          width={645}
          height={92}
          className={["absolute inset-y-0 left-0 h-full max-w-none", filterClass].join(" ")}
          style={{ width: "381.66%" }}
        />
      </span>
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
