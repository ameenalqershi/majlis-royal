globalThis.Majlis = (() => {
  const rooms = new Map();
  const random = n => Array.from(crypto.getRandomValues(new Uint8Array(n)),x=>x.toString(16).padStart(2,'0')).join('');
  const nameOf = s => {
    if(typeof s !== 'string' || !s.trim() || s.trim().length>24) throw Error('أدخل اسمًا من ١ إلى ٢٤ حرفًا');
    return s.trim();
  };
  function request(action,input={}) {
    const now=Date.now();
    for(const [code,r] of rooms) if(now-r.used>86400000) rooms.delete(code);
    if(action==='create') {
      if(rooms.size>=100) throw Error('اكتمل عدد الطاولات');
      let code;
      do { code=random(3).toUpperCase(); } while(rooms.has(code));
      const player={name:nameOf(input.name),token:random(24)};
      rooms.set(code,{players:[player],used:now,rev:0,game:null});
      return {code,token:player.token};
    }
    const r=rooms.get(input.code);
    if(!r) throw Error('تعذّر العثور على هذه الطاولة');
    if(action==='join') {
      if(r.players.length===4 || r.game) throw Error('اكتملت مقاعد الطاولة');
      const player={name:nameOf(input.name),token:random(24)};
      r.players.push(player);
      r.rev++;
      r.used=now;
      return {code:input.code,token:player.token};
    }
    const seat=r.players.findIndex(p=>p.token===input.token);
    if(seat<0) throw Error('انتهت جلسة المقعد');
    r.used=now;
    if(action==='leave') {
      if(seat===0) rooms.delete(input.code);
      else {
        if(r.game && r.game.winner===null) throw Error('ينهي المضيف الطاولة أثناء اللعب');
        r.players.splice(seat,1);r.game=null;r.rev++;
      }
      return {left:true};
    }
    if(action==='start') {
      if(seat || r.players.length!==4 || (r.game && r.game.winner===null)) throw Error('يبدأ المضيف بعد اكتمال المقاعد');
      r.game=Jackaroo.start();
      r.rev++;
    } else if(action==='play') {
      if(!r.game || input.rev!==r.rev) throw Error('تغيّرت الطاولة، أعد اختيار الحركة');
      Jackaroo.play(r.game,seat,input.card,input.move);
      r.rev++;
    } else if(action!=='state') throw Error('طلب غير معروف');
    const g=r.game;
    return {code:input.code,rev:r.rev,seat,players:r.players.map(p=>p.name),
      game:g && {board:g.board,turn:g.turn,round:g.round,last:g.last,winner:g.winner,
        hand:g.hands[seat],counts:g.hands.map(h=>h.length),
        moves:g.turn===seat && g.winner===null ? Jackaroo.choices(g).map(m=>m.map(({label,pieces,board})=>({label,pieces,targets:pieces.map(i=>board[i])}))) : []}};
  }
  return {request};
})();
