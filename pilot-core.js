(function(){
  'use strict';
  const VERSION='pilot-v4';
  const STORE_KEY='vln_pilot_v4';
  const SCENARIOS=['S1','S2','S3','S4','B0'];
  const ROUTES={S1:'s1.html',S2:'s2.html',S3:'s3.html',S4:'s4.html',B0:'s1.html?trial=baseline'};
  const TITLES={S1:'Visibility Persistence',S2:'Heading / Motion Alignment',S3:'Future-Action Consistency',S4:'Distance Bias',B0:'Final observation'};
  const CONDITION_NAMES={
    S1:{experimental:'visibility-unequal',baseline:'visibility-equal'},
    S2:{experimental:'heading-unequal',baseline:'heading-equal'},
    S3:{experimental:'future-action-present',baseline:'future-action-absent'},
    S4:{experimental:'distance-unequal',baseline:'distance-equal'},
    B0:{baseline:'neutral-equal'}
  };
  const QUESTIONS={
    q1:'Based on the instruction and what you just observed, which chair do you think the speaker most likely refers to?',
    q2:'If you had to choose one, which chair would you choose?',
    q3:'Why did you make this choice?',
    q4:'Which factors influenced your choice?'
  };
  const FACTORS=[
    'It was closer',
    'It was more aligned with the direction of movement',
    'It remained visible throughout the movement',
    'It seemed easier to reach',
    'It fit the instruction or next action better',
    'It was visually more noticeable',
    'Other'
  ];
  function blankStore(){return{schemaVersion:VERSION,activeParticipantId:null,participants:{},responses:[]}}
  function load(){try{const parsed=JSON.parse(localStorage.getItem(STORE_KEY)||'null');if(parsed&&parsed.schemaVersion===VERSION&&parsed.participants&&Array.isArray(parsed.responses))return parsed}catch{}return blankStore()}
  function save(store){localStorage.setItem(STORE_KEY,JSON.stringify(store))}
  function hash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  function bit(seed,key){return hash(`${seed}:${key}`)%2}
  function makeId(){const rand=crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase();return`P-${Date.now().toString(36).toUpperCase()}-${rand}`}
  function makePlan(participantId){
    const cell=hash(participantId)%16;
    const rotations=[['S1','S2','S3','S4'],['S2','S3','S4','S1'],['S3','S4','S1','S2'],['S4','S1','S2','S3']];
    const order=[...rotations[cell%4]];
    if(bit(participantId,'order-reverse'))order.reverse();
    order.push('B0');
    const scenarios={};
    SCENARIOS.forEach((scenario,index)=>{
      const cueTargetId=bit(participantId,`${scenario}:cue-id`)?'target-2':'target-1';
      const cueTargetSide=bit(participantId,`${scenario}:side`)?'right':'left';
      const cueTargetLabel=bit(participantId,`${scenario}:label`)?'B':'A';
      const condition=scenario==='B0'?'baseline':'experimental';
      scenarios[scenario]={scenario,condition,conditionName:CONDITION_NAMES[scenario][condition],cueTargetId,cueTargetSide,cueTargetLabel,nonCueTargetId:cueTargetId==='target-1'?'target-2':'target-1',nonCueTargetSide:cueTargetSide==='left'?'right':'left',nonCueTargetLabel:cueTargetLabel==='A'?'B':'A',orderIndex:order.indexOf(scenario)};
    });
    return{participantId,createdAt:new Date().toISOString(),counterbalanceCell:cell,scenarioOrder:order,baselineScenario:'B0',scenarios,completedScenarios:[]};
  }
  function createParticipant(forcedId){const store=load(),id=forcedId||makeId();store.participants[id]=makePlan(id);store.activeParticipantId=id;save(store);return store.participants[id]}
  function currentParticipant(){const store=load(),id=store.activeParticipantId;return id&&store.participants[id]?store.participants[id]:createParticipant()}
  function boolParam(params,name){const v=params.get(name);return v==='1'||v==='true'}
  function assignmentFor(scenario){
    const params=new URLSearchParams(location.search),isDebug=boolParam(params,'debug')||boolParam(params,'preview'),forcedPid=isDebug&&params.get('pid')?params.get('pid').slice(0,80):null;
    let participant;
    if(forcedPid)participant=makePlan(forcedPid);else participant=currentParticipant();
    const base={...participant.scenarios[scenario]};
    if(isDebug){
      const condition=params.get('condition');if(['experimental','baseline'].includes(condition)&&CONDITION_NAMES[scenario][condition]){base.condition=condition;base.conditionName=CONDITION_NAMES[scenario][condition]}
      const cue=params.get('cue');if(['target-1','target-2'].includes(cue)){base.cueTargetId=cue;base.nonCueTargetId=cue==='target-1'?'target-2':'target-1'}
      const side=params.get('side');if(['left','right'].includes(side)){base.cueTargetSide=side;base.nonCueTargetSide=side==='left'?'right':'left'}
      const label=(params.get('label')||'').toUpperCase();if(['A','B'].includes(label)){base.cueTargetLabel=label;base.nonCueTargetLabel=label==='A'?'B':'A'}
    }
    return{...base,participantId:participant.participantId,scenarioOrder:participant.scenarioOrder,counterbalanceCell:participant.counterbalanceCell,assignmentSource:isDebug?'debug':'participant-plan',debug:isDebug,saveDebug:boolParam(params,'save')};
  }
  function completedSet(participantId){return new Set(load().responses.filter(r=>r.participantId===participantId).map(r=>r.scenario))}
  function nextRoute(participantId,currentScenario){const store=load(),p=store.participants[participantId];if(!p)return'index.html';const done=completedSet(participantId),start=Math.max(0,p.scenarioOrder.indexOf(currentScenario)+1);for(let offset=0;offset<p.scenarioOrder.length;offset++){const s=p.scenarioOrder[(start+offset)%p.scenarioOrder.length];if(!done.has(s))return ROUTES[s]}return'index.html'}
  function saveResponse(record,assignment){
    if(assignment.debug&&!assignment.saveDebug)return{saved:false,debug:true,next:'index.html'};
    const store=load(),normalized={
      schemaVersion:VERSION,
      participantId:assignment.participantId,
      scenario:assignment.scenario,
      condition:assignment.condition,
      conditionName:assignment.conditionName,
      cueTargetId:assignment.cueTargetId,
      cueTargetSide:assignment.cueTargetSide,
      cueTargetLabel:assignment.cueTargetLabel,
      nonCueTargetId:assignment.nonCueTargetId,
      nonCueTargetSide:assignment.nonCueTargetSide,
      nonCueTargetLabel:assignment.nonCueTargetLabel,
      counterbalanceCell:assignment.counterbalanceCell,
      scenarioOrder:assignment.scenarioOrder,
      scenarioOrderIndex:assignment.orderIndex,
      assignmentSource:assignment.assignmentSource,
      ...record,
      completionTimestamp:new Date().toISOString()
    };
    const index=store.responses.findIndex(r=>r.participantId===normalized.participantId&&r.scenario===normalized.scenario);
    if(index>=0)store.responses[index]=normalized;else store.responses.push(normalized);
    if(store.participants[normalized.participantId]){
      const p=store.participants[normalized.participantId];
      p.completedScenarios=Array.from(new Set([...(p.completedScenarios||[]),normalized.scenario]));
      p.lastUpdatedAt=normalized.completionTimestamp;
    }
    save(store);
    return{saved:true,debug:false,next:nextRoute(normalized.participantId,normalized.scenario),record:normalized};
  }
  function allData(){return load()}
  function flatten(record){
    return{
      schemaVersion:record.schemaVersion,participantId:record.participantId,scenario:record.scenario,condition:record.condition,conditionName:record.conditionName,
      cueTargetId:record.cueTargetId,cueTargetSide:record.cueTargetSide,cueTargetLabel:record.cueTargetLabel,nonCueTargetId:record.nonCueTargetId,nonCueTargetSide:record.nonCueTargetSide,nonCueTargetLabel:record.nonCueTargetLabel,
      counterbalanceCell:record.counterbalanceCell,scenarioOrder:(record.scenarioOrder||[]).join('>'),scenarioOrderIndex:record.scenarioOrderIndex,instruction:record.instruction||'',
      q1Answer:record.q1Answer||'',q2Answer:record.q2Answer||'',q3FreeText:record.q3FreeText||'',q4Factors:(record.q4Factors||[]).join('|'),q4Other:record.q4Other||'',
      q1ResponseTimeMs:record.q1ResponseTimeMs??'',questionnaireDurationMs:record.questionnaireDurationMs??'',observationDurationMs:record.observationDurationMs??'',completionTimestamp:record.completionTimestamp||'',sceneMetrics:JSON.stringify(record.sceneMetrics||{})
    }
  }
  function csvCell(value){const text=String(value??'');return`"${text.replace(/"/g,'""')}"`}
  function csv(){const rows=load().responses.map(flatten),headers=Object.keys(flatten({}));return[headers.map(csvCell).join(','),...rows.map(row=>headers.map(h=>csvCell(row[h])).join(','))].join('\r\n')}
  function download(name,text,type){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  function exportJSON(){download(`vln-pilot-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify({...load(),exportedAt:new Date().toISOString()},null,2),'application/json')}
  function exportCSV(){download(`vln-pilot-${new Date().toISOString().slice(0,10)}.csv`,csv(),'text/csv;charset=utf-8')}
  function debugBadge(assignment){if(!assignment.debug)return;const badge=document.createElement('div');badge.className='pilot-debug-badge';badge.textContent=`DEBUG · ${assignment.scenario} · ${assignment.condition} · cue ${assignment.cueTargetId} / ${assignment.cueTargetSide} / ${assignment.cueTargetLabel}${assignment.saveDebug?' · saving':' · not saving'}`;document.body.appendChild(badge)}
  function finishUI(assignment,result){const finish=document.querySelector('#finish');if(!finish)return;const card=finish.querySelector('.finish-card'),code=finish.querySelector('#recordCode');if(code)code.textContent=result.debug?'Debug run · not recorded':`Participant · ${assignment.participantId}`;let actions=card.querySelector('.pilot-finish-actions');if(!actions){actions=document.createElement('div');actions.className='pilot-finish-actions';card.appendChild(actions)}const next=result.next||'index.html';actions.innerHTML=`<a class="pilot-next" href="${next}">${next==='index.html'?'Return to pilot':'Continue to next scene'}</a>`}
  window.VLNPilot={VERSION,SCENARIOS,ROUTES,TITLES,CONDITION_NAMES,QUESTIONS,FACTORS,load,save,createParticipant,currentParticipant,assignmentFor,saveResponse,nextRoute,completedSet,allData,exportJSON,exportCSV,debugBadge,finishUI};
})();
