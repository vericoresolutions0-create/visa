import { ImageResponse } from "@vercel/og";
import { writeFileSync } from "fs";

const img = new ImageResponse(
  {
    type: "div",
    props: {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        background: "#0f2040",
        padding: "0 96px",
      },
      children: {
        type: "div",
        props: {
          style: {
            display: "flex",
            flexDirection: "column",
          },
          children: [
            // Logo mark + brand name
            {
              type: "div",
              props: {
                style: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px" },
                children: [
                  {
                    type: "div",
                    props: {
                      style: {
                        width: "54px",
                        height: "54px",
                        background: "#c9a84c",
                        borderRadius: "13px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "30px",
                      },
                      children: "🌐",
                    },
                  },
                  {
                    type: "div",
                    props: {
                      style: { fontSize: "28px", fontWeight: "700", color: "rgba(255,255,255,0.5)" },
                      children: "VisaClear",
                    },
                  },
                ],
              },
            },
            // Headline
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  fontSize: "72px",
                  fontWeight: "800",
                  lineHeight: "1.08",
                  marginBottom: "22px",
                },
                children: [
                  {
                    type: "span",
                    props: { style: { color: "#ffffff" }, children: "Your visa," },
                  },
                  {
                    type: "span",
                    props: { style: { color: "#c9a84c" }, children: "done right." },
                  },
                ],
              },
            },
            // Tagline
            {
              type: "div",
              props: {
                style: {
                  fontSize: "26px",
                  color: "rgba(255,255,255,0.55)",
                  lineHeight: "1.5",
                  marginBottom: "36px",
                },
                children: "Personalised checklist · AI readiness score · Verified agents",
              },
            },
            // Domain
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                },
                children: [
                  {
                    type: "div",
                    props: {
                      style: { width: "28px", height: "2px", background: "#c9a84c", opacity: "0.6" },
                      children: "",
                    },
                  },
                  {
                    type: "div",
                    props: {
                      style: { fontSize: "18px", fontWeight: "700", color: "#c9a84c", letterSpacing: "0.1em" },
                      children: "VISACLEAR.APP",
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    },
  },
  { width: 1200, height: 630 },
);

const buf = await img.arrayBuffer();
writeFileSync("public/og-image.png", Buffer.from(buf));
console.log(`✓ public/og-image.png generated (${(Buffer.from(buf).length / 1024).toFixed(1)} KB)`);
