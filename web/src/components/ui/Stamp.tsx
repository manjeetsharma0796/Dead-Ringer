type Tone = "accent" | "human" | "bot" | "dim";

const tones: Record<Tone, string> = {
  accent: "border-accent text-accent",
  human: "border-human text-human",
  bot: "border-bot text-bot",
  dim: "border-line text-dim",
};

/* Case-file stamp: sharp corners, uppercase, slight tilt available. */
export function Stamp({
  children,
  tone = "dim",
  tilt = false,
  className = "",
}: {
  children: React.ReactNode;
  tone?: Tone;
  tilt?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`type-stamp inline-block border-2 px-2 py-0.5 text-xs leading-tight ${tones[tone]} ${
        tilt ? "-rotate-3" : ""
      } ${className}`}
    >
      {children}
    </span>
  );
}
