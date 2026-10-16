'use strict';
(() => {
  const KEY = 'magic-inside-independent-tracker:v1';
  const APP = 'magic-inside-independent-tracker';
  const ARTIFACTS = ['Волшебная Кисть','Зеркало Мечты','Компас Намерений','Сундук Благодарностей','Амулет Силы','Волшебный Пояс Движения','Щит Настойчивости','Мост Радости','Ловец Мыслей','Волшебная Кнопка Паузы'];
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const n=document.createElement(tag); if(cls)n.className=cls; if(text!==undefined)n.textContent=text;return n; };
  const localDate = (d=new Date()) => [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  const dateObj = s => new Date(s+'T12:00:00');
  const shift = (s,n) => { const d=dateObj(s); d.setDate(d.getDate()+n); return localDate(d); };
  const longDate = s => dateObj(s).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'});
  const validDate = s => typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && s>='2000-01-01' && s<=localDate() && localDate(dateObj(s))===s;
  const defaults = () => ({app:APP,version:1,entries:[],settings:{days:[0,1,2,3,4,5,6],time:'19:00',reminders:true}});
  let state=defaults(), editing=null, toastTimer, storageBlocked=false;
  function warning(text){ $('storage-warning').textContent=text; $('storage-warning').hidden=false; }
  function validate(raw){
    if(!raw || raw.app!==APP || raw.version!==1 || !Array.isArray(raw.entries) || raw.entries.length>10000) throw Error('Это не копия прогресса этого трекера или её версия не поддерживается.');
    const entries=[], seen=new Set();
    for(const r of raw.entries){
      if(!r || typeof r.id!=='string' || r.id.length<1 || r.id.length>100 || !Number.isInteger(r.day) || r.day<1 || r.day>10 || !validDate(r.date) || typeof r.note!=='string' || r.note.length>1000) throw Error('В файле есть некорректные записи или даты из будущего. Импорт отменён.');
      const pair=r.date+':'+r.day;
      if(!seen.has(pair)){entries.push({id:r.id,day:r.day,date:r.date,note:r.note});seen.add(pair);}
    }
    const s=raw.settings;
    if(!s || !Array.isArray(s.days) || s.days.some(d=>!Number.isInteger(d)||d<0||d>6) || typeof s.reminders!=='boolean' || typeof s.time!=='string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time)) throw Error('В файле некорректные настройки ритма. Импорт отменён.');
    return {app:APP,version:1,entries,settings:{days:[...new Set(s.days)].sort(),time:s.time,reminders:s.reminders}};
  }
  function load(){
    try{ const raw=localStorage.getItem(KEY); state=raw?validate(JSON.parse(raw)):defaults();storageBlocked=false; }
    catch(e){storageBlocked=true;warning('Не удалось прочитать сохранённые отметки. До восстановления копии лучше не добавлять новые записи. Если браузер ограничивает хранение, используйте обычную вкладку и сохраняйте копию прогресса.');}
  }
  function save(){
    try{if(storageBlocked)throw Error("Storage preserved");localStorage.setItem(KEY,JSON.stringify(state));return true;}
    catch(e){warning('Браузер не смог сохранить изменения. Сейчас они доступны только до закрытия или перезагрузки страницы. Нажмите «Сохранить копию», чтобы не потерять их.');return false;}
  }
  function toast(text,action){
    clearTimeout(toastTimer);const box=$('toast');box.replaceChildren(el('span','',text));
    if(action){ const b=el('button','',action.label);b.type='button';b.onclick=()=>{action.run();box.hidden=true;};box.append(b); }
    box.hidden=false;toastTimer=setTimeout(()=>box.hidden=true,action?20000:7000);
  }
  function plural(n,one,few,many){const x=n%100,y=n%10;return x>=11&&x<=14?many:y===1?one:y>=2&&y<=4?few:many;}
  function openEntry(day,record){
    clearTimeout(toastTimer);$('toast').hidden=true;
    editing=record?record.id:null;
    $('entry-title').textContent=record?'Изменить отметку':'Моя практика';
    $('artifact').value=record?record.day:day||ARTIFACTS.findIndex((_,i)=>!state.entries.some(e=>e.day===i+1))+1||1;
    $('date').max=localDate();$('date').min='2000-01-01';$('date').value=record?record.date:localDate();
    $('note').value=record?record.note:'';$('form-error').textContent='';
    if(!record)prefill();$('entry-dialog').showModal();
  }
  function prefill(){if(editing)return;const r=state.entries.find(e=>e.day===Number($('artifact').value)&&e.date===$('date').value);$('note').value=r?r.note:'';}
  function render(){
    const today=localDate(),unique=new Set(state.entries.map(e=>e.day)),n=unique.size;
    $('total').textContent=n;$('progress-fill').style.width=n*10+'%';document.querySelector('[role=progressbar]').setAttribute('aria-valuenow',n);
    const recent=[...state.entries].sort((a,b)=>b.date.localeCompare(a.date)||b.day-a.day)[0];
    $('last').textContent=recent?'Последняя отметка: '+longDate(recent.date)+' · '+ARTIFACTS[recent.day-1]:'Начните с одной небольшой практики.';
    const map=$('artifacts');map.replaceChildren();
    ARTIFACTS.forEach((name,i)=>{
      const done=unique.has(i+1),b=el('button','artifact'+(done?' done':''));b.type='button';
      b.setAttribute('aria-label','День '+(i+1)+'. '+name+'. '+(done?'Практика отмечена. Добавить повторение':'Отметить практику'));
      b.append(el('span','num','ДЕНЬ '+String(i+1).padStart(2,'0')),el('span','star',done?'★':'☆'),el('strong','',name),el('small','',done?'Отмечено · повторить +':'Зажечь звезду +'));
      b.onclick=()=>openEntry(i+1);map.append(b);
    });
    $('reward').textContent=n===10?'Ваше созвездие собрано. Все десять практик попробованы — возвращайтесь к тем, что поддерживают вас.':n>=5?'Пять звёзд уже зажглись. Не нужно торопиться — впереди ваш собственный темп.':n>=1?'Первая звезда уже с вами. Каждый новый артефакт добавит свет, а повторение поддержит ритм.':'Первая звезда зажжётся после вашей отметки.';
    const week=$('week');week.replaceChildren();let active=0;
    for(let i=-6;i<=0;i++){
      const d=shift(today,i),has=state.entries.some(e=>e.date===d),obj=dateObj(d),cell=el('div','week-day'+(has?' active':'')+(i===0?' today':''));if(has)active++;
      cell.setAttribute('aria-label',longDate(d)+(has?' — практика отмечена':' — без отметки')+(i===0?' — сегодня':''));
      cell.append(el('span','',obj.toLocaleDateString('ru-RU',{weekday:'short'})),el('span','week-light',has?'★':'·'));
      const t=el('time','',obj.getDate());t.dateTime=d;cell.append(t);week.append(cell);
    }
    $('week-summary').textContent=active?'Практика была с вами '+active+' '+plural(active,'день','дня','дней')+' за последние семь дней.':'Пока нет отметок за последние семь дней. Можно начать сегодня.';
    reminder(today,recent);
    const journal=$('journal'),rows=[...state.entries].sort((a,b)=>b.date.localeCompare(a.date)||b.day-a.day);
    $('entry-count').textContent=rows.length+' '+plural(rows.length,'запись','записи','записей');journal.replaceChildren();
    if(!rows.length){const empty=el('div','empty');empty.append(el('strong','','Здесь останутся ваши маленькие открытия'),el('p','','Отметьте практику и, если хочется, добавьте несколько слов. Писать заметку необязательно.'));journal.append(empty);}
    else{
      const grid=el('div','entries');
      for(const r of rows){
        const a=el('article','entry'),top=el('div','entry-top'),t=el('time','',longDate(r.date));t.dateTime=r.date;
        top.append(t,el('span','','День '+r.day+' · ★'));a.append(top,el('h3','',ARTIFACTS[r.day-1]),el('p',r.note?'':'subtle',r.note||'Практика отмечена. Можно оставить этот момент без слов.'));
        const controls=el('div','entry-controls'),edit=el('button','plain-button','Изменить'),del=el('button','plain-button','Убрать отметку');edit.type=del.type='button';
        edit.setAttribute('aria-label','Изменить отметку: '+ARTIFACTS[r.day-1]+', '+longDate(r.date));
        del.setAttribute('aria-label','Убрать отметку: '+ARTIFACTS[r.day-1]+', '+longDate(r.date));
        edit.onclick=()=>openEntry(r.day,r);
        del.onclick=()=>{if(!confirm('Убрать эту отметку и её заметку? Остальные записи сохранятся.'))return;state.entries=state.entries.filter(e=>e.id!==r.id);save();render();toast('Отметка убрана.',{label:'Отменить',run:()=>{if(!state.entries.some(e=>e.day===r.day&&e.date===r.date))state.entries.push(r);save();render();}});};
        controls.append(edit,del);a.append(controls);grid.append(a);
      }journal.append(grid);
    }
  }
  function reminder(today,recent){
    const settings=state.settings,has=state.entries.some(e=>e.date===today),scheduled=settings.days.includes(dateObj(today).getDay()),now=new Date(),time=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
    let title='Можно начать с того места, где вы сейчас',text='Выберите артефакт или повторите знакомую практику. Здесь нет потерянных серий.';
    if(!settings.reminders){title='Ваш ритм — ваш выбор';text='Напоминания выключены. Все отметки и звёзды остаются на месте.';}
    else if(has){title='Сегодня ваша звезда уже зажглась';text='Практика отмечена. Можно вернуться к делам или записать небольшое наблюдение.';}
    else if(scheduled&&time>=settings.time){title='Ваше время для практики';text='Сегодня практика пока не отмечена. Можно позаниматься, отметить уже выполненное или выбрать другое время в настройках.';}
    else if(recent){
      let missed=false;
      for(let i=1;i<=7;i++){const d=shift(today,-i);if(d>recent.date&&settings.days.includes(dateObj(d).getDay()))missed=true;}
      if(missed){title='Можно вернуться без наверстывания';text='Есть запланированные дни без отметок. Если вы практиковали — добавьте дату. Если был перерыв — звёзды на месте, можно продолжить с небольшого шага.';}
      else{title='Небольшие шаги остаются с вами';text=scheduled?'Сегодня вы выбрали время '+settings.time+'. Напоминание появится здесь после этого времени.':'Сегодня нет запланированного занятия. Повторить любимую практику можно в любой момент.';}
    }else if(!scheduled){text='Сегодня нет запланированного занятия. Начните, когда будет удобно.';}
    $('reminder-title').textContent=title;$('reminder-text').textContent=text;
  }
  function settingsUI(){
    $('days').replaceChildren();
    [1,2,3,4,5,6,0].forEach((day,i)=>{const label=el('label','day-option'),input=el('input');input.type='checkbox';input.value=day;input.checked=state.settings.days.includes(day);input.setAttribute('aria-label',['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'][i]);label.append(input,el('span','',['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][i]));$('days').append(label);});
    $('time').value=state.settings.time;$('reminders').checked=state.settings.reminders;
  }
  ARTIFACTS.forEach((name,i)=>{const o=el('option','',(i+1)+'. '+name);o.value=i+1;$('artifact').append(o);});
  load();settingsUI();render();
  $('add').onclick=()=>openEntry();$('close-dialog').onclick=()=>$('entry-dialog').close();
  $('entry-dialog').addEventListener('click',e=>{if(e.target===$('entry-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
  $('artifact').onchange=prefill;$('date').onchange=prefill;
  $('entry-form').onsubmit=e=>{
    e.preventDefault();const day=Number($('artifact').value),date=$('date').value,note=$('note').value.trim();
    if(!validDate(date)||day<1||day>10||note.length>1000){$('form-error').textContent='Проверьте дату и артефакт. Нельзя отмечать будущие дни.';return;}
    const existing=state.entries.find(r=>r.day===day&&r.date===date);
    if(editing&&existing&&existing.id!==editing){$('form-error').textContent='На эту дату уже есть отметка этого артефакта. Измените её в копилке или выберите другую дату.';return;}
    if(state.entries.length>=10000&&!existing&&!editing){$('form-error').textContent='Достигнут предел в 10 000 записей. Сохраните копию прогресса перед дальнейшими изменениями.';return;}
    const id=editing||(existing?existing.id:crypto.randomUUID()),r={id,day,date,note};
    state.entries=state.entries.filter(v=>v.id!==id);state.entries.push(r);const persisted=save();render();$('entry-dialog').close();toast(persisted?'Практика сохранена. Ваш шаг остаётся с вами.':'Отметка добавлена только на эту сессию. Сохраните копию прогресса.');
  };
  $('rhythm-form').onsubmit=e=>{e.preventDefault();state.settings={days:[...$('days').querySelectorAll('input:checked')].map(n=>Number(n.value)),time:$('time').value,reminders:$('reminders').checked};const ok=save();render();toast(ok?'Ваш ритм сохранён. Напоминания работают только на открытой странице.':'Ритм изменён только до перезагрузки. Сохраните копию.');};
  $('export').onclick=()=>{
    const blob=new Blob([JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='magic-inside-progress-'+localDate()+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Копия подготовлена. Проверьте загрузки: в файле есть ваши личные заметки.');
  };
  $('import').onclick=()=>$('import-file').click();
  $('import-file').onchange=async e=>{
    const file=e.target.files[0];if(!file)return;
    try{
      if(file.size>15000000)throw Error('Файл слишком большой. Выберите JSON-копию, сохранённую этим трекером.');
      const imported=validate(JSON.parse(await file.text()));
      const byPair=new Map(state.entries.map(r=>[r.date+':'+r.day,r])),ids=new Set(state.entries.map(r=>r.id));let added=0,conflicts=0;
      for(const r of imported.entries){const key=r.date+':'+r.day;if(!byPair.has(key)){const clean={...r,id:ids.has(r.id)?crypto.randomUUID():r.id};byPair.set(key,clean);ids.add(clean.id);added++;}else if(byPair.get(key).note!==r.note)conflicts++;}
      if(byPair.size>10000)throw Error('После объединения получится больше 10 000 записей. Импорт отменён.');
      const message='Добавить '+added+' '+plural(added,'запись','записи','записей')+' из копии? Текущие записи и настройки сохранятся.'+(conflicts?' В '+conflicts+' совпадающих отметках заметки отличаются: сохранятся текущие заметки. Исходный файл копии останется без изменений.':'');
      if(!confirm(message+(storageBlocked?' Внимание: нечитаемые данные трекера в браузере будут заменены восстановленными отметками.':'')))return;
      storageBlocked=false;state.entries=[...byPair.values()];const ok=save();render();toast(ok?'Копия объединена. Добавлено записей: '+added+'.':'Копия прочитана, но браузер не сохранил изменения. Экспортируйте объединённый прогресс.');
    }catch(error){toast(error instanceof SyntaxError?'Не удалось прочитать JSON. Выберите файл копии прогресса.':error.message||'Не удалось восстановить копию. Текущие записи не изменены.');}
    finally{e.target.value='';}
  };
  window.addEventListener('focus',()=>{ $('date').max=localDate();render(); });
  window.addEventListener('storage',e=>{if(e.key===KEY){load();settingsUI();render();}});
  setInterval(()=>reminder(localDate(),[...state.entries].sort((a,b)=>b.date.localeCompare(a.date))[0]),60000);
})();
