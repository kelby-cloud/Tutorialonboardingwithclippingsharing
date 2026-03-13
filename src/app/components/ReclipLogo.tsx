import svgPaths from "../../imports/svg-cwe1ouf713";

/**
 * Reclip Logo — locked aspect ratio (335.835:123.82), max height 64px.
 * Uses the Figma-imported SVG paths with fill from CSS variable --foreground.
 */
export function ReclipLogo({ maxHeight = 64 }: { maxHeight?: number }) {
  // Original viewBox dimensions
  const SVG_W = 335.835;
  const SVG_H = 123.82;
  const aspectRatio = SVG_W / SVG_H;

  return (
    <div
      style={{
        maxHeight,
        height: maxHeight,
        width: maxHeight * aspectRatio,
        maxWidth: "60%",
        flexShrink: 0,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        fill="none"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block" }}
      >
        <g clipPath="url(#reclip-logo-clip)">
          <path d={svgPaths.p1ee18480} fill="var(--foreground, white)" />
          <path d={svgPaths.p1f772700} fill="var(--foreground, white)" />
          <path d={svgPaths.p65e000} fill="var(--foreground, white)" />
          <path d={svgPaths.pfea2800} fill="var(--foreground, white)" />
          <path d={svgPaths.p354bfd80} fill="var(--foreground, white)" />
          <path d={svgPaths.p3e644100} fill="var(--foreground, white)" />
        </g>
        <defs>
          <clipPath id="reclip-logo-clip">
            <rect width={SVG_W} height={SVG_H} />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}
