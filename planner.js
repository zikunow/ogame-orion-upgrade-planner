'use strict';
const P=OrionPlanner,$=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
let lang=params.get('lang')==='en'?'en':'ru',state={...P.defaults},result=null;
const t=(ru,en)=>lang==='ru'?ru:en;
const labels={planets:['Планеты','Planets'],playerClass:['Класс','Class'],mission:['Режим награды для T18','T18 reward mode'],scannerLevel:['Тарелки','Scanner'],metal:['Металлическое подздание','Metal building'],crystal:['Кристаллическое подздание','Crystal building'],deut:['Дейтериевое подздание','Deuterium building'],t18:['T18 на каждой планете','T18 on each planet'],experience:['Уровень опыта ФЖ','Lifeform experience level'],techBoost:['Усиление зданием ФЖ, %','Lifeform building boost, %'],labLevel:['Уровень здания скидки исследований','Research discount building level'],steps:['Количество шагов','Number of steps'],budget:['Бюджет, МСУ (необязательно)','Budget, MSU (optional)']};
const label=k=>labels[k][lang==='ru'?0:1];
for(const k of Object.keys(state))if(params.has(k))state[k]=['budget','playerClass','mission'].includes(k)?params.get(k):Number(params.get(k));
let theme=params.get('theme')==='cosmic'?'cosmic':'minimal';
const fmt=n=>new Intl.NumberFormat(lang==='ru'?'ru-RU':'en-US',{maximumFractionDigits:2}).format(n);
const units=n=>new Intl.NumberFormat(lang==='ru'?'ru-RU':'en-US').format(n/2n)+(n%2n?(lang==='ru'?',5':'.5'):'');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function field(k,help='') {
  const opts=k==='playerClass'?[['general',t('Генерал','General')],['collector',t('Коллекционер','Collector')],['discoverer',t('Исследователь','Discoverer')]]:k==='steps'?[[10,'10'],[50,'50'],[100,'100']]:k==='mission'?[['pvp','PvP'],['pve','PvE']]:null;
  const max=k==='planets'?50:k==='experience'||k==='labLevel'?100:P.caps[k]??(k==='techBoost'?1000:null);
  const min=k==='planets'||k==='scannerLevel'?1:0;
  const control=opts?`<select id="${k}" >${opts.map(([v,name])=>`<option value="${v}" ${String(state[k])===String(v)?'selected':''}>${name}</option>`).join('')}</select>`:`<input id="${k}" type="${k==='budget'?'text':'number'}" value="${escape(state[k])}" ${k==='budget'?'inputmode="decimal"':`min="${min}" ${max===null?'':`max="${max}"`} step="${k==='techBoost'?'any':'1'}"`} ${k==='t18'&&state.playerClass!=='general'?'disabled':''}>`;
  return `<label><span>${label(k)}</span>${control}${help?`<small>${help}</small>`:''}</label>`;
}
function renderForm() {
  $('title').textContent=t('Планировщик улучшений','Upgrade planner');document.title=t('Планировщик улучшений Ориона — OGame','Orion Upgrade Planner — OGame');
  $('intro').textContent=t('Введите текущие уровни и получите порядок улучшений с наименьшей стоимостью за +1% ресурсной награды. Каждый шаг — +1 уровень сразу на всех планетах.','Enter your current levels to find upgrades with the lowest MSU cost per +1% resource reward. Every step adds one level on all planets.');
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
    <div class="field-grid">${['planets','playerClass','scannerLevel','metal','crystal','deut','t18','mission','experience','techBoost','labLevel'].map(k=>field(k,k==='experience'?`<span id="experienceHelp"></span>`:k==='labLevel'?`<span id="discountHelp"></span>`:k==='techBoost'?t('Усиливает эффект T18.','Strengthens the T18 effect.'):k==='t18'?t('Кандидат только для Генерала.','A candidate only for the General class.'):'')).join('')}</div>
    <p class="note">${t('Стартовая ресурсная награда принята за 100%. Металл, кристалл и дейтерий составляют по ⅓ базового МСУ.','Starting resource reward is set to 100%. Metal, crystal and deuterium each account for one third of base MSU.')}</p>
  </section><section class="panel flight-panel"><div class="field-grid">${field('steps')}${field('budget',t('Пусто — без лимита. Шаг бюджета 0,5 МСУ. Остановка, если лучший следующий шаг не помещается в бюджет.','Empty means unlimited. Budget increments: 0.5 MSU. Stops if the best next upgrade exceeds the remaining budget.'))}</div>
    <div class="planner-actions"><button id="generate" type="button">${t('Сгенерировать путь','Generate path')}</button><button id="reset" type="button" class="secondary">${t('Сбросить','Reset')}</button><button id="copyLink" type="button" class="secondary">${t('Скопировать ссылку','Copy share link')}</button></div><p class="status" id="status" role="status"></p></section>`;
  for(const k of Object.keys(state))$(k).addEventListener('input',()=>{
    state[k]=['budget','playerClass','mission'].includes(k)?$(k).value:$(k).value===''?NaN:Number($(k).value);
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
function updateUrl(){if(P.validate(state).length)return;const url=new URL(location.href);url.search='';for(const [k,v]of Object.entries(state))url.searchParams.set(k,v);url.searchParams.set('lang',lang);url.searchParams.set('theme',theme);history.replaceState({},'',url);}
const config=s=>`IAS ${s.scannerLevel} · M ${s.metal} · C ${s.crystal} · D ${s.deut} · T18 ${s.t18}`;
const signed=n=>(n>0?'+':'')+fmt(n);
function renderResult(){
  if(!result)return;
  const r=result,first=r.rows[0];
  const reasons={steps:t('Достигнуто выбранное число шагов.','Requested step count reached.'),budget:t('Лучший следующий шаг превышает остаток бюджета.','Best next step exceeds the remaining budget.'),noGain:t('Не осталось допустимых улучшений с положительным приростом.','No eligible upgrades with positive gain remain.')};
  const headings=[t('Шаг','Step'),t('Улучшение','Upgrade'),t('Планеты','Planets'),t('Цена шага, МСУ','Step cost, MSU'),t('Всего, МСУ','Cumulative, MSU'),t('Прирост шага, %','Step gain, %'),t('Общий прирост к старту, %','Total gain vs start, %'),t('МСУ / +1%','MSU / +1%'),t('Конфигурация после шага','Configuration after step')];
  const slices=[t('Тарелки','Scanner'),'M / C / D / T18','IAS',t('Награда к старту, %','Reward vs start, %'),t('Общий прирост, %','Total gain, %'),t('Цена тарелок +1, МСУ','Scanner +1 cost, MSU'),t('От прошлого среза, МСУ','Since prior snapshot, MSU')];
  $('results').innerHTML=`<section class="summary-grid planner-summary"><article class="stat"><span>${t('Прирост ресурсной награды к старту','Resource reward gain vs start')}</span><strong>+${fmt(r.totalGainPercent)}%</strong><small>${t('Старт 100% → ','Start 100% → ')}${fmt(100+r.totalGainPercent)}%</small></article><article class="stat"><span>${t('Затраты пути, МСУ','Path cost, MSU')}</span><strong>${units(r.totalUnits)}</strong><small>${t('Только новые улучшения','New upgrades only')}</small></article><article class="stat"><span>${t('Выполнено шагов','Steps completed')}</span><strong>${r.rows.length} / ${state.steps}</strong><small>${reasons[r.reason]}</small></article></section>
    <section class="panel account-panel"><div class="next-step"><span>${t('Первое улучшение','First upgrade')}</span><strong>${first?`${label(first.type)} ${first.from} → ${first.to}`:t('Нет выбранных улучшений','No upgrades selected')}</strong><span>${first?t('На всех ','On all ')+state.planets+t(' планетах · ',' planets · ')+units(first.units)+' '+t('МСУ','MSU')+' · +'+fmt(first.gainPercent)+'% · '+fmt(first.msuPerPercent)+' '+t('МСУ / +1%','MSU / +1%'):reasons[r.reason]}</span></div>
    <p class="note">${t('Прирост шага сравнивается с конфигурацией перед этим шагом. Общий прирост сравнивается со стартом: проценты последовательных шагов перемножаются, а не складываются.','Step gain is measured against the configuration before that step. Total gain is measured against the start: successive percentage gains compound rather than add.')}</p>
    <h2 class="table-heading">${t('Каждый шаг','Every step')}</h2><div class="table-wrap"><table class="planner-table"><thead><tr>${headings.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${r.rows.map(a=>`<tr><td>${a.step}</td><td><strong>${label(a.type)}</strong><small class="sub">${a.from} → ${a.to}</small></td><td>${t('Все ','All ')}${state.planets}</td><td>${units(a.units)}<small class="sub">M ${fmt(a.resources.metal)} · C ${fmt(a.resources.crystal)} · D ${fmt(a.resources.deut)}</small></td><td>${units(a.totalUnits)}</td><td>+${fmt(a.gainPercent)}%</td><td>+${fmt(a.totalGainPercent)}%</td><td><strong>${fmt(a.msuPerPercent)}</strong></td><td>${config(a.state)}</td></tr>`).join('')}</tbody></table></div></section>
    <section class="panel account-panel"><h2>${t('Срезы по уровням тарелок','Scanner-level snapshots')}</h2><p class="note">${t('Срез фиксируется перед следующим выбранным повышением тарелок, после промежуточных улучшений. Последний срез — состояние на остановке. Первый переход считается от начала пути.','Snapshots are recorded before the next chosen scanner upgrade, after intermediate upgrades. The final snapshot shows the stopping state. The first transition is measured from the path start.')}</p><div class="table-wrap"><table class="snapshot-table"><thead><tr>${slices.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${r.slices.map(a=>`<tr><td><strong>${a.state.scannerLevel}</strong>${!a.complete?`<small class="sub">${t('На остановке','At stopping')}</small>`:''}</td><td>${[a.state.metal,a.state.crystal,a.state.deut,a.state.t18].join(' / ')}</td><td>${a.metrics.ias}</td><td>${fmt(100+a.totalGainPercent)}%</td><td>+${fmt(a.totalGainPercent)}%</td><td>${a.scannerUnits===null?'—':units(a.scannerUnits)}</td><td>${units(a.transitionUnits)}</td></tr>`).join('')}</tbody></table></div></section>`;
}
function generate(){if(showErrors())return;try{result=P.generate(state);renderResult();updateUrl();$('status').textContent=t('Путь рассчитан.','Path calculated.');}catch(e){$('validation').hidden=false;$('validation').textContent=t('Расчёт остановлен: ','Calculation stopped: ')+e.message;}}
function renderDetails(){
  $('details').innerHTML=`<details class="panel model-panel"><summary>${t('Как считается прирост и выбираются улучшения','How gains and upgrades are calculated')}</summary>
  <p>${t('Сравниваем только ресурсную награду. Стартовая конфигурация — X = 100%. Абсолютный доход и число вылетов для этого расчёта не нужны.','Only resource rewards are compared. The starting configuration is X = 100%. Absolute income and flight counts are not needed.')}</p>
  <pre>bM = 0.002 × P × TM; bC = 0.002 × P × TC; bD = 0.002 × P × TD
ResourceFactor = ((1 + bM) + (1 + bC) + (1 + bD)) / 3
S(L) = floor(168.96 × L × 1.1^(L − 1))
ScannerFactor = S(L) / S(39)
E = 0.002 × T18 × P × (1 + 0.001 × R + B)
GeneralPvE = 1.5 + 0.5 × E; GeneralPvP = 2 + E
${t('Без Генерала ClassFactor = 1; T18 не сравнивается','Without General ClassFactor = 1; T18 is excluded')}
F = ScannerFactor × ResourceFactor × ClassFactor
${t('Прирост шага, % = (F после / F до − 1) × 100','Step gain, % = (F after / F before − 1) × 100')}
${t('Общий прирост, % = (F после / F старт − 1) × 100','Total gain, % = (F after / F start − 1) × 100')}
${t('МСУ / +1% = цена шага / прирост шага в процентах','MSU / +1% = step cost / step percentage gain')}
MSU = Metal + 1.5 × Crystal + 3 × Deuterium
${t('Цена шага = P × цена нового уровня на одной планете','Step cost = P × new level cost on one planet')}
${t('Тарелки: round(base × 1.5^(n − 1)), базы 90 / 45 / 15','Scanner: round(base × 1.5^(n − 1)), bases 90 / 45 / 15')}
${t('Подздания: floor(base × 1.5^(n − 1))','Buildings: floor(base × 1.5^(n − 1))')}
M: 112500 / 37500 / 18000; C: 37500 / 67500 / 27000
D: 30000 / 37500 / 45000
T18: floor(base × n × 1.7^(n − 1) × (1 − discount))
T18 base: 300000 / 180000 / 120000
discount = min(0.0025 × labLevel, 0.25)</pre>
  <p>${t('Пример: 18 планет, все три подздания уровня 15. Общий ресурсный множитель 1,54. Металл 15 → 16 добавляет 3,6 п.п. к бонусу металла и 1,2 п.п. к общему бонусу. Фактический прирост награды: 1,552 / 1,54 − 1 = 0,7792%. При нулевых исходных подзданиях прирост такого шага составит ровно 1,2%.','Example: 18 planets, all three resource buildings at level 15. The resource factor is 1.54. Metal 15 → 16 adds 3.6 pp to the metal bonus and 1.2 pp to the overall bonus. Actual reward gain: 1.552 / 1.54 − 1 = 0.7792%. With all resource buildings initially at zero, the same single-level upgrade gives exactly 1.2%.')}</p>
  <p>${t('Для T18 используется выбранный режим PvP или PvE; по умолчанию PvP. Для тарелок сохраняется предположение, что ресурсные награды растут пропорционально S(L). Общая скорость экономики и число планет в этом масштабе сокращаются при сравнении уровней тарелок. Число планет продолжает влиять на бонусы подзданий, T18 и стоимость всех улучшений.','T18 uses the selected PvP or PvE mode, with PvP as the default. Scanner resource rewards are assumed to scale with S(L). A common economy speed and planet count cancel in the scanner-level ratio. Planet count still affects building bonuses, T18 and all upgrade costs.')}</p>
  <p>${t('На каждом шаге выбирается минимальное положительное МСУ / +1%. Это жадный выбор ближайшего улучшения, не доказанный глобальный оптимум. При равной эффективности выбирается меньшая цена, затем тарелки, M, C, D, T18. Если лучший шаг не помещается в бюджет, путь останавливается.','Every step selects the lowest positive MSU / +1%. This greedy choice is not a proven global optimum. Ties use lower cost, then scanner, M, C, D, T18. The path stops if the best upgrade exceeds the remaining budget.')}</p>
  <p>${t('Стоимость уже построенных уровней и строительство зданий скидки и усиления ФЖ не включены. Ресурсные доли по ⅓ — допущение. Стоимости точные, проценты приближённые. Диапазоны калькулятора: до 50 планет, тарелки/T18 до 80, подздания до 50; это не подтверждённые игровые лимиты.','Previously built levels and lifeform discount/boost building construction are excluded. Equal one-third resource shares are an assumption. Costs are exact; percentages are approximate. Calculator ranges: up to 50 planets, scanner/T18 level 80, buildings level 50; these are not confirmed game limits.')}</p></details>`;
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
