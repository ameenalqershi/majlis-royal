const mercyNames=MercyCards.inks;
function cardFace(card){
  const {ink,mark,label,color,sign}=MercyCards.describe(card);
  return '<span class="face ink-'+ink+'"><span class="index" dir="ltr">'+mark+'</span><b class="pip" dir="ltr">'+mark+'</b><span class="faceName">'+label+'</span><small>'+sign+' '+color+'</small></span>';
}
function colorPicker(){
  return '<fieldset class="palette"><legend>اختر اللون</legend>'+MercyCards.colors.map(c=>
    '<label><input type="radio" name="color" value="'+c+'" required><span class="ink-'+c+'">'+mercyNames[c]+'</span></label>').join('')+'</fieldset>';
}
function mercyGuide(){
  show('<h2>دليل أونو لا ترحم</h2><div class="rules"><p>تبدأ بسبع أوراق. طابق لون الورقة العليا أو رقمها أو رمزها، أو العب ورقة حرّة. إذا تعذّر اللعب، اسحب حتى تجد ورقة صالحة ثم العبها.</p><details open><summary>التكديس والإقصاء</summary><p>يمكن ردّ عقوبة السحب بورقة سحب مساوية لآخر زيادة أو أعلى منها، بأي لون. تتجمع العقوبة على اللاعب التالي. إذا قبلتها، اسحب المجموع وافقد دورك. عند بلوغ ٢٥ ورقة تخرج من الجولة.</p></details><details><summary>أوراق الحركة والروليت</summary><p>السبعة تبدّل يدك مع لاعب تختاره، والصفر يمرّر كل يد إلى المقعد التالي باتجاه اللعب. تخطّي الجميع يعيد لك الدور. ورقة التخلص تضع كل أوراق لونها تحتها. في الروليت يختار اللاعب التالي لونًا ويسحب حتى يظهر ثم يفقد دوره. في اللعب الثنائي يعيد العكس الدور إليك، وتعود عقوبة العكس +٤ إليك أيضًا.</p></details><details><summary>نداء أونو والفوز</summary><p>عند بقاء ورقة واحدة اضغط «أونو!» قبل حركة الدور التالية. يمكنك إعلانها مع لعب الورقة. من يسبقك بالتنبيه يجعلك تسحب ورقتين. يفوز أول من يُفرغ يده أو آخر لاعب يبقى في الجولة.</p></details></div>');
}
function mercyTable(s){
  const g=s.game,mine=g.turn===s.seat,over=g.winner!==null;
  const title=over?'فاز '+esc(s.players[g.winner]):mine?'دورك الآن':'دور '+esc(s.players[g.turn]);
  const summary=over?'انتهت الجولة':g.roulette?'الروليت · اللاعب التالي يختار اللون':g.debt?'عقوبة متراكمة · اسحب '+g.debt+' أو كدّس +'+g.floor+' فأكثر':g.forced?'العب الورقة التي سحبتها':'اللون الحالي · '+mercyNames[g.color];
  const players=s.players.map((n,i)=>'<li class="'+(g.out[i]?'out':i===g.turn&&!over?'current':'')+'"><span class="avatar">'+esc(Array.from(n)[0])+'</span><span><strong>'+esc(n)+(i===s.seat?' · أنت':'')+'</strong><small>'+(g.out[i]?'خارج الجولة':g.counts[i]+' ورقة')+'</small></span></li>').join('');
  const log=g.log.map(e=>'<li><strong>'+esc(s.players[e.seat])+'</strong> · '+esc(e.message)+'</li>').join('');
  const hand=g.hand.map((card,i)=>{
    const d=MercyCards.describe(card);
    return '<button class="handCard" aria-label="'+d.color+' '+d.mark+' '+d.label+'" data-mercy-card="'+i+'" '+(g.playable.includes(i)?'':'disabled')+'>'+cardFace(card)+'</button>';
  }).join('');
  const calls=g.exposed.map(i=>i===s.seat?'<button class="gold" data-call>أونو!</button>':'<button class="light" data-catch="'+i+'">تنبيه '+esc(s.players[i])+' لنداء أونو</button>').join('');
  return '<section class="mercyArena"><div class="felt"><div class="feltTop"><span>مجلس الأوراق</span><span>'+(g.direction===1?'↻ مع عقارب الساعة':'↺ عكس عقارب الساعة')+'</span></div><ul class="playersRail">'+players+'</ul><div class="piles"><figure><div class="stock"><i>✥</i><small>مَجلس</small></div><figcaption>رزمة السحب</figcaption></figure><figure>'+cardFace(g.top)+'<figcaption>الورقة العليا</figcaption></figure></div><div class="turnBar" aria-live="polite"><strong>'+title+'</strong><span>'+summary+'</span></div></div><div class="handPanel"><div class="handTitle"><h2>'+(g.out[s.seat]?'متابعة الجولة':'أوراقك')+'</h2><span>'+g.counts[s.seat]+' ورقة</span></div><div class="mercyHand">'+hand+'</div><div class="actions">'+(!over&&!g.out[s.seat]?calls:'')+(g.canDraw?'<button class="solid" data-mercy-draw>'+(g.roulette?'اختر لون الروليت':g.debt?'اسحب العقوبة · '+g.debt:'اسحب حتى تجد ورقة')+'</button>':'')+(over&&s.seat===0?'<button class="solid" id="start">جولة جديدة</button>':'')+'</div>'+(log?'<details class="history"><summary>سجل الطاولة</summary><ol>'+log+'</ol></details>':'')+'</div></section>';
}
function chooseMercyCard(index){
  const s=snapshot,g=s.game;
  if(!g.playable.includes(index))return;
  const card=g.hand[index],d=MercyCards.describe(card),last=g.hand.length===1;
  const target=d.rank==='7'&&!last?'<label class="field">بدّل يدك مع<select name="target">'+s.players.map((name,i)=>i===s.seat||g.out[i]?'':'<option value="'+i+'">'+esc(name)+'</option>').join('')+'</select></label>':'';
  const choose=d.ink==='w'&&d.rank!=='wheel'&&!last;
  const canCall=g.hand.length===2||d.rank==='0'||d.rank==='7'||d.rank==='discard';
  show('<div class="previewCard">'+cardFace(card)+'</div><h2>لعب الورقة</h2><form id="mercyChoice">'+(choose?colorPicker():'')+target+(canCall?'<label class="callCheck"><input name="uno" type="checkbox"> أعلن أونو إذا بقيت لي ورقة</label>':'')+'<button class="solid">العب الورقة</button></form>');
  $('mercyChoice').onsubmit=e=>{
    e.preventDefault();const fields=new FormData(e.target);modal.close();
    act('play',{move:'card',card:index,color:fields.get('color'),target:fields.has('target')?Number(fields.get('target')):null,uno:fields.has('uno'),rev:s.rev});
  };
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button');
  if(!b||!snapshot?.game||snapshot.kind!=='mercy')return;
  const s=snapshot;
  if(b.hasAttribute('data-mercy-card'))chooseMercyCard(Number(b.dataset.mercyCard));
  if(b.hasAttribute('data-call'))act('play',{move:'call',rev:s.rev});
  if(b.hasAttribute('data-catch'))act('play',{move:'catch',target:Number(b.dataset.catch),rev:s.rev});
  if(b.hasAttribute('data-mercy-draw')){
    if(!s.game.roulette)return act('play',{move:'draw',rev:s.rev});
    show('<h2>روليت الألوان</h2><p>تسحب حتى تظهر ورقة اللون الذي تختاره.</p><form id="roulettePick">'+colorPicker()+'<button class="solid">اسحب الأوراق</button></form>');
    $('roulettePick').onsubmit=event=>{event.preventDefault();const color=new FormData(event.target).get('color');modal.close();act('play',{move:'draw',color,rev:s.rev});};
  }
});
