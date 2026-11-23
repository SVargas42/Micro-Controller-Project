import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {networkInterfaces} from 'node:os';
import {pathToFileURL} from 'node:url';
export function createDemo(){
 let state={status:'free',customStatuses:[],message:'Ready when you are.',duration:1500,remaining:1500,running:false},deadline=0,nextStatusId=1;
 function snapshot(){if(state.running){state.remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));if(!state.remaining){state.running=false;state.status='free';}}return {...state,device:'Browser simulator — no hardware connected'};}
 return http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/state'&&req.method==='GET'){res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');return res.end(JSON.stringify(snapshot()));}
  if(url.pathname==='/api/action'&&req.method==='POST'){
   let body='';for await(const chunk of req){body+=chunk;if(body.length>2048){res.writeHead(413);return res.end('Too large');}}
   const p=new URLSearchParams(body),action=p.get('action');snapshot();
   if(action==='status'&&['free','meeting','focus',...state.customStatuses.map(s=>s.id)].includes(p.get('value')))state.status=p.get('value');
   else if(action==='add-status'){
    const label=(p.get('value')||'').trim();
    if(!label||Array.from(label).length>32||state.customStatuses.length>=12||['Free','Available','In a meeting','Deep focus',...state.customStatuses.map(s=>s.label)].some(s=>s.toLowerCase()===label.toLowerCase())){res.writeHead(400);return res.end('Use a unique name of 1–32 characters. Up to 12 custom statuses are allowed.');}
    const id=`custom-${nextStatusId++}`;state.customStatuses.push({id,label});state.status=id;
   }
   else if(action==='delete-status'){
    const id=p.get('value');
    if(!state.customStatuses.some(s=>s.id===id)){res.writeHead(400);return res.end('Custom status not found.');}
    state.customStatuses=state.customStatuses.filter(s=>s.id!==id);if(state.status===id)state.status='free';
   }
   else if(action==='message')state.message=Array.from(p.get('value')||'').slice(0,80).join('');
   else if(action==='start'){const seconds=Number(p.get('seconds'));if(!Number.isInteger(seconds)||seconds<1||seconds>7200){res.writeHead(400);return res.end('Invalid duration');}state.duration=state.remaining=seconds;state.running=true;state.status='focus';deadline=Date.now()+seconds*1000;}
   else if(action==='pause'){state.running=false;}
   else if(action==='resume'){if(state.remaining>0){state.running=true;state.status='focus';deadline=Date.now()+state.remaining*1000;}}
   else if(action==='reset'){state.running=false;state.remaining=state.duration;}
   else {res.writeHead(400);return res.end('Invalid action');}
   res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(snapshot()));
  }
  if(req.method==='GET'&&['/','/app.js','/style.css'].includes(url.pathname)){const name=url.pathname==='/'?'index.html':url.pathname.slice(1);res.setHeader('Content-Type',name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.js')?'text/javascript; charset=utf-8':'text/css; charset=utf-8');return res.end(await readFile(new URL('./web/'+name,import.meta.url)));}
  res.writeHead(404);res.end('Not found');
 }catch(error){res.writeHead(500);res.end('Server error');console.error(error);}});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const port=Number(process.env.PORT||8080);createDemo().listen(port,'0.0.0.0',()=>{console.log(`Smart Desk simulator: http://localhost:${port}`);for(const entries of Object.values(networkInterfaces()))for(const entry of entries||[])if(entry.family==='IPv4'&&!entry.internal)console.log(`Phone on same Wi-Fi: http://${entry.address}:${port}`);console.log('Simulator only. For the physical LED demo, follow README.md. Ctrl+C stops the server.');});}
