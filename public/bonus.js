import {assessTrekker,missionPriorities,WEATHER} from './mission-engine.js';

// A review filter, not an additional rescue scoring formula.
export function needsAttention(t){return t.status!=='rescued'&&(t.urgency>=70||t.needsVerification||t.sos?.status==='active');}
export function commanderBrief(s){
 const people=s.trekkers.map(t=>assessTrekker(t,s)).filter(t=>t.status!=='rescued').sort((a,b)=>b.urgency-a.urgency);
 const sectors=missionPriorities(s);
 return [`RESQ.AI — COMMANDER BRIEF`,`${s.mission.title} | ${s.conditions.now}`,`Conditions: ${WEATHER[s.conditions.weather].label}; daylight ${s.conditions.daylightMinutes} min`,`${people.length} unresolved; ${people.filter(needsAttention).length} need attention`, '', 'TOP PRIORITIES',...people.slice(0,3).map((t,i)=>`${i+1}. ${t.name} (${t.id}, ${t.zoneId}): urgency ${Math.round(t.urgency)}/100; confidence ${Math.round(t.confidence)}/100; ${t.needsVerification?'verify location':'review rescue plan'}`),'','CONFIRMED ASSIGNMENTS',...(s.assignments.length?s.assignments.map(a=>`${s.teams.find(t=>t.id===a.teamId)?.name||a.teamId} → ${a.zoneId}${sectors.find(z=>z.id===a.zoneId)?.blocked?' — NEEDS REVIEW: constraints exceeded':''}`):['No assignments confirmed.']), '', 'SECTOR WARNINGS',...sectors.filter(z=>z.blocked).map(z=>`${z.name}: ${z.blockReasons.join('; ')}`),...(sectors.some(z=>z.blocked)?[]:['No sector exceeds modeled constraints.']), '', 'Fictional academic prototype. Heuristic scores; human review required. No real dispatch.'].join('\n');
}
