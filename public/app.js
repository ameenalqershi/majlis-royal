const $=id=>document.getElementById(id);
const modal=$('modal'), body=$('dialogBody'), storage='majlis-seat-v1';
const colors=TableRules.colors;
const esc=v=>String(v).replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k]));
let session=JSON.parse(localStorage.getItem(storage)||'null'), snapshot, selected=-1, invite='', busy=false;
let addresses=[];
let showingRoom=!!session;
const invited=new URLSearchParams(location.search).get('room')?.toUpperCase();
const guides=[
 ['اللعب كفريق','يجلس الشريكان متقابلين. في الطاولة الرباعية فريقان، وفي الطاولة السداسية ثلاثة فرق من لاعبين. عندما تصل أحجارك الأربعة إلى الأمان، استخدم أوراقك لتحريك أحجار شريكك. يفوز أول فريق يؤمّن أحجاره الثمانية.'],
 ['دليل الأوراق','قواعد مجلس: الآس ينزّل حجرًا أو يحرّكه ١ أو ١١. الملك ينزّل حجرًا أو يحرّكه ١٣. الملكة ١٢، والشاب يبادل حجرًا بحجر من لون آخر على المسار. الأربعة تتراجع، والخمسة تحرّك أي حجر على المسار ما عدا قاعدة خصم أو شريك. السبعة تتحرك كاملة أو تتوزع بين حجرين. بقية الأوراق تتحرك بقيمتها.'],
 ['المسار والأمان','تبدأ الأحجار في البيت، وتسير مع عقارب الساعة. لا تتجاوز حجرًا من لون الحجر المتحرّك أو حجرًا محميًا على قاعدته. الهبوط على حجر بلون آخر يعيده إلى بيته. ادخل الأمان بعد خانة المسار السابقة للقاعدة بعدد خطوات دقيق. لا تقفز فوق حجر داخل الأمان. إذا تعذّرت كل حركات يدك، اختر ورقة لحرقها.']
];
async function api(action,data={}) {
  const res=await fetch('/api/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const value=await res.json();if(!res.ok || value.error)throw Error(value.error||'تعذّر الاتصال');return value;
}
function show(html){body.innerHTML=html;if(!modal.open)modal.showModal();}
function notify(msg){$('toast').textContent=msg;clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('toast').textContent='',4000);}
function guide(n){
  show('<h2>'+guides[n][0]+'</h2><div class="guideTabs">'+guides.map((g,i)=>'<button class="light '+(i===n?'on':'')+'" data-guide="'+i+'">'+g[0]+'</button>').join('')+'</div><p>'+guides[n][1]+'</p>');
}
function form(join=false,kind="jackaroo") {
  if(session && (!invited || invited===session.code))return resume();
  show('<h2>'+(join?'انضم إلى طاولة':('طاولة '+(kind==='mercy'?'أونو لا ترحم':'جاكارو')))+'</h2><form id="entry"><label class="field">اسم اللاعب<input name="name" required maxlength="24" autocomplete="nickname"></label>'+(join?'<label class="field">رمز الطاولة<input dir="ltr" name="code" required maxlength="6" minlength="6" pattern="[a-fA-F0-9]{6}" value="'+esc(invited||'')+'"></label><button type="button" class="light" id="scanInvite">مسح رمز الدعوة</button>':'<label class="field">عدد اللاعبين<select name="capacity">'+(kind==='mercy'?[2,3,4,5,6].map(n=>'<option value="'+n+'">'+n+' لاعبين</option>').join(''):'<option value="4">أربعة لاعبين · فريقان</option><option value="6">ستة لاعبين · ثلاثة فرق</option>')+'</select></label>')+'<p class="hint">اتصلوا بشبكة واي فاي واحدة أو بنقطة اتصال المضيف.</p><p class="err" role="alert"></p><button class="solid">'+(join?'تأكيد الانضمام':'افتح الطاولة')+'</button></form>');
  if($('scanInvite'))$('scanInvite').onclick=openScanner;
  $('entry').onsubmit=async e=>{
    e.preventDefault();const f=e.target;f.querySelector('button.solid').disabled=true;
    try{const data=Object.fromEntries(new FormData(f));if(data.capacity){data.capacity=Number(data.capacity);data.kind=kind;}if(data.code)data.code=data.code.toUpperCase();
      session=await api(join?'join':'create',data);localStorage.setItem(storage,JSON.stringify(session));
      history.replaceState(null,'','/');modal.close();snapshot=null;await resume();
    }catch(err){f.querySelector('.err').textContent=err.message;}finally{f.querySelector('button.solid').disabled=false;}
  };
}
async function resume(){showingRoom=true;await refresh(true);}
async function refresh(force=false){
  if(!session || !showingRoom || busy)return;
  const current=session;
  try{const state=await api('state',session);
    if(!showingRoom || session!==current || (snapshot && state.rev<snapshot.rev))return;
    if(force || !snapshot || state.rev!==snapshot.rev){snapshot=state;render();}
  }catch(err){
    if(/العثور|انتهت/.test(err.message)){session=null;snapshot=null;localStorage.removeItem(storage);home();}
    notify(err.message);
  }
}
function home(){showingRoom=false;$('room').hidden=true;$('landing').hidden=false;for(const [id,label] of [['create','العب جاكارو'],['mercyCreate','العب أونو']])$(id).firstChild.textContent=session?'العودة إلى طاولتي ':label+' ';}
function seats(s){
  if(s.kind==='mercy')return '<ul class="seats">'+Array.from({length:s.capacity},(_,i)=>'<li><span class="seatNo">'+(i+1)+'</span><strong>'+esc(s.players[i]||'مقعد شاغر')+'</strong>'+(i===s.seat?' · أنت':'')+'</li>').join('')+'</ul>';
  return '<ul class="seats">'+colors.slice(0,s.capacity).map((color,i)=>'<li><b class="dot s'+i+'"></b><strong>'+esc(s.players[i]||'مقعد شاغر')+'</strong> · '+color+' · فريق '+(1+i%(s.capacity/2))+(i===s.seat?' (أنت)':'')+(s.game?.turn===i && s.game.winner===null?' ◂ عليه الدور':'')+'</li>').join('')+'</ul>';
}
function render(){
  const s=snapshot,g=s.game;
  $('landing').hidden=true;$('room').hidden=false;
  const mercy=s.kind==='mercy';
  let html='<div class="roomHead"><div><div class="eyebrow dark">طاولة '+esc(s.code)+'</div><h2>'+(mercy?'أونو لا ترحم':'جاكارو المجلس')+'</h2></div><button class="light" '+(mercy?'data-mercy-guide':'data-guide="1"')+'>دليل الأوراق</button></div>';
  if(!g){
    html+='<div class="lobby"><h2>مقاعد الطاولة</h2><p>'+s.players.length+' من '+s.capacity+' لاعبين'+(mercy?' · لعب فردي':' · يجلس الشريكان متقابلين')+'</p>'+seats(s)+'<div class="inviteBox" id="inviteBox"><img id="inviteQR" alt="رمز الانضمام إلى الطاولة"><div><h3>امسح للانضمام</h3><p class="hint">افتح كاميرا هاتفك على الشبكة نفسها.</p><code>'+s.code+'</code></div></div><label class="field">رابط الدعوة<input id="inviteLink" readonly value="'+esc(invite+'/?room='+s.code)+'"></label><div class="actions"><button class="light" id="copy">نسخ الرابط</button>'+(s.seat===0?'<button class="solid" id="start" '+(s.players.length!==s.capacity?'disabled':'')+'>بدء المباراة</button>':'')+'</div></div>';
  } else if(mercy){
    html+=mercyTable(s);
  } else {
    selected=g.moves.findIndex(m=>m.length);
    html+='<div class="arena"><canvas class="board" id="board" aria-label="لوحة جاكارو"></canvas><section class="panel"><div class="eyebrow dark">توزيعة '+g.round+' · '+colors[s.seat]+'</div><h2>'+(g.winner!==null?'فوز '+colors[g.winner]+' و'+colors[TableRules.partner(g.winner,s.capacity)]:g.turn===s.seat?'حان دورك':'دور '+esc(s.players[g.turn]))+'</h2><h3>أوراقك</h3><div class="hand">'+g.hand.map((card,i)=>'<button data-card="'+i+'" class="card '+(/[♦♥]/.test(card)?'red':'')+'" '+(!g.moves[i]?.length?'disabled':'')+'>'+card.slice(0,-1)+'<span>'+card.slice(-1)+'</span></button>').join('')+'</div><div id="moves"></div>'+(g.winner!==null && s.seat===0?'<button id="start" class="solid">مباراة جديدة</button>':'')+'<hr>'+seats(s)+(g.last?'<p class="hint">آخر حركة · '+esc(s.players[g.last.seat])+' · '+g.last.card+' · '+esc(g.last.label)+'</p>':'')+'</section></div>';
  }
  if(s.seat===0 || !g || g.winner!==null) html+='<div class="roomExit"><button class="light" id="exitRoom">'+(s.seat===0?'إنهاء الطاولة':'مغادرة المقعد')+'</button></div>';
  $('room').innerHTML=html;
  if($('exitRoom'))$('exitRoom').onclick=()=>{
    const host=s.seat===0;
    show('<h2>'+(host?'إنهاء الطاولة؟':'مغادرة المقعد؟')+'</h2><p>'+(host?'سيُغلق رابط الدعوة وتنتهي جلسة جميع اللاعبين.':'سيصبح مقعدك متاحًا للاعب آخر.')+'</p><button class="solid" id="confirmExit">تأكيد</button>');
    $('confirmExit').onclick=async()=>{try{await api('leave',session);session=null;snapshot=null;localStorage.removeItem(storage);modal.close();home();}catch(e){notify(e.message);}};
  };
  function updateInvite(){
    const link=invite+'/?room='+s.code;
    $('inviteLink').value=link;
    const loopback=['127.0.0.1','localhost'].includes(new URL(link).hostname);
    if(loopback){$('inviteBox').hidden=true;return;}
    $('inviteBox').hidden=false;$('inviteQR').src=inviteImage(link);
  }
  if(!g)updateInvite();
  if(!g && addresses.length>1 && ['localhost','127.0.0.1'].includes(location.hostname)){
    const label=document.createElement('label');label.className='field';label.textContent='عنوان شبكة الدعوة';
    const select=document.createElement('select');
    addresses.forEach(a=>select.add(new Option(a,a,a===invite,a===invite)));
    select.dir='ltr';label.append(select);$('inviteLink').parentElement.before(label);
    select.onchange=()=>{invite=select.value;updateInvite();};
  }
  if($('copy'))$('copy').onclick=async()=>{const inp=$('inviteLink');inp.select();try{await navigator.clipboard.writeText(inp.value);notify('نُسخ الرابط');}catch{notify(document.execCommand('copy')?'نُسخ الرابط':'حدّد الرابط وانسخه');}};
  if($('start'))$('start').onclick=()=>act('start');
  if(g&&!mercy)displayMoves();
}
function displayMoves(){
  const g=snapshot.game, moves=g.moves[selected]||[];
  document.querySelectorAll('[data-card]').forEach(btn=>btn.classList.toggle('chosen',Number(btn.dataset.card)===selected));
  $('moves').innerHTML=moves.length?'<label class="field">الحركة<select id="choice">'+moves.map((m,i)=>'<option value="'+i+'">'+esc(m.label)+'</option>').join('')+'</select></label><button class="solid" id="play">تأكيد الحركة</button>':'';
  const paint=()=>{
    const move=moves[Number($('choice')?.value)];
    drawBoard($('board'),g.board,move?.pieces||[],move?.targets||[],g.last);
  };
  $('board').onclick=e=>{
    const el=e.currentTarget,rect=el.getBoundingClientRect();
    const x=(e.clientX-rect.left)*800/rect.width,y=(e.clientY-rect.top)*800/rect.height;
    const id=el.marbleCenters.findIndex(([px,py])=>Math.hypot(px-x,py-y)<19);
    if(id<0 || !moves.length)return;
    const idx=moves.findIndex(m=>m.pieces[0]===id);
    if(idx>=0){$('choice').value=String(idx);paint();}
  };
  if($('play')){$('choice').onchange=paint;$('play').onclick=()=>act('play',{card:selected,move:Number($('choice').value),rev:snapshot.rev});}
  paint();
}
async function act(action,data={}){
  if(busy)return;busy=true;try{snapshot=await api(action,{...session,...data});render();}catch(e){notify(e.message);}finally{busy=false;await refresh();}
}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-mercy-guide'))mercyGuide();
 if(b.dataset.guide!==undefined)guide(Number(b.dataset.guide));
 if(b.dataset.card!==undefined){selected=Number(b.dataset.card);displayMoves();}
});
$('guideMenu').onclick=()=>{if(showingRoom&&snapshot)return snapshot.kind==='mercy'?mercyGuide():guide(0);show('<h2>دليل اللعب</h2><div class="actions"><button class="solid" data-mercy-guide>أونو لا ترحم</button><button class="light" data-guide="0">جاكارو</button></div>');};
$('mercyCreate').onclick=()=>form(false,'mercy');$('create').onclick=()=>form();$('join').onclick=()=>form(true);$('home').onclick=home;
document.querySelector('.close').onclick=()=>modal.close();
$('network').onclick=()=>show('<h2>الشبكة المحلية</h2><p>فعّل نقطة اتصال الهاتف المضيف أو اتصلوا بشبكة واي فاي واحدة. افتح الطاولة ثم شارك رابط الدعوة مع بقية اللاعبين. أبقِ المضيف مفتوحًا طوال المباراة.</p><p dir="ltr">'+esc(invite||location.origin)+'</p>');
(async()=>{let urls=[];try{urls=(await api('network')).urls;addresses=urls;}catch{}
 invite=['localhost','127.0.0.1'].includes(location.hostname)?urls[0]||location.origin:location.origin;
 if(invited && invited!==session?.code){showingRoom=false;form(true);}else if(session)await resume();
 setInterval(()=>refresh(),1000);
})();
