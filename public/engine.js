import {validateMission,missionPriorities,recommendTeams} from './mission-engine.js';
export function validate(s){
 const fail=m=>{throw new Error(m)};const num=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;
 if(!s||s.version!==1||!s.mission||typeof s.mission.title!=='string'||!num(s.mission.people,0,100000))fail('Version 1, mission title and nonnegative people count are required.');
 for(const k of ['zones','teams','clues','hazardTypes','assignments','timeline'])if(!Array.isArray(s[k])||s[k].some(x=>!x||typeof x!=='object'))fail(k+' must be an array of objects.');
 if(s.features&&Object.values(s.features).some(v=>typeof v!=='boolean'))fail('Feature flags must be booleans.');
 for(const e of s.timeline)if(typeof e.action!=='string'||typeof e.detail!=='string'||!Number.isFinite(Date.parse(e.time)))fail('Invalid timeline entry.');
 if(!s.zones.length)fail('At least one zone is required.');
 for(const k of ['zones','teams','hazardTypes']){const ids=s[k].map(x=>x.id);if(ids.some(x=>typeof x!=='string'||!x)||new Set(ids).size!==ids.length)fail(k+' IDs must be unique strings.');}
 for(const z of s.zones){if(typeof z.name!=='string'||!['x','y','evidence','urgency','access','risk'].every(k=>num(z[k],0,100))||!num(z.travelMinutes,0,10000)||!Array.isArray(z.hazards)||z.hazards.some(h=>!s.hazardTypes.some(t=>t.id===h)))fail('Invalid zone: '+z.id);}
 for(const t of s.teams)if(typeof t.name!=='string'||!num(t.members,1,10000)||typeof t.available!=='boolean')fail('Invalid team: '+t.id);
 for(const c of s.clues)if(!s.zones.some(z=>z.id===c.zoneId)||typeof c.text!=='string'||!num(c.confidence,0,100)||!Number.isFinite(Date.parse(c.time)))fail('Invalid clue.');
 if(!s.weights||!['evidence','urgency','access','risk'].every(k=>num(s.weights[k],0,100))||s.weights.evidence+s.weights.urgency+s.weights.access===0)fail('Invalid scoring weights.');
 if(!s.constraints||!num(s.constraints.maxRisk,0,100)||!num(s.constraints.maxTravelMinutes,0,10000))fail('Invalid constraints.');
 for(const a of s.assignments)if(!s.zones.some(z=>z.id===a.zoneId)||!s.teams.some(t=>t.id===a.teamId))fail('Assignment references an unknown team or zone.');
 if(new Set(s.assignments.map(a=>a.teamId)).size!==s.assignments.length)fail('A team can have only one active assignment.');
 return validateMission(s);
}
export function rank(s,delta=0){if(s.trekkers){const result=missionPriorities(s);if(!delta)return result;const copy=structuredClone(s);copy.zones.forEach(z=>z.risk=Math.min(100,Math.max(0,z.risk+delta)));return missionPriorities(copy);}const w=s.weights;const total=w.evidence+w.urgency+w.access;return s.zones.map(z=>{const clues=s.clues.filter(c=>c.zoneId===z.id);const boost=Math.min(30,clues.reduce((n,c)=>n+c.confidence/10,0));const evidence=Math.min(100,z.evidence+boost);const risk=Math.min(100,Math.max(0,z.risk+delta));const parts={evidence:evidence*w.evidence/total,urgency:z.urgency*w.urgency/total,access:z.access*w.access/total,risk:risk*w.risk/100};const blocked=risk>s.constraints.maxRisk||z.travelMinutes>s.constraints.maxTravelMinutes;return {...z,risk,evidence,parts,score:Math.max(0,Math.min(100,parts.evidence+parts.urgency+parts.access-parts.risk)),blocked,clueCount:clues.length};}).sort((a,b)=>a.blocked-b.blocked||a.searched-b.searched||b.score-a.score||a.id.localeCompare(b.id));}
export function assign(s,teamId,zoneId){const t=s.teams.find(t=>t.id===teamId),z=rank(s).find(z=>z.id===zoneId);if(!t?.available||s.assignments.some(a=>a.teamId===teamId))throw Error('Team unavailable or already assigned.');if(!z||z.blocked||z.searched)throw Error('Zone is blocked or already searched.');if(s.trekkers&&!recommendTeams(s,zoneId).find(t=>t.id===teamId)?.eligible)throw Error('Team lacks required capability or medical kit.');s.assignments.push({teamId,zoneId,time:new Date().toISOString()});return s;}
