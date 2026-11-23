const games = [
  {
    kind: 'mercy', id: 'mercyCreate', title: 'أونو لا ترحم', latin: 'SHOW ’EM NO MERCY',
    meta: 'لعبة أوراق · ٢–٦ لاعبين', play: 'العب أونو',
    description: 'كدّس أوراق السحب، وبدّل يدك في اللحظة المناسبة. عند الورقة الخامسة والعشرين تغادر الطاولة.',
  },
  {
    kind: 'jackaroo', id: 'create', title: 'جاكارو', latin: 'JACKAROO',
    meta: 'لعبة شراكة · ٤ أو ٦ لاعبين', play: 'العب جاكارو',
    description: 'حرّك أحجارك عبر لوح الرخام وساعد شريكك على بلوغ الأمان.',
  },
];

export function Lounge({ resume, onEntry, onGuide }) {
  return <main id="landing">
    <div className="libraryHead">
      <div><div className="eyebrow dark"><b/> صالة الألعاب المحلية</div><h1>اختر طاولتك</h1></div>
      <button className="light" id="join" onClick={() => onEntry('join')}>انضم إلى طاولة</button>
    </div>
    <section className="collection" aria-label="ألعاب المجلس">
      {games.map(game => <article key={game.kind} className={'hero ' + (game.kind === 'mercy' ? 'mercyCover' : 'jackCover')}>
        <div className="photo"/>
        <div className="heroCopy">
          <div className="eyebrow">{game.meta}</div>
          <h2>{game.title}</h2><div className="latin" lang="en">{game.latin}</div><p>{game.description}</p>
          <div className="actions">
            <button className="gold" id={game.id} onClick={() => onEntry('create', game.kind)}>{resume ? 'العودة إلى طاولتي' : game.play} <span>＋</span></button>
            <button className="outline" onClick={() => onGuide(game.kind)}>دليل اللعبة</button>
          </div>
        </div>
      </article>)}
    </section>
  </main>;
}
