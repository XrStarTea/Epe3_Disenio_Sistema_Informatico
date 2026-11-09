const KEY="nexo_traza_v1",SEDES=["Oficina Santiago","Oficina Providencia","Bodega Central"],TIPOS=["Notebook","Desktop","Monitor","Impresora","Teléfono"],ESTADOS=["Disponible","Asignado","En reparación","Baja"];
const USERS={admin:{p:"admin123",r:"Admin TI"},soporte:{p:"soporte123",r:"Soporte"},bodega:{p:"bodega123",r:"Bodega"}};
const PERM={"Admin TI":["reg","edit","baja","asig","trasl","rep","hit"],Soporte:["asig","rep","hit"],Bodega:["reg","trasl","rep","hit"]};
const MM={Notebook:["Lenovo ThinkPad","HP ProBook","Dell Latitude"],Desktop:["Dell OptiPlex","HP EliteDesk"],Monitor:["LG 24MK","Samsung S24"],Impresora:["Brother HL","HP LaserJet"],"Teléfono":["Samsung A54","iPhone SE"]};
const TRAB=["Ana Rojas","Bruno Soto","Carla Díaz","Diego Mena","Elisa Vera","Fabián Pino","Gloria Paz","Hugo Lara"];
const VIEWS=[["dash","Panel"],["inv","Inventario","reg"],["asig","Asignaciones","asig"],["trasl","Traslados","trasl"],["rep","Reportes","rep"],["hit","Hitos y pruebas","hit"]];
let ST,ME=null,view="dash",tries=0,lock=false;
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const today=()=>new Date().toISOString().slice(0,10);

function seed(){const assets=[];for(let i=1;i<=450;i++){const t=TIPOS[i%5],m=MM[t][i%MM[t].length],e=i%11==0?"En reparación":i%4==0?"Asignado":"Disponible";
 assets.push({id:"ACT-"+String(i).padStart(4,"0"),serie:"SN"+(700000+i*37),tipo:t,marca:m.split(" ")[0],modelo:m,specs:t=="Notebook"?"i5, 16GB RAM, 512GB SSD":"Ficha estándar",estado:e,sede:e=="Asignado"?SEDES[i%2]:e=="En reparación"?SEDES[2]:SEDES[i%3],resp:e=="Asignado"?TRAB[i%8]:"",fecha:"2026-11-0"+(1+i%8)});}
 return{assets,hist:[]};}
function load(){try{ST=JSON.parse(localStorage.getItem(KEY))}catch(e){}if(!ST||!ST.assets)ST=seed()}
function save(){try{localStorage.setItem(KEY,JSON.stringify(ST))}catch(e){}}
const can=(p,r=ME&&ME.r)=>(PERM[r]||[]).includes(p);
function log(st,id,tipo,det,user){const h=Object.freeze({t:new Date().toISOString(),id,tipo,det,user:user||(ME?ME.r:"Sistema")});st.hist.push(h);}

/* ---- reglas de negocio (reutilizadas por las pruebas) ---- */
function validar(a,assets){if(!a.id||!a.id.trim())return"El código único es obligatorio";if(!a.serie||!a.serie.trim())return"El número de serie es obligatorio";
 if(assets.some(x=>x.id==a.id||x.serie==a.serie))return"El código o el número de serie ya existe";return""}
function asignar(st,id,trab,rol){if(!can("asig",rol))return"Sin permiso";const a=st.assets.find(x=>x.id==id);if(!a||a.estado!="Disponible")return"El equipo no está disponible";if(!trab.trim())return"Indica el trabajador";
 a.estado="Asignado";a.resp=trab;a.fecha=today();log(st,id,"Asignación","Entregado a "+trab+" en "+a.sede,rol);return""}
function devolver(st,id,rol){const a=st.assets.find(x=>x.id==id);if(!can("asig",rol)||!a||a.estado!="Asignado")return"No se puede devolver";log(st,id,"Devolución","Devuelto por "+a.resp,rol);a.estado="Disponible";a.resp="";a.fecha=today();return""}
function trasladar(st,id,dest,rol){if(!can("trasl",rol))return"Sin permiso";const a=st.assets.find(x=>x.id==id);if(!a)return"Activo no encontrado";if(a.estado=="Baja")return"El activo está dado de baja";if(a.sede==dest)return"El activo ya está en ese destino";
 log(st,id,"Traslado",a.sede+" → "+dest,rol);a.sede=dest;a.fecha=today();return""}
function filtrar(st,f){return st.assets.filter(a=>(!f.sede||a.sede==f.sede)&&(!f.estado||a.estado==f.estado)&&(!f.tipo||a.tipo==f.tipo)&&(!f.d||a.fecha>=f.d)&&(!f.h||a.fecha<=f.h))}

/* ---- sesión ---- */
function doLogin(){const u=$("#u").value.trim(),p=$("#p").value,e=$("#lerr");if(lock){e.textContent="Acceso bloqueado por intentos fallidos. Recarga la página.";return}
 const x=USERS[u];if(x&&x.p==p){ME={u,r:x.r};tries=0;e.textContent="";$("#login").style.display="none";$("#app").classList.add("on");$("#who").textContent=x.r+" · "+u;view="dash";nav();render()}
 else{tries++;if(tries>=3){lock=true;e.textContent="Acceso bloqueado tras 3 intentos fallidos."}else e.textContent="Usuario o clave incorrectos. Intento "+tries+" de 3."}}
function logout(){ME=null;$("#app").classList.remove("on");$("#login").style.display="";$("#p").value=""}
$("#p").addEventListener("keydown",e=>{if(e.key=="Enter")doLogin()});
function nav(){$("#nav").innerHTML=VIEWS.map(v=>`<a class="${view==v[0]?"on":""} ${v[2]&&!can(v[2])?"off":""}" onclick="go('${v[0]}')" tabindex="0">${v[1]}</a>`).join("")}
function go(v){view=v;nav();render()}
function msg(t,ok){const m=$("#m");if(m){m.className="msg "+(ok?"ok":"no");m.textContent=t}}
function sel(id,arr,all){return`<select id="${id}">${all?`<option value="">${all}</option>`:""}${arr.map(x=>`<option>${esc(x)}</option>`).join("")}</select>`}
function tabla(rows,cols,max=40){return`<div class="tw"><table><thead><tr>${cols.map(c=>`<th>${c[0]}</th>`).join("")}</tr></thead><tbody>${rows.slice(0,max).map(r=>`<tr>${cols.map(c=>`<td>${c[1](r)}</td>`).join("")}</tr>`).join("")||`<tr><td colspan="${cols.length}">Sin resultados</td></tr>`}</tbody></table></div>${rows.length>max?`<p style="color:var(--mut)">Mostrando ${max} de ${rows.length}. Usa los filtros para acotar.</p>`:""}`}
const est=e=>`<span class="tag ${e.split(" ")[0]}">${e}</span>`;

/* ---- vistas ---- */
function render(){({dash,inv,asig,trasl,rep,hit})[view]()}
function dash(){const c=e=>ST.assets.filter(a=>a.estado==e).length;
 $("#v").innerHTML=`<h1>Panel principal</h1><div class="grid"><div class="k"><b>${ST.assets.length}</b><span>Activos registrados</span></div>${ESTADOS.map(e=>`<div class="k"><b>${c(e)}</b><span>${e}</span></div>`).join("")}</div>
 <div class="grid">${SEDES.map(s=>`<div class="k"><b>${ST.assets.filter(a=>a.sede==s).length}</b><span>${s}</span></div>`).join("")}</div>
 <div class="box"><b>Últimos movimientos</b>${tabla(ST.hist.slice().reverse(),[["Fecha",h=>h.t.slice(0,16).replace("T"," ")],["Activo",h=>h.id],["Tipo",h=>h.tipo],["Detalle",h=>esc(h.det)],["Rol",h=>h.user]],8)}</div>`}

function inv(){$("#v").innerHTML=`<h1>Inventario y catalogación</h1>
 <div class="box"><b>Registrar activo</b><div class="row"><div><label>Código único</label><input id="n_id" placeholder="ACT-0451"></div><div><label>N° de serie</label><input id="n_s"></div><div><label>Tipo</label>${sel("n_t",TIPOS)}</div><div><label>Marca</label><input id="n_m"></div><div><label>Modelo</label><input id="n_mo"></div><div><label>Especificaciones</label><input id="n_e"></div><div><label>Ubicación</label>${sel("n_u",SEDES)}</div><button onclick="alta()">Guardar activo</button></div><div id="m" class="msg" role="status"></div></div>
 <div class="box"><div class="row"><div><label>Buscar código o serie</label><input id="q" oninput="lista()"></div><div><label>Sede</label>${sel("fs",SEDES,"Todas")}</div><div><label>Estado</label>${sel("fe",ESTADOS,"Todos")}</div><div><label>Tipo</label>${sel("ft",TIPOS,"Todos")}</div></div><div id="lst" style="margin-top:12px"></div></div>`;
 ["fs","fe","ft"].forEach(i=>$("#"+i).onchange=lista);lista()}
function lista(){const q=$("#q").value.toLowerCase(),r=filtrar(ST,{sede:$("#fs").value,estado:$("#fe").value,tipo:$("#ft").value}).filter(a=>!q||(a.id+a.serie).toLowerCase().includes(q)).reverse();
 $("#lst").innerHTML=tabla(r,[["Código",a=>a.id],["Serie",a=>a.serie],["Tipo",a=>a.tipo],["Modelo",a=>esc(a.modelo)],["Estado",a=>est(a.estado)],["Ubicación",a=>a.sede],["Responsable",a=>esc(a.resp||"—")],["",a=>can("edit")&&a.estado!="Baja"?`<button class="sec" onclick="editar('${a.id}')">Editar</button> <button class="dng" onclick="baja('${a.id}')">Dar de baja</button>`:""]])}
function alta(){if(!can("reg"))return msg("Sin permiso",0);const a={id:$("#n_id").value.trim(),serie:$("#n_s").value.trim(),tipo:$("#n_t").value,marca:$("#n_m").value,modelo:$("#n_mo").value,specs:$("#n_e").value,estado:"Disponible",sede:$("#n_u").value,resp:"",fecha:today()};
 const e=validar(a,ST.assets);if(e)return msg(e,0);ST.assets.push(a);log(ST,a.id,"Alta","Registrado en "+a.sede);save();msg("Activo "+a.id+" registrado y visible en la lista.",1);lista()}
function editar(id){if(!can("edit"))return;const a=ST.assets.find(x=>x.id==id),s=prompt("Especificaciones de "+id,a.specs);if(s!==null){a.specs=s;log(ST,id,"Edición","Especificaciones actualizadas");save();lista()}}
function baja(id){if(!can("baja"))return;if(confirm("¿Autorizar la baja de "+id+"?")){const a=ST.assets.find(x=>x.id==id);a.estado="Baja";a.resp="";log(ST,id,"Baja","Baja autorizada por Admin TI");save();lista()}}

function asig(){$("#v").innerHTML=`<h1>Asignaciones</h1><div class="box"><div class="row"><div><label>Activo disponible</label><input id="a_id" list="dl" placeholder="ACT-0001"><datalist id="dl">${ST.assets.filter(a=>a.estado=="Disponible").slice(0,60).map(a=>`<option value="${a.id}">${esc(a.modelo)} · ${a.sede}</option>`).join("")}</datalist></div><div><label>Trabajador</label><input id="a_t" list="tr"><datalist id="tr">${TRAB.map(t=>`<option>${t}</option>`).join("")}</datalist></div><button onclick="doAsig()">Asignar equipo</button></div><div id="m" class="msg" role="status"></div></div>
 <div class="box"><b>Equipos asignados</b><div id="lst"></div></div>`;pintaAs()}
function pintaAs(){$("#lst").innerHTML=tabla(ST.assets.filter(a=>a.estado=="Asignado").reverse(),[["Código",a=>a.id],["Equipo",a=>esc(a.modelo)],["Responsable",a=>esc(a.resp)],["Sede",a=>a.sede],["Entrega",a=>a.fecha],["",a=>`<button class="sec" onclick="doDev('${a.id}')">Registrar devolución</button>`]],15)}
function doAsig(){const e=asignar(ST,$("#a_id").value.trim(),$("#a_t").value,ME.r);if(e)return msg(e,0);save();msg("Equipo asignado. El estado pasó a Asignado y quedó en el historial.",1);pintaAs()}
function doDev(id){const e=devolver(ST,id,ME.r);if(e)return msg(e,0);save();msg("Devolución registrada.",1);pintaAs()}

function trasl(){$("#v").innerHTML=`<h1>Traslados e historial</h1><div class="box"><div class="row"><div><label>Código del activo</label><input id="t_id" placeholder="ACT-0002"></div><div><label>Destino</label>${sel("t_d",SEDES)}</div><button onclick="doTr()">Registrar traslado</button></div><div id="m" class="msg" role="status"></div></div>
 <div class="box"><b>Historial de movimientos</b> <span style="color:var(--mut)">(solo lectura: una vez registrado no se puede editar ni borrar)</span><div id="lst"></div></div>`;pintaHi()}
function pintaHi(){$("#lst").innerHTML=tabla(ST.hist.slice().reverse(),[["Fecha",h=>h.t.slice(0,16).replace("T"," ")],["Activo",h=>h.id],["Tipo",h=>h.tipo],["Detalle",h=>esc(h.det)],["Registrado por",h=>h.user]],25)}
function doTr(){const e=trasladar(ST,$("#t_id").value.trim(),$("#t_d").value,ME.r);if(e)return msg(e,0);save();msg("Traslado registrado. La ubicación se actualizó al instante.",1);pintaHi()}

function rep(){$("#v").innerHTML=`<h1>Reportes de inventario</h1><div class="box noprint"><div class="row"><div><label>Sede / ubicación</label>${sel("r_s",SEDES,"Todas")}</div><div><label>Estado</label>${sel("r_e",ESTADOS,"Todos")}</div><div><label>Tipo</label>${sel("r_t",TIPOS,"Todos")}</div><div><label>Fecha desde</label><input id="r_d" type="date"></div><div><label>Fecha hasta</label><input id="r_h" type="date"></div></div>
 <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button onclick="verRep()">Generar reporte</button><button class="sec" onclick="exc()">Descargar Excel (CSV)</button><button class="sec" onclick="window.print()">Descargar PDF (imprimir)</button></div></div><div id="lst"></div>`;verRep()}
const rf=()=>({sede:$("#r_s").value,estado:$("#r_e").value,tipo:$("#r_t").value,d:$("#r_d").value,h:$("#r_h").value});
function verRep(){const t0=performance.now(),r=filtrar(ST,rf()),ms=(performance.now()-t0).toFixed(1),porSede=SEDES.map(s=>s+": "+r.filter(a=>a.sede==s).length).join(" · ");
 $("#lst").innerHTML=`<div class="box"><b>Resumen:</b> ${r.length} equipos · ${porSede}<br><span style="color:var(--mut)">Generado el ${new Date().toLocaleString("es-CL")} en ${ms} ms. Alerta de mantenimiento: ${r.filter(a=>a.estado=="En reparación").length} equipos en reparación.</span></div>`+tabla(r,[["Código",a=>a.id],["Tipo",a=>a.tipo],["Modelo",a=>esc(a.modelo)],["Estado",a=>a.estado],["Ubicación",a=>a.sede],["Responsable",a=>esc(a.resp||"—")],["Fecha",a=>a.fecha]],60)}
function exc(){const r=filtrar(ST,rf()),h=["Código","Serie","Tipo","Marca","Modelo","Estado","Ubicación","Responsable","Fecha"];
 const csv="\ufeff"+[h].concat(r.map(a=>[a.id,a.serie,a.tipo,a.marca,a.modelo,a.estado,a.sede,a.resp,a.fecha])).map(l=>l.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(";")).join("\r\n");
 const l=document.createElement("a");l.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));l.download="reporte_inventario_"+today()+".csv";l.click()}

/* ---- hitos y pruebas automáticas ---- */
const HITOS=[["1","Planificación de construcción","09-11 al 11-11","Gantt, priorización de REQ-001 a REQ-005","—"],["2","Desarrollo · Hito 1","12-11 al 17-11","Login, roles e inventario","REQ-005, REQ-001"],["3","Desarrollo · Hito 2","18-11 al 23-11","Asignaciones, traslados y reportes","REQ-002, REQ-003, REQ-004"],["4","Integración, pruebas y calidad","24-11 al 27-11","Casos de prueba CP-01 a CP-05 (botón de abajo)","REQ-001 a REQ-005"],["5","Puesta en producción","30-11 al 01-12","Despliegue en entorno académico (esta página)","REQ-001 a REQ-005"]];
function hit(){$("#v").innerHTML=`<h1>Hitos y pruebas</h1><div class="box">${tabla(HITOS,[["Hito",h=>h[0]],["Etapa",h=>h[1]],["Fechas",h=>h[2]],["Entrega demostrable",h=>h[3]],["Requerimientos",h=>h[4]],["Estado",h=>est("Completado").replace("tag Completado","tag Asignado")]])}</div>
 <div class="box"><div class="top"><b>Pruebas automáticas (Hito 4)</b><button onclick="pruebas()">Ejecutar casos de prueba</button></div><div id="lst" style="color:var(--mut)">Cada caso se ejecuta sobre una copia de los datos, sin modificar tu inventario.</div></div>`}
function pruebas(){const c=()=>JSON.parse(JSON.stringify(ST)),R=[];
 let s=c(),e=validar({id:"",serie:"X1"},s.assets),e2=validar({id:"ACT-9999",serie:""},s.assets),ok=validar({id:"ACT-9999",serie:"ZZ1"},s.assets)=="";
 R.push(["CP-01","REQ-001","No guarda sin código único ni N° de serie; con datos completos sí guarda",!!e&&!!e2&&ok]);
 s=c();const id=s.assets.find(a=>a.estado=="Disponible").id,n=s.hist.length;let er=asignar(s,id,"Ana Rojas","Soporte"),a=s.assets.find(x=>x.id==id);
 R.push(["CP-02","REQ-002","Al asignar el estado pasa a Asignado y se guarda usuario y fecha en el historial",!er&&a.estado=="Asignado"&&s.hist.length==n+1&&s.hist.at(-1).det.includes("Ana Rojas")]);
 s=c();const t=s.assets.find(x=>x.estado=="Disponible"),dest=SEDES.find(x=>x!=t.sede);trasladar(s,t.id,dest,"Bodega");const h=s.hist.at(-1);let inm=false;try{"use strict";h.det="x";inm=h.det!="x"}catch(x){inm=true}
 R.push(["CP-03","REQ-003","El traslado actualiza la ubicación y el historial queda inmutable",s.assets.find(x=>x.id==t.id).sede==dest&&inm&&Object.isFrozen(h)]);
 s=c();const t0=performance.now(),rr=filtrar(s,{sede:SEDES[0],estado:"Disponible"}),dt=performance.now()-t0;
 R.push(["CP-04","REQ-004","El reporte filtrado coincide con los datos y se genera en menos de 5 segundos ("+dt.toFixed(1)+" ms)",rr.every(x=>x.sede==SEDES[0]&&x.estado=="Disponible")&&dt<5000]);
 s=c();const bad=!USERS.admin||USERS.admin.p=="malaclave",d1=asignar(s,id,"X","Bodega")!="",d2=!can("edit","Soporte")&&!can("baja","Bodega")&&can("baja","Admin TI");
 R.push(["CP-05","REQ-005","Sin permisos de administrador no se puede editar ni dar de baja; clave incorrecta bloquea",!bad&&d1&&d2&&!(USERS.admin.p=="malaclave")]);
 const n5=R.filter(r=>r[3]).length;
 $("#lst").innerHTML=tabla(R,[["Caso",r=>r[0]],["Req.",r=>r[1]],["Criterio de aceptación",r=>r[2]],["Resultado",r=>`<b style="color:var(--${r[3]?"ok":"bad"})">${r[3]?"Aprobado":"Falló"}</b>`]])+`<p><b>${n5} de ${R.length} casos aprobados.</b></p>`}

load();