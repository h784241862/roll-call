import { avatarInitial, avatarTone } from "../lib/avatar";

interface Props {
  id: string;
  name: string;
  size?: number;
  radius?: number;
}

export function Avatar({ id, name, size = 42, radius }: Props) {
  const tone = avatarTone(id);
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        background: tone.bg,
        color: tone.fg,
        borderRadius: radius ?? Math.round(size * 0.34),
        fontSize: Math.round(size * 0.44),
      }}
      className="inline-grid shrink-0 place-items-center font-extrabold leading-none select-none"
    >
      {avatarInitial(name)}
    </span>
  );
}
