/* ===== Intellect — People & Teams ===== */

function PeopleView({ scope, go }) {
  const P = D().people;
  const ids = Object.keys(P);
  // workload per person
  const stat = (id)=>({
    topics: D().topics.filter(t=>t.lead===id).length,
    work: D().work.filter(w=>w.team.includes(id)).length,
    leadWork: D().work.filter(w=>w.lead===id).length,
    papers: D().papers.filter(p=>p.authors.includes(id)).length,
  });
  // group by team
  const teams = {};
  ids.forEach(id=>{ const t=P[id].team; (teams[t]=teams[t]||[]).push(id); });
  const order = ['Directorate','Cognitive Systems','Energy & Materials','Autonomy','Quantum & Sensing','Synthetic Biology','Climate Systems'];
  const teamNames = order.filter(t=>teams[t]);

  return (
    <div className="rise" style={{ padding:'22px 26px 60px', maxWidth:1440, margin:'0 auto' }}>
      <div style={{ marginBottom:18 }}>
        <div className="eyebrow" style={{ marginBottom:7 }}>{D().lab.name} · {ids.length} members</div>
        <h1 className="serif" style={{ fontSize:30, fontWeight:500, letterSpacing:'-0.4px' }}>People &amp; Teams</h1>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
        {teamNames.map(team=>(
          <div key={team}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <h3 className="serif" style={{ fontSize:17, fontWeight:500, whiteSpace:'nowrap' }}>{team}</h3>
              <span className="num" style={{ fontSize:11, color:'var(--faint)' }}>{teams[team].length}</span>
              <div className="hair" style={{ flex:1 }}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
              {teams[team].sort((a,b)=> (P[a].title==='Chief'||P[a].title==='PI'?0:1)-(P[b].title==='Chief'||P[b].title==='PI'?0:1)).map(id=>{ const p=P[id]; const s=stat(id);
                const ledTopics = D().topics.filter(t=>t.lead===id);
                return (
                <div key={id} className="panel" style={{ padding:'15px 16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:11, marginBottom:13 }}>
                    <Avatar id={id} size={40} ring />
                    <div style={{ minWidth:0, lineHeight:1.3, whiteSpace:'nowrap' }}>
                      <div style={{ fontSize:14, fontWeight:600 }}>{p.name}</div>
                      <div style={{ fontSize:11.5, color:'var(--faint)' }}>{p.role}</div>
                    </div>
                    {(p.title==='Chief') && <span className="chip" style={{ marginLeft:'auto', color:'var(--gold)', borderColor:'var(--gold-dim)', background:'var(--gold-dim)' }}>Chief</span>}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom: ledTopics.length?13:0 }}>
                    {[['Topics',s.topics,'var(--gold)'],['Work',s.work,'var(--blue)'],['Papers',s.papers,'var(--green)']].map(([l,v,c])=>(
                      <div key={l} style={{ background:'var(--panel)', border:'1px solid var(--line)', borderRadius:8, padding:'8px 10px' }}>
                        <div className="num" style={{ fontSize:18, fontWeight:600, color: v? c:'var(--faint)' }}>{v}</div>
                        <div className="eyebrow" style={{ fontSize:8.5, marginTop:2 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  {ledTopics.length>0 && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {ledTopics.map(t=>(
                        <button key={t.id} onClick={()=>go('topic',{topicId:t.id})} className="chip" style={{ cursor:'pointer' }}>
                          <span className={'dot '+t.health} style={{ boxShadow:'none', width:5, height:5 }}/>{t.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );})}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== Research Topics — grouped by priority bin (canonical) ===== */
function TopicsList({ scope, go }) {
  const [healthF, setHealthF] = useState('all');
  let ts = scope.topics;
  if (healthF!=='all') ts = ts.filter(t=> t.health===healthF);
  const hr = {'at-risk':0,watch:1,healthy:2};
  const bins = [1,2,3,4].map(bin=>({ bin, items: ts.filter(t=>t.bin===bin).sort((a,b)=> (hr[a.health]-hr[b.health]) || a.coverage-b.coverage) })).filter(s=>s.items.length);

  return (
    <div className="rise" style={{ padding:'22px 26px 60px', maxWidth:1440, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:18, gap:16, flexWrap:'wrap' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom:7 }}>{scope.isChief?'Directorate · All topics':`${scope.person.name} · ${scope.person.team}`}</div>
          <h1 className="serif" style={{ fontSize:30, fontWeight:500, letterSpacing:'-0.4px' }}>Research Topics</h1>
        </div>
        <button className="btn btn-gold">+ New topic</button>
      </div>
      <div style={{ display:'flex', gap:10, marginBottom:14, alignItems:'center', flexWrap:'wrap' }}>
        <span className="eyebrow">Grouped by priority</span>
        <div style={{ flex:1 }}/>
        <div style={{ display:'flex', gap:4, background:'var(--bg-2)', border:'1px solid var(--line-2)', borderRadius:8, padding:3 }}>
          {[['all','All'],['at-risk','At risk'],['watch','Watch'],['healthy','On track']].map(([k,l])=>(
            <button key={k} onClick={()=>setHealthF(k)} style={{ padding:'6px 12px', borderRadius:6, border:0, cursor:'pointer', fontSize:12, fontFamily:'var(--sans)', whiteSpace:'nowrap',
              background: healthF===k?'var(--raised)':'transparent', color: healthF===k?'var(--ink)':'var(--faint)', fontWeight: healthF===k?550:450 }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {bins.map(sec=>(
          <div key={sec.bin} className="panel" style={{ overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'13px 16px' }}>
              <PriorityBadge bin={sec.bin} size={22} />
              <span className="serif" style={{ fontSize:16, fontWeight:500 }}>{BIN[sec.bin].name}</span>
              <span className="num" style={{ fontSize:11, color:'var(--faint)' }}>{sec.items.length}</span>
              <span style={{ flex:1 }}/>
              {sec.items.filter(t=>t.health==='at-risk').length>0 && <span className="chip" style={{ color:'var(--rose)', borderColor:'var(--rose-dim)' }}><span className="dot at-risk" style={{ boxShadow:'none', width:6, height:6 }}/>{sec.items.filter(t=>t.health==='at-risk').length} at risk</span>}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1.7fr 86px 110px 84px 76px', gap:14, padding:'0 16px 7px' }}>
              {['Topic','Momentum','Gap coverage','Open','Work'].map(h=><div key={h} className="eyebrow" style={{ fontSize:9 }}>{h}</div>)}
            </div>
            {sec.items.map(t=> <TopicRow key={t.id} t={t} onOpen={(id)=>go('topic',{topicId:id})} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

window.PeopleView = PeopleView;
window.TopicsList = TopicsList;
