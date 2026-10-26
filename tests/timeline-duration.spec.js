import {test,expect} from '@playwright/test';
import {calendarDay,elapsedDays,estimateDays,durationDefaults,durationLength,durationSettings,durationLabel,durationAxis} from '../src/timelineDuration.js';
import {timelineData,timelineStep,timelineGeometry,timelineItems,validateMilestoneTimeline} from '../src/milestoneTimeline.js';
import {createParallel} from '../src/timelineParallel.js';
import {createLayer,normalizeDocument,emptyPage} from '../src/document.js';

test('dates calendaires : jours écoulés, bissextiles, changements d’heure et estimations honnêtes',()=>{
 for(const tz of ['UTC','America/Toronto','Europe/Paris','Pacific/Auckland']){process.env.TZ=tz;expect(elapsedDays({start:'2026-11-01',end:'2026-11-29'})).toBe(28);expect(elapsedDays({start:'2026-03-07',end:'2026-03-09'})).toBe(2);expect(elapsedDays({start:'2024-02-28',end:'2024-03-01'})).toBe(2);expect(calendarDay('0001-01-01')).not.toBeNull();}
 process.env.TZ='UTC';for(const invalid of ['2026-02-29','2026-13-01','2026-04-31','not a date'])expect(calendarDay(invalid)).toBeNull();expect(elapsedDays({start:'2026-11-01',end:'2026-11-01'})).toBe(0);expect(elapsedDays({start:'2026-11-29',end:'2026-11-01'})).toBeNull();expect(estimateDays('14 jours')).toBe(14);expect(estimateDays('3 semaines')).toBe(21);for(const estimate of ['2 mois','3 à 4 semaines','bientôt'])expect(estimateDays(estimate)).toBeNull();
});
test('modèle temporel facultatif : proportions, surcharges indépendantes, métadonnées et migration non destructive',()=>{
 const t=timelineData(),a=t.steps[0],b=t.steps[1];a.timing={start:'2026-11-01',end:'2026-11-15',metadata:{keep:true}};b.timing={estimate:'4 semaines'};expect(durationLength(t,a,'a')).toBeCloseTo(100);expect(durationLength(t,b,'a')).toBeCloseTo(200);expect(durationLength(t,t.steps[2],'a')).toBeNull();a.timing.a={mode:'custom',length:333};a.timing.display={a:true,c:false};t.design.duration={...durationDefaults(),display:{a:false,b:true,c:true}};expect(durationSettings(t,a).display).toEqual({a:true,b:true,c:false});expect(durationLength(t,a,'a')).toBe(333);expect(durationLength(t,a,'b')).toBeCloseTo(100);expect(durationLabel(t,b)).toContain('4 semaines');validateMilestoneTimeline({type:'milestoneTimeline',timeline:t});
 const old=normalizeDocument({version:36,pages:[{...emptyPage(1),layers:[{...createLayer('milestoneTimeline'),timeline:t}]}],media:[],transitions:[],metadata:'preserved'});expect(old.version).toBe(37);expect(old.pages[0].layers[0].timeline).toEqual(t);expect(old.metadata).toBe('preserved');for(const timing of [{start:'2026-02-30'},{start:'2026-11-29',end:'2026-11-01'},{a:{length:Infinity}},{display:{c:'yes'}}])expect(()=>validateMilestoneTimeline({type:'milestoneTimeline',timeline:{...t,steps:[{...a,timing}]}})).toThrow();
});
