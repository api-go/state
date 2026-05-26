const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const name = await page.evaluate(() => {
    const div = document.createElement('div');
    div.innerHTML = '<div $.val="hello"></div>';
    return div.firstChild.attributes[0].name;
  });
  console.log('Attribute name:', name);
  await browser.close();
})();
