/* ===== Intellect — Papers & Impact ===== */

const SENT = { positive:{c:'var(--green)',t:'Positive'}, mixed:{c:'var(--amber)',t:'Mixed'}, negative:{c:'var(--rose)',t:'Critical'} };
const FB_KIND = { peer:'Peer review', reader:'Reader', sponsor:'Sponsor', talk:'Talk' };
const GRADE = {
  outstanding:   { t:'Outstanding',    c:'var(--green)',  dim:'var(--green-dim)' },
  excellent:     { t:'Excellent',      c:'var(--blue)',   dim:'var(--blue-dim)' },
  satisfactory:  { t:'Satisfactory',   c:'var(--amber)',  dim:'var(--amber-dim)' },
  dissatisfactory:{ t:'Dissatisfactory',c:'var(--rose)',  dim:'var(--rose-dim)' },
};
const GRADE_ORDER = ['outstanding','excellent','satisfactory','dissatisfactory'];

function GradeBadge({ grade }) {
  const g = GRADE[grade]; if(!g) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 12px 7px 10px', borderRadius:8, background:g.dim, border:'1px solid color-mix(in srgb,'+g.c+' 32%, transparent)', flex:'none' }}>
      <span style={{ width:9, height:9, borderRadius:'50%', background:g.c, flex:'none' }}/>
      <div style={{ lineHeight:1.1 }}>
        <div className="eyebrow" style={{ fontSize:8.5, color:'var(--faint)' }}>Assessment</div>
        <div style={{ fontSize:12.5, fontWeight:600, color:g.c }}>{g.t}</div>
      </div>
    </div>
  );
}

function BarRow({ label, v, max, color, suffix='%' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ width:96, fontSize:11.5, color:'var(--muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', flex:'none' }}>{label}</div>
      <div style={{ flex:1, height:7, background:'var(--line)', borderRadius:100, overflow:'hidden' }}>
        <div style={{ width:(v/max*100)+'%', height:'100%', background:color, borderRadius:100, transition:'width .6s' }}/>
      </div>
      <div className="num" style={{ width:34, textAlign:'right', fontSize:11, color:'var(--faint)', flex:'none' }}>{v}{suffix}</div>
    </div>
  );
}

function PaperMetric({ label, value, sub, color }) {
  return (
    <div style={{ flex:1, minWidth:0 }}>
      <div className="num" style={{ fontSize:26, fontWeight:600, color, lineHeight:1, letterSpacing:'-0.5px' }}>{value}</div>
      <div className="eyebrow" style={{ marginTop:6 }}>{label}</div>
      {sub && <div style={{ fontSize:10.5, color:'var(--faint)', marginTop:3 }}>{sub}</div>}
    </div>
  );
}

function FeedbackItem({ f }) {
  const s = SENT[f.sentiment]||SENT.mixed;
  return (
    <div style={{ display:'flex', gap:12, padding:'13px 0', borderTop:'1px solid var(--line)' }}>
      <div style={{ width:3, borderRadius:3, background:s.c, flex:'none' }}/>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:6, flexWrap:'wrap' }}>
          <span className="chip" style={{ color:'var(--ink-2)' }}>{FB_KIND[f.type]}</span>
          <span style={{ fontSize:12, fontWeight:550 }}>{f.who}</span>
          <span className="chip" style={{ color:s.c, borderColor:'color-mix(in srgb,'+s.c+' 30%, transparent)', marginLeft:'auto' }}>{s.t}</span>
        </div>
        <p style={{ fontSize:13, color:'var(--ink-2)', lineHeight:1.5, margin:'0 0 6px' }}>“{f.text}”</p>
        <div className="num" style={{ fontSize:10.5, color:'var(--faint)' }}>{f.date}</div>
      </div>
    </div>
  );
}

function PaperDetail({ p, go }) {
  const [fbFilter, setFbFilter] = useState('all');
  const fb = p.feedback.filter(f=> fbFilter==='all' || f.type===fbFilter);
  const audMax = Math.max(...Object.values(p.audience));
  const geoMax = Math.max(...p.geo.map(g=>g[1]));
  const topic = D().topics.find(t=>t.id===p.topic);
  const sentMix = ['positive','mixed','negative'].map(k=>({ k, n:p.feedback.filter(f=>f.sentiment===k).length }));

  return (
    <div className="rise-fade" key={p.id} style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* header */}
      <div className="panel" style={{ padding:'18px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:10, flexWrap:'wrap' }}>
          <span className="chip" style={{ color:'var(--violet)', borderColor:'var(--violet-dim)' }}>{p.venue}</span>
          <span className="num" style={{ fontSize:11.5, color:'var(--faint)' }}>{p.month} {p.year}</span>
          <button onClick={()=>go('topic',{topicId:p.topic})} className="chip" style={{ cursor:'pointer', color:'var(--gold)', borderColor:'var(--gold-dim)', marginLeft:'auto' }}>↳ {topic.name}</button>
        </div>
        <div style={{ display:'flex', alignItems:'flex-start', gap:16, marginBottom:12 }}>
          <h2 className="serif" style={{ fontSize:23, fontWeight:500, lineHeight:1.2, letterSpacing:'-0.3px', flex:1, minWidth:0 }}>{p.title}</h2>
          <GradeBadge grade={p.grade} />
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <AvatarStack ids={p.authors} size={24} />
            <span style={{ fontSize:12, color:'var(--muted)' }}>{p.authors.map(a=>D().people[a].name.split(' ')[1]).join(', ')}</span>
          </div>
          <div style={{ width:1, height:20, background:'var(--line)' }}/>
          {p.gaps.map(gid=>{ const g=D().gaps.find(x=>x.id===gid); return g && <span key={gid} className="chip" style={{ color:'var(--blue)', borderColor:'var(--blue-dim)' }}>resolves gap</span>; })}
        </div>
      </div>

      {/* metrics + readership trend */}
      <div className="panel" style={{ padding:'16px 20px' }}>
        <div style={{ display:'flex', gap:16, alignItems:'flex-end', marginBottom:16 }}>
          <PaperMetric label="Downloads" value={fmt(p.reads.downloads)} color="var(--ink)" />
          <PaperMetric label="Views" value={fmt(p.reads.views)} color="var(--ink)" />
          <PaperMetric label="Citations" value={p.reads.citations} color="var(--gold)" />
          <PaperMetric label="Altmetric" value={p.reads.altmetric} sub="attention score" color="var(--violet)" />
          <div style={{ flex:'none', alignSelf:'stretch', display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
            <div className="eyebrow" style={{ marginBottom:6, textAlign:'right' }}>Cumulative reads</div>
            <Sparkline data={p.readTrend} w={200} h={44} color="var(--violet)" />
          </div>
        </div>
        <div className="hair"/>
        <div style={{ display:'flex', gap:8, marginTop:14 }}>
          {[['news','News',p.mentions.news,'var(--rose)'],['policy','Policy',p.mentions.policy,'var(--gold)'],['social','Social',p.mentions.social,'var(--blue)'],['patents','Patents',p.mentions.patents,'var(--green)']].map(([k,l,v,c])=>(
            <div key={k} style={{ flex:1, background:'var(--panel)', border:'1px solid var(--line-2)', borderRadius:8, padding:'10px 12px' }}>
              <div className="num" style={{ fontSize:18, fontWeight:600, color:c }}>{v}</div>
              <div className="eyebrow" style={{ marginTop:3 }}>{l} mentions</div>
            </div>
          ))}
        </div>
      </div>

      {/* audience + geo + split */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div className="panel" style={{ padding:'15px 18px' }}>
          <h3 className="serif" style={{ fontSize:15, fontWeight:500, marginBottom:3 }}>Who is reading</h3>
          <p style={{ fontSize:11, color:'var(--faint)', margin:'0 0 14px' }}>Reader sector mix</p>
          <div style={{ display:'flex', flexDirection:'column', gap:11, marginBottom:18 }}>
            <BarRow label="Academic" v={p.audience.academic} max={audMax} color="var(--blue)" />
            <BarRow label="Industry" v={p.audience.industry} max={audMax} color="var(--violet)" />
            <BarRow label="Government" v={p.audience.government} max={audMax} color="var(--gold)" />
            <BarRow label="Nonprofit" v={p.audience.nonprofit} max={audMax} color="var(--green)" />
          </div>
          <div className="hair"/>
          <div style={{ display:'flex', alignItems:'center', gap:16, marginTop:14 }}>
            <div style={{ flex:1 }}>
              <div className="eyebrow" style={{ marginBottom:8 }}>Internal vs external</div>
              <StackBar parts={[{label:'Internal',v:p.split.internal,color:'var(--gold)'},{label:'External',v:p.split.external,color:'var(--line-3)'}]} h={9} />
              <div className="num" style={{ display:'flex', justifyContent:'space-between', marginTop:7, fontSize:11 }}>
                <span style={{ color:'var(--gold)' }}>{p.split.internal}% internal</span>
                <span style={{ color:'var(--muted)' }}>{p.split.external}% external</span>
              </div>
            </div>
          </div>
        </div>
        <div className="panel" style={{ padding:'15px 18px' }}>
          <h3 className="serif" style={{ fontSize:15, fontWeight:500, marginBottom:3 }}>Where</h3>
          <p style={{ fontSize:11, color:'var(--faint)', margin:'0 0 14px' }}>Top reader geographies</p>
          <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
            {p.geo.map(([c,v])=> <BarRow key={c} label={c} v={v} max={geoMax} color={c==='United States'?'var(--blue)':'var(--muted)'} />)}
          </div>
        </div>
      </div>

      {/* feedback */}
      <div className="panel" style={{ padding:'15px 20px 18px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6, gap:12, flexWrap:'wrap' }}>
          <div>
            <h3 className="serif" style={{ fontSize:16, fontWeight:500 }}>Feedback</h3>
            <div style={{ display:'flex', gap:10, marginTop:6 }}>
              {sentMix.map(({k,n})=> n>0 && <span key={k} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--faint)' }}><span style={{ width:6, height:6, borderRadius:'50%', background:SENT[k].c }}/>{n} {SENT[k].t.toLowerCase()}</span>)}
            </div>
          </div>
          <div style={{ display:'flex', gap:4, background:'var(--bg-2)', border:'1px solid var(--line-2)', borderRadius:8, padding:3 }}>
            {[['all','All'],['peer','Peer'],['reader','Reader'],['sponsor','Sponsor']].map(([k,l])=>(
              <button key={k} onClick={()=>setFbFilter(k)} style={{ padding:'5px 11px', borderRadius:6, border:0, cursor:'pointer', fontSize:11.5, fontFamily:'var(--sans)',
                background: fbFilter===k?'var(--raised)':'transparent', color: fbFilter===k?'var(--ink)':'var(--faint)', fontWeight: fbFilter===k?550:450 }}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          {fb.length? fb.map((f,i)=><FeedbackItem key={i} f={f} />) : <div style={{ padding:'20px 0', color:'var(--faint)', fontSize:12.5 }}>No {fbFilter} feedback recorded.</div>}
        </div>
      </div>
    </div>
  );
}

function PapersView({ scope, go, paperId }) {
  const tset = new Set(scope.topics.map(t=>t.id));
  const papers = D().papers.filter(p=> tset.has(p.topic));
  const [sel, setSel] = useState(paperId || (papers[0] && papers[0].id));
  useEffect(()=>{ if(paperId) setSel(paperId); }, [paperId]);
  const current = papers.find(p=>p.id===sel) || papers[0];

  // scope aggregate
  const totals = papers.reduce((a,p)=>({ d:a.d+p.reads.downloads, c:a.c+p.reads.citations, alt:a.alt+p.reads.altmetric }), {d:0,c:0,alt:0});

  return (
    <div className="rise" style={{ padding:'22px 26px 60px', maxWidth:1440, margin:'0 auto' }}>
      <div style={{ marginBottom:18 }}>
        <div className="eyebrow" style={{ marginBottom:7 }}>{scope.isChief?'Directorate · All publications':`${scope.person.name} · ${scope.person.team}`}</div>
        <h1 className="serif" style={{ fontSize:30, fontWeight:500, letterSpacing:'-0.4px' }}>Papers &amp; Impact</h1>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'320px minmax(0,1fr)', gap:16, alignItems:'start' }}>
        {/* list */}
        <div style={{ display:'flex', flexDirection:'column', gap:12, position:'sticky', top:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
            {[['Reads',fmt(totals.d),'var(--ink)'],['Cites',totals.c,'var(--gold)'],['Altmetric',totals.alt,'var(--violet)']].map(([l,v,c])=>(
              <div key={l} className="panel" style={{ padding:'11px 12px' }}>
                <div className="num" style={{ fontSize:18, fontWeight:600, color:c }}>{v}</div>
                <div className="eyebrow" style={{ marginTop:3, fontSize:9 }}>{l}</div>
              </div>
            ))}
          </div>
          <div className="panel" style={{ overflow:'hidden' }}>
            <div style={{ padding:'12px 14px 6px' }} className="eyebrow">{papers.length} publications</div>
            {papers.map(p=>{ const on=p.id===current.id;
              return (
              <button key={p.id} onClick={()=>setSel(p.id)} style={{ display:'block', width:'100%', textAlign:'left', cursor:'pointer',
                background: on?'linear-gradient(90deg,var(--gold-dim),transparent)':'transparent', border:0, borderTop:'1px solid var(--line)', padding:'12px 14px', color:'inherit', position:'relative' }}>
                {on && <span style={{ position:'absolute', left:0, top:10, bottom:10, width:2.5, background:'var(--gold)', borderRadius:3 }}/>}
                <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:6 }}>
                  {GRADE[p.grade] && <span title={GRADE[p.grade].t} style={{ width:7, height:7, borderRadius:'50%', background:GRADE[p.grade].c, flex:'none', marginTop:4 }}/>}
                  <div style={{ fontSize:12.5, fontWeight: on?600:500, lineHeight:1.32, color: on?'var(--ink)':'var(--ink-2)' }}>{p.title}</div>
                </div>
                <div className="num" style={{ display:'flex', gap:11, fontSize:10.5, color:'var(--faint)' }}>
                  <span>{p.venue}</span><span>·</span><span>↓{fmt(p.reads.downloads)}</span><span>◇{p.reads.citations}</span>
                </div>
              </button>
            );})}
          </div>
        </div>
        {/* detail */}
        {current && <PaperDetail p={current} go={go} />}
      </div>
    </div>
  );
}

window.PapersView = PapersView;
window.GRADE = GRADE;
window.GRADE_ORDER = GRADE_ORDER;
