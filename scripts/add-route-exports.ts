import fs from "fs";
import path from "path";

function processDir(d: string) {
  fs.readdirSync(d).forEach((f) => {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) {
      processDir(p);
    } else if (f === "route.ts") {
      let txt = fs.readFileSync(p, "utf8");
      if (p.includes("report.pdf")) {
        if (!txt.includes("export const dynamic")) {
          txt = `export const dynamic = "force-dynamic";\nexport const runtime = "nodejs";\n` + txt;
        } else if (!txt.includes('runtime = "nodejs"')) {
          txt = `export const runtime = "nodejs";\n` + txt;
        }
      } else {
        if (!txt.includes("export const dynamic")) {
          txt = `export const dynamic = "force-dynamic";\n` + txt;
        }
      }
      fs.writeFileSync(p, txt, "utf8");
      console.log("Verified:", p);
    }
  });
}

processDir("app/api");
console.log("Done checking all API routes.");

