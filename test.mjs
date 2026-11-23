import {test} from 'node:test';import assert from 'node:assert/strict';import {createDemo} from './server.mjs';
test('phone and preview share state; timer pauses, resumes and completes',async()=>{const server=createDemo();await new Promise(r=>server.listen(0,'127.0.0.1',r));try{const root=`http://127.0.0.1:${server.address().port}`;const get=async()=> (await fetch(root+'/api/state')).json();const act=async(action,extra={})=>(await fetch(root+'/api/action',{method:'POST',body:new URLSearchParams({action,...extra})})).json();assert.equal((await fetch(root)).status,200);assert.equal((await fetch(root+'/app.js')).status,200);assert.equal((await get()).status,'free');await act('status',{value:'meeting'});assert.equal((await get()).status,'meeting');const msg='<script>alert("test")</script> ☕';assert.equal((await act('message',{value:msg})).message,msg);await act('start',{seconds:2});assert.equal((await get()).running,true);await act('pause');await new Promise(r=>setTimeout(r,1100));assert.equal((await get()).remaining,2);await act('resume');await new Promise(r=>setTimeout(r,2100));const done=await get();assert.equal(done.remaining,0);assert.equal(done.running,false);assert.equal(done.status,'free');await act('reset');assert.equal((await get()).remaining,2);const bad=await fetch(root+'/api/action',{method:'POST',body:new URLSearchParams({action:'start',seconds:'-1'})});assert.equal(bad.status,400);assert.equal((await fetch(root+'/../server.mjs')).status,404);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}});

test('custom statuses are shared, selectable and validated',async()=>{
 const server=createDemo();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const root=`http://127.0.0.1:${server.address().port}`;
  const act=(action,value)=>fetch(root+'/api/action',{method:'POST',body:new URLSearchParams({action,value})});
  const get=async()=>(await fetch(root+'/api/state')).json();
  const label='<Lunch> & coffee ☕';
  const added=await (await act('add-status','  '+label+'  ')).json();
  assert.deepEqual(added.customStatuses,[{id:'custom-1',label}]);
  assert.equal(added.status,'custom-1');
  assert.deepEqual((await get()).customStatuses,added.customStatuses);
  await act('status','meeting');await act('status','custom-1');
  assert.equal((await get()).status,'custom-1');
  for(const invalid of ['', '   ', 'a'.repeat(33), 'FREE', 'available', 'in a meeting', 'deep focus', label.toUpperCase()])assert.equal((await act('add-status',invalid)).status,400);
  assert.equal((await act('status','custom-99')).status,400);
  assert.equal((await act('add-status','☕'.repeat(32))).status,200);
  for(let i=2;i<12;i++)assert.equal((await act('add-status',`Status ${i}`)).status,200);
  assert.equal((await act('add-status','One too many')).status,400);
  assert.equal((await get()).customStatuses.length,12);
  assert.equal((await get()).status,'custom-12');
  for(const id of ['free','meeting','focus','custom-99'])assert.equal((await act('delete-status',id)).status,400);
  const removed=await (await act('delete-status','custom-1')).json();
  assert.equal(removed.status,'custom-12');
  assert.equal(removed.customStatuses.length,11);
  assert.equal(removed.customStatuses.some(s=>s.id==='custom-1'),false);
  assert.deepEqual((await get()).customStatuses,removed.customStatuses);
  assert.equal((await act('status','custom-1')).status,400);
  const replacement=await (await act('add-status',label)).json();
  assert.equal(replacement.status,'custom-13');
  assert.equal(new Set(replacement.customStatuses.map(s=>s.id)).size,12);
  const cleared=await (await act('delete-status','custom-13')).json();
  assert.equal(cleared.status,'free');
  assert.equal((await act('delete-status','custom-13')).status,400);
  await fetch(root+'/api/action',{method:'POST',body:new URLSearchParams({action:'start',seconds:60})});
  await act('delete-status','custom-2');
  assert.equal((await get()).running,true);
  assert.equal((await get()).status,'focus');
  for(const item of (await get()).customStatuses)assert.equal((await act('delete-status',item.id)).status,200);
  assert.deepEqual((await get()).customStatuses,[]);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
