// Headless smoke test: loads key routes and reports console errors + page text.
import puppeteer from "puppeteer-core"

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5173"
const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

const routes = process.argv.slice(2)
if (routes.length === 0) routes.push("/dashboard", "/clients", "/services", "/proposals", "/settings")

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
})

let failures = 0
for (const route of routes) {
  const page = await browser.newPage()
  const errors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text())
  })
  page.on("pageerror", (err) => errors.push(String(err)))
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle2", timeout: 20000 })
    await new Promise((r) => setTimeout(r, 2500))
    const text = await page.evaluate(() => document.body.innerText)
    const head = text.replace(/\s+/g, " ").slice(0, 220)
    const ok = errors.length === 0
    if (!ok) failures++
    console.log(`\n=== ${route} ${ok ? "OK" : "FAILED"} ===`)
    console.log(`text: ${head}`)
    if (errors.length) console.log(`console errors:\n${errors.slice(0, 5).join("\n")}`)
  } catch (err) {
    failures++
    console.log(`\n=== ${route} NAV ERROR ===`)
    console.log(String(err))
  } finally {
    await page.close()
  }
}
await browser.close()
process.exit(failures > 0 ? 1 : 0)
