const puppeteer = require('puppeteer');

const delay = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log("Starting Puppeteer...");
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();

  await page.exposeFunction('logOrder', (msg, orderArr) => {
    console.log(`[STATE: ${msg}] -> ` + orderArr.join(' | '));
  });

  await page.setCacheEnabled(false);
  await page.goto('http://localhost/', { waitUntil: 'networkidle2' });
  
  console.log("Navigating to Results...");
  page.on('console', msg => {
    console.log(`[BROWSER]: ${msg.text()}`);
  });

  await page.evaluate(() => {
    const tabs = document.querySelectorAll('.sidebar-item');
    if (tabs.length >= 4) {
      tabs[3].click();
    }
  });

  await delay(2000);
  
  console.log("Clicking ALL to generate fields...");
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const allBtn = buttons.find(b => b.textContent.includes('ALL'));
    if (allBtn) allBtn.click();
  });
  
  await delay(3000);

  async function checkOrder(stateName) {
    await page.evaluate(async (state) => {
      const layer = window.__debugLayer;
      if (!layer) {
        window.logOrder(state, ["NO_LAYER"]);
        return;
      }
      const children = layer.getChildren();
      const order = children.map(c => c.name() || 'unnamed');
      window.logOrder(state, order);
    }, stateName);
  }

  await checkOrder("AFTER_GEN");

  console.log("Clicking Edit Polygon for Field...");
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const editBtn = buttons.find(b => b.textContent === 'EDIT' || b.textContent.includes('EDIT'));
    if (editBtn) editBtn.click();
  });

  await delay(1000);
  await checkOrder("IN_EDIT_FIELD");

  console.log("Clicking Done...");
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const doneBtn = buttons.find(b => b.textContent === 'DONE' || b.textContent.includes('DONE'));
    if (doneBtn) doneBtn.click();
  });

  await delay(1000);
  await checkOrder("AFTER_DONE_FIELD");

  console.log("Clicking Edit Area for Mask...");
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const editBtn = buttons.find(b => b.textContent === 'Edit Area' || b.textContent.includes('Edit Area'));
    if (editBtn) editBtn.click();
  });

  await delay(1000);
  await checkOrder("IN_EDIT_MASK");

  console.log("Clicking Done for Mask...");
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const doneBtn = buttons.find(b => b.textContent === 'Done' || b.textContent.includes('Done'));
    if (doneBtn) doneBtn.click();
  });

  await delay(1000);
  await checkOrder("AFTER_DONE_MASK");

  await browser.close();
  console.log("Test finished.");
})();
