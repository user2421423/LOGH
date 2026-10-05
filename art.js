/* Original generated artwork. Source atlases remain intact; source rectangles are consumed at runtime. */
const ART={
 frames:{corvette:0,torpedo:1,boarding:2,vanguard:3,transport:4,light:5,heavy:6,battleship:7,flagship:8,beam:9,siege:10,missile:11,battery:12,station:13,fortress:14,capital:15},
 officers:{reinhard:0,yang:1,mittermeyer:2,reuenthal:3,kircheis:4,attenborough:5,fischer:6,schonkopf:7},
 urls:{fleet:'assets/fleet-atlas.png',terrain:'assets/terrain-atlas.png',portraits:'assets/admiral-atlas.png'},
 fleetRects:[[20,48,310,240],[347,47,280,240],[633,48,301,241],[938,48,308,242],[10,335,310,265],[325,345,302,251],[627,336,311,271],[932,338,314,273],[8,640,309,261],[325,638,300,267],[629,622,310,290],[935,641,310,263],[5,914,335,319],[311,905,321,327],[629,905,304,319],[935,935,314,279]],
 terrainRects:[[25,48,280,256],[328,39,290,267],[643,42,279,264],[952,42,287,267],[22,324,288,312],[326,322,299,314],[635,321,300,315],[950,322,294,316],[35,652,250,252],[306,651,343,245],[660,650,251,253],[965,649,274,261],[20,922,293,290],[336,931,285,281],[660,931,272,282],[943,927,300,292]],
 masks:{12:[[0,0],[335,0],[335,88],[267,145],[220,232],[189,319],[0,319]],13:[[45,0],[321,0],[321,327],[0,327],[0,115],[52,56]]},
 images:{},ready:{},serial:0,
 load(){if(typeof Image==='undefined')return;for(const [name,url] of Object.entries(this.urls)){const img=new Image();img.onload=()=>{this.ready[name]=true;};img.onerror=()=>{this.ready[name]=false;};img.src=url;this.images[name]=img;}},
 rect(name,index){if(name==='fleet')return this.fleetRects[index];if(name==='terrain')return this.terrainRects[index];return[index%4*313.5+3,Math.floor(index/4)*627+14,307,439];},
 draw(context,name,index,x,y,width,height=width,flip=false){const img=this.images[name];if(!this.ready[name]||!img)return false;const [sx,sy,sw,sh]=this.rect(name,index),ratio=Math.min(width/sw,height/sh),dw=sw*ratio,dh=sh*ratio;context.save();context.translate(x,y);if(flip)context.scale(-1,1);if(name==='fleet'&&index===8)context.rotate(Math.PI);if(name==='fleet'&&this.masks[index]){context.beginPath();this.masks[index].forEach((p,i)=>{const px=-dw/2+p[0]*ratio,py=-dh/2+p[1]*ratio;i?context.lineTo(px,py):context.moveTo(px,py);});context.closePath();context.clip();}context.drawImage(img,sx,sy,sw,sh,-dw/2,-dh/2,dw,dh);context.restore();return true;},
 svg(name,index,extra=''){const [x,y,w,h]=this.rect(name,index),mask=name==='fleet'?this.masks[index]:null,id='asset-mask-'+this.serial++;const def=mask?`<defs><clipPath id="${id}"><polygon points="${mask.map(p=>(p[0]+x)+','+(p[1]+y)).join(' ')}"/></clipPath></defs>`:'';return `<span class="${name==='portraits'?'portrait-art':'ship-art'} ${extra}" aria-hidden="true"><svg viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="xMidYMid ${name==='portraits'?'slice':'meet'}" xmlns="http://www.w3.org/2000/svg">${def}<image href="${this.urls[name]}" width="1254" height="1254" ${mask?'clip-path="url(#'+id+')"':''}/></svg></span>`;},
 ship(type,extra=''){return this.svg('fleet',this.frames[type]??13,extra);},
 portrait(admiral,extra=''){return this.svg('portraits',this.officers[admiral]??0,extra);}
};
ART.load();
