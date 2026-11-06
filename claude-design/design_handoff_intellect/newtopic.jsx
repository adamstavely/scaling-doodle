/* ===== Intellect — New Topic creation flow =====
   Multi-step modal launched from the Dashboard "+ New topic" button.
   Define → Scope → Resourcing, with a live preview rail; on create it adds a
   well-formed topic to the in-memory portfolio and lands on the dashboard.
   Reuses shared globals: D, money, Avatar, PriorityBadge, Icon, icons. */

const TAG_POOL = ['hardware','edge','ml','climate','materials','energy','sensing','autonomy','security','policy','bio','quantum','storage','modeling','scale-up'];
const PRIORITY_LABEL = { 1:'Flagship', 2:'Core', 3:'Core', 4:'Emerging' };
const HEALTH_OPTS = [['healthy','On track','var(--green)'],['watch','Watch','var(--amber)'],['at-risk','At risk','var(--rose)']];
const HEALTH_COV = { healthy:0.82, watch:0.55, 'at-risk':0.34 };

function ntInput(extra){ return { width:'100%', background:'var(--bg-2)', border:'1px solid var(--line-2)', borderRadius:8, padding:'9px 12px', color:'var(--ink)', fontSize:13, fontFamily:'var(--sans)', ...extra }; }

function NTField({ label, hint, children }){
  return (
    <label style={{ display:'block', marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:7 }}>
        <span style={{ fontSize:12, fontWeight:600, color:'var(--ink-2)' }}>{label}</span>
        {hint && <span style={{ fontSize:10.5, color:'var(--faint)' }}>{hint}</span>}
      </div>
      {children}
    </label>
  );
}
function Segmented({ value, options, onChange }){
  return (
    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
      {options.map(o=>{ const on = value===o.v;
        return <button key={o.v} type="button" onClick={()=>onChange(o.v)} style={{
          display:'inline-flex', alignItems:'center', gap:7, padding:'8px 12px', borderRadius:8, cursor:'pointer', fontSize:12.5, fontWeight:500, fontFamily:'var(--sans)',
          border:`1px solid ${on?'var(--brand)':'var(--line-2)'}`, background: on?'var(--brand)':'var(--panel)', color: on?'var(--on-brand)':'var(--ink-2)', transition:'.12s' }}>
          {o.node}{o.label}
        </button>;
      })}
    </div>
  );
}

const STEPS = ['Define','Scope','Resourcing'];

function NewTopic({ open, onClose, go }){
  const sls = D().subLabs;
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState('form'); // form | done
  const [f, setF] = useState(null);
  const set = (patch)=> setF(s=>({ ...s, ...patch }));

  useEffect(()=>{
    if (open){
      const center = sls[0];
      const team = center.teams[0];
      const lead = Object.values(D().people).find(p=>p.team===team && p.title==='PI');
      setF({ name:'', summary:'', center:center.id, team, lead: lead?lead.id:'mo', bin:2,
        tags:[], sponsors:'', questions:[], qDraft:'', budget:1.5, fte:1.0, health:'healthy' });
      setStep(0); setPhase('form');
      document.body.style.overflow='hidden';
      const onKey=(e)=>{ if(e.key==='Escape') onClose(); };
      window.addEventListener('keydown', onKey);
      return ()=>{ window.removeEventListener('keydown', onKey); document.body.style.overflow=''; };
    }
  }, [open]);

  if (!open || !f) return null;

  const center = sls.find(s=>s.id===f.center) || sls[0];
  const teamPeople = Object.values(D().people).filter(p=> center.teams.includes(p.team) && p.title==='PI');
  const lead = D().people[f.lead];
  const canNext = step!==0 || (f.name.trim() && f.team && f.lead);

  const toggleTag = (t)=> set({ tags: f.tags.includes(t)? f.tags.filter(x=>x!==t) : [...f.tags, t] });
  const addQ = ()=>{ const q=f.qDraft.trim(); if(q){ set({ questions:[...f.questions, q], qDraft:'' }); } };

  const create = ()=>{
    const slug = (f.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')||'topic').slice(0,18);
    const id = 't-'+slug+'-'+Math.random().toString(36).slice(2,5);
    const cov = HEALTH_COV[f.health];
    const topic = {
      id, bin:f.bin, name:f.name.trim(), lead:f.lead, team:f.team,
      health:f.health, coverage:cov, momentum:0, priority:PRIORITY_LABEL[f.bin],
      summary:f.summary.trim() || 'New research topic.',
      questions:f.questions.length, gaps:0, openGaps:0, work:0, papers:0,
      trend:[44,44,45,44,45,45,46,45,46,46,45,46],
      tags:f.tags, sponsors: f.sponsors.split(',').map(s=>s.trim()).filter(Boolean),
      budget:{ allocated:Number(f.budget)||0, spent:0, fy:'FY26' },
      fte:Number(f.fte)||0, team_ids:[f.lead],
    };
    D().topics.unshift(topic);
    f.questions.forEach((q,i)=> D().questions.push({ id:id+'-q'+i, topic:id, text:q, status:'open', owner:f.lead, gaps:[] }));
    setPhase('done');
  };

  /* ---- preview rail ---- */
  const Preview = () => (
    <div style={{ width:286, flex:'none', borderLeft:'1px solid var(--line)', background:'var(--bg)', padding:'22px 22px', display:'flex', flexDirection:'column' }}>
      <div className="eyebrow" style={{ marginBottom:14 }}>Live preview</div>
      <div className="panel" style={{ padding:'15px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:10 }}>
          <PriorityBadge bin={f.bin} size={22} />
          <span className="chip" style={{ gap:6 }}><span style={{ width:6,height:6,borderRadius:'50%',background:HEALTH_OPTS.find(h=>h[0]===f.health)[2] }}/>{HEALTH_OPTS.find(h=>h[0]===f.health)[1]}</span>
        </div>
        <div className="serif" style={{ fontSize:16, fontWeight:600, letterSpacing:'-0.3px', lineHeight:1.25, color: f.name? 'var(--ink)':'var(--faint)' }}>{f.name || 'Untitled topic'}</div>
        <div style={{ fontSize:11.5, color:'var(--muted)', marginTop:7, lineHeight:1.5, minHeight:17 }}>{f.summary || center.short}</div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:13, paddingTop:13, borderTop:'1px solid var(--line)' }}>
          {lead && <><Avatar id={lead.id} size={22}/><div style={{ lineHeight:1.25, minWidth:0 }}><div style={{ fontSize:12, fontWeight:600, whiteSpace:'nowrap' }}>{lead.name}</div><div style={{ fontSize:10, color:'var(--faint)' }}>{f.team}</div></div></>}
        </div>
        {f.tags.length>0 && <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:12 }}>{f.tags.map(t=><span key={t} className="chip" style={{ fontSize:9.5, padding:'2px 7px' }}>{t}</span>)}</div>}
        <div style={{ display:'flex', gap:16, marginTop:14, paddingTop:13, borderTop:'1px solid var(--line)' }}>
          <div><div className="num" style={{ fontSize:15, fontWeight:600 }}>{money(Number(f.budget)||0)}</div><div className="eyebrow" style={{ fontSize:8.5, marginTop:3 }}>Budget</div></div>
          <div><div className="num" style={{ fontSize:15, fontWeight:600, color:'var(--blue)' }}>{f.fte}</div><div className="eyebrow" style={{ fontSize:8.5, marginTop:3 }}>FTE</div></div>
          <div><div className="num" style={{ fontSize:15, fontWeight:600 }}>{f.questions.length}</div><div className="eyebrow" style={{ fontSize:8.5, marginTop:3 }}>Q's</div></div>
        </div>
      </div>
      <div style={{ flex:1 }}/>
      <div style={{ fontSize:10.5, color:'var(--faint)', lineHeight:1.5 }}>{center.code} · {center.short}</div>
    </div>
  );

  return (
    <div style={{ position:'fixed', inset:0, zIndex:120, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(8,12,20,0.5)', backdropFilter:'blur(3px)', animation:'briefFade .2s both' }}/>
      <div className="panel" style={{ position:'relative', width:'min(820px, 96vw)', maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'var(--sh-pop)', overflow:'hidden', animation:'briefRise .35s cubic-bezier(.2,.7,.2,1) both' }}>

        {/* header */}
        <div style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 20px', borderBottom:'1px solid var(--line)' }}>
          <div style={{ flex:1 }}>
            <div className="eyebrow" style={{ marginBottom:5 }}>New research topic</div>
            <div style={{ display:'flex', alignItems:'center', gap:9 }}>
              {STEPS.map((s,i)=>(
                <React.Fragment key={s}>
                  {i>0 && <span style={{ width:18, height:1, background: i<=step?'var(--brand)':'var(--line-2)' }}/>}
                  <span style={{ display:'inline-flex', alignItems:'center', gap:7, fontSize:12.5, fontWeight: i===step?600:500, color: i===step?'var(--ink)': i<step?'var(--muted)':'var(--faint)' }}>
                    <span className="num" style={{ width:18, height:18, borderRadius:'50%', display:'grid', placeItems:'center', fontSize:10, background: i<step?'var(--brand)': i===step?'var(--brand-dim)':'transparent', color: i<step?'var(--on-brand)': i===step?'var(--ink)':'var(--faint)', border: i>=step?'1px solid var(--line-2)':'0' }}>{i<step?'✓':i+1}</span>
                    {s}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding:8 }}><Icon d={icons.close} size={18}/></button>
        </div>

        {phase==='done' ? (
          <div style={{ padding:'52px 40px 56px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
            <div style={{ width:54, height:54, borderRadius:'50%', background:'var(--green-dim)', display:'grid', placeItems:'center', color:'var(--green)' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </div>
            <div>
              <h2 className="serif" style={{ fontSize:21, fontWeight:600, letterSpacing:'-0.3px' }}>Topic created</h2>
              <p style={{ fontSize:13, color:'var(--muted)', marginTop:7, maxWidth:380 }}><b style={{ color:'var(--ink)' }}>{f.name}</b> is now tracked under {center.short} · {f.team}. It's live on the portfolio dashboard.</p>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:4 }}>
              <button className="btn" onClick={onClose}>Close</button>
              <button className="btn btn-gold" onClick={()=>{ onClose(); go('dashboard'); }}>View on dashboard</button>
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', flex:1, minHeight:0 }}>
            {/* form column */}
            <div style={{ flex:1, minWidth:0, padding:'22px 24px', overflow:'auto' }}>
              {step===0 && (
                <div>
                  <NTField label="Topic name" hint="required">
                    <input autoFocus value={f.name} onChange={e=>set({name:e.target.value})} placeholder="e.g. Neuromorphic Computing" style={ntInput()} />
                  </NTField>
                  <NTField label="One-line summary">
                    <textarea value={f.summary} onChange={e=>set({summary:e.target.value})} rows={2} placeholder="What question does this topic pursue?" style={ntInput({ resize:'vertical', lineHeight:1.5 })} />
                  </NTField>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                    <NTField label="Center">
                      <select value={f.center} onChange={e=>{ const c=sls.find(s=>s.id===e.target.value); const team=c.teams[0]; const ld=Object.values(D().people).find(p=>p.team===team&&p.title==='PI'); set({ center:e.target.value, team, lead: ld?ld.id:f.lead }); }} style={ntInput({ cursor:'pointer' })}>
                        {sls.map(s=><option key={s.id} value={s.id}>{s.short}</option>)}
                      </select>
                    </NTField>
                    <NTField label="Team">
                      <select value={f.team} onChange={e=>{ const ld=Object.values(D().people).find(p=>p.team===e.target.value&&p.title==='PI'); set({ team:e.target.value, lead: ld?ld.id:f.lead }); }} style={ntInput({ cursor:'pointer' })}>
                        {center.teams.map(t=><option key={t} value={t}>{t}</option>)}
                      </select>
                    </NTField>
                  </div>
                  <NTField label="Topic lead">
                    <select value={f.lead} onChange={e=>set({lead:e.target.value})} style={ntInput({ cursor:'pointer' })}>
                      {teamPeople.map(p=><option key={p.id} value={p.id}>{p.name} · {p.team}</option>)}
                    </select>
                  </NTField>
                  <NTField label="Priority">
                    <Segmented value={f.bin} onChange={v=>set({bin:v})} options={[1,2,3,4].map(b=>({ v:b, node:<PriorityBadge bin={b} size={18} />, label:PRIORITY_LABEL[b] }))} />
                  </NTField>
                </div>
              )}

              {step===1 && (
                <div>
                  <NTField label="Tags" hint={`${f.tags.length} selected`}>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                      {TAG_POOL.map(t=>{ const on=f.tags.includes(t);
                        return <button key={t} type="button" onClick={()=>toggleTag(t)} style={{ padding:'6px 11px', borderRadius:100, cursor:'pointer', fontSize:12, fontFamily:'var(--mono)', letterSpacing:'.3px',
                          border:`1px solid ${on?'var(--brand)':'var(--line-2)'}`, background:on?'var(--brand)':'var(--panel)', color:on?'var(--on-brand)':'var(--muted)', transition:'.12s' }}>{t}</button>;
                      })}
                    </div>
                  </NTField>
                  <NTField label="Opening questions" hint="optional">
                    <div style={{ display:'flex', gap:8 }}>
                      <input value={f.qDraft} onChange={e=>set({qDraft:e.target.value})} onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addQ(); } }} placeholder="Add a research question and press Enter" style={ntInput()} />
                      <button className="btn" type="button" onClick={addQ} style={{ flex:'none' }}><Icon d={icons.plus} size={15}/></button>
                    </div>
                    {f.questions.length>0 && (
                      <div style={{ display:'flex', flexDirection:'column', gap:7, marginTop:10 }}>
                        {f.questions.map((q,i)=>(
                          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:9, padding:'9px 11px', background:'var(--bg-2)', border:'1px solid var(--line)', borderRadius:8 }}>
                            <span className="num" style={{ fontSize:11, color:'var(--faint)', marginTop:1 }}>{i+1}</span>
                            <span style={{ flex:1, fontSize:12.5, color:'var(--ink-2)', lineHeight:1.45 }}>{q}</span>
                            <button type="button" onClick={()=>set({ questions:f.questions.filter((_,j)=>j!==i) })} style={{ border:0, background:'transparent', cursor:'pointer', color:'var(--faint)', padding:0, display:'flex' }}><Icon d={icons.close} size={14}/></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </NTField>
                  <NTField label="Sponsors" hint="comma separated">
                    <input value={f.sponsors} onChange={e=>set({sponsors:e.target.value})} placeholder="e.g. DARPA MTO, Internal Seed" style={ntInput()} />
                  </NTField>
                </div>
              )}

              {step===2 && (
                <div>
                  <NTField label="Budget allocated (FY26)" hint={money(Number(f.budget)||0)}>
                    <input type="range" min="0" max="6" step="0.1" value={f.budget} onChange={e=>set({budget:e.target.value})} style={{ width:'100%', accentColor:'var(--brand)' }} />
                  </NTField>
                  <NTField label="People allocated" hint={f.fte+' FTE'}>
                    <input type="range" min="0" max="6" step="0.1" value={f.fte} onChange={e=>set({fte:e.target.value})} style={{ width:'100%', accentColor:'var(--brand)' }} />
                  </NTField>
                  <NTField label="Starting health">
                    <Segmented value={f.health} onChange={v=>set({health:v})} options={HEALTH_OPTS.map(([v,label,c])=>({ v, node:<span style={{ width:8,height:8,borderRadius:'50%',background:c, marginRight:1 }}/>, label }))} />
                  </NTField>
                  <div style={{ marginTop:20, padding:'14px 16px', background:'var(--bg-2)', border:'1px solid var(--line)', borderRadius:10 }}>
                    <div className="eyebrow" style={{ marginBottom:10 }}>Ready to create</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 18px', fontSize:12.5 }}>
                      {[['Topic', f.name||'—'],['Center', center.short],['Team', f.team],['Lead', lead?lead.name:'—'],['Priority', PRIORITY_LABEL[f.bin]],['Budget · FTE', `${money(Number(f.budget)||0)} · ${f.fte}`]].map(([k,v])=>(
                        <div key={k} style={{ display:'flex', justifyContent:'space-between', gap:10 }}><span style={{ color:'var(--faint)' }}>{k}</span><span style={{ fontWeight:550, color:'var(--ink-2)', textAlign:'right', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{v}</span></div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <Preview />
          </div>
        )}

        {/* footer */}
        {phase==='form' && (
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 20px', borderTop:'1px solid var(--line)', background:'var(--bg)' }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <div style={{ flex:1 }}/>
            {step>0 && <button className="btn" onClick={()=>setStep(s=>s-1)}><Icon d={icons.back} size={14}/>Back</button>}
            {step<STEPS.length-1
              ? <button className="btn btn-gold" onClick={()=>canNext && setStep(s=>s+1)} style={{ opacity:canNext?1:0.5, pointerEvents:canNext?'auto':'none' }}>Continue</button>
              : <button className="btn btn-gold" onClick={create}>Create topic</button>}
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { NewTopic });
