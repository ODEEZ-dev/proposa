import puppeteer from "puppeteer-core"

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5173"
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
})
const page = await browser.newPage()
const errors = []
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text())
})
page.on("pageerror", (err) => errors.push(String(err)))

const step = (name, fn) => {
  console.log(`\n▶ ${name}`)
  return fn()
}

const clickButton = async (page, text) => {
  const clicked = await page.evaluate((needle) => {
    const btns = [...document.querySelectorAll("button")]
    const el = btns.find((b) => b.innerText.trim().includes(needle))
    if (!el) return false
    el.click()
    return true
  }, text)
  if (!clicked) throw new Error(`Button not found: ${text}`)
}

const clickOption = async (page, text) => {
  const clicked = await page.evaluate((needle) => {
    const items = [...document.querySelectorAll("[role=option]")]
    const el = items.find((i) => i.innerText.trim().includes(needle))
    if (!el) return false
    el.click()
    return true
  }, text)
  if (!clicked) throw new Error(`Option not found: ${text}`)
}

await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 30000 })
await new Promise((r) => setTimeout(r, 4000))

const needsOnboarding = await page
  .waitForSelector("input#business-name", { timeout: 3000 })
  .then(() => true)
  .catch(() => false)

if (needsOnboarding) {
  // Onboarding: step 1 — business name
  await step("onboarding step 1", async () => {
    await page.type("input#business-name", "Acme Studio")
    await clickButton(page, "Continue")
  })
  await new Promise((r) => setTimeout(r, 1600))

  // Onboarding: step 2 — pick a couple of services
  await step("onboarding step 2", async () => {
    await page.waitForFunction(() => document.body.innerText.includes("What services do you offer?"), { timeout: 10000 })
    const buttons = await page.$$("button[type=button]")
    let clicked = 0
    for (const b of buttons) {
      const t = await page.evaluate((el) => el.innerText, b)
      if (t.includes("Website Design") || t.includes("Brand Identity")) {
        await b.click()
        clicked++
        if (clicked === 2) break
      }
    }
    console.log(`selected ${clicked} services`)
    await clickButton(page, "Continue")
  })
  await new Promise((r) => setTimeout(r, 1600))

  // Onboarding: step 3 — skip
  await step("onboarding step 3 (skip)", async () => {
    await page.waitForFunction(() => document.body.innerText.includes("Upload your logo"), { timeout: 10000 })
    const skip = await page.evaluate(() => {
      const btns = [...document.querySelectorAll("button")]
      const el = btns.find((b) => b.innerText.includes("skip for now"))
      if (el) { el.click(); return true }
      return false
    })
    console.log(`skip clicked: ${skip}`)
  })
  await new Promise((r) => setTimeout(r, 4000))
} else {
  console.log("▶ onboarding skipped (already configured)")
}

// Dashboard should now greet the user
await step("dashboard renders", async () => {
  const text = await page.evaluate(() => document.body.innerText)
  const clean = text.replace(/\s+/g, " ")
  console.log(`dashboard: ${clean.slice(0, 300)}`)
  if (!clean.includes("Good morning") && !clean.includes("Good afternoon") && !clean.includes("Good evening")) {
    throw new Error("Greeting missing")
  }
})

// Add a client if missing
await page.goto(`${BASE}/clients`, { waitUntil: "domcontentloaded" })
await new Promise((r) => setTimeout(r, 2500))
const body1 = await page.evaluate(() => document.body.innerText)
if (!body1.includes("Jane Smith")) {
  await step("add client", async () => {
    await clickButton(page, "Add Client")
    await page.waitForSelector("input#client-name", { timeout: 10000 })
    await page.type("input#client-name", "Jane Smith")
    await page.type("input#client-email", "jane@acme.com")
    await page.type("input#client-company", "Acme Corp")
    await page.evaluate(() => {
      const dialog = document.querySelector("[role=dialog]")
      if (!dialog) return false
      const save = [...dialog.querySelectorAll("button")].find((b) => b.innerText.trim() === "Add Client")
      if (save) save.click()
    })
  })
  await new Promise((r) => setTimeout(r, 3000))
} else {
  console.log("▶ add client skipped (already exists)")
}

await step("client appears in grid", async () => {
  const text = await page.evaluate(() => document.body.innerText)
  const clean = text.replace(/\s+/g, " ")
  console.log(`clients page: ${clean.slice(0, 160)}`)
  if (!clean.includes("Jane Smith")) throw new Error("Client not saved")
})

// New proposal flow up to review step
await step("new proposal intake", async () => {
  await page.goto(`${BASE}/proposals/new`, { waitUntil: "domcontentloaded" })
  await new Promise((r) => setTimeout(r, 2500))
  // select client dropdown
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")]
    const el = btns.find((b) => b.innerText.includes("Search or select a client"))
    if (el) el.click()
  })
  await new Promise((r) => setTimeout(r, 1600))
  await new Promise((r) => setTimeout(r, 400))
  const stateAfterOpen = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").slice(0, 400))
  console.log(`after dropdown open: ${stateAfterOpen}`)
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")]
    const el = btns.find((b) => b.innerText.includes("Jane Smith"))
    if (el) { el.click(); return true }
    return false
  }).then((ok) => console.log(`jane smith clickable: ${ok}`))
  await new Promise((r) => setTimeout(r, 700))
  const stateAfterPick = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").slice(0, 400))
  console.log(`after client pick: ${stateAfterPick}`)
  await clickButton(page, "Continue")
  await new Promise((r) => setTimeout(r, 2000))
  const stateAfterContinue = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").slice(0, 300))
  console.log(`after continue: ${stateAfterContinue}`)
  // step 2: project type + description
  await page.waitForFunction(() => document.body.innerText.includes("Brief Description"), { timeout: 10000 })
  // open project type select
  await page.evaluate(() => {
    const triggers = [...document.querySelectorAll("button[role=combobox]")]
    if (triggers[0]) triggers[0].click()
  })
  await new Promise((r) => setTimeout(r, 600))
  await page.evaluate(() => {
    const items = [...document.querySelectorAll("[role=option]")]
    const el = items.find((i) => i.innerText.includes("Website"))
    if (el) el.click()
  })
  await page.type("textarea#scope", "We need a new marketing website that converts visitors into customers, with a blog and CMS.")
  await new Promise((r) => setTimeout(r, 300))
  await clickButton(page, "Continue")
  await new Promise((r) => setTimeout(r, 1600))
  // step 3: timeline select
  await page.waitForFunction(() => document.body.innerText.includes("Budget Range"), { timeout: 10000 })
  await page.evaluate(() => {
    const triggers = [...document.querySelectorAll("button[role=combobox]")]
    if (triggers[0]) triggers[0].click()
  })
  await new Promise((r) => setTimeout(r, 600))
  await page.evaluate(() => {
    const items = [...document.querySelectorAll("[role=option]")]
    const el = items.find((i) => i.innerText.trim() === "1 month")
    if (el) el.click()
  })
  // select a deliverable service if shown
  const svc = await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")]
    const el = btns.find((b) => b.innerText.includes("Website Design & Development"))
    if (el) { el.click(); return true }
    return false
  })
  console.log(`deliverable selected: ${svc}`)
  await new Promise((r) => setTimeout(r, 400))
  await clickButton(page, "Continue")
  await new Promise((r) => setTimeout(r, 1000))
  const review = await page.evaluate(() => document.body.innerText)
  console.log(`review step: ${review.replace(/\s+/g, " ").slice(0, 300)}`)
  if (!review.includes("Review your proposal brief")) throw new Error("Review step missing")

  // Generate with AI → loading overlay → editor
  const genClicked = await clickButton(page, "Generate with AI")
  console.log(`generate clicked: ${genClicked}`)
  await new Promise((r) => setTimeout(r, 1200))
  const loading = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").slice(0, 260))
  console.log(`generation overlay: ${loading}`)
  await page.waitForFunction(() => document.body.innerText.includes("Executive Summary"), { timeout: 90000 })
  await new Promise((r) => setTimeout(r, 1500))
  const editor = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " "))
  console.log(`editor: ${editor.slice(0, 300)}`)
  if (!editor.includes("AI Assistant")) throw new Error("Editor did not open")

  // Copy share link
  await clickButton(page, "Copy Share Link")
  await new Promise((r) => setTimeout(r, 1500))
  const shareToast = await page.evaluate(() => document.body.innerText)
  if (!shareToast.includes("Link copied")) throw new Error("Share link toast missing")
  console.log("share link copied ✅")
})

// Client-side acceptance flow on the public share page
await step("client acceptance flow", async () => {
  // Fetch the latest proposal's share token straight from Convex
  const res = await fetch("http://127.0.0.1:3210/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: "queries:listProposals",
      args: {},
      format: "json",
    }),
  })
  const { value: rows } = await res.json()
  const latest = rows[0]
  if (!latest?.proposal?.shareToken) throw new Error("No shareToken found on proposal")
  const shareToken = latest.proposal.shareToken
  console.log(`share token: ${shareToken}`)

  await page.goto(`${BASE}/p/${shareToken}`, { waitUntil: "domcontentloaded" })
  await new Promise((r) => setTimeout(r, 2500))
  const pub = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " "))
  console.log(`public page: ${pub.slice(0, 260)}`)
  if (!pub.includes("Prepared for")) throw new Error("Public page branding missing")
  if (!pub.includes("Accept Proposal")) throw new Error("Accept button missing")

  // Accept the proposal
  await clickButton(page, "Accept Proposal")
  await new Promise((r) => setTimeout(r, 2000))
  const afterAccept = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " "))
  console.log(`after accept: ${afterAccept.slice(0, 200)}`)
  if (!afterAccept.includes("Proposal accepted")) throw new Error("Acceptance did not register")
})

// Dashboard reflects the acceptance in real time
await step("dashboard win rate updates", async () => {
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" })
  await new Promise((r) => setTimeout(r, 2500))
  const dash = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " "))
  if (!dash.includes("accepted by Jane Smith")) throw new Error("Accepted activity missing from dashboard")
  if (!dash.includes("100% Win Rate")) throw new Error("Win rate not updated")
  console.log(`dashboard after accept: ${dash.slice(0, 200)}`)
})

await step("console errors", () => {
  if (errors.length) {
    console.log(`ERRORS:\n${errors.slice(0, 8).join("\n")}`)
    process.exitCode = 1
  } else {
    console.log("none ✅")
  }
})

await browser.close()
