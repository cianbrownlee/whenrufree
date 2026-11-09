import { ImageResponse } from "next/og";

// Preview card shown when the site's link is shared (LinkedIn, Slack, iMessage, and so on).
export const alt = "whenrufree: find a time that works for everyone";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Draws a simple branded card with a mock availability grid; returns the image response.
export default function OpengraphImage() {
  const columns = 7;
  const rows = 4;
  // Fixed pattern of how many people are free in each slot (0 to 4), so the card looks the same every time.
  const pattern = [
    [0, 1, 2, 3, 2, 1, 0],
    [1, 2, 3, 4, 3, 2, 1],
    [1, 3, 4, 4, 4, 2, 1],
    [0, 1, 2, 3, 2, 1, 0],
  ];
  const shades = ["#27272a", "#14532d", "#15803d", "#22c55e", "#86efac"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#000000",
          color: "#fafafa",
          padding: "0 90px",
        }}
      >
        <div style={{ display: "flex", fontSize: 92, fontWeight: 700 }}>whenrufree</div>
        <div style={{ display: "flex", fontSize: 38, color: "#a1a1aa", marginTop: 16 }}>
          Share a link and see when everyone is free. No accounts needed.
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 56 }}>
          {pattern.slice(0, rows).map((row, rowIndex) => (
            <div key={rowIndex} style={{ display: "flex" }}>
              {row.slice(0, columns).map((level, columnIndex) => (
                <div
                  key={columnIndex}
                  style={{
                    width: 92,
                    height: 44,
                    marginRight: 8,
                    marginBottom: 8,
                    borderRadius: 8,
                    background: shades[level],
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
