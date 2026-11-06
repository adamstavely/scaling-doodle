/* ===== Intellect — shared visual components ===== */
const { useState, useEffect, useRef, useLayoutEffect, useMemo } = React;

const D = () => window.DATA;
const fmt = (n) => n >= 1000 ? (n/1000).toFixed(n>=10000?0:1).replace(/\.0$/,'') + 'k' : '' + n;
const pct = (x) => Math.round(x*100) + '%';
const money = (m) => m>=1 ? '$'+m.toFixed(1).replace(/\.0$/,'')+'M' : '$'+Math.round(m*1000)+'K';

/* ---- Avatar ---- */
function Avatar({ id, size=26, ring }) {
  const p = D().people[id]; if (!p) return null;
  const hue = { Chief:'var(--gold)', PI:'var(--blue)', Staff:'var(--green)', Postdoc:'var(--violet)' }[p.title] || 'var(--muted)';
  return (
    <div title={`${p.name} · ${p.role}`} style={{
      width:size, height:size, borderRadius:'50%', flex:'none',
      display:'grid', placeItems:'center', fontFamily:'var(--mono)',
      fontSize:size*0.36, letterSpacing:'.3px', color:hue,
      background:'var(--raised)', border:`1px solid ${ring? hue : 'var(--line-2)'}`,
      boxShadow: ring? `0 0 0 2px color-mix(in srgb, ${hue} 18%, transparent)` : 'none',
    }}>{p.init}</div>
  );
}
function AvatarStack({ ids, size=24 }) {
  return (
    <div style={{ display:'flex' }}>
      {ids.slice(0,4).map((id,i)=>(
        <div key={id} style={{ marginLeft: i? -8:0, position:'relative', zIndex:10-i }}>
          <Avatar id={id} size={size} />
        </div>
      ))}
      {ids.length>4 && <div className="num" style={{ marginLeft:-8, width:size, height:size, borderRadius:'50%', display:'grid', placeItems:'center', fontSize:size*0.32, background:'var(--raised)', border:'1px solid var(--line-2)', color:'var(--muted)' }}>+{ids.length-4}</div>}
    </div>
  );
}

/* ---- Sparkline ---- */
function Sparkline({ data, w=92, h=28, color='var(--gold)', fill=true, dot=true }) {
  const min = Math.min(...data), max = Math.max(...data);
  const rng = max-min || 1;
  const pts = data.map((v,i)=>[ i/(data.length-1)*w, h-3 - (v-min)/rng*(h-6) ]);
  const d = pts.map((p,i)=> (i? 'L':'M') + p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const area = d + ` L${w} ${h} L0 ${h} Z`;
  const gid = useMemo(()=> 'sg'+Math.random().toString(36).slice(2,8), []);
  return (
    <svg width={w} height={h} style={{ display:'block', overflow:'visible' }}>
      {fill && <><defs><linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor={color} stopOpacity="0.22"/><stop offset="1" stopColor={color} stopOpacity="0"/>
      </linearGradient></defs>
      <path d={area} fill={`url(#${gid})`} /></>}
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"/>
      {dot && <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="2.4" fill={color}/>}
    </svg>
  );
}

/* ---- Ring (donut gauge) ---- */
function Ring({ value, size=58, stroke=6, color='var(--gold)', track='var(--line-2)', label, sub }) {
  const r = (size-stroke)/2, c = 2*Math.PI*r;
  return (
    <div style={{ position:'relative', width:size, height:size }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c*(1-value)} strokeLinecap="round"
          style={{ transition:'stroke-dashoffset .9s cubic-bezier(.2,.7,.2,1)' }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'grid', placeItems:'center', textAlign:'center', lineHeight:1 }}>
        <div>
          <div className="num" style={{ fontSize:size*0.26, fontWeight:600 }}>{label}</div>
          {sub && <div className="eyebrow" style={{ marginTop:2, fontSize:8 }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

/* ---- Horizontal stacked bar ---- */
function StackBar({ parts, h=8, radius=100 }) {
  const total = parts.reduce((s,p)=>s+p.v,0) || 1;
  return (
    <div style={{ display:'flex', height:h, borderRadius:radius, overflow:'hidden', background:'var(--line)' }}>
      {parts.map((p,i)=>(
        <div key={i} title={`${p.label}: ${p.v}`} style={{ width:(p.v/total*100)+'%', background:p.color, transition:'width .6s' }}/>
      ))}
    </div>
  );
}

/* ---- Mini bar chart ---- */
function MiniBars({ data, w=120, h=34, color='var(--blue)', gap=2 }) {
  const max = Math.max(...data)||1;
  const bw = (w - gap*(data.length-1))/data.length;
  return (
    <svg width={w} height={h} style={{ display:'block' }}>
      {data.map((v,i)=>{ const bh = Math.max(2, v/max*h);
        return <rect key={i} x={i*(bw+gap)} y={h-bh} width={bw} height={bh} rx="1.5" fill={color} opacity={0.45 + 0.55*(v/max)}/>; })}
    </svg>
  );
}

/* ---- status / severity tags ---- */
const HEALTH = { healthy:{c:'var(--green)',t:'On track'}, watch:{c:'var(--amber)',t:'Watch'}, 'at-risk':{c:'var(--rose)',t:'At risk'} };
function HealthTag({ h }) { const x = HEALTH[h]||HEALTH.watch;
  return <span className="chip" style={{ color:x.c, borderColor:'color-mix(in srgb,'+x.c+' 35%, transparent)', background:'color-mix(in srgb,'+x.c+' 9%, transparent)' }}><span className="dot" style={{ background:x.c, boxShadow:'none', width:6, height:6 }}/>{x.t}</span>;
}
const WORK_ST = { planning:{c:'var(--muted)',t:'Planning'}, active:{c:'var(--blue)',t:'Active'}, blocked:{c:'var(--rose)',t:'Blocked'}, review:{c:'var(--violet)',t:'In review'}, complete:{c:'var(--green)',t:'Complete'} };
const GAP_ST = { open:{c:'var(--rose)',t:'Open'}, addressing:{c:'var(--amber)',t:'Addressing'}, closing:{c:'var(--blue)',t:'Closing'}, closed:{c:'var(--green)',t:'Closed'} };
const SEV = { critical:'var(--rose)', high:'var(--amber)', medium:'var(--muted)' };
function Tag({ map, k }) { const x = map[k]; if(!x) return null;
  return <span className="chip" style={{ color:x.c, borderColor:'color-mix(in srgb,'+x.c+' 30%, transparent)' }}>{x.t}</span>; }

/* ---- trend delta ---- */
function Delta({ v }) {
  const up = v>=0, c = up? 'var(--green)':'var(--rose)';
  return <span className="num" style={{ color:c, fontSize:12, display:'inline-flex', alignItems:'center', gap:2 }}>
    <svg width="9" height="9" viewBox="0 0 10 10" style={{ transform: up?'none':'scaleY(-1)' }}><path d="M5 1L9 7H1Z" fill={c}/></svg>{Math.abs(v)}%</span>;
}

/* ---- progress ---- */
function Progress({ v, color='var(--blue)', h=5 }) {
  return <div style={{ height:h, background:'var(--line)', borderRadius:100, overflow:'hidden' }}>
    <div style={{ width:pct(v), height:'100%', background:color, borderRadius:100, transition:'width .7s' }}/>
  </div>;
}

/* ---- priority bins (1 = top) ---- */
const BIN = {
  1: { label:'P1', name:'Top priority' },
  2: { label:'P2', name:'High' },
  3: { label:'P3', name:'Medium' },
  4: { label:'P4', name:'Watching' },
};
function PriorityBadge({ bin, size=22 }) {
  const styles = {
    1: { background:'var(--gold)', color:'var(--on-brand)', border:'1px solid transparent', fontWeight:700 },
    2: { background:'var(--gold-dim)', color:'var(--gold)', border:'1px solid color-mix(in srgb,var(--gold) 40%, transparent)', fontWeight:600 },
    3: { background:'transparent', color:'var(--muted)', border:'1px solid var(--line-3)', fontWeight:600 },
    4: { background:'transparent', color:'var(--faint)', border:'1px solid var(--line-2)', fontWeight:600 },
  }[bin] || {};
  return <span title={`Priority ${bin} · ${BIN[bin].name}`} className="num" style={{
    display:'inline-grid', placeItems:'center', width:size, height:size, borderRadius:6,
    fontSize:size*0.46, letterSpacing:'-0.3px', flex:'none', ...styles }}>{bin}</span>;
}

Object.assign(window, { BIN, PriorityBadge });


