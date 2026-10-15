const clamp=(v,min=0,max=100)=>Math.min(max,Math.max(min,v));
export const WEATHER={rain:{label:'Rain',risk:12,travel:1.25,exposure:60},storm:{label:'Severe storm',risk:30,travel:1.8,exposure:95},fog:{label:'Dense fog',risk:8,travel:1.4,exposure:65},clear:{label:'Clearing',risk:0,travel:1,exposure:30}};
export function validateMission(s){
 if(!s.trekkers)return s;
 const number=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;
 if(!Array.isArray(s.trekkers)||!s.trekkers.length||new Set(s.trekkers.map(t=>t.id)).size!==s.trekkers.length)throw Error('Trekker IDs must be unique.');
 for(const t of s.trekkers){if(!t.id||typeof t.name!=='string'||!s.zones.some(z=>z.id===t.zoneId)||!Number.isFinite(Date.parse(t.lastPing))||(t.battery!==null&&!number(t.battery,0,100))||!number(t.injurySeverity,0,100)||!number(t.signalQuality,0,100)||!number(t.baseRadiusKm,0,100)||!['missing','located','rescued'].includes(t.status))throw Error('Invalid trekker profile: '+t.id);}
 const c=s.conditions;if(!c||!WEATHER[c.weather]||!Number.isFinite(Date.parse(c.now))||!number(c.daylightMinutes,0,1440)||!Array.isArray(c.closedZones)||c.closedZones.some(id=>!s.zones.some(z=>z.id===id)))throw Error('Invalid mission conditions.');
 for(const t of s.trekkers)if(Date.parse(t.lastPing)>Date.parse(c.now))throw Error('Last ping cannot be later than the simulation clock.');
 for(const t of s.trekkers)if(t.sos){const r=t.sos;if(!['none','unverified','active','resolved'].includes(r.status)||(r.status!=='none'&&(!Number.isFinite(Date.parse(r.reportedAt))||Date.parse(r.reportedAt)>Date.parse(c.now)||typeof r.source!=='string'||!r.source.trim()||r.source.length>200)))throw Error('Invalid SOS report: '+t.id);}
 const w=s.model;if(!w||!['medical','battery','staleness','exposure'].every(k=>number(w.urgencyWeights?.[k],0,100))||Object.values(w.urgencyWeights).reduce((a,b)=>a+b,0)<=0||!number(w.driftKmPerHour,0,10)||!number(w.returnBufferMinutes,0,300))throw Error('Invalid mission model settings.');
 if(w.priorityWeights&&(!['urgency','evidence','access'].every(k=>number(w.priorityWeights[k],0,100))||Object.values(w.priorityWeights).reduce((a,b)=>a+b,0)<=0))throw Error('Invalid priority weights.');
 if(w.sos&&(!number(w.sos.maxBoost,0,30)||!number(w.sos.freshnessHours,.1,48)||!number(w.sos.staleFraction,0,1)))throw Error('Invalid SOS scoring settings.');
 return s;
}
export function assessTrekker(t,s,conditions=s.conditions){
 const weather=WEATHER[conditions.weather],ageHours=Math.max(0,(Date.parse(conditions.now)-Date.parse(t.lastPing))/3600000),w=s.model.urgencyWeights,total=Object.values(w).reduce((a,b)=>a+b,0);
 const batteryInput=t.battery===null?(Number.isFinite(t.batteryUpperBound)?100-t.batteryUpperBound:t.batteryCategory==='critical'?95:65):100-t.battery;
 const signals={medical:t.injurySeverity,battery:batteryInput,staleness:clamp(ageHours/6*100),exposure:weather.exposure};
 const parts=Object.fromEntries(Object.keys(signals).map(k=>[k,signals[k]*w[k]/total]));
 const baseUrgency=Object.values(parts).reduce((a,b)=>a+b,0),cfg=s.model.sos||{maxBoost:15,freshnessHours:6,staleFraction:.25};
 const sosAgeHours=t.sos?.reportedAt?Math.max(0,(Date.parse(conditions.now)-Date.parse(t.sos.reportedAt))/3600000):null;
 const boost=t.sos?.status==='active'&&t.status!=='rescued'?cfg.maxBoost*Math.max(cfg.staleFraction,1-sosAgeHours/cfg.freshnessHours):0;
 const urgency=clamp(baseUrgency+boost),sosBoost=urgency-baseUrgency;parts.sos=sosBoost;
 const confidence=clamp(t.signalQuality-ageHours*6,5,95),radiusKm=t.baseRadiusKm+s.model.driftKmPerHour*ageHours;
 return {...t,ageHours,urgency,confidence,radiusKm,parts,sosAgeHours,sosBoost,baseUrgency,unknownBattery:t.battery===null,reasons:[t.medicalNote,`${ageHours.toFixed(1)}h since last ping`,t.battery===null?`Battery unknown; provisional urgency input ${batteryInput}/100${Number.isFinite(t.batteryUpperBound)?' based on reported upper bound':''}`:`Last reported battery ${t.battery}%`],needsVerification:t.sos?.status==='unverified'||t.battery===null||confidence<40||radiusKm>1.5};
}
export function missionPriorities(s,conditions=s.conditions){
 const weather=WEATHER[conditions.weather];return s.zones.map(z=>{
 const people=s.trekkers.filter(t=>t.zoneId===z.id&&t.status!=='rescued').map(t=>assessTrekker(t,s,conditions));const urgency=people.length?.6*Math.max(...people.map(t=>t.urgency))+.4*people.reduce((n,t)=>n+t.urgency,0)/people.length:0;
 const accepted=s.clues.filter(c=>c.zoneId===z.id&&(!c.status||c.status==='accepted')&&!c.conflicting);const corroboration=Math.min(15,accepted.reduce((n,c)=>n+c.confidence/20,0));
 const conflicts=s.clues.filter(c=>c.zoneId===z.id&&c.conflicting&&c.status!=='rejected').length;
 const evidence=people.length?clamp(people.reduce((n,t)=>n+t.confidence,0)/people.length+corroboration-Math.min(30,conflicts*10)):0;
 const risk=clamp(z.risk+weather.risk),travelMinutes=Math.ceil(z.travelMinutes*weather.travel),daylightNeed=travelMinutes*2+s.model.returnBufferMinutes;
 const reasons=[];if(conditions.closedZones.includes(z.id))reasons.push('Sector closed by operator');if(risk>s.constraints.maxRisk)reasons.push(`Risk ${risk} exceeds ${s.constraints.maxRisk}`);if(travelMinutes>s.constraints.maxTravelMinutes)reasons.push('Travel limit exceeded');if(daylightNeed>conditions.daylightMinutes)reasons.push(`Return budget ${daylightNeed} min exceeds ${conditions.daylightMinutes} min daylight`);if(!people.length)reasons.push('No unresolved trekkers in sector');
 const pw=s.model.priorityWeights||{urgency:60,evidence:25,access:15},sum=pw.urgency+pw.evidence+pw.access;
 const access=clamp(z.access-weather.risk),parts={urgency:urgency*pw.urgency/sum,evidence:evidence*pw.evidence/sum,access:access*pw.access/sum,risk:0};
 return {...z,risk,travelMinutes,evidence,urgency,access,parts,score:parts.urgency+parts.evidence+parts.access,blocked:reasons.length>0,blockReasons:reasons,clueCount:accepted.length,people,daylightNeed,confidence:evidence,medicalNeed:people.some(t=>t.injurySeverity>=50)};
 }).sort((a,b)=>a.blocked-b.blocked||a.searched-b.searched||b.score-a.score||a.id.localeCompare(b.id));
}
export function recommendTeams(s,zoneId,conditions=s.conditions){const z=missionPriorities(s,conditions).find(z=>z.id===zoneId);if(!z)return [];return s.teams.map(t=>{const reasons=[];if(!t.available||s.assignments.some(a=>a.teamId===t.id))reasons.push('Unavailable / committed');if(z.blocked)reasons.push(...z.blockReasons);const missing=(z.requiredSkills||[]).filter(skill=>!(t.capabilities||[]).includes(skill));if(missing.length)reasons.push('Missing skills: '+missing.join(', '));if(z.medicalNeed&&!(t.medicalKits>0))reasons.push('Medical kit required');return {...t,eligible:reasons.length===0,reasons,match:(t.capabilities||[]).filter(k=>(z.requiredSkills||[]).includes(k)).length+(z.medicalNeed&&t.medicalKits>0?1:0)};}).sort((a,b)=>Number(b.eligible)-Number(a.eligible)||b.match-a.match||a.id.localeCompare(b.id));}
export function nextInformation(s){return s.trekkers.filter(t=>t.status==='missing').map(t=>{const a=assessTrekker(t,s),pending=s.clues.filter(c=>c.zoneId===t.zoneId&&c.status==='pending'),conflicts=s.clues.filter(c=>c.zoneId===t.zoneId&&c.conflicting&&c.status!=='rejected');return {trekker:a,score:a.urgency*(1-a.confidence/100)+conflicts.length*15,action:t.sos?.status==='unverified'?'Verify the reported SOS and its source':conflicts.length?'Resolve contradictory report before relying on its location':pending.length?'Review pending field report':t.baseRadiusKm>=.8?'Request location corroboration; coordinate spread is large':a.unknownBattery?'Request ranger / relay check; battery and contact are uncertain':'Request a fresh location report via field relay',why:`Urgency ${a.urgency.toFixed(0)}; evidence confidence ${a.confidence.toFixed(0)}/100${conflicts.length?'; conflicting evidence flagged':''}. Verification score is a heuristic, not expected lives saved.`};}).sort((a,b)=>b.score-a.score);}
export function comparePlans(s,conditions){const before=missionPriorities(s),after=missionPriorities(s,conditions);return after.map((z,i)=>({...z,oldRank:before.findIndex(b=>b.id===z.id)+1,newRank:i+1,oldScore:before.find(b=>b.id===z.id).score,oldTravel:before.find(b=>b.id===z.id).travelMinutes,affectedAssignments:s.assignments.filter(a=>a.zoneId===z.id)}));}
