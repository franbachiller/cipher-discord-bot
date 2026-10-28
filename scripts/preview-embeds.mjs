// Genera docs/embed-preview.html con una vista previa estilo Discord de embeds/*.json.
// Uso: node scripts/preview-embeds.mjs
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const embedsDir = join(root, "embeds");
const outFile = join(root, "docs", "embed-preview.html");

const escape = (text = "") =>
  String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Subconjunto del markdown de Discord: **negrita**, *cursiva*, `código`, [links](url), menciones y saltos.
const markdown = (text = "") =>
  escape(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/&lt;#\w+&gt;/g, '<span class="mention">#canal</span>')
    .replace(/&lt;@&amp;?\w+&gt;/g, '<span class="mention">@rol</span>')
    .replace(/\n/g, "<br>");

function renderEmbed(name, embed) {
  const fields = (embed.fields || [])
    .map((f) => `<div class="field${f.inline ? " inline" : ""}"><div class="fname">${markdown(f.name)}</div><div class="fvalue">${markdown(f.value)}</div></div>`)
    .join("");
  const footer = embed.footer
    ? `<div class="footer">${escape(embed.footer.text)}${embed.timestamp ? " • hoy" : ""}</div>`
    : "";
  return `
  <section>
    <div class="file">embeds/${escape(name)}</div>
    <div class="msg">
      <div class="avatar">C</div>
      <div class="body">
        <div class="user">Cipher Bot <span class="tag">BOT</span></div>
        <div class="embed" style="border-color:${escape(embed.color || "#5865F2")}">
          ${embed.author ? `<div class="author">${escape(embed.author.name)}</div>` : ""}
          ${embed.title ? `<div class="title">${markdown(embed.title)}</div>` : ""}
          ${embed.description ? `<div class="desc">${markdown(embed.description)}</div>` : ""}
          ${fields ? `<div class="fields">${fields}</div>` : ""}
          ${footer}
        </div>
      </div>
    </div>
  </section>`;
}

const files = readdirSync(embedsDir).filter((f) => f.endsWith(".json")).sort();
const sections = files.map((f) => renderEmbed(f, JSON.parse(readFileSync(join(embedsDir, f), "utf8")))).join("");

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Vista previa de embeds</title>
<style>
  body{margin:0;padding:32px;background:#313338;color:#dbdee1;font:15px/1.4 "gg sans","Segoe UI",system-ui,sans-serif}
  h1{font-size:18px;color:#f2f3f5;margin:0 0 24px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(560px,1fr));gap:28px}
  .file{font:12px ui-monospace,Consolas,monospace;color:#949ba4;margin-bottom:8px}
  .msg{display:flex;gap:16px}
  .avatar{flex:0 0 40px;height:40px;border-radius:50%;background:#e03c3c;color:#fff;display:grid;place-items:center;font-weight:700}
  .user{font-weight:600;color:#f2f3f5;margin-bottom:4px}
  .tag{background:#5865f2;color:#fff;font-size:10px;padding:1px 4px;border-radius:3px;vertical-align:middle}
  .embed{background:#2b2d31;border-left:4px solid;border-radius:4px;padding:12px 16px 14px;max-width:520px}
  .author{font-size:13px;font-weight:600;color:#f2f3f5;margin-bottom:6px}
  .title{font-weight:700;color:#f2f3f5;margin-bottom:6px}
  .desc{font-size:14px;margin-bottom:8px}
  .fields{display:flex;flex-wrap:wrap;gap:8px 16px}
  .field{flex:1 1 100%;font-size:14px}.field.inline{flex:1 1 30%}
  .fname{font-weight:600;color:#f2f3f5;margin-bottom:2px}
  .footer{margin-top:10px;font-size:12px;color:#949ba4}
  a{color:#00a8fc;text-decoration:none} code{background:#1e1f22;padding:0 4px;border-radius:3px}
  .mention{background:rgba(88,101,242,.3);color:#c9cdfb;border-radius:3px;padding:0 2px}
</style></head>
<body><h1>Embeds configurados (${files.length})</h1><div class="grid">${sections}</div></body></html>`;

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, html);
console.log(`Vista previa generada: ${outFile}`);
