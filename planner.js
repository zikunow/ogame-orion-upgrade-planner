'use strict';
const P=OrionPlanner,$=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
let lang=params.get('lang')==='en'?'en':'ru',state={...P.defaults},result=null;
const t=(ru,en)=>lang==='ru'?ru:en;
const labels={planets:['Планеты','Planets'],economy:['Экономика','Economy'],playerClass:['Класс','Class'],scannerLevel:['Тарелки','Scanner'],metal:['Металлическое подздание','Metal building'],crystal:['Кристаллическое подздание','Crystal building'],deut:['Дейтериевое подздание','Deuterium building'],lithium:['Литиевое подздание','Lithium building'],t18:['T18 на каждой планете','T18 on each planet'],experience:['Уровень опыта ФЖ','Lifeform experience level'],techBoost:['Усиление технологий зданиями, %','Building technology boost, %'],labLevel:['Уровень здания скидки исследований','Research discount building level'],lithiumValue:['Условная ценность лития, МСУ/литий','Assumed lithium value, MSU/lithium'],steps:['Количество шагов','Number of steps'],budget:['Бюджет, МСУ (необязательно)','Budget, MSU (optional)']};
const label=k=>labels[k][lang==='ru'?0:1];
for(const k of Object.keys(state))if(params.has(k))state[k]=k==='budget'?params.get(k):k==='playerClass'?params.get(k):k==='scaleLithium'?params.get(k)==='1':Number(params.get(k));
let theme=params.get('theme')==='cosmic'?'cosmic':'minimal';
const fmt=n=>new Intl.NumberFormat(lang==='ru'?'ru-RU':'en-US',{maximumFractionDigits:2}).format(n);
const units=n=>new Intl.NumberFormat(lang==='ru'?'ru-RU':'en-US').format(n/2n)+(n%2n?(lang==='ru'?',5':'.5'):'');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function field(k,help='') {
  const opts=k==='playerClass'?[['general',t('Генерал','General')],['collector',t('Коллекционер','Collector')],['discoverer',t('Исследователь','Discoverer')]]:k==='steps'?[[10,'10'],[50,'50'],[100,'100']]:k==='economy'?[[10,'×10']]:null;
  const max=k==='planets'?50:k==='experience'||k==='labLevel'?100:P.caps[k]??(k==='techBoost'?1000:k==='lithiumValue'?1e9:null);
  const min=k==='planets'||k==='scannerLevel'?1:0;
  const control=opts?`<select id="${k}" ${k==='economy'?'disabled':''}>${opts.map(([v,name])=>`<option value="${v}" ${String(state[k])===String(v)?'selected':''}>${name}</option>`).join('')}</select>`:`<input id="${k}" type="${k==='budget'?'text':'number'}" value="${escape(state[k])}" ${k==='budget'?'inputmode="decimal"':`min="${min}" ${max===null?'':`max="${max}"`} step="${['techBoost','lithiumValue'].includes(k)?'any':'1'}"`} ${k==='t18'&&state.playerClass!=='general'?'disabled':''}>`;
  return `<label><span>${label(k)}</span>${control}${help?`<small>${help}</small>`:''}</label>`;
}
function renderForm() {
  $('title').textContent=t('Планировщик улучшений','Upgrade planner');document.title=t('Планировщик улучшений Ориона — OGame','Orion Upgrade Planner — OGame');
  $('intro').textContent=t('Что строить следующим? Сравниваем прирост условных МСУ на средний вылет с ценой улучшения. Каждый шаг — +1 уровень сразу на всех планетах.','What should you build next? Compare assumed MSU gain per average flight with upgrade cost. Every step adds one level on all planets.');
  $('calculatorLabel').textContent=t('Калькулятор','Calculator');
  $('calculatorSelect').setAttribute('aria-label',t('Калькулятор','Calculator'));
  $('navIas').textContent=t('Калькулятор тарелок (IAS)','Scanner Calculator (IAS)');
  $('navResources').textContent=t('Калькулятор подзданий','Orion Building Calculator');
  $('navGeneral').textContent=t('Калькулятор T18 Генерала','General T18 Calculator');
  $('navRewards').textContent=t('Симулятор ресурсных наград','Resource Rewards Simulator');
  $('navPlanner').textContent=t('Планировщик улучшений','Upgrade Planner');
  $('calculatorSelect').value='https://zikunow.github.io/ogame-orion-upgrade-planner/';
  $('themeLabel').textContent=t('Дизайн','Design');
  $('theme').value=theme;document.documentElement.dataset.theme=theme;document.documentElement.lang=lang;
  $('langRu').setAttribute('aria-pressed',String(lang==='ru'));$('langEn').setAttribute('aria-pressed',String(lang==='en'));
  $('form').innerHTML=`<section class="panel account-panel"><div class="section-top"><h2>${t('Аккаунт и модель','Account and model')}</h2><span class="note">${t('Одинаковые уровни на всех планетах','Identical levels on all planets')}</span></div>
    <div class="field-grid">${['planets','economy','playerClass','scannerLevel','metal','crystal','deut','lithium','t18','experience','techBoost','labLevel','lithiumValue'].map(k=>field(k,k==='economy'?t('×10 уже встроена в baseline.','×10 is already included in the baseline.'):k==='experience'?`<span id="experienceHelp"></span>`:k==='labLevel'?`<span id="discountHelp"></span>`:k==='lithiumValue'?t('Условная оценка, не игровой курс обмена.','An assumed valuation, not an in-game exchange rate.'):k==='t18'?t('Кандидат только для Генерала.','A candidate only for the General class.'):'')).join('')}</div>
    <label class="toggle"><input id="scaleLithium" type="checkbox" ${state.scaleLithium?'checked':''}><span>${t('Предположить масштабирование литиевых наград пропорционально Q','Assume lithium rewards scale proportionally with Q')}</span></label>
    <p class="model-warning">${t('По умолчанию литиевые награды не масштабируются с тарелками. Их зависимость от Q не подтверждена; выбор допущения может изменить весь путь.','By default, lithium rewards do not scale with scanners. Their dependence on Q is unconfirmed; this assumption can change the entire path.')}</p>
    <p class="note">${t('Поиск на максимальном IAS, 6 результатов скана. Металл, кристалл и дейтерий: по ⅓ базового МСУ — допущение. Стоимость зданий скидки и усиления ФЖ исключена.','Search at maximum IAS, 6 results per scan. Metal, crystal and deuterium: one third each of base MSU — an assumption. Lifeform discount and boost building costs are excluded.')}</p>
  </section><section class="panel flight-panel"><div class="field-grid">${field('steps')}${field('budget',t('Пусто — без лимита. Шаг бюджета 0,5 МСУ. Остановка, если лучший следующий шаг не помещается в бюджет.','Empty means unlimited. Budget increments: 0.5 MSU. Stops if the best next upgrade exceeds the remaining budget.'))}</div>
    <div class="planner-actions"><button id="generate" type="button">${t('Сгенерировать путь','Generate path')}</button><button id="reset" type="button" class="secondary">${t('Сбросить','Reset')}</button><button id="copyLink" type="button" class="secondary">${t('Скопировать ссылку','Copy share link')}</button></div><p class="status" id="status" role="status"></p></section>`;
  for(const k of Object.keys(state))$(k).addEventListener('input',()=>{
    state[k]=k==='budget'||k==='playerClass'?$(k).value:k==='scaleLithium'?$(k).checked:$(k).value===''?NaN:Number($(k).value);
    result=null;$('results').innerHTML='';updateHelp();showErrors();updateUrl();renderDetails();
    $('status').textContent=t('Настройки изменены. Сгенерируйте путь заново.','Settings changed. Generate a new path.');
  });
  $('generate').addEventListener('click',generate);
  $('reset').addEventListener('click',()=>{state={...P.defaults};renderForm();generate();});
  $('copyLink').addEventListener('click',async()=>{if(showErrors())return;updateUrl();try{await navigator.clipboard.writeText(location.href);$('status').textContent=t('Ссылка скопирована.','Link copied.');}catch{$('status').textContent=t('Скопируйте адрес из строки браузера.','Copy the address from the browser address bar.');}});
  updateHelp();showErrors();renderDetails();
}
function updateHelp(){
  $('experienceHelp').textContent=t('Усиление: +','Enhancement: +')+fmt(state.experience*.1)+'%'+t(' · максимум +10%',' · maximum +10%');
  $('discountHelp').textContent=t('Скидка T18: ','T18 discount: ')+fmt(Math.min(state.labLevel*.25,25))+'%';
  $('t18').disabled=state.playerClass!=='general';
}
function showErrors(){const errors=P.validate(state);$('validation').hidden=!errors.length;$('validation').textContent=errors.length?t('Проверьте поля: ','Check fields: ')+errors.map(k=>labels[k]?label(k):k).join(', ')+'.':'';$('generate').disabled=Boolean(errors.length);$('copyLink').disabled=Boolean(errors.length);return errors.length;}
function updateUrl(){if(P.validate(state).length)return;const url=new URL(location.href);url.search='';for(const [k,v]of Object.entries(state))url.searchParams.set(k,k==='scaleLithium'?(v?'1':'0'):v);url.searchParams.set('lang',lang);url.searchParams.set('theme',theme);history.replaceState({},'',url);}
const config=s=>`IAS ${s.scannerLevel} · M ${s.metal} · C ${s.crystal} · D ${s.deut} · Li ${s.lithium} · T18 ${s.t18}`;
const signed=n=>(n>0?'+':'')+fmt(n);
function renderResult(){
  if(!result)return;
  const r=result,first=r.rows[0];
  const reasons={steps:t('Достигнуто выбранное число шагов.','Requested step count reached.'),budget:t('Лучший следующий шаг превышает остаток бюджета.','Best next step exceeds the remaining budget.'),noGain:t('Не осталось допустимых улучшений с положительным приростом V.','No eligible upgrades with positive V gain remain.')};
  const headings=[t('Шаг','Step'),t('Улучшение','Upgrade'),t('Планеты','Planets'),t('Цена шага, МСУ','Step cost, MSU'),t('Всего, МСУ','Cumulative, MSU'),t('Δ ресурсов, МСУ/вылет','Δ resources, MSU/flight'),t('Δ чистого Li/вылет','Δ net Li/flight'),t('Δ V, МСУ/вылет','Δ V, MSU/flight'),t('Цена / Δ V','Cost / Δ V'),t('Δ V, %','Δ V, %'),t('Конфигурация после шага','Configuration after step')];
  const slices=[t('Тарелки','Scanner'),t('M / C / D / Li / T18','M / C / D / Li / T18'),'IAS',t('Q, Li/ч','Q, Li/h'),t('Ресурсы, МСУ/вылет','Resources, MSU/flight'),t('Награда Li/вылет','Reward Li/flight'),t('Получение Li/вылет','Claim Li/flight'),t('Поиск Li/вылет','Search Li/flight'),t('V, МСУ/вылет','V, MSU/flight'),t('Цена тарелок +1, МСУ','Scanner +1 cost, MSU'),t('От прошлого среза, МСУ','Since prior snapshot, MSU')];
  $('results').innerHTML=`<section class="summary-grid planner-summary"><article class="stat"><span>${t('V на старте → в конце, МСУ/вылет','Start → final V, MSU/flight')}</span><strong class="${r.final.v<0?'negative':''}">${fmt(r.final.v)}</strong><small>${fmt(r.start.v)} → ${fmt(r.final.v)}</small></article><article class="stat"><span>${t('Затраты пути, МСУ','Path cost, MSU')}</span><strong>${units(r.totalUnits)}</strong><small>${t('Только новые улучшения','New upgrades only')}</small></article><article class="stat"><span>${t('Выполнено шагов','Steps completed')}</span><strong>${r.rows.length} / ${state.steps}</strong><small>${reasons[r.reason]}</small></article></section>
    <section class="panel account-panel"><div class="next-step"><span>${t('Первое улучшение','First upgrade')}</span><strong>${first?`${label(first.type)} ${first.from} → ${first.to}`:t('Нет выбранных улучшений','No upgrades selected')}</strong><span>${first?t('На всех ','On all ')+state.planets+t(' планетах · ',' planets · ')+units(first.units)+' '+t('МСУ','MSU'):reasons[r.reason]}</span></div>
    <p class="model-warning">${t('Жадный выбор максимального положительного ΔV / цены на каждом шаге. Это не доказанный глобальный оптимум.','Greedy selection of the highest positive ΔV / cost at every step. This is not a proven global optimum.')}</p>
    <p class="note">${state.scaleLithium?t('Допущение: литиевые награды масштабируются с Q.','Assumption: lithium rewards scale with Q.'):t('Допущение: литиевые награды не масштабируются с Q.','Assumption: lithium rewards do not scale with Q.')} ${t('Цена / ΔV — стоимость единицы прироста на средний вылет, не окупаемость в днях.','Cost / ΔV is the cost of one unit of gain per average flight, not payback in days.')}</p>
    <h2 class="table-heading">${t('Каждый шаг','Every step')}</h2><div class="table-wrap"><table class="planner-table"><thead><tr>${headings.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${r.rows.map(a=>`<tr><td>${a.step}</td><td><strong>${label(a.type)}</strong><small class="sub">${a.from} → ${a.to}</small></td><td>${t('Все ','All ')}${state.planets}</td><td>${units(a.units)}<small class="sub">M ${fmt(a.resources.metal)} · C ${fmt(a.resources.crystal)} · D ${fmt(a.resources.deut)}</small></td><td>${units(a.totalUnits)}</td><td>${signed(a.deltaResource)}</td><td class="${a.deltaLithium<0?'negative':''}">${signed(a.deltaLithium)}</td><td>${signed(a.deltaV)}</td><td>${fmt(a.costPerGain)}</td><td>${a.relative===null?t('н/д','n/a'):signed(a.relative*100)+'%'}</td><td>${config(a.state)}</td></tr>`).join('')}</tbody></table></div></section>
    <section class="panel account-panel"><h2>${t('Срезы по уровням тарелок','Scanner-level snapshots')}</h2><p class="note">${t('Срез фиксируется перед следующим выбранным повышением тарелок, после промежуточных улучшений. Последний срез — состояние на остановке, может быть неполным. Достижение всех уровней не гарантируется. Первый переход считается от начала пути.','Snapshots are recorded before the next chosen scanner upgrade, after intermediate upgrades. The final snapshot is the state at stopping and may be incomplete. Not every scanner level will be reached. The first transition is measured from the path start.')}</p><div class="table-wrap"><table class="snapshot-table"><thead><tr>${slices.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${r.slices.map(a=>`<tr><td><strong>${a.state.scannerLevel}</strong>${!a.complete?`<small class="sub">${t('На остановке','At stopping')}</small>`:''}</td><td>${[a.state.metal,a.state.crystal,a.state.deut,a.state.lithium,a.state.t18].join(' / ')}</td><td>${a.metrics.ias}</td><td>${fmt(a.metrics.q)}</td><td>${fmt(a.metrics.resource)}</td><td>${fmt(a.metrics.lithium)}</td><td>${fmt(a.metrics.claim)}</td><td>${fmt(a.metrics.search)}</td><td class="${a.metrics.v<0?'negative':''}">${fmt(a.metrics.v)}</td><td>${a.scannerUnits===null?'—':units(a.scannerUnits)}</td><td>${units(a.transitionUnits)}</td></tr>`).join('')}</tbody></table></div></section>`;
}
function generate(){if(showErrors())return;try{result=P.generate(state);renderResult();updateUrl();$('status').textContent=t('Путь рассчитан.','Path calculated.');}catch(e){$('validation').hidden=false;$('validation').textContent=t('Расчёт остановлен: ','Calculation stopped: ')+e.message;}}
function renderDetails(){
  $('details').innerHTML=`<details class="panel model-panel"><summary>${t('Формулы и допущения','Formulas and assumptions')}</summary><p>${t('Фиксированная выборка второго алгоритма: 102 вылета (12 PvE, 90 PvP), 313 сканов. Ресурсы: PvP с базовым K >12 и наградой >200 млн МСУ; литий: награда ≥1,5 стоимости получения. Отбор выполнен на бонусе +62%. После улучшений пороги не применяются заново.','Fixed second-algorithm selection: 102 flights (12 PvE, 90 PvP), 313 scans. Resources: PvP with base K >12 and reward >200 million MSU; lithium: reward ≥1.5 times claim cost. Selection used a +62% bonus. Thresholds are not reapplied after upgrades.')}</p>
  <pre>IAS = P × L; Q = P × floor(168.96 × L × 1.1^(L − 1))
scale = Q / 4436514; lithiumScale = ${state.scaleLithium?'scale':'1'}
bM = 0.002 × P × TM; bC = 0.002 × P × TC; bD = 0.002 × P × TD
ResourceFactor = ((1 + bM) + (1 + bC) + (1 + bD)) / 3
bLi = 0.002 × P × TLi
E = 0.002 × T18 × P × (1 + 0.001 × R + B)
GeneralPvE = 1.5 + 0.5 × E; GeneralPvP = 2 + E
${t('Без Генерала оба множителя = 1','Without General both multipliers = 1')}
ResourceMSU = (247005407.19766924 × GeneralPvE
 + 22762786610.090557 × GeneralPvP) / 102 × scale × ResourceFactor
LithiumReward = (107452034.20347393 × GeneralPvE
 + 647816510.3907931 × GeneralPvP) / 102 × lithiumScale × (1 + bLi)
ClaimCost = 21717567.43137255 × scale
SearchCost = 2218257 × 313 / 102 × scale
NetLithium = LithiumReward − ClaimCost − SearchCost
V = ResourceMSU + lithiumValue × NetLithium
ΔV = V(after) − V(before); efficiency = ΔV / cost
MSU = Metal + 1.5 × Crystal + 3 × Deuterium
${t('Цена шага = P × цена уровня на одной планете','Step cost = P × level cost on one planet')}
${t('Тарелки: round(base × 1.5^(n − 1)), базы 90 / 45 / 15','Scanner: round(base × 1.5^(n − 1)), bases 90 / 45 / 15')}
${t('Подздания: floor(base × 1.5^(n − 1))','Buildings: floor(base × 1.5^(n − 1))')}
M: 112500 / 37500 / 18000; C: 37500 / 67500 / 27000
D: 30000 / 37500 / 45000; Li: 52500 / 37500 / 37500
T18: floor(base × n × 1.7^(n − 1) × (1 − discount))
T18 base: 300000 / 180000 / 120000
discount = min(0.0025 × labLevel, 0.25)</pre>
  <p>${t('P — планеты; L — тарелки; TM/TC/TD/TLi — уровни подзданий; R — опыт ФЖ; B — усиление зданий в долях единицы. Состав миссий, распределение звёзд и волн, доли PvE/PvP и среднее отношение уровня аномалии к IAS считаются неизменными.','P: planets; L: scanner level; TM/TC/TD/TLi: building levels; R: lifeform experience; B: building boost as a fraction. Mission mix, star and wave distributions, PvE/PvP proportions and average anomaly level relative to IAS are held fixed.')}</p>
  <p>${t('Q — параметр масштабирования, не бесплатный приток лития; Q × 24 к доходу не добавляется. Литий переводится в МСУ ровно один раз. При V ≤ 0 относительный процент не определён, но выбор по абсолютному ΔV продолжает работать. При равной эффективности выбирается меньшая цена, затем порядок: тарелки, M, C, D, Li, T18.','Q is a scaling parameter, not free lithium income; Q × 24 is not added. Lithium is valued in MSU exactly once. If V ≤ 0 the relative percentage is undefined; absolute ΔV selection still works. Equal efficiencies are resolved by lower cost, then scanner, M, C, D, Li, T18.')}</p>
  <p>${t('Точные ресурсы и стоимость МСУ хранятся в BigInt; награды и эффективность — приближённые числа. Диапазоны калькулятора: тарелки/T18 до 80, подздания до 50, планеты до 50. Это не подтверждённые игровые лимиты.','Resource costs and MSU totals use exact BigInt arithmetic; rewards and efficiencies use approximate numbers. Calculator ranges: scanner/T18 up to 80, buildings up to 50, planets up to 50. These are not confirmed game limits.')}</p>
  <p><a href="https://docs.google.com/spreadsheets/d/1qThnC-g_e5L8qr_c1JbNX0UI3StwBIj048nCSvhY9Ps/edit" target="_blank" rel="noreferrer">${t('Исходный эксперимент ↗','Source experiment ↗')}</a> · <a href="https://github.com/zikunow/ogame-orion-rewards-calculator" target="_blank" rel="noreferrer">${t('Модель калькулятора наград ↗','Rewards calculator model ↗')}</a></p></details>`;
}
$('calculatorSelect').addEventListener('change',()=>{
  const selected=$('calculatorSelect').value;
  if(selected==='https://zikunow.github.io/ogame-orion-upgrade-planner/')return;
  const target=new URL(selected);
  target.searchParams.set('lang',lang);
  target.searchParams.set('theme',theme);
  location.assign(target.href);
});
$('langRu').addEventListener('click',()=>{lang='ru';renderForm();renderResult();updateUrl();});
$('langEn').addEventListener('click',()=>{lang='en';renderForm();renderResult();updateUrl();});
$('theme').addEventListener('change',()=>{theme=$('theme').value;document.documentElement.dataset.theme=theme;updateUrl();});
renderForm();generate();
