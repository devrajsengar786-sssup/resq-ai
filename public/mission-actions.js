import {validate} from './engine.js';
export function applyMissionAction(original,p,actor='Local coordinator'){
 const s=structuredClone(original);if(!s.trekkers)throw Error('Load the official mission scenario first.');let action,detail;
 if(p.action==='conditions'){s.conditions=p.conditions;action='Conditions updated';detail=`${p.conditions.weather}; ${p.conditions.daylightMinutes} min daylight; closed sectors: ${p.conditions.closedZones.join(', ')||'none'}. Review existing assignments.`;}
 else if(p.action==='telemetry'){const t=s.trekkers.find(t=>t.id===p.trekkerId);if(!t)throw Error('Unknown trekker.');if(typeof p.note!=='string'||!p.note.trim()||p.note.length>300)throw Error('An update note is required (max 300 characters).');t.battery=p.battery;delete t.batteryUpperBound;delete t.batteryCategory;t.lastPing=p.lastPing;t.status=p.status;t.batteryNote=p.battery===null?'Unknown; updated by operator':'Operator-reported battery';t.notes=p.note.trim();action='Telemetry updated';detail=`${t.name}: ${p.note.trim()}; status ${t.status}`;}
 else if(p.action==='evidence-review'){const c=s.clues.find(c=>c.id===p.clueId);if(!c||!['accepted','rejected'].includes(p.status))throw Error('Invalid clue review.');c.status=p.status;if(p.status==='accepted')c.conflicting=false;c.reviewedBy=actor;action='Evidence '+p.status;detail=c.text+(p.status==='accepted'?' — contradiction cleared by operator':'');}
 else if(p.action==='sos'){const t=s.trekkers.find(t=>t.id===p.trekkerId);if(!t)throw Error('Unknown trekker.');if(typeof p.note!=='string'||!p.note.trim()||p.note.length>300)throw Error('An SOS review note is required (max 300 characters).');t.sos={status:p.status,reportedAt:p.status==='none'?null:p.reportedAt,source:p.status==='none'?'':p.source,reviewedBy:actor,note:p.note.trim()};action='SOS '+p.status;detail=t.name+': '+p.note.trim();}
 else throw Error('Unknown mission action.');
 validate(s);s.timeline.unshift({time:new Date().toISOString(),action,detail,actor});return s;
}
