const $=id=>document.getElementById(id);let busy=false,editing=false,lastState,statusSignature='';
const labels={free:'Available',meeting:'In a meeting',focus:'Deep focus'},colors={free:'#b7f66b',meeting:'#ff7b79',focus:'#70b7ff'};
function renderStatuses(customStatuses){
 const signature=JSON.stringify(customStatuses);
 if(signature===statusSignature)return;
 statusSignature=signature;
 document.querySelectorAll('[data-custom-status]').forEach(b=>b.remove());
 for(const status of customStatuses){
  const group=document.createElement('span');group.className='custom-status';group.dataset.customStatus='';
  const button=document.createElement('button');button.type='button';button.dataset.status=status.id;button.textContent=status.label;
  const remove=document.createElement('button');remove.type='button';remove.dataset.deleteStatus=status.id;remove.className='delete-status';remove.textContent='×';remove.setAttribute('aria-label',`Delete ${status.label}`);remove.title=`Delete ${status.label}`;
  group.append(button,remove);$('statuses').insertBefore(group,$('add-status'));
 }
 $('add-status').disabled=customStatuses.length>=12;
}
function render(s){lastState=s;renderStatuses(s.customStatuses||[]);$('status-label').textContent=labels[s.status]||(s.customStatuses||[]).find(item=>item.id===s.status)?.label||'Unknown status';$('screen').style.setProperty('--accent',colors[s.status]||'#c6a0ff');$('countdown').textContent=Math.floor(s.remaining/60).toString().padStart(2,'0')+':'+(s.remaining%60).toString().padStart(2,'0');$('ring').style.setProperty('--progress',100*s.remaining/s.duration+'%');$('timer-label').textContent=s.running?'Focus in progress':s.remaining===0?'Session complete':s.remaining===s.duration?'Ready to focus':'Timer paused';$('note').textContent=s.message||' ';$('device').textContent=s.device;$('pause').textContent=s.running?'Pause':'Resume';$('pause').disabled=!s.running&&s.remaining===0;document.querySelectorAll('[data-status]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.status===s.status));if(!editing)$('message').value=s.message;$('connection').textContent='Connected';}
async function refresh(){if(busy)return;try{const r=await fetch('/api/state',{cache:'no-store'});if(!r.ok)throw Error();render(await r.json());}catch{$('connection').textContent='Disconnected · retrying';}}
async function action(action,extra={}){if(busy)return false;busy=true;try{const r=await fetch('/api/action',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({action,...extra})});if(!r.ok){if(action==='add-status'&&r.status===400){$('status-error').textContent=await r.text();return false;}throw Error();}render(await r.json());$('feedback').textContent=action==='message'?'Message sent.':action==='add-status'?'Status added.':'Updated.';return true;}catch{$('feedback').textContent='Could not update. Check your connection and try again.';if(action==='add-status')$('status-error').textContent='Could not add status. Check your connection and try again.';$('connection').textContent='Disconnected';return false;}finally{busy=false;}}
function closeStatusForm(){$('status-form').hidden=true;$('add-status').setAttribute('aria-expanded','false');$('status-name').value='';$('status-error').textContent='';if(!$('add-status').disabled)$('add-status').focus();else document.querySelector('[data-status][aria-pressed="true"]')?.focus();}
$('statuses').onclick=async e=>{const remove=e.target.closest('[data-delete-status]');if(remove){if(await action('delete-status',{value:remove.dataset.deleteStatus})){$('feedback').textContent='Status deleted.';$('add-status').focus();}return;}const button=e.target.closest('[data-status]');if(button)action('status',{value:button.dataset.status});};
$('add-status').onclick=()=>{$('status-form').hidden=false;$('add-status').setAttribute('aria-expanded','true');$('status-name').focus();};
$('cancel-status').onclick=closeStatusForm;
$('status-form').onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();closeStatusForm();}};
$('status-form').onsubmit=async e=>{e.preventDefault();const value=$('status-name').value.trim();if(!value||Array.from(value).length>32){$('status-error').textContent='Enter a name of 1–32 characters.';return;}if(await action('add-status',{value}))closeStatusForm();};
$('message').onfocus=()=>editing=true;$('message').onblur=()=>editing=false;$('message-form').onsubmit=e=>{e.preventDefault();action('message',{value:$('message').value});};$('start').onclick=()=>action('start',{seconds:$('duration').value});$('pause').onclick=()=>action(lastState?.running?'pause':'resume');$('reset').onclick=()=>action('reset');refresh();setInterval(refresh,500);
