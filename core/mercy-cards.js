// A card ID consists of its ink (r, b, g, y or wild) followed by its rank.
globalThis.MercyCards=(()=>{
  const inks={r:'أحمر',b:'أزرق',g:'أخضر',y:'ذهبي',w:'حرّة'};
  const signs={r:'◆',b:'●',g:'▲',y:'✦',w:'✧'};
  const ranks={
    skip:['⊘','تخطَّ التالي'],reverse:['⇄','اعكس الاتجاه'],all:['⟳','تخطَّ الجميع'],
    discard:['≋','تخلّص من اللون'],d2:['+2','اسحب اثنتين'],d4:['+4','اسحب أربعًا'],
    back4:['+4','اعكس واسحب'],d6:['+6','اسحب ستًا'],d10:['+10','اسحب عشرًا'],wheel:['✣','روليت الألوان']
  };
  const colors=['r','b','g','y'];
  function describe(card){
    const ink=card[0],rank=card.slice(1);
    const [mark,label]=ranks[rank]||[rank,rank==='7'?'بدّل يدك':rank==='0'?'مرّر الأيدي':'ورقة رقمية'];
    return {ink,rank,mark,label,color:inks[ink],sign:signs[ink]};
  }
  return {inks,colors,describe};
})();
