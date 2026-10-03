import { classColor } from "../utils.js";

export default function ClassTag({ cls }) {
  return (
    <span className="class-tag" style={{ "--tag": classColor(cls) }}>
      <span className="class-sigil" aria-hidden="true" />
      {cls}
    </span>
  );
}
