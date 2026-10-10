(() => {
"use strict";
const URL="https://giqybxcoireaxidokqwf.supabase.co";
const KEY="sb_publishable_Xc6dmMjjOC7qv8t4ko_EDQ_-wmH3MNh";
const FN=URL+"/functions/v1/scopeproof-approval";
const $=s=>document.querySelector(s);
const client=window.supabase?.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const say=(m)=>{const el=$("#cloudAuthMessage");if(el)el.textContent=m;};
const status=(signed,email)=>{const pill=$("#cloudStatusPill"),txt=$("#cloudStatusText"),notice=document.querySelector(".notice");if(pill)pill.innerHTML='<span class="dot"></span> '+(signed?"Cloud account":"Local mode");if(txt)txt.textContent=signed?"Signed in as "+email+". Sync before creating client links.":"Sign in to create real client approval links and store project records.";$("#cloudSignOutBtn").hidden=!signed;$("#cloudSyncBtn").disabled=!signed;if(notice){const h=notice.querySelector("strong"),p=notice.querySelector("p");if(h)h.textContent=signed?"Cloud account connected":"Prototype mode";if(p)p.textContent=signed?"Your browser data is not uploaded automatically. Click Sync to cloud before creating client approval links.":"Data stays in this browser. Demo approvals are simulated locally and are not shared with clients.";}};
async function current(){if(!client)return null;const {data}=await client.auth.getSession();return data.session||null;}
async function api(action,body,session){const res=await fetch(FN,{method:"POST",headers:{"Content-Type":"application/json","apikey":KEY,...(session?{Authorization:"Bearer "+session.access_token}:{})},body:JSON.stringify({action,...body})});const data=await res.json().catch(()=>({error:"Unexpected server response."}));if(!res.ok)throw new Error(data.error||"Request failed ("+res.status+").");return data;}
function map(uid){const key="scopeproof_cloud_ids_"+uid;try{return JSON.parse(localStorage.getItem(key)||'{"projects":{},"changes":{},"events":{}}')}catch{return {projects:{},changes:{},events:{}}}}
function saveMap(m,uid){localStorage.setItem("scopeproof_cloud_ids_"+uid,JSON.stringify(m))}
async function pushCloud(){
 const session=await current();if(!session)throw new Error("Sign in first.");
 const uid=session.user.id;let state=window.ScopeProofApp?.getState();if(!state)throw new Error("App is still loading.");const previousUser=localStorage.getItem("scopeproof_active_cloud_user");if(previousUser&&previousUser!==uid){state.projects=[];state.changes=[];state.events=[];state.sample=false;window.ScopeProofApp.save();window.ScopeProofApp.renderAll();}localStorage.setItem("scopeproof_active_cloud_user",uid);const m=map(uid);
 for(const p of state.projects.filter(x=>!String(x.id).startsWith("p_sample_"))){
  let dbid=m.projects[p.id];const row={owner_id:uid,name:p.name,client_name:p.client||"",currency:p.currency||"USD",original_price:Number(p.price||0),original_scope:p.scope||"",notes:p.notes||"",due_date:p.dueDate||null,updated_at:new Date().toISOString()};
  if(dbid){const {error}=await client.from("scopeproof_projects").update(row).eq("id",dbid);if(error)throw error;}
  else{const {data,error}=await client.from("scopeproof_projects").insert(row).select("id").single();if(error)throw error;dbid=data.id;m.projects[p.id]=dbid;saveMap(m,uid);}
 }
 for(const c of state.changes.filter(x=>!String(x.id).startsWith("c_sample_"))){
  const dbProject=m.projects[c.projectId];if(!dbProject)continue;
  let dbid=m.changes[c.id];const row={owner_id:uid,project_id:dbProject,title:c.title,description:c.description||"",additional_price:Number(c.price||0),estimated_hours:Number(c.hours||0),revised_due_date:c.dueDate||null,requested_on:c.requestDate||new Date().toISOString().slice(0,10),status:["pending","approved","declined","completed"].includes(c.status)?c.status:"pending",updated_at:new Date().toISOString()};
  if(dbid){const safeRow={...row};delete safeRow.status;const {error}=await client.from("scopeproof_change_requests").update(safeRow).eq("id",dbid);if(error)throw error;}
  else{const {data,error}=await client.from("scopeproof_change_requests").insert(row).select("id").single();if(error)throw error;dbid=data.id;m.changes[c.id]=dbid;saveMap(m,uid);}
 }
 for(const ev of state.events.filter(x=>!["e1","e2","e3","e4"].includes(String(x.id)))){
  if(m.events[ev.id])continue;
  const changeId=ev.changeId?m.changes[ev.changeId]:null, projectId=m.projects[ev.projectId];
  if(!projectId)continue;
  const type=["created","link_created","approved","declined","completed"].includes(ev.type)?ev.type:"created";
  const {data,error}=await client.from("scopeproof_approval_events").insert({owner_id:uid,project_id:projectId,change_request_id:changeId,event_type:type,note:ev.note||""}).select("id").single();
  if(error)throw error;m.events[ev.id]=data.id;saveMap(m,uid);
 }
 return {session,m,state};
}
async function sync(){
 const {session,m,state}=await pushCloud();const uid=session.user.id;
 const {data:remoteProjects,error:projectError}=await client.from("scopeproof_projects").select("*").eq("owner_id",session.user.id);
 if(projectError)throw projectError;
 for(const p of (remoteProjects||[])){
  let localId=Object.keys(m.projects).find(k=>m.projects[k]===p.id)||("p_cloud_"+p.id);
  m.projects[localId]=p.id;
  const local={id:localId,name:p.name,client:p.client_name||"",currency:p.currency||"USD",price:Number(p.original_price||0),dueDate:p.due_date||"",scope:p.original_scope||"",notes:p.notes||"",createdAt:p.created_at||new Date().toISOString(),status:"active"};
  const ix=state.projects.findIndex(x=>x.id===localId);if(ix>=0)state.projects[ix]=local;else state.projects.push(local);
 }
 saveMap(m,uid);
 const {data:remoteChanges,error:changeError}=await client.from("scopeproof_change_requests").select("*").eq("owner_id",session.user.id);
 if(changeError)throw changeError;
 for(const c of (remoteChanges||[])){
  const projectLocalId=Object.keys(m.projects).find(k=>m.projects[k]===c.project_id);
  if(!projectLocalId)continue;
  let localId=Object.keys(m.changes).find(k=>m.changes[k]===c.id)||("c_cloud_"+c.id);
  m.changes[localId]=c.id;
  const local=state.changes.find(x=>x.id===localId);
  const history=local?.history||[{status:"pending",at:c.created_at||new Date().toISOString(),note:"Synced from cloud."}];
  if(local&&local.status!==c.status&&c.decided_at)history.push({status:c.status,at:c.decided_at,note:c.decision_note||"Client decision recorded online."});
  const converted={id:localId,projectId:projectLocalId,title:c.title,description:c.description||"",price:Number(c.additional_price||0),hours:Number(c.estimated_hours||0),dueDate:c.revised_due_date||"",requestDate:c.requested_on||"",status:c.status,createdAt:c.created_at||new Date().toISOString(),history};
  const ix=state.changes.findIndex(x=>x.id===localId);if(ix>=0)state.changes[ix]=converted;else state.changes.push(converted);
 }
 const {data:remoteEvents,error:eventError}=await client.from("scopeproof_approval_events").select("*").eq("owner_id",session.user.id).order("created_at",{ascending:true});
 if(eventError)throw eventError;
 for(const ev of (remoteEvents||[])){
  const localEventId=Object.keys(m.events).find(k=>m.events[k]===ev.id);
  const changeLocalId=ev.change_request_id?Object.keys(m.changes).find(k=>m.changes[k]===ev.change_request_id):null;
  const projectLocalId=Object.keys(m.projects).find(k=>m.projects[k]===ev.project_id);
  if(!projectLocalId)continue;
  const eventId=localEventId||("e_cloud_"+ev.id);
  m.events[eventId]=ev.id;
  if(!state.events.some(x=>x.id===eventId))state.events.push({id:eventId,type:ev.event_type,projectId:projectLocalId,changeId:changeLocalId||null,at:ev.created_at,note:ev.note||""});
 }
 state.projects=state.projects.filter(p=>!String(p.id).startsWith("p_sample_"));state.changes=state.changes.filter(c=>!String(c.id).startsWith("c_sample_"));state.events=state.events.filter(e=>!["e1","e2","e3","e4"].includes(String(e.id))&&!String(e.projectId||"").startsWith("p_sample_"));saveMap(m,uid);state.sample=false;window.ScopeProofApp.save();window.ScopeProofApp.renderAll();const notice=document.querySelector(".notice");if(notice){const h=notice.querySelector("strong"),p=notice.querySelector("p");if(h)h.textContent="Cloud sync ready";if(p)p.textContent="Your project data has synced to your account. Changes are synced when you use Sync to cloud; create a client approval link only after syncing."; }return session;
}
function openAuth(){ $("#cloudAuthMessage").textContent="";$("#cloudAuthDialog").showModal(); }
async function signUp(){const f=new FormData($("#cloudAuthForm")),email=String(f.get("email")||"").trim(),password=String(f.get("password")||"");if(!email||password.length<8){say("Enter a valid email and a password of at least 8 characters.");return;}const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:"https://anacambridge-max.github.io/scopeproof/"}});if(error)throw error;say(data.session?"Account created and signed in.":"Account created. Check your email for a confirmation link, then sign in.");}
async function resendConfirmation(){const f=new FormData($("#cloudAuthForm")),email=String(f.get("email")||"").trim();if(!email){say("Enter your email address first.");return;}const {error}=await client.auth.resend({type:"signup",email,options:{emailRedirectTo:"https://anacambridge-max.github.io/scopeproof/"}});if(error)throw error;say("If this account needs confirmation, a fresh email has been sent. Open the newest email link promptly.");}
async function handleAuthHash(){if(!location.hash||(!location.hash.includes("error_code=")&&!location.hash.includes("error=")))return;const params=new URLSearchParams(location.hash.slice(1)),code=params.get("error_code"),description=params.get("error_description");history.replaceState(null,"",location.pathname+location.search);if(code==="otp_expired"||code==="access_denied"){const s=await current();const message=code==="otp_expired"?"This confirmation link has expired. Enter your email above and click Resend confirmation, then open the newest email link.":(description?description.replace(/\+/g," "):"The email link could not be verified. Request a fresh confirmation email.");if(s){window.ScopeProofApp.toast("An earlier email link expired. You are signed in; try Sync to cloud.");}else{openAuth();say(message);}}}
async function signIn(e){e.preventDefault();const f=new FormData(e.currentTarget),email=String(f.get("email")||"").trim(),password=String(f.get("password")||"");const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;$("#cloudAuthDialog").close();await refreshStatus();window.ScopeProofApp.toast("Signed in. Use Sync to cloud before creating an approval link.");}
async function refreshStatus(){const s=await current();status(!!s,s?.user?.email||"");}
async function createLink(cid){
 try{const session=await current();if(!session){openAuth();throw new Error("Sign in first, then create the link again.");}
 const {m,state}=await pushCloud(),dbid=m.changes[cid];if(!dbid)throw new Error("Request could not be synced.");
 const result=await api("create_link",{change_request_id:dbid},session);
 const html='<div class="modal-header"><div><span class="mini-label">CLIENT APPROVAL LINK</span><h2>Link ready to share</h2><p>Expires '+new Date(result.expires_at).toLocaleString()+'.</p></div><button class="icon-button" data-close="approvalDialog" aria-label="Close">×</button></div><p class="prose">Send this link to your client. They can review the request and approve or decline it without creating an account.</p><label>Secure approval URL<input id="generatedApprovalUrl" readonly value="'+result.approval_url.replace(/&/g,"&amp;").replace(/"/g,"&quot;")+'"></label><div class="modal-actions"><button class="button secondary" data-close="approvalDialog">Close</button><button class="button primary" id="copyApprovalUrlBtn">Copy link</button></div>';
 $("#approvalContent").innerHTML=html;$("#approvalDialog").showModal();$("#copyApprovalUrlBtn").onclick=async()=>{try{await navigator.clipboard.writeText(result.approval_url);window.ScopeProofApp.toast("Approval link copied.");}catch{$("#generatedApprovalUrl").select();document.execCommand("copy");window.ScopeProofApp.toast("Approval link copied.");}};
 }catch(e){window.ScopeProofApp?.toast(e.message||"Could not create link.");}
}
async function clientApproval(){
 const token=new URLSearchParams(location.search).get("approval");if(!token)return;
 document.body.innerHTML='<main style="font:16px system-ui;max-width:760px;margin:7vh auto;padding:24px;color:#152238"><p style="color:#3459e6;font-weight:800;letter-spacing:2px">SCOPEPROOF · CLIENT REVIEW</p><div id="clientApprovalContent">Loading approval request…</div></main>';
 const box=$("#clientApprovalContent");
 try{
  const data=await api("get",{token});const c=data.change,p=c.project||{};
  const esc=s=>String(s??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
  const money=(n,currency)=>{try{return new Intl.NumberFormat(undefined,{style:"currency",currency:currency||"USD"}).format(Number(n||0))}catch{return (currency||"")+" "+n}};
  box.innerHTML='<section style="border:1px solid #e4e9f0;border-radius:16px;overflow:hidden"><header style="background:#f5f7ff;padding:24px"><h1 style="margin:0 0 8px">'+esc(c.title)+'</h1><p style="margin:0;color:#64748b">Prepared for '+esc(p.client_name||"Client")+' · '+esc(p.name||"Project")+'</p></header><div style="padding:24px"><h3>Requested change</h3><p style="white-space:pre-wrap;line-height:1.6">'+esc(c.description)+'</p><div style="background:#f8faff;padding:18px;border-radius:12px"><small>Additional price</small><h2 style="margin:4px 0">'+money(c.additional_price,p.currency)+'</h2><p>Original project price: '+money(p.original_price,p.currency)+'</p><p>Estimated hours: '+esc(c.estimated_hours||"Not specified")+'</p><p>Revised due date: '+esc(c.revised_due_date||"Not specified")+'</p></div><h3>Original scope</h3><p style="white-space:pre-wrap">'+esc(p.original_scope||"Not provided")+'</p><p id="decisionStatus" style="color:#64748b"></p><label>Optional note<textarea id="decisionNote" rows="3" maxlength="500" style="display:block;width:100%;margin-top:8px;padding:12px;border:1px solid #cbd5e1;border-radius:8px"></textarea></label><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px"><button id="clientApprove" style="background:#13795b;color:#fff;border:0;border-radius:9px;padding:12px 18px;font-weight:700">Approve change</button><button id="clientDecline" style="background:#fff;color:#b72e3d;border:1px solid #e4e9f0;border-radius:9px;padding:12px 18px;font-weight:700">Decline change</button></div><p style="font-size:12px;color:#7b8798;margin-top:20px">Your decision will be recorded with a server timestamp. This is not legal advice or a qualified electronic signature.</p></div></section>';
  const s=$("#decisionStatus");if(c.status!=="pending"){s.textContent="A decision has already been recorded: "+c.status+(c.decided_at?" on "+new Date(c.decided_at).toLocaleString():"")+". The link is now read-only.";$("#clientApprove").disabled=true;$("#clientDecline").disabled=true;return;}
  async function decide(decision){$("#clientApprove").disabled=true;$("#clientDecline").disabled=true;s.textContent="Recording decision…";try{const r=await api("decide",{token,decision,note:$("#decisionNote").value});s.textContent="Decision recorded: "+r.status+" · "+new Date(r.decided_at).toLocaleString();}catch(e){s.textContent=e.message;$("#clientApprove").disabled=false;$("#clientDecline").disabled=false;}}
  $("#clientApprove").onclick=()=>decide("approved");$("#clientDecline").onclick=()=>decide("declined");
 }catch(e){box.innerHTML='<h1>Approval link unavailable</h1><p>'+String(e.message||"This link is invalid or expired.").replace(/[&<>]/g,"")+'</p><p>Ask the project owner to generate a new link if needed.</p>';}
}
if(client){
 $("#cloudAccountBtn").addEventListener("click",openAuth);
 $("#cloudSignUpBtn").addEventListener("click",async()=>{try{await signUp()}catch(e){say(e.message)}});
 $("#cloudResendBtn").addEventListener("click",async()=>{try{await resendConfirmation()}catch(e){say(e.message)}});
 $("#cloudAuthForm").addEventListener("submit",async e=>{try{await signIn(e)}catch(err){say(err.message)}});
 $("#cloudSignOutBtn").addEventListener("click",async()=>{await client.auth.signOut();await refreshStatus();});
 $("#cloudSyncBtn").addEventListener("click",async()=>{try{await sync();window.ScopeProofApp.toast("Cloud sync complete.");}catch(e){window.ScopeProofApp.toast("Cloud sync failed: "+(e.message||e));}});
 document.addEventListener("click",e=>{const b=e.target.closest("[data-cloud-link]");if(b){e.preventDefault();createLink(b.dataset.cloudLink);}});
 client.auth.onAuthStateChange(()=>{setTimeout(refreshStatus,0)});
 refreshStatus();
 handleAuthHash().catch(e=>console.warn("Auth redirect handling failed",e));
 if(new URLSearchParams(location.search).has("approval"))clientApproval();
}else{status(false,"");}
})();