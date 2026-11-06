/* ===== Intellect — app shell, nav, role switching, routing ===== */

/* --- icons (inline, 1.6 stroke) --- */
const Icon = ({ d, fill, size=18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill?'currentColor':'none'} stroke={fill?'none':'currentColor'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const icons = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>,
  topics: <><circle cx="6" cy="6" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="12" cy="18" r="2.4"/><path d="M7.8 7.6 10.6 16M16.2 7.6 13.4 16M8 6h8"/></>,
  pipeline: <><path d="M3 6h7M3 12h12M3 18h5"/><circle cx="14" cy="6" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="11" cy="18" r="2"/></>,
  papers: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6M9 8h2"/></>,
  gaps: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22"/></>,
  resourcing: <><path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 3v9h9A9 9 0 0 0 12 3z"/></>,
  people: <><circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.5a3 3 0 0 1 0 5.5M16.5 14.5a5.5 5.5 0 0 1 4 5.5"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></>,
  bell: <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></>,
  back: <path d="M15 19 8 12l7-7"/>,
  chevron: <path d="M9 6l6 6-6 6"/>,
  org: <><rect x="9" y="3" width="6" height="5" rx="1.3"/><rect x="3" y="16" width="6" height="5" rx="1.3"/><rect x="15" y="16" width="6" height="5" rx="1.3"/><path d="M12 8v4M6 16v-2.5h12V16"/></>,
  download: <><path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M4 21h16"/></>,
  close: <path d="M6 6l12 12M18 6 6 18"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
};

const NAV = [
  { id:'dashboard', label:'Dashboard', icon:'dashboard' },
  { id:'org',       label:'Organization', icon:'org' },
  { id:'topics',    label:'Research Topics', icon:'topics' },
  { id:'gaps',      label:'Gaps & Coverage', icon:'gaps' },
  { id:'resourcing',label:'Resourcing', icon:'resourcing' },
  { id:'papers',    label:'Papers & Impact', icon:'papers' },
  { id:'people',    label:'People', icon:'people' },
];

function Logo() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" style={{ display:'block' }}>
        <defs><linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2FB2F3"/><stop offset="0.5" stopColor="#0073E6"/><stop offset="1" stopColor="var(--gold)"/>
        </linearGradient></defs>
        <rect x="0.5" y="0.5" width="27" height="27" rx="7.5" fill="url(#logoGrad)"/>
        <circle cx="14" cy="8.3" r="2.25" fill="#ffffff"/>
        <rect x="11.85" y="12.3" width="4.3" height="8.9" rx="2.15" fill="#ffffff"/>
      </svg>
      <div style={{ lineHeight:1 }}>
        <div className="serif" style={{ fontSize:19, fontWeight:700, letterSpacing:'-0.02em', color:'var(--ink)' }}>Intellect</div>
      </div>
    </div>
  );
}

function RoleSwitch({ role, setRole }) {
  return (
    <div style={{ display:'flex', background:'var(--bg-2)', border:'1px solid var(--line-2)', borderRadius:100, padding:3, gap:2 }}>
      {[['pi','PI view','MO'],['chief','Chief view','HV']].map(([r,label])=>(
        <button key={r} onClick={()=>setRole(r)} style={{
          display:'flex', alignItems:'center', gap:7, padding:'5px 12px 5px 7px', borderRadius:100, border:0, cursor:'pointer',
          background: role===r? 'var(--raised)':'transparent', color: role===r? 'var(--ink)':'var(--faint)',
          boxShadow: role===r? 'var(--sh-1)':'none', transition:'.15s', fontSize:12.5, fontWeight:500, fontFamily:'var(--sans)', whiteSpace:'nowrap' }}>
          <Avatar id={r==='pi'?'mo':'hv'} size={20} ring={role===r} />{label}
        </button>
      ))}
    </div>
  );
}

function Sidebar({ view, go, openBrief }) {
  return (
    <nav style={{ width:212, flex:'none', borderRight:'1px solid var(--line)', display:'flex', flexDirection:'column', padding:'14px 12px', gap:3, background:'var(--bg-2)' }}>
      <div style={{ padding:'6px 8px 16px' }}><Logo/></div>
      {NAV.map(n=>{ const on = view===n.id || (view==='topic'&&n.id==='topics');
        return (
        <button key={n.id} onClick={()=>go(n.id)} style={{
          display:'flex', alignItems:'center', gap:11, padding:'9px 11px', borderRadius:8, border:0, cursor:'pointer', textAlign:'left',
          background: on? 'linear-gradient(90deg, var(--gold-dim), transparent)':'transparent',
          color: on? 'var(--ink)':'var(--muted)', fontSize:13.5, fontWeight: on?550:450, position:'relative', transition:'.15s', fontFamily:'var(--sans)' }}
          onMouseEnter={e=>{ if(!on) e.currentTarget.style.background='var(--panel)'; }}
          onMouseLeave={e=>{ if(!on) e.currentTarget.style.background='transparent'; }}>
          {on && <span style={{ position:'absolute', left:0, top:9, bottom:9, width:2.5, borderRadius:3, background:'var(--gold)' }}/>}
          <span style={{ color: on?'var(--gold)':'var(--faint)' }}><Icon d={icons[n.icon]} size={17}/></span>
          {n.label}
        </button>
      );})}
      <div style={{ flex:1 }}/>
      <div className="panel" style={{ padding:'12px 13px', background:'var(--panel)' }}>
        <div className="eyebrow" style={{ marginBottom:6 }}>Portfolio review</div>
        <div style={{ fontSize:12.5, color:'var(--ink-2)', lineHeight:1.4, marginBottom:9 }}>Quarterly directorate review in <b className="num" style={{ color:'var(--gold)' }}>9 days</b>.</div>
        <button className="btn" onClick={openBrief} style={{ width:'100%', justifyContent:'center', fontSize:12 }}>Prep brief</button>
      </div>
    </nav>
  );
}

function Topbar({ role, setRole }) {
  const me = role==='pi'? D().people.mo : D().people.hv;
  return (
    <header style={{ height:60, flex:'none', borderBottom:'1px solid var(--line)', display:'flex', alignItems:'center', gap:16, padding:'0 22px', background:'var(--topbar)', backdropFilter:'blur(8px)', position:'sticky', top:0, zIndex:20 }}>
      <div style={{ flex:1 }}/>
      <div style={{ position:'relative', flex:'none', width:440, maxWidth:'42vw' }}>
        <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--faint)' }}><Icon d={icons.search} size={15}/></span>
        <input placeholder="Search topics, gaps, papers, people…" style={{
          width:'100%', background:'var(--bg-2)', border:'1px solid var(--line-2)', borderRadius:8, padding:'8px 12px 8px 34px',
          color:'var(--ink)', fontSize:13, fontFamily:'var(--sans)' }} />
        <span className="mono" style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontSize:10.5, color:'var(--faint)', border:'1px solid var(--line-2)', borderRadius:4, padding:'1px 5px' }}>⌘K</span>
      </div>
      <div style={{ flex:1 }}/>
      <RoleSwitch role={role} setRole={setRole} />
      <button className="btn btn-ghost" style={{ padding:8, position:'relative' }}>
        <Icon d={icons.bell} size={18}/>
        <span style={{ position:'absolute', top:6, right:7, width:6, height:6, borderRadius:'50%', background:'var(--gold)', boxShadow:'0 0 0 2px var(--bg)' }}/>
      </button>
      <div style={{ display:'flex', alignItems:'center', gap:9, paddingLeft:4 }}>
        <Avatar id={me.id} size={32} ring />
        <div style={{ lineHeight:1.25, whiteSpace:'nowrap' }}>
          <div style={{ fontSize:12.5, fontWeight:550 }}>{me.name}</div>
          <div style={{ fontSize:10.5, color:'var(--faint)' }}>{me.role}</div>
        </div>
      </div>
    </header>
  );
}

const DARK = {
  /* Strata Flagship — Dark Tier: deep navy canvas, glass surfaces, lifted blue */
  '--bg':'#0E1626','--bg-2':'#11192A','--panel':'#16223B','--panel-2':'#16223B','--raised':'#1B2840',
  '--line':'#243150','--line-2':'#2E3D5F','--line-3':'#3A4A6E',
  '--ink':'#EAF0F8','--ink-2':'#AEBACC','--muted':'#7D8AA0','--faint':'#56627A',
  '--brand':'#2C5A9E','--brand-2':'#21477E','--brand-dim':'rgba(44,90,158,0.20)','--on-brand':'#ffffff',
  '--green':'#34B074','--green-dim':'rgba(52,176,116,0.16)',
  '--rose':'#F0625A','--rose-dim':'rgba(240,98,90,0.16)',
  '--amber':'#E0A03A','--amber-dim':'rgba(224,160,58,0.16)',
  '--blue':'#3D9BFF','--blue-dim':'rgba(61,155,255,0.16)',
  '--violet':'#7E8DB0','--violet-dim':'rgba(126,141,176,0.16)',
  '--mesh-a':'#11203A','--mesh-b':'#1A1638',
  '--topbar':'color-mix(in srgb, #0E1626 72%, transparent)',
  '--sh-1':'0 1px 2px rgba(0,0,0,0.45)',
  '--sh-2':'0 6px 16px rgba(0,0,0,0.5), 0 20px 44px rgba(0,0,0,0.5)',
  '--sh-pop':'0 18px 50px -16px rgba(0,0,0,0.8), 0 0 0 1px rgba(233,238,245,0.13)',
};
const SIGNAL = {
  '#1D3557': { light:['#1D3557','#16293F','rgba(29,53,87,0.07)'],   dark:['#2C5A9E','#21477E','rgba(44,90,158,0.20)'] },
  '#0073E6': { light:['#0073E6','#0059B8','rgba(0,115,230,0.11)'],  dark:['#3D9BFF','#2B82E0','rgba(61,155,255,0.16)'] },
  '#0E7C86': { light:['#0E7C86','#0A626B','rgba(14,124,134,0.12)'], dark:['#36B3BD','#2A9098','rgba(54,179,189,0.16)'] },
};
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{ "theme":"Light", "signal":"#1D3557" }/*EDITMODE-END*/;

function App() {
  const [role, setRole] = useState('chief');
  const [route, setRoute] = useState({ view:'dashboard', params:{} });
  const [brief, setBrief] = useState(false);
  const [newTopic, setNewTopic] = useState(false);
  const go = (view, params={}) => { setRoute({ view, params }); document.querySelector('#scroll')?.scrollTo(0,0); };
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  useEffect(()=>{
    const r = document.documentElement.style;
    const dark = tw.theme==='Dark';
    if (dark) { for(const k in DARK) r.setProperty(k, DARK[k]); }
    else { for(const k in DARK) r.removeProperty(k); }
    const sig = (SIGNAL[tw.signal]||SIGNAL['#1D3557'])[dark?'dark':'light'];
    r.setProperty('--gold', sig[0]); r.setProperty('--gold-2', sig[1]); r.setProperty('--gold-dim', sig[2]);
    document.documentElement.dataset.theme = dark?'dark':'light';
  }, [tw]);

  // scope by role
  const scope = useMemo(()=>{
    if (role==='chief') return { isChief:true, topics:D().topics, person:D().people.hv };
    const me = D().people.mo;
    const topics = D().topics.filter(t=> t.lead===me.id || t.team===me.team);
    return { isChief:false, topics, person:me };
  }, [role]);

  let body;
  const { view, params } = route;
  if (view==='dashboard') body = <Dashboard scope={scope} go={go} onNewTopic={()=>setNewTopic(true)} />;
  else if (view==='org') body = <OrgView scope={scope} go={go} openBrief={()=>setBrief(true)} />;
  else if (view==='topic') body = <TopicDetail topicId={params.topicId} go={go} scope={scope} />;
  else if (view==='topics') body = <TopicsList scope={scope} go={go} />;
  else if (view==='gaps') body = <GapsBoard scope={scope} go={go} />;
  else if (view==='resourcing') body = <Resourcing scope={scope} go={go} />;
  else if (view==='papers') body = <PapersView scope={scope} go={go} paperId={params.paperId} />;
  else if (view==='people') body = <PeopleView scope={scope} go={go} />;

  return (
    <div style={{ display:'flex', height:'100%' }}>
      <Sidebar view={view} go={(v)=>go(v)} openBrief={()=>setBrief(true)} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        <Topbar role={role} setRole={setRole} />
        <main id="scroll" style={{ flex:1, overflow:'auto', minWidth:0 }}>
          {body}
        </main>
      </div>
      <TweaksPanel title="Tweaks">
        <TweakSection label="Appearance" />
        <TweakRadio label="Theme" value={tw.theme} options={['Light','Dark']} onChange={(v)=>setTweak('theme', v)} />
        <TweakColor label="Accent" value={tw.signal} options={['#1D3557','#0073E6','#0E7C86']} onChange={(v)=>setTweak('signal', v)} />
      </TweaksPanel>
      <DirectorateBrief open={brief} onClose={()=>setBrief(false)} />
      <NewTopic open={newTopic} onClose={()=>setNewTopic(false)} go={go} />
    </div>
  );
}

// stubs (replaced by real views in later files if loaded after)
function Stub({ title }) { return <div style={{ padding:40 }} className="rise"><h1 className="serif" style={{ fontSize:26 }}>{title}</h1><p style={{ color:'var(--faint)' }}>Coming up next.</p></div>; }
window.TopicDetail = window.TopicDetail || (()=> <Stub title="Topic" />);
window.TopicsList  = window.TopicsList  || (()=> <Stub title="Topics" />);
window.GapsBoard   = window.GapsBoard   || (()=> <Stub title="Gaps & Coverage" />);
window.Resourcing  = window.Resourcing  || (()=> <Stub title="Resourcing" />);
window.PapersView  = window.PapersView  || (()=> <Stub title="Papers & Impact" />);
window.PeopleView  = window.PeopleView  || (()=> <Stub title="People" />);

window.App = App; window.Icon = Icon; window.icons = icons;
