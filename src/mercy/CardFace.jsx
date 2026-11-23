import { describe } from '../../core/mercy-cards.js';

const inks = { r: '#eb202d', b: '#087ac3', g: '#26843b', y: '#ffca10', w: '#181619' };
const black = '#171417';
const white = '#fffdf6';
const drawCards = {
  d2: [[9,-12],[-9,12]],
  d4: [[19,-22],[-2,-10],[6,8],[-20,21]],
  back4: [[18,-20],[-3,-10],[5,8],[-17,22]],
  d6: [[6,-28],[20,-15],[-7,-13],[8,9],[-21,12],[-4,28]],
  d10: [[11,-32],[24,-22],[-12,-20],[1,-9],[-25,0],[16,0],[-10,12],[26,14],[4,24],[-20,33]],
};
const wildColors = {
  back4: ['y','b','r','g'],
  d6: ['b','r','y','g','r','b'],
  d10: ['y','g','b','w','y','b','g','r','w','r'],
};

function Value({ value, size = 66 }) {
  return <text x="0" y={size * .35} textAnchor="middle" fontFamily="Arial, sans-serif"
    fontWeight="900" fontSize={size} strokeWidth={size * .055} paintOrder="stroke fill">{value}</text>;
}

function Reverse() {
  return <path d="M-22 20l1-19 6 5 13-13 8 8-13 13 5 6zm44-40-1 19-6-5L2 7l-8-8L7-14l-5-6z"/>;
}

function Symbol({ rank, mark }) {
  if (drawCards[rank]) return <>
    {drawCards[rank].map(([x,y], i) => {
      const color = wildColors[rank]?.[i];
      return <g key={i} transform={`translate(${x} ${y})`}>
        <rect x="-10" y="-16" width="20" height="32" rx="2" fill={color ? inks[color] : white}/>
        {color === 'w' && <ellipse rx="6" ry="13" transform="rotate(28)" stroke="none"/>}
      </g>;
    })}
    {rank === 'back4' && <Reverse/>}
  </>;
  switch (rank) {
    case 'reverse': return <Reverse/>;
    case 'skip': return <path fillRule="evenodd" d="M0-23a23 23 0 1 0 0 46 23 23 0 1 0 0-46zm-13 31a15 15 0 0 1 21-21zm26-16A15 15 0 0 1-8 13z"/>;
    case 'all': return <path d="M18-4A18 18 0 1 0 12 14l5 4A24 24 0 1 1 24-4h5L20 8 10-4z"/>;
    case 'discard': return <>
      {[-30,-10,12,32].map(angle => <rect key={angle} x="-8" y="-26" width="16" height="24" rx="2" transform={`rotate(${angle} 0 4)`}/>)}
      <path d="M13 0q1 10-9 14l2-5-12 9 15-1-3-2Q19 11 18 2z" fill={black} stroke="none"/>
      <path d="M-23 16h19l-2 9h-21zm-4 10h21v3h-21zm0 4h21v3h-21z"/>
    </>;
    case 'wheel': return <>{[['y',0,-13,-4],['b',12,0,9],['r',-12,0,-12],['g',0,12,-4]].map(([c,x,y,a]) =>
      <g key={c} transform={`translate(${x} ${y}) rotate(${a})`}>
        <rect x="-12" y="-9" rx="3" width="24" height="18" fill={inks[c]}/>
        <g fill={black} stroke="none"><circle cx="-3" cy="-3" r="1.3"/><circle cx="3" cy="-3" r="1.3"/></g>
        <path d="M-5 5q5-8 10 0" fill="none" strokeWidth="1.5"/>
      </g>)}</>;
    default: return <><Value value={mark}/>{['6','9'].includes(rank) && <path d="M-13 24h26v4h-26z"/>}</>;
  }
}

function Corner({ rank, mark }) {
  if (drawCards[rank]) return rank === 'back4' ? <>
    <g transform="translate(-6 0) scale(.25)"><Reverse/></g>
    <g transform="translate(7 0)"><Value value="+4" size={15}/></g>
  </> : <Value value={mark} size={17}/>;
  if (/^\d$/.test(rank)) return <><Value value={mark} size={21}/>
    {['6','9'].includes(rank) && <path d="M-6 9h12v2H-6z" strokeWidth="1"/>}
    {rank === '7' && <path d="M-7 11l3-3v2h8V8l3 3-3 3v-2h-8v2z" strokeWidth=".8"/>}
    {rank === '0' && <g transform="translate(0 12) scale(.12)"><Symbol rank="all"/></g>}
  </>;
  return <g transform="scale(.37)"><Symbol rank={rank} mark={mark}/></g>;
}

export function CardFace({ card }) {
  const { ink, rank, mark, color, label } = describe(card);
  const wild = ink === 'w';
  const description = [color, mark, label].join(' · ');
  return <svg className="face" viewBox="0 0 100 150" preserveAspectRatio="none"
    role="img" aria-label={description}>
    <title>{description}</title>
    <rect width="100" height="150" rx="8" fill={black}/>
    <rect x="5" y="6" width="90" height="138" rx="7" fill={inks[ink]}/>
    <ellipse cx="50" cy="75" rx="33" ry="64" transform="rotate(30 50 75)"
      fill={wild ? white : 'none'} stroke={black} strokeWidth="3.4"/>
    <g fill={white} stroke={black} strokeWidth="1.8" strokeLinejoin="round">
      <g transform="translate(49 77)" fill={black} strokeWidth="3"><Symbol rank={rank} mark={mark}/></g>
      <g transform="translate(51 74)"><Symbol rank={rank} mark={mark}/></g>
      <g transform="translate(17 19)"><Corner rank={rank} mark={mark}/></g>
      <g transform="translate(83 131) rotate(180)"><Corner rank={rank} mark={mark}/></g>
    </g>
    <path d="m7 36 5 8m-3-6 1 4m68 80 7 8m-6-9 2 4M31 10l5 3m22 121 7 2M10 105l3 6"
      stroke={white} opacity=".26" strokeWidth=".6"/>
  </svg>;
}

export function CardBack() {
  return <svg className="stock" viewBox="0 0 100 150" aria-label="ظهر رزمة أونو" role="img">
    <rect width="100" height="150" rx="8" fill={black}/>
    <rect x="5" y="6" width="90" height="138" rx="7" fill="#d62225"/>
    <path d="m9 7 27 46L16 7zm22 0 12 36-5-36zm43 0L60 46 82 7zm18 19L70 51l22-18zM7 127l28-29-28 20zm18 17 16-36-10 36zm44 0-11-45 19 45zm23-16-25-33 25 24z" fill="#8d171a"/>
    <g transform="translate(50 70) rotate(-9)" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900">
      <text y="3" fill="#ffd21d" stroke={black} strokeWidth="4" paintOrder="stroke fill" fontSize="33">UNO</text>
      <rect x="-40" y="7" width="80" height="20" fill={black}/>
      <text y="21" fontSize="12" fill={white}>NO MERCY</text>
    </g>
  </svg>;
}
