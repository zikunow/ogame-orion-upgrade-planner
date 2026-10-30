// Live QA is run after publication by the existing Pages workflow.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{for(const width of [1440,768,390,320]){
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(process.env.PLANNER_URL||'https://zikunow.github.io/ogame-orion-upgrade-planner/?lang=en');
  assert.equal(response.status(),200);
  assert.equal(await page.locator('#calculatorSelect').inputValue(),'https://zikunow.github.io/ogame-orion-upgrade-planner/');
  assert.equal(await page.locator('#calculatorSelect option:checked').textContent(),'Upgrade Planner');
  assert.equal(await page.locator('#calculatorSelect option').count(),5);
  assert.equal(await page.locator('.planner-table tbody tr').count(),50);
  assert.match(await page.locator('.planner-table tbody tr').first().textContent(),/Metal building.*15 → 16/);
  assert.ok(await page.locator('.snapshot-table tbody tr').count()>1);
  assert.equal(await page.locator('#lithium').inputValue(),'17');
  assert.match(await page.locator('#cashbackHelp').textContent(),/8.06/);
  assert.equal(await page.locator('#threshold').inputValue(),'28.4');
  assert.match(await page.locator('#results').textContent(),/Calendar-day income/);
  assert.match(await page.locator('.planner-table thead').textContent(),/Payback/);
  assert.match(await page.locator('.planner-table thead').textContent(),/MSU \/ \+1%/);
  assert.match(await page.locator('#experienceHelp').textContent(),/10%/);
  await page.locator('#mission').selectOption('pve');assert.equal(await page.locator('.planner-table').count(),0);
  await page.locator('#generate').click();assert.match(await page.locator('#results').textContent(),/No eligible missions/);
  await page.locator('#threshold').fill('0');
  await page.locator('#playerClass').selectOption('collector');assert.equal(await page.locator('#t18').isDisabled(),true);
  await page.locator('#generate').click();assert.equal(await page.locator('.planner-table tbody tr td:nth-child(2)').filter({hasText:'T18'}).count(),0);
  await page.locator('#planets').fill('9');await page.locator('#steps').selectOption('10');await page.locator('#generate').click();
  assert.equal(await page.locator('.planner-table tbody tr').count(),10);
  assert.ok((await page.locator('.planner-table tbody tr td:nth-child(3)').allTextContents()).every(s=>s==='All 9'));
  await page.locator('#budget').fill('0');await page.locator('#generate').click();assert.equal(await page.locator('.planner-table tbody tr').count(),0);
  await page.reload();assert.equal(await page.locator('#planets').inputValue(),'9');assert.equal(await page.locator('#budget').inputValue(),'0');
  await page.locator('#planets').fill('');assert.equal(await page.locator('#generate').isDisabled(),true);
  await page.locator('#reset').click();await page.locator('#langRu').click();assert.match(await page.locator('h1').textContent(),/Планировщик/);
  assert.equal(await page.locator('#calculatorSelect option:checked').textContent(),'Планировщик улучшений');
  for(const theme of ['minimal','cosmic']){
    await page.locator('#theme').selectOption(theme);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Viewport overflow '+width+' '+theme);
  }
  if(process.env.SCREENSHOT_DIR){
    await page.locator('#theme').selectOption('minimal');
    await page.screenshot({path:process.env.SCREENSHOT_DIR+'/planner-'+width+'.png',fullPage:true});
  }
  await page.locator('#theme').selectOption('cosmic');
  await page.route('https://zikunow.github.io/ogame-orion-ias-calculator/resources.html*',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Navigation test</title>'}));
  await page.locator('#calculatorSelect').selectOption('https://zikunow.github.io/ogame-orion-ias-calculator/resources.html');
  await page.waitForURL('https://zikunow.github.io/ogame-orion-ias-calculator/resources.html?lang=ru&theme=cosmic');
  assert.deepEqual(errors,[]);console.log('PASS planner '+width+'px');await context.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

