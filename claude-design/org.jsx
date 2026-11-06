/* ===== Intellect — Organization: centers → teams → topics drill-down ===== */
/* Chief-facing rollup of the institute by sub-lab (center), the teams inside
   each center, and the topics inside each team. Reuses shared atoms
   (Avatar, KPI, PriorityBadge, Delta, Icon, money/pct/fmt, D). */

function orgRollup(ts){
  const mix = { healthy:0, watch:0, 'at-risk':0 };
  let openGaps=0, work=0, papers=0, fte=0, budA=0, budS=0, covSum=0, mom=0;
  ts.forEach(t=>{
    mix[t.health] = (mix[t.health]||0)+1;
    openGaps+=t.openGaps; work+=t.work; papers+=t.papers; fte+=t.fte;
    budA+=t.budget.allocated; budS+=t.budget.spent; covSum+=t.coverage; mom+=t.momentum;
  });
  const n = ts.length||1;
  return { n:ts.length, mix, openGaps, work, papers,
    fte:Math.round(fte*10)/10, budA, budS, cov:covSum/n, mom:Math.round(mom/n) };
}
const covColor = (c)=> c>=0.66 ? 'var(--green)' : c>=0.45 ? 'var(--amber)' : 'var(--rose)';

function HealthBar({ mix, total, h=8 }){
  const segs = [['healthy','var(--green)'],['watch','var(--amber)'],['at-risk','var(--rose)']];
  return (
    <div style={{ display:'flex', height:h, borderRadius:100, overflow:'hidden', background:'var(--line)', gap:2 }}>
      {segs.map(([k,c])=> mix[k]>0 && <div key={k} title={`${mix[k]} ${k}`} style={{ width:(mix[k]/(total||1)*100)+'%', background:c }}/>)}
    </div>
  );
}
function MiniHealth({ mix }){
  const segs = [['healthy','var(--green)'],['watch','var(--amber)'],['at-risk','var(--rose)']];
  return <div style={{ display:'flex', gap:9 }}>{segs.map(([k,c])=> mix[k]>0 ? (
    <span key={k} className="num" style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11.5, color:'var(--muted)' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:c }}/>{mix[k]}
    </span>
  ) : null)}</div>;
}
function CoverageBar({ v, w=120 }){
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ width:w, height:5, borderRadius:100, background:'var(--line)', overflow:'hidden' }}>
        <div style={{ width:pct(v), height:'100%', background:covColor(v), borderRadius:100, transition:'width .6s' }}/>
      </div>
      <span className="num" style={{ fontSize:11.5, color:'var(--ink-2)', width:30, textAlign:'right' }}>{pct(v)}</span>
    </div>
  );
}
function OrgStat({ label, value, sub, color='var(--ink)' }){
  return (
    <div style={{ minWidth:0 }}>
      <div className="eyebrow" style={{ marginBottom:6 }}>{label}</div>
      <div className="num" style={{ fontSize:20, fontWeight:600, color, lineHeight:1, letterSpacing:'-0.5px', whiteSpace:'nowrap' }}>{value}</div>
      {sub && <div style={{ fontSize:10.5, color:'var(--faint)', marginTop:5 }}>{sub}</div>}
    </div>
  );
}

function TeamRow({ team, go, defaultOpen }){
  const [open,setOpen] = useState(!!defaultOpen);
  const ts = useMemo(()=> D().topics.filter(t=>t.team===team), [team]);
  const r = orgRollup(ts);
  const lead = Object.values(D().people).find(p=>p.team===team && p.title==='PI');
  const members = Object.values(D().people).filter(p=>p.team===team);
  const Col = ({ value, label, color }) => (
    <div style={{ textAlign:'right', minWidth:42 }}>
      <div className="num" style={{ fontSize:14, fontWeight:600, color:color||'var(--ink)' }}>{value}</div>
      <div className="eyebrow" style={{ fontSize:8.5, letterSpacing:'1px', marginTop:2 }}>{label}</div>
    </div>
  );
  return (
    <div style={{ borderTop:'1px solid var(--line)' }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ width:'100%', display:'flex', alignItems:'center', gap:16, padding:'14px 6px', background:'transparent', border:0, cursor:'pointer', textAlign:'left', color:'inherit' }}
        onMouseEnter={e=>e.currentTarget.style.background='var(--raised)'}
        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
        <span style={{ color:'var(--faint)', display:'inline-flex', transition:'transform .18s', transform: open?'rotate(90deg)':'none', flex:'none' }}><Icon d={icons.chevron} size={15}/></span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:600, whiteSpace:'nowrap' }}>{team}</div>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginTop:4, color:'var(--faint)', fontSize:11.5 }}>
            {lead && <span style={{ display:'inline-flex', alignItems:'center', gap:6, color:'var(--muted)' }}><Avatar id={lead.id} size={16}/>{lead.name}</span>}
            <span>·</span><span>{members.length} people</span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:24, flex:'none' }}>
          <MiniHealth mix={r.mix}/>
          <div style={{ width:1, height:24, background:'var(--line)' }}/>
          <Col value={r.n} label="Topics"/>
          <CoverageBar v={r.cov} w={78}/>
          <Col value={r.openGaps} label="Gaps" color={r.openGaps? 'var(--ink)':'var(--green)'}/>
          <Col value={r.fte} label="FTE" color="var(--blue)"/>
        </div>
      </button>
      {open && (
        <div style={{ padding:'0 6px 14px 36px', display:'flex', flexDirection:'column', gap:6 }}>
          {ts.map(t=>(
            <button key={t.id} onClick={()=>go('topic',{topicId:t.id})}
              style={{ display:'grid', gridTemplateColumns:'24px 1fr 148px 76px 56px', alignItems:'center', gap:14, padding:'10px 12px', borderRadius:8, background:'var(--raised)', border:'1px solid var(--line)', cursor:'pointer', textAlign:'left', color:'inherit', transition:'.15s' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor='var(--line-3)'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='var(--line)'}>
              <PriorityBadge bin={t.bin} size={20}/>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:550, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.name}</div>
                <div style={{ fontSize:10.5, color:'var(--faint)', marginTop:2 }}>{t.priority} · {t.work} in work</div>
              </div>
              <CoverageBar v={t.coverage} w={92}/>
              <div className="num" style={{ fontSize:12, color:'var(--muted)', textAlign:'right' }}>{t.openGaps} open</div>
              <div style={{ display:'flex', justifyContent:'flex-end' }}><Delta v={t.momentum}/></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CenterCard({ sl, go, index }){
  const ts = useMemo(()=> D().topics.filter(t=> sl.teams.includes(t.team)), [sl]);
  const r = orgRollup(ts);
  const lead = D().people[sl.lead];
  const people = Object.values(D().people).filter(p=> sl.teams.includes(p.team));
  return (
    <div className="panel rise" style={{ padding:'22px 24px 18px', marginBottom:14, animationDelay:(index*0.05)+'s' }}>
      {/* header */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:16, marginBottom:6 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:11, marginBottom:7 }}>
            <span className="mono" style={{ fontSize:11, fontWeight:600, color:'var(--on-brand)', background:'var(--brand)', borderRadius:6, padding:'4px 8px', letterSpacing:'0.6px' }}>{sl.code}</span>
            <h2 className="serif" style={{ fontSize:21, fontWeight:600, letterSpacing:'-0.4px' }}>{sl.short}</h2>
          </div>
          <p style={{ fontSize:13, color:'var(--muted)', margin:0, maxWidth:600, lineHeight:1.5 }}>{sl.focus}</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:11, flex:'none', paddingTop:2 }}>
          <div style={{ textAlign:'right', lineHeight:1.3 }}>
            <div className="eyebrow" style={{ marginBottom:4 }}>Center lead</div>
            <div style={{ fontSize:13, fontWeight:600, whiteSpace:'nowrap' }}>{lead.name}</div>
            <div style={{ fontSize:10.5, color:'var(--faint)' }}>{lead.role}</div>
          </div>
          <Avatar id={lead.id} size={38} ring/>
        </div>
      </div>
      {/* stat strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:18, padding:'18px 0', marginTop:14, borderTop:'1px solid var(--line)', borderBottom:'1px solid var(--line)' }}>
        <OrgStat label="Teams" value={sl.teams.length} sub={`${people.length} researchers`} />
        <OrgStat label="Topics" value={r.n} sub={`${r.work} in work`} />
        <OrgStat label="Coverage" value={pct(r.cov)} color={covColor(r.cov)} sub="gap coverage" />
        <OrgStat label="Open gaps" value={r.openGaps} color={r.openGaps? 'var(--ink)':'var(--green)'} sub="unresolved" />
        <OrgStat label="People" value={r.fte+' FTE'} color="var(--blue)" sub="allocated" />
        <OrgStat label="Budget" value={money(r.budA)} sub={`${money(r.budS)} spent`} />
      </div>
      {/* health */}
      <div style={{ display:'flex', alignItems:'center', gap:16, margin:'15px 0 4px', flexWrap:'wrap' }}>
        <div className="eyebrow" style={{ flex:'none' }}>Portfolio health</div>
        <div style={{ flex:1, minWidth:160 }}><HealthBar mix={r.mix} total={r.n}/></div>
        <div style={{ display:'flex', gap:16, flex:'none' }}>
          {[['On track','healthy','var(--green)'],['Watch','watch','var(--amber)'],['At risk','at-risk','var(--rose)']].map(([l,k,c])=>(
            <span key={k} style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:11.5, color:'var(--muted)' }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:c }}/><span className="num">{r.mix[k]||0}</span> {l}
            </span>
          ))}
        </div>
      </div>
      {/* teams */}
      <div style={{ marginTop:18 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
          <span className="eyebrow">Teams</span>
          <span className="num" style={{ fontSize:11, color:'var(--faint)' }}>{sl.teams.length}</span>
        </div>
        {sl.teams.map((team,i)=> <TeamRow key={team} team={team} go={go} defaultOpen={index===0 && i===0} />)}
      </div>
    </div>
  );
}

function OrgView({ scope, go, openBrief }){
  const sls = D().subLabs;
  const allTopics = D().topics;
  const totalPeople = Object.values(D().people).filter(p=>p.title!=='Chief').length;
  const totalFte = Math.round(allTopics.reduce((s,t)=>s+t.fte,0)*10)/10;
  const totalBud = allTopics.reduce((s,t)=>s+t.budget.allocated,0);
  const teamCount = sls.reduce((s,sl)=>s+sl.teams.length,0);
  return (
    <div className="rise" style={{ padding:'22px 26px 60px', maxWidth:1280, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:18, gap:16, flexWrap:'wrap' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom:7 }}>{D().lab.name} · Organization</div>
          <h1 className="serif" style={{ fontSize:30, fontWeight:500, letterSpacing:'-0.4px' }}>Centers &amp; Teams</h1>
        </div>
        <button className="btn btn-gold" onClick={openBrief}>Directorate brief</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:18 }}>
        <KPI label="Centers" value={sls.length} sub="research directorates" />
        <KPI label="Teams" value={teamCount} sub="across centers" />
        <KPI label="Active topics" value={allTopics.length} sub="tracked" />
        <KPI label="Researchers" value={totalPeople} sub={totalFte+' FTE allocated'} />
        <KPI label="Budget" value={money(totalBud)} sub="FY26 allocated" />
      </div>

      {sls.map((sl,i)=> <CenterCard key={sl.id} sl={sl} go={go} index={i} />)}
    </div>
  );
}

Object.assign(window, { OrgView });
