import { CLASS_COLORS } from "../utils.js";

export default function ClassTag({ cls }) {
  return (
    <span className="class-tag" style={{ "--tag": CLASS_COLORS[cls] }}>
      <span className="class-sigil" aria-hidden="true" />
      {cls}
    </span>
  );
}
