var qt=Object.defineProperty;var Vt=Object.getOwnPropertyDescriptor;var f=(d,o,e,t)=>{for(var i=t>1?void 0:t?Vt(o,e):o,n=d.length-1,r;n>=0;n--)(r=d[n])&&(i=(t?r(o,e,i):r(i))||i);return t&&i&&qt(o,e,i),i};var ke=globalThis,ze=ke.ShadowRoot&&(ke.ShadyCSS===void 0||ke.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Oe=Symbol(),rt=new WeakMap,he=class{constructor(o,e,t){if(this._$cssResult$=!0,t!==Oe)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=o,this.t=e}get styleSheet(){let o=this.o,e=this.t;if(ze&&o===void 0){let t=e!==void 0&&e.length===1;t&&(o=rt.get(e)),o===void 0&&((this.o=o=new CSSStyleSheet).replaceSync(this.cssText),t&&rt.set(e,o))}return o}toString(){return this.cssText}},ot=d=>new he(typeof d=="string"?d:d+"",void 0,Oe),F=(d,...o)=>{let e=d.length===1?d[0]:o.reduce((t,i,n)=>t+(r=>{if(r._$cssResult$===!0)return r.cssText;if(typeof r=="number")return r;throw Error("Value passed to 'css' function must be a 'css' function result: "+r+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+d[n+1],d[0]);return new he(e,d,Oe)},st=(d,o)=>{if(ze)d.adoptedStyleSheets=o.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let e of o){let t=document.createElement("style"),i=ke.litNonce;i!==void 0&&t.setAttribute("nonce",i),t.textContent=e.cssText,d.appendChild(t)}},Fe=ze?d=>d:d=>d instanceof CSSStyleSheet?(o=>{let e="";for(let t of o.cssRules)e+=t.cssText;return ot(e)})(d):d;var{is:Gt,defineProperty:Ut,getOwnPropertyDescriptor:jt,getOwnPropertyNames:Wt,getOwnPropertySymbols:Kt,getPrototypeOf:Yt}=Object,Ee=globalThis,at=Ee.trustedTypes,Qt=at?at.emptyScript:"",Xt=Ee.reactiveElementPolyfillSupport,pe=(d,o)=>d,ue={toAttribute(d,o){switch(o){case Boolean:d=d?Qt:null;break;case Object:case Array:d=d==null?d:JSON.stringify(d)}return d},fromAttribute(d,o){let e=d;switch(o){case Boolean:e=d!==null;break;case Number:e=d===null?null:Number(d);break;case Object:case Array:try{e=JSON.parse(d)}catch{e=null}}return e}},Me=(d,o)=>!Gt(d,o),lt={attribute:!0,type:String,converter:ue,reflect:!1,useDefault:!1,hasChanged:Me};Symbol.metadata??=Symbol("metadata"),Ee.litPropertyMetadata??=new WeakMap;var W=class extends HTMLElement{static addInitializer(o){this._$Ei(),(this.l??=[]).push(o)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(o,e=lt){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(o)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(o,e),!e.noAccessor){let t=Symbol(),i=this.getPropertyDescriptor(o,t,e);i!==void 0&&Ut(this.prototype,o,i)}}static getPropertyDescriptor(o,e,t){let{get:i,set:n}=jt(this.prototype,o)??{get(){return this[e]},set(r){this[e]=r}};return{get:i,set(r){let s=i?.call(this);n?.call(this,r),this.requestUpdate(o,s,t)},configurable:!0,enumerable:!0}}static getPropertyOptions(o){return this.elementProperties.get(o)??lt}static _$Ei(){if(this.hasOwnProperty(pe("elementProperties")))return;let o=Yt(this);o.finalize(),o.l!==void 0&&(this.l=[...o.l]),this.elementProperties=new Map(o.elementProperties)}static finalize(){if(this.hasOwnProperty(pe("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(pe("properties"))){let e=this.properties,t=[...Wt(e),...Kt(e)];for(let i of t)this.createProperty(i,e[i])}let o=this[Symbol.metadata];if(o!==null){let e=litPropertyMetadata.get(o);if(e!==void 0)for(let[t,i]of e)this.elementProperties.set(t,i)}this._$Eh=new Map;for(let[e,t]of this.elementProperties){let i=this._$Eu(e,t);i!==void 0&&this._$Eh.set(i,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(o){let e=[];if(Array.isArray(o)){let t=new Set(o.flat(1/0).reverse());for(let i of t)e.unshift(Fe(i))}else o!==void 0&&e.push(Fe(o));return e}static _$Eu(o,e){let t=e.attribute;return t===!1?void 0:typeof t=="string"?t:typeof o=="string"?o.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(o=>this.enableUpdating=o),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(o=>o(this))}addController(o){(this._$EO??=new Set).add(o),this.renderRoot!==void 0&&this.isConnected&&o.hostConnected?.()}removeController(o){this._$EO?.delete(o)}_$E_(){let o=new Map,e=this.constructor.elementProperties;for(let t of e.keys())this.hasOwnProperty(t)&&(o.set(t,this[t]),delete this[t]);o.size>0&&(this._$Ep=o)}createRenderRoot(){let o=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return st(o,this.constructor.elementStyles),o}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(o=>o.hostConnected?.())}enableUpdating(o){}disconnectedCallback(){this._$EO?.forEach(o=>o.hostDisconnected?.())}attributeChangedCallback(o,e,t){this._$AK(o,t)}_$ET(o,e){let t=this.constructor.elementProperties.get(o),i=this.constructor._$Eu(o,t);if(i!==void 0&&t.reflect===!0){let n=(t.converter?.toAttribute!==void 0?t.converter:ue).toAttribute(e,t.type);this._$Em=o,n==null?this.removeAttribute(i):this.setAttribute(i,n),this._$Em=null}}_$AK(o,e){let t=this.constructor,i=t._$Eh.get(o);if(i!==void 0&&this._$Em!==i){let n=t.getPropertyOptions(i),r=typeof n.converter=="function"?{fromAttribute:n.converter}:n.converter?.fromAttribute!==void 0?n.converter:ue;this._$Em=i;let s=r.fromAttribute(e,n.type);this[i]=s??this._$Ej?.get(i)??s,this._$Em=null}}requestUpdate(o,e,t,i=!1,n){if(o!==void 0){let r=this.constructor;if(i===!1&&(n=this[o]),t??=r.getPropertyOptions(o),!((t.hasChanged??Me)(n,e)||t.useDefault&&t.reflect&&n===this._$Ej?.get(o)&&!this.hasAttribute(r._$Eu(o,t))))return;this.C(o,e,t)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(o,e,{useDefault:t,reflect:i,wrapped:n},r){t&&!(this._$Ej??=new Map).has(o)&&(this._$Ej.set(o,r??e??this[o]),n!==!0||r!==void 0)||(this._$AL.has(o)||(this.hasUpdated||t||(e=void 0),this._$AL.set(o,e)),i===!0&&this._$Em!==o&&(this._$Eq??=new Set).add(o))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let o=this.scheduleUpdate();return o!=null&&await o,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[i,n]of this._$Ep)this[i]=n;this._$Ep=void 0}let t=this.constructor.elementProperties;if(t.size>0)for(let[i,n]of t){let{wrapped:r}=n,s=this[i];r!==!0||this._$AL.has(i)||s===void 0||this.C(i,void 0,n,s)}}let o=!1,e=this._$AL;try{o=this.shouldUpdate(e),o?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(t){throw o=!1,this._$EM(),t}o&&this._$AE(e)}willUpdate(o){}_$AE(o){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(o)),this.updated(o)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(o){return!0}update(o){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(o){}firstUpdated(o){}};W.elementStyles=[],W.shadowRootOptions={mode:"open"},W[pe("elementProperties")]=new Map,W[pe("finalized")]=new Map,Xt?.({ReactiveElement:W}),(Ee.reactiveElementVersions??=[]).push("2.1.2");var Ke=globalThis,dt=d=>d,Se=Ke.trustedTypes,ct=Se?Se.createPolicy("lit-html",{createHTML:d=>d}):void 0,gt="$lit$",X=`lit$${Math.random().toFixed(9).slice(2)}$`,_t="?"+X,Ht=`<${_t}>`,re=document,me=()=>re.createComment(""),ge=d=>d===null||typeof d!="object"&&typeof d!="function",Ye=Array.isArray,Jt=d=>Ye(d)||typeof d?.[Symbol.iterator]=="function",qe=`[ 	
\f\r]`,fe=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,ht=/-->/g,pt=/>/g,ie=RegExp(`>|${qe}(?:([^\\s"'>=/]+)(${qe}*=${qe}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),ut=/'/g,ft=/"/g,vt=/^(?:script|style|textarea|title)$/i,Qe=d=>(o,...e)=>({_$litType$:d,strings:o,values:e}),h=Qe(1),y=Qe(2),Ti=Qe(3),oe=Symbol.for("lit-noChange"),u=Symbol.for("lit-nothing"),mt=new WeakMap,ne=re.createTreeWalker(re,129);function bt(d,o){if(!Ye(d)||!d.hasOwnProperty("raw"))throw Error("invalid template strings array");return ct!==void 0?ct.createHTML(o):o}var Zt=(d,o)=>{let e=d.length-1,t=[],i,n=o===2?"<svg>":o===3?"<math>":"",r=fe;for(let s=0;s<e;s++){let a=d[s],c,l,p=-1,_=0;for(;_<a.length&&(r.lastIndex=_,l=r.exec(a),l!==null);)_=r.lastIndex,r===fe?l[1]==="!--"?r=ht:l[1]!==void 0?r=pt:l[2]!==void 0?(vt.test(l[2])&&(i=RegExp("</"+l[2],"g")),r=ie):l[3]!==void 0&&(r=ie):r===ie?l[0]===">"?(r=i??fe,p=-1):l[1]===void 0?p=-2:(p=r.lastIndex-l[2].length,c=l[1],r=l[3]===void 0?ie:l[3]==='"'?ft:ut):r===ft||r===ut?r=ie:r===ht||r===pt?r=fe:(r=ie,i=void 0);let m=r===ie&&d[s+1].startsWith("/>")?" ":"";n+=r===fe?a+Ht:p>=0?(t.push(c),a.slice(0,p)+gt+a.slice(p)+X+m):a+X+(p===-2?s:m)}return[bt(d,n+(d[e]||"<?>")+(o===2?"</svg>":o===3?"</math>":"")),t]},_e=class d{constructor({strings:o,_$litType$:e},t){let i;this.parts=[];let n=0,r=0,s=o.length-1,a=this.parts,[c,l]=Zt(o,e);if(this.el=d.createElement(c,t),ne.currentNode=this.el.content,e===2||e===3){let p=this.el.content.firstChild;p.replaceWith(...p.childNodes)}for(;(i=ne.nextNode())!==null&&a.length<s;){if(i.nodeType===1){if(i.hasAttributes())for(let p of i.getAttributeNames())if(p.endsWith(gt)){let _=l[r++],m=i.getAttribute(p).split(X),v=/([.?@])?(.*)/.exec(_);a.push({type:1,index:n,name:v[2],strings:m,ctor:v[1]==="."?Ge:v[1]==="?"?Ue:v[1]==="@"?je:ae}),i.removeAttribute(p)}else p.startsWith(X)&&(a.push({type:6,index:n}),i.removeAttribute(p));if(vt.test(i.tagName)){let p=i.textContent.split(X),_=p.length-1;if(_>0){i.textContent=Se?Se.emptyScript:"";for(let m=0;m<_;m++)i.append(p[m],me()),ne.nextNode(),a.push({type:2,index:++n});i.append(p[_],me())}}}else if(i.nodeType===8)if(i.data===_t)a.push({type:2,index:n});else{let p=-1;for(;(p=i.data.indexOf(X,p+1))!==-1;)a.push({type:7,index:n}),p+=X.length-1}n++}}static createElement(o,e){let t=re.createElement("template");return t.innerHTML=o,t}};function se(d,o,e=d,t){if(o===oe)return o;let i=t!==void 0?e._$Co?.[t]:e._$Cl,n=ge(o)?void 0:o._$litDirective$;return i?.constructor!==n&&(i?._$AO?.(!1),n===void 0?i=void 0:(i=new n(d),i._$AT(d,e,t)),t!==void 0?(e._$Co??=[])[t]=i:e._$Cl=i),i!==void 0&&(o=se(d,i._$AS(d,o.values),i,t)),o}var Ve=class{constructor(o,e){this._$AV=[],this._$AN=void 0,this._$AD=o,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(o){let{el:{content:e},parts:t}=this._$AD,i=(o?.creationScope??re).importNode(e,!0);ne.currentNode=i;let n=ne.nextNode(),r=0,s=0,a=t[0];for(;a!==void 0;){if(r===a.index){let c;a.type===2?c=new ve(n,n.nextSibling,this,o):a.type===1?c=new a.ctor(n,a.name,a.strings,this,o):a.type===6&&(c=new We(n,this,o)),this._$AV.push(c),a=t[++s]}r!==a?.index&&(n=ne.nextNode(),r++)}return ne.currentNode=re,i}p(o){let e=0;for(let t of this._$AV)t!==void 0&&(t.strings!==void 0?(t._$AI(o,t,e),e+=t.strings.length-2):t._$AI(o[e])),e++}},ve=class d{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(o,e,t,i){this.type=2,this._$AH=u,this._$AN=void 0,this._$AA=o,this._$AB=e,this._$AM=t,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let o=this._$AA.parentNode,e=this._$AM;return e!==void 0&&o?.nodeType===11&&(o=e.parentNode),o}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(o,e=this){o=se(this,o,e),ge(o)?o===u||o==null||o===""?(this._$AH!==u&&this._$AR(),this._$AH=u):o!==this._$AH&&o!==oe&&this._(o):o._$litType$!==void 0?this.$(o):o.nodeType!==void 0?this.T(o):Jt(o)?this.k(o):this._(o)}O(o){return this._$AA.parentNode.insertBefore(o,this._$AB)}T(o){this._$AH!==o&&(this._$AR(),this._$AH=this.O(o))}_(o){this._$AH!==u&&ge(this._$AH)?this._$AA.nextSibling.data=o:this.T(re.createTextNode(o)),this._$AH=o}$(o){let{values:e,_$litType$:t}=o,i=typeof t=="number"?this._$AC(o):(t.el===void 0&&(t.el=_e.createElement(bt(t.h,t.h[0]),this.options)),t);if(this._$AH?._$AD===i)this._$AH.p(e);else{let n=new Ve(i,this),r=n.u(this.options);n.p(e),this.T(r),this._$AH=n}}_$AC(o){let e=mt.get(o.strings);return e===void 0&&mt.set(o.strings,e=new _e(o)),e}k(o){Ye(this._$AH)||(this._$AH=[],this._$AR());let e=this._$AH,t,i=0;for(let n of o)i===e.length?e.push(t=new d(this.O(me()),this.O(me()),this,this.options)):t=e[i],t._$AI(n),i++;i<e.length&&(this._$AR(t&&t._$AB.nextSibling,i),e.length=i)}_$AR(o=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);o!==this._$AB;){let t=dt(o).nextSibling;dt(o).remove(),o=t}}setConnected(o){this._$AM===void 0&&(this._$Cv=o,this._$AP?.(o))}},ae=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(o,e,t,i,n){this.type=1,this._$AH=u,this._$AN=void 0,this.element=o,this.name=e,this._$AM=i,this.options=n,t.length>2||t[0]!==""||t[1]!==""?(this._$AH=Array(t.length-1).fill(new String),this.strings=t):this._$AH=u}_$AI(o,e=this,t,i){let n=this.strings,r=!1;if(n===void 0)o=se(this,o,e,0),r=!ge(o)||o!==this._$AH&&o!==oe,r&&(this._$AH=o);else{let s=o,a,c;for(o=n[0],a=0;a<n.length-1;a++)c=se(this,s[t+a],e,a),c===oe&&(c=this._$AH[a]),r||=!ge(c)||c!==this._$AH[a],c===u?o=u:o!==u&&(o+=(c??"")+n[a+1]),this._$AH[a]=c}r&&!i&&this.j(o)}j(o){o===u?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,o??"")}},Ge=class extends ae{constructor(){super(...arguments),this.type=3}j(o){this.element[this.name]=o===u?void 0:o}},Ue=class extends ae{constructor(){super(...arguments),this.type=4}j(o){this.element.toggleAttribute(this.name,!!o&&o!==u)}},je=class extends ae{constructor(o,e,t,i,n){super(o,e,t,i,n),this.type=5}_$AI(o,e=this){if((o=se(this,o,e,0)??u)===oe)return;let t=this._$AH,i=o===u&&t!==u||o.capture!==t.capture||o.once!==t.once||o.passive!==t.passive,n=o!==u&&(t===u||i);i&&this.element.removeEventListener(this.name,this,t),n&&this.element.addEventListener(this.name,this,o),this._$AH=o}handleEvent(o){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,o):this._$AH.handleEvent(o)}},We=class{constructor(o,e,t){this.element=o,this.type=6,this._$AN=void 0,this._$AM=e,this.options=t}get _$AU(){return this._$AM._$AU}_$AI(o){se(this,o)}};var ei=Ke.litHtmlPolyfillSupport;ei?.(_e,ve),(Ke.litHtmlVersions??=[]).push("3.3.3");var yt=(d,o,e)=>{let t=e?.renderBefore??o,i=t._$litPart$;if(i===void 0){let n=e?.renderBefore??null;t._$litPart$=i=new ve(o.insertBefore(me(),n),n,void 0,e??{})}return i._$AI(d),i};var Xe=globalThis,T=class extends W{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let o=super.createRenderRoot();return this.renderOptions.renderBefore??=o.firstChild,o}update(o){let e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(o),this._$Do=yt(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return oe}};T._$litElement$=!0,T.finalized=!0,Xe.litElementHydrateSupport?.({LitElement:T});var ti=Xe.litElementPolyfillSupport;ti?.({LitElement:T});(Xe.litElementVersions??=[]).push("4.2.2");var I=d=>(o,e)=>{e!==void 0?e.addInitializer(()=>{customElements.define(d,o)}):customElements.define(d,o)};var ii={attribute:!0,type:String,converter:ue,reflect:!1,hasChanged:Me},ni=(d=ii,o,e)=>{let{kind:t,metadata:i}=e,n=globalThis.litPropertyMetadata.get(i);if(n===void 0&&globalThis.litPropertyMetadata.set(i,n=new Map),t==="setter"&&((d=Object.create(d)).wrapped=!0),n.set(e.name,d),t==="accessor"){let{name:r}=e;return{set(s){let a=o.get.call(this);o.set.call(this,s),this.requestUpdate(r,a,d,!0,s)},init(s){return s!==void 0&&this.C(r,void 0,d,s),s}}}if(t==="setter"){let{name:r}=e;return function(s){let a=this[r];o.call(this,s),this.requestUpdate(r,a,d,!0,s)}}throw Error("Unsupported decorator location: "+t)};function $(d){return(o,e)=>typeof e=="object"?ni(d,o,e):((t,i,n)=>{let r=i.hasOwnProperty(n);return i.constructor.createProperty(n,t),r?Object.getOwnPropertyDescriptor(i,n):void 0})(d,o,e)}function b(d){return $({...d,state:!0,attribute:!1})}var ri=[{name:"title",selector:{text:{}}},{name:"config_entry_id",selector:{config_entry:{integration:"zigbee_health"}}},{name:"default_tab",selector:{select:{mode:"dropdown",options:[{value:"map",label:"Netzkarte / Network map"},{value:"actions",label:"Ma\xDFnahmen / Measures"},{value:"findings",label:"Befunde / Findings"},{value:"rooms",label:"R\xE4ume / Rooms"}]}}},{name:"show_labels",selector:{boolean:{}}}],oi={title:["Titel","Title"],config_entry_id:["Zigbee-Netz (leer = erstes)","Zigbee network (empty = first)"],default_tab:["Start-Ansicht","Default view"],show_labels:["Alle Ger\xE4tenamen zeigen","Show all device names"]},le=class extends T{setConfig(o){this._config=o}render(){if(!this.hass||!this._config)return h``;let o=(this.hass.locale?.language??"en").startsWith("de");return h`<ha-form
      .hass=${this.hass}
      .data=${this._config}
      .schema=${ri}
      .computeLabel=${e=>oi[e.name]?.[o?0:1]??e.name}
      @value-changed=${e=>{this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:e.detail.value},bubbles:!0,composed:!0}))}}
    ></ha-form>`}};f([$({attribute:!1})],le.prototype,"hass",2),f([b()],le.prototype,"_config",2),le=f([I("zigbee-health-card-editor")],le);var be={router:150,other:240,end:330,endOuter:362},Ae="__coordinator__",He="__unknown__",si=30,Pe=(d,o)=>d.name.localeCompare(o.name,void 0,{numeric:!0});function Je(d,o){return{x:400+o*Math.cos(d),y:400+o*Math.sin(d)}}function Ze(d,o,e){let t=null;for(let i of d){let n=i.a===o?i.b:i.b===o?i.a:null;n===null||!e.has(n)||(t===null||i.lqi>t.lqi)&&(t=i)}return t}function xt(d,o,e,t=.12){if(d===0)return[];if(d===1)return[o];let i=e*(1-t),n=i/d,r=o-i/2+n/2;return Array.from({length:d},(s,a)=>r+a*n)}function et(d){let o=d.coordinator?.ieee??"coordinator",e=d.nodes,t=e.filter(g=>g.state!=="dead"),i=e.filter(g=>g.state==="dead").sort(Pe),n=new Map(t.map(g=>[g.ieee,g])),r=t.filter(g=>g.type==="router"&&g.kind==="always_on").sort(Pe),s=t.filter(g=>g.type==="router"&&g.kind!=="always_on"),a=new Set([o,...r.map(g=>g.ieee)]),c=new Map;for(let g of s){let k=Ze(d.links,g.ieee,a);c.set(g.ieee,k?k.a===g.ieee?k.b:k.a:o)}let l=new Map,p=g=>{let k=l.get(g);if(!k){let A=n.get(g)??null;k={key:g,anchor:A,routers:[],ends:[],weight:0},l.set(g,k)}return k};for(let g of r)p(g.ieee);for(let g of s){let k=c.get(g.ieee)??o;p(k===o?Ae:k).routers.push(g)}let _=new Set(d.unknown_parent);for(let g of t.filter(k=>k.type==="end_device")){let k=g.parent,A=He;if(k===o)A=Ae;else if(k&&a.has(k))A=k;else if(k&&c.has(k)){let ce=c.get(k);A=ce===o?Ae:ce}else _.add(g.ieee);p(A).ends.push(g)}let m=[...r.map(g=>l.get(g.ieee)),...[Ae,He].map(g=>l.get(g)).filter(g=>!!g)].filter(g=>g.anchor||g.routers.length||g.ends.length);for(let g of m)g.weight=(g.anchor?1:0)+g.ends.length+.8*g.routers.length+.3,g.anchor&&(g.weight=Math.max(g.weight,2.4));let v=m.reduce((g,k)=>g+k.weight,0)||1,w=new Map;w.set(o,{id:o,node:null,x:400,y:400,angle:0,ring:0});let x=m.reduce((g,k)=>g+k.ends.length,0)*si>2*Math.PI*be.end,R=null,L=-Math.PI/2;for(let g of m){let k=g.weight/v*2*Math.PI,A=L+k/2;if(L+=k,g.key===He&&(R=A),g.anchor){let O=Je(A,be.router);w.set(g.anchor.ieee,{id:g.anchor.ieee,node:g.anchor,...O,angle:A,ring:1})}let ce=[...g.routers].sort(Pe);xt(ce.length,A,k,.3).forEach((O,ee)=>{let te=ce[ee];w.set(te.ieee,{id:te.ieee,node:te,...Je(O,be.other),angle:O,ring:2})});let it=O=>(O.parent?w.get(O.parent)?.angle:void 0)??A,nt=[...g.ends].sort((O,ee)=>it(O)-it(ee)||Pe(O,ee));xt(nt.length,A,k).forEach((O,ee)=>{let te=nt[ee],Ft=x&&ee%2===1?be.endOuter:be.end;w.set(te.ieee,{id:te.ieee,node:te,...Je(O,Ft),angle:O,ring:3})})}let P=[],N=new Set([...w.values()].filter(g=>g.ring<=2).map(g=>g.id));for(let g of d.links)N.has(g.a)&&N.has(g.b)&&P.push({from:g.a,to:g.b,lqi:g.lqi,kind:"mesh"});let Z=new Set([o,...r.map(g=>g.ieee)]);for(let g of r){let k=new Set(Z);k.delete(g.ieee);let A=Ze(d.links,g.ieee,k);P.push(A?{from:g.ieee,to:A.a===g.ieee?A.b:A.a,lqi:A.lqi,kind:"backbone"}:{from:g.ieee,to:o,lqi:null,kind:"anchor"})}for(let g of s){let k=c.get(g.ieee)??o,A=Ze(d.links,g.ieee,new Set([k]));P.push({from:g.ieee,to:k,lqi:A?.lqi??null,kind:A?"backbone":"anchor"})}for(let g of t)g.type==="end_device"&&g.parent&&w.has(g.parent)&&P.push({from:g.ieee,to:g.parent,lqi:g.parent_lqi,kind:"parent"});return{coordinatorId:o,unknownAngle:R,placed:w,edges:P,dead:i,unknownParent:_}}function K(d,o){let e=new Map;for(let n of d.edges)n.kind!=="mesh"&&!e.has(n.from)&&e.set(n.from,n.to);let t=[o],i=o;for(let n=0;n<10&&e.has(i)&&(i=e.get(i),!t.includes(i));n++)t.push(i);return t}function $t(d,o){return new Set(K(d,o))}function q(d){return d===null||d<=0?"none":d>=150?"good":d>=80?"ok":"bad"}var V=F`
  :host {
    --zh-good: var(--success-color, #43a047);
    --zh-ok: var(--warning-color, #ffa000);
    --zh-bad: var(--error-color, #db4437);
    --zh-info: var(--info-color, #039be5);
    --zh-part: #8e6bd8;
    --zh-muted: var(--secondary-text-color, #727272);
    --zh-line: var(--divider-color, rgba(127, 127, 127, 0.25));
    --zh-surface: var(--secondary-background-color, rgba(127, 127, 127, 0.08));
    --zh-card: var(--card-background-color, var(--ha-card-background, #fff));
    --zh-text: var(--primary-text-color, #212121);
    --zh-radius: var(--ha-card-border-radius, 12px);
    display: block;
  }
  ha-card {
    overflow: hidden;
    color: var(--zh-text);
  }
  .wrap {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  /* header */
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px 16px;
  }
  .head .btns {
    display: flex;
    gap: 8px;
    margin-left: auto;
  }
  .gauge {
    position: relative;
    width: 84px;
    height: 84px;
    flex: none;
  }
  .gauge svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }
  .gauge .track {
    fill: none;
    stroke: var(--zh-line);
    stroke-width: 9;
  }
  .gauge .value {
    fill: none;
    stroke-width: 9;
    stroke-linecap: round;
    transition: stroke-dasharray 0.8s ease;
  }
  .gauge .num {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    font-weight: 600;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .gauge .num small {
    font-size: 11px;
    font-weight: 500;
    color: var(--zh-muted);
    margin-top: 3px;
  }
  .headtext {
    flex: 1 1 170px;
    min-width: 0;
  }
  .title {
    font-size: 20px;
    font-weight: 500;
    margin: 0;
  }
  .level {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
    font-weight: 500;
  }
  .level .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: currentColor;
  }
  .sub {
    color: var(--zh-muted);
    font-size: 13px;
    margin-top: 2px;
  }
  .lvl-stable {
    color: var(--zh-good);
  }
  .lvl-degraded {
    color: var(--zh-ok);
  }
  .lvl-fragile {
    color: var(--zh-bad);
  }
  .lvl-paused {
    color: var(--zh-muted);
  }
  .iconbtn {
    border: none;
    background: var(--zh-surface);
    color: var(--zh-text);
    width: 38px;
    height: 38px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex: none;
    transition: background 0.2s;
  }
  .iconbtn:hover {
    background: var(--zh-line);
  }
  .iconbtn svg {
    width: 20px;
    height: 20px;
  }
  .iconbtn.busy svg {
    animation: spin 1.2s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* tiles */
  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
    gap: 8px;
  }
  .tile {
    position: relative;
    border: 1px solid var(--zh-line);
    border-radius: 10px;
    padding: 9px 10px 8px;
    text-align: left;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
    overflow: hidden;
    transition: border-color 0.2s, background 0.2s;
  }
  .tile::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: var(--accent, var(--zh-line));
  }
  .tile:hover {
    background: var(--zh-surface);
  }
  .tile.active {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, transparent);
  }
  .tile.zero {
    --accent: var(--zh-line) !important;
    opacity: 0.7;
  }
  .tile .n {
    font-size: 22px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
  }
  .tile .l {
    font-size: 12px;
    color: var(--zh-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* tabs */
  .tabs {
    display: flex;
    gap: 4px;
    padding: 4px;
    background: var(--zh-surface);
    border-radius: 999px;
    overflow-x: auto;
  }
  .tabs button {
    flex: 1 0 auto;
    border: none;
    background: none;
    color: var(--zh-muted);
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    padding: 7px 10px;
    border-radius: 999px;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.2s, color 0.2s;
  }
  .tabs button.on {
    background: var(--zh-card);
    color: var(--zh-text);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  }
  .tabs .badge {
    display: inline-block;
    min-width: 18px;
    padding: 0 5px;
    margin-left: 4px;
    border-radius: 9px;
    font-size: 11px;
    line-height: 18px;
    background: var(--zh-bad);
    color: #fff;
  }

  /* map */
  .mapbox {
    position: relative;
  }
  .map {
    width: 100%;
    height: auto;
    display: block;
    max-height: 760px;
    touch-action: manipulation;
  }
  .guide {
    fill: none;
    stroke: var(--zh-line);
    stroke-dasharray: 3 6;
  }
  .guide-label {
    fill: var(--zh-muted);
    font-size: 11px;
    opacity: 0.8;
  }
  .edge {
    fill: none;
    stroke-linecap: round;
    transition: opacity 0.25s, stroke-width 0.25s;
    animation: draw 0.9s ease both;
  }
  @keyframes draw {
    from {
      opacity: 0;
    }
  }
  .edge.parent {
    stroke-width: 1.8;
  }
  .edge.backbone {
    stroke-width: 3;
  }
  .edge.mesh {
    stroke-width: 1;
    opacity: 0.14;
  }
  .edge.anchor {
    stroke-width: 1.5;
    stroke-dasharray: 3 5;
    stroke: var(--zh-muted) !important;
    opacity: 0.6;
  }
  .lqi-good {
    stroke: var(--zh-good);
  }
  .lqi-ok {
    stroke: var(--zh-ok);
  }
  .lqi-bad {
    stroke: var(--zh-bad);
  }
  .lqi-none {
    stroke: var(--zh-muted);
  }
  .dim .edge:not(.hl) {
    opacity: 0.07;
  }
  .dim .node:not(.hl) {
    opacity: 0.18;
  }
  .edge.hl {
    stroke-width: 3.5;
    opacity: 1;
  }
  .node {
    cursor: pointer;
    transition: opacity 0.25s;
  }
  .node .shape {
    stroke: var(--zh-card);
    stroke-width: 2.5;
    transition: transform 0.2s;
    transform-box: fill-box;
    transform-origin: center;
  }
  .node:hover .shape,
  .node.sel .shape {
    transform: scale(1.35);
  }
  .node.part .shape,
  .node.unclear .shape {
    stroke: var(--zh-part);
    stroke-dasharray: 3 2;
    stroke-width: 2;
  }
  .node.offline .shape,
  .node.ignored .shape {
    stroke-dasharray: 2 2;
    stroke: var(--zh-muted);
  }
  .st-ok {
    fill: var(--zh-good);
  }
  .node.orphan:not(.offline):not(.ignored) .shape {
    fill: var(--zh-card);
    stroke: var(--zh-good);
    stroke-width: 2;
    stroke-dasharray: 2.5 2;
  }
  .group-label {
    font-size: 11.5px;
    fill: var(--zh-muted);
    font-style: italic;
  }
  .st-weak {
    fill: var(--zh-ok);
  }
  .st-battery {
    fill: #f57c00;
  }
  .st-offline,
  .st-ignored {
    fill: var(--zh-muted);
  }
  .st-part_time_router {
    fill: color-mix(in srgb, var(--zh-part) 35%, var(--zh-card));
  }
  .st-unclear {
    fill: color-mix(in srgb, var(--zh-part) 18%, var(--zh-card));
  }
  .st-dead {
    fill: var(--zh-bad);
  }
  .pulse {
    fill: none;
    stroke-width: 2;
    animation: pulse 2.2s ease-out infinite;
    transform-box: fill-box;
    transform-origin: center;
  }
  @keyframes pulse {
    from {
      transform: scale(1);
      opacity: 0.8;
    }
    to {
      transform: scale(2.6);
      opacity: 0;
    }
  }
  .coord .shape {
    fill: var(--primary-color, #03a9f4);
  }
  .coord .glyph {
    fill: none;
    stroke: #fff;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
    pointer-events: none;
  }
  .label {
    font-size: 12px;
    fill: var(--zh-text);
    pointer-events: none;
    paint-order: stroke;
    stroke: var(--zh-card);
    stroke-width: 3px;
    stroke-linejoin: round;
  }
  .label.small {
    font-size: 10.5px;
    fill: var(--zh-muted);
  }
  .tip {
    position: absolute;
    z-index: 2;
    min-width: 180px;
    max-width: 260px;
    padding: 10px 12px;
    border-radius: 10px;
    background: var(--zh-card);
    border: 1px solid var(--zh-line);
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
    font-size: 12.5px;
    pointer-events: none;
    transform: translate(-50%, calc(-100% - 14px));
  }
  .tip b {
    display: block;
    font-size: 14px;
    margin-bottom: 2px;
  }
  .tip .k {
    color: var(--zh-muted);
  }
  .tip .row {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-top: 3px;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 1px 8px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 500;
    background: var(--zh-surface);
    margin: 2px 0 4px;
  }
  .pill i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    align-items: center;
    font-size: 12px;
    color: var(--zh-muted);
  }
  .legend svg {
    width: 16px;
    height: 16px;
    vertical-align: -3px;
    margin-right: 4px;
  }
  .legend .bar {
    display: inline-flex;
    height: 6px;
    width: 72px;
    border-radius: 3px;
    overflow: hidden;
    margin: 0 6px;
    vertical-align: 1px;
  }
  .legend .bar span {
    flex: 1;
  }
  .switch {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    user-select: none;
  }
  .switch input {
    accent-color: var(--primary-color, #03a9f4);
  }

  /* chips (dead strip, items) */
  .strip h4 {
    margin: 4px 0 8px;
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .strip h4 i {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--zh-bad);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chip {
    border: 1px solid var(--zh-line);
    border-radius: 999px;
    padding: 3px 10px;
    font-size: 12.5px;
    background: none;
    color: inherit;
    font-family: inherit;
    cursor: pointer;
  }
  .chip:hover {
    background: var(--zh-surface);
  }
  .chip span {
    color: var(--zh-muted);
    margin-left: 4px;
  }

  /* measures */
  .actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    counter-reset: action;
  }
  .action {
    display: grid;
    grid-template-columns: 40px 1fr;
    gap: 4px 12px;
    padding: 14px;
    border-radius: var(--zh-radius);
    background: var(--zh-surface);
  }
  .action .no {
    grid-row: span 3;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    color: #fff;
    background: var(--zh-bad);
  }
  .action:nth-child(2) .no {
    background: var(--zh-ok);
  }
  .action:nth-child(3) .no {
    background: var(--zh-info);
  }
  .action .t {
    font-weight: 600;
    font-size: 15px;
  }
  .action .h {
    color: var(--zh-muted);
    font-size: 13px;
  }
  .action .foot {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-top: 6px;
  }
  .btn {
    margin-left: auto;
    border: none;
    border-radius: 999px;
    padding: 7px 16px;
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    background: var(--primary-color, #03a9f4);
    color: var(--text-primary-color, #fff);
    cursor: pointer;
  }

  /* findings */
  .group h4 {
    margin: 6px 0;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--zh-muted);
  }
  .finding {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 12px;
    border-radius: 10px;
    border-left: 4px solid var(--sev);
    background: var(--zh-surface);
    margin-bottom: 6px;
    cursor: pointer;
  }
  .finding:hover {
    background: var(--zh-line);
  }
  .finding .ft {
    font-weight: 500;
  }
  .finding .fs {
    font-size: 12px;
    color: var(--zh-muted);
  }
  .sev-critical {
    --sev: var(--zh-bad);
  }
  .sev-warning {
    --sev: var(--zh-ok);
  }
  .sev-info {
    --sev: var(--zh-info);
  }

  /* rooms */
  .rooms {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
  }
  .room {
    padding: 12px 14px;
    border-radius: var(--zh-radius);
    background: var(--zh-surface);
  }
  .room .rh {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-weight: 600;
  }
  .room .rh span {
    font-size: 20px;
    font-variant-numeric: tabular-nums;
  }
  .bar {
    height: 6px;
    border-radius: 3px;
    background: var(--zh-line);
    overflow: hidden;
    margin: 8px 0;
  }
  .bar > div {
    height: 100%;
    border-radius: 3px;
    transition: width 0.8s ease;
  }
  .room .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: 12px;
    color: var(--zh-muted);
  }
  .room .stats b {
    color: var(--zh-text);
    font-weight: 600;
  }
  .room .rec {
    margin-top: 8px;
    font-size: 12.5px;
    color: var(--zh-ok);
  }

  /* live */
  .live-rate {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: var(--zh-text);
    font-variant-numeric: tabular-nums;
  }
  .live-rate i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--zh-good);
    animation: blink 1.6s ease-in-out infinite;
  }
  @keyframes blink {
    50% {
      opacity: 0.25;
    }
  }
  .spark {
    fill: var(--primary-color, #03a9f4);
    filter: drop-shadow(0 0 4px var(--primary-color, #03a9f4));
    pointer-events: none;
  }
  .spark.router {
    fill: var(--zh-good);
    filter: drop-shadow(0 0 4px var(--zh-good));
  }
  .heat {
    fill: var(--primary-color, #03a9f4);
    pointer-events: none;
    transition: r 0.9s ease, opacity 0.9s ease;
  }
  .pulse.alarm {
    stroke: var(--zh-bad);
    stroke-width: 3;
    animation-duration: 1.2s;
  }
  .alert {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    text-align: left;
    border: 1px solid color-mix(in srgb, var(--zh-bad) 45%, transparent);
    background: color-mix(in srgb, var(--zh-bad) 10%, var(--zh-card));
    color: var(--zh-text);
    border-radius: var(--zh-radius);
    padding: 10px 14px;
    font: inherit;
    cursor: pointer;
    animation: alert-in 0.4s ease both;
  }
  @keyframes alert-in {
    from {
      transform: translateY(-6px);
      opacity: 0;
    }
  }
  .alert .bolt {
    flex: none;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--zh-bad);
    color: #fff;
    animation: blink 1.2s ease-in-out infinite;
  }
  .alert .bolt svg {
    width: 20px;
    height: 20px;
  }
  .alert .at {
    display: flex;
    flex-direction: column;
    font-size: 13px;
    color: var(--zh-muted);
  }
  .alert .at b {
    color: var(--zh-text);
    font-size: 14.5px;
  }
  .switch.live {
    margin-left: auto;
  }
  .switch.live + .switch {
    margin-left: 0;
  }
  @media (prefers-reduced-motion: reduce) {
    .spark,
    .pulse,
    .alert .bolt,
    .live-rate i {
      animation: none;
      display: none;
    }
  }

  /* sidebar panel layout */
  .panel-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(340px, 420px);
    gap: 16px;
    height: 100%;
    align-items: start;
  }
  .panel-layout .map-card {
    height: 100%;
    min-height: 480px;
  }
  .map-wrap {
    height: 100%;
    box-sizing: border-box;
  }
  .map-wrap .mapbox {
    flex: 1;
    min-height: 0;
  }
  /* Fit the map into the free space (keeps its aspect ratio). */
  .map-wrap .map {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    max-height: none;
  }
  .map-wrap .strip {
    flex: none;
    max-height: 84px;
    overflow-y: auto;
  }
  .map-wrap .strip h4 {
    margin-top: 0;
  }
  .map-wrap .chip {
    padding: 2px 9px;
    font-size: 12px;
  }
  .side {
    display: flex;
    flex-direction: column;
    gap: 16px;
    height: 100%;
    min-height: 0;
  }
  .side-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
  .panel-layout.narrow {
    grid-template-columns: 1fr;
    height: auto;
  }
  .panel-layout.narrow .map-card {
    height: 78vh;
  }
  .panel-layout.narrow .side {
    height: auto;
  }
  .search {
    width: 100%;
    box-sizing: border-box;
    padding: 9px 14px;
    border-radius: 999px;
    border: 1px solid var(--zh-line);
    background: var(--zh-surface);
    color: var(--zh-text);
    font: inherit;
  }
  .search:focus-visible {
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: 1px;
  }
  .devlist {
    display: flex;
    flex-direction: column;
  }
  .dev {
    display: grid;
    grid-template-columns: 14px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    padding: 9px 4px;
    border: none;
    border-bottom: 1px solid var(--zh-line);
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .dev:hover {
    background: var(--zh-surface);
  }
  .dev .dot {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: currentColor;
  }
  .dev .dot.router {
    border-radius: 3px;
  }
  .dev .dot.st-ok { color: var(--zh-good); }
  .dev .dot.st-weak { color: var(--zh-ok); }
  .dev .dot.st-battery { color: #f57c00; }
  .dev .dot.st-offline, .dev .dot.st-ignored { color: var(--zh-muted); }
  .dev .dot.st-part_time_router, .dev .dot.st-unclear { color: var(--zh-part); }
  .dev .dot.st-dead { color: var(--zh-bad); }
  .dev .dn,
  .dev .dm {
    display: flex;
    flex-direction: column;
    min-width: 0;
    font-size: 12px;
    color: var(--zh-muted);
  }
  .dev .dn b {
    font-size: 14px;
    font-weight: 500;
    color: var(--zh-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dev .dm {
    text-align: right;
    align-items: flex-end;
    font-variant-numeric: tabular-nums;
  }
  .lqi-t.lqi-good { color: var(--zh-good); }
  .lqi-t.lqi-ok { color: var(--zh-ok); }
  .lqi-t.lqi-bad { color: var(--zh-bad); }

  /* map / floor plan switch */
  .viewswitch {
    display: inline-flex;
    align-self: flex-start;
    padding: 3px;
    border-radius: 999px;
    background: var(--zh-surface);
    flex: none;
  }
  .viewswitch button {
    border: none;
    background: none;
    color: var(--zh-muted);
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    padding: 5px 14px;
    border-radius: 999px;
    cursor: pointer;
  }
  .viewswitch button.on {
    background: var(--zh-card);
    color: var(--zh-text);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  }
  zigbee-health-floor {
    min-height: 420px;
  }

  /* network check */
  .checkbtn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 38px;
    padding: 0 14px 0 11px;
    border: none;
    border-radius: 999px;
    background: var(--primary-color, #03a9f4);
    color: var(--text-primary-color, #fff);
    font: inherit;
    font-size: 13.5px;
    font-weight: 500;
    cursor: pointer;
    flex: none;
    box-shadow: 0 2px 10px color-mix(in srgb, var(--primary-color, #03a9f4) 40%, transparent);
  }
  .checkbtn svg {
    width: 19px;
    height: 19px;
  }
  .map.checking {
    opacity: 0.35;
    transition: opacity 0.4s;
  }
  .check-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3;
  }
  .radar {
    position: absolute;
    left: 50%;
    top: 50%;
    height: 86%;
    max-width: 100%;
    aspect-ratio: 1;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    overflow: hidden;
    pointer-events: none;
  }
  .radar .sweep {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      transparent 0deg,
      transparent 280deg,
      color-mix(in srgb, var(--primary-color, #03a9f4) 12%, transparent) 320deg,
      color-mix(in srgb, var(--primary-color, #03a9f4) 55%, transparent) 360deg
    );
    animation: spin 2.2s linear infinite;
  }
  .steps {
    position: relative;
    list-style: none;
    margin: 0;
    padding: 16px 20px;
    border-radius: 14px;
    background: color-mix(in srgb, var(--zh-card) 88%, transparent);
    backdrop-filter: blur(6px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.18);
    min-width: 260px;
  }
  .steps li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 0;
    color: var(--zh-muted);
    font-size: 14px;
    transition: color 0.3s;
  }
  .steps li i {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid var(--zh-line);
    box-sizing: border-box;
    flex: none;
  }
  .steps li.run {
    color: var(--zh-text);
  }
  .steps li.run i {
    border-color: var(--primary-color, #03a9f4);
    border-right-color: transparent;
    animation: spin 0.8s linear infinite;
  }
  .steps li.done {
    color: var(--zh-text);
  }
  .steps li.done i {
    border-color: var(--zh-good);
    background: var(--zh-good);
    box-shadow: inset 0 0 0 3px var(--zh-card);
  }
  .check-overlay.reveal {
    background: color-mix(in srgb, var(--zh-card) 72%, transparent);
    backdrop-filter: blur(3px);
    animation: fade-in 0.4s ease both;
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
  }
  .verdict {
    text-align: center;
    max-width: 440px;
    padding: 24px;
    animation: rise 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }
  @keyframes rise {
    from {
      transform: translateY(18px) scale(0.96);
      opacity: 0;
    }
  }
  .verdict .big {
    font-size: 88px;
    font-weight: 700;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.03em;
  }
  .verdict .of {
    color: var(--zh-muted);
    margin-top: 2px;
  }
  .verdict .lvl {
    font-size: 20px;
    font-weight: 600;
    margin-top: 6px;
  }
  .verdict .lead {
    margin: 18px 0 6px;
    font-weight: 500;
  }
  .verdict ol {
    text-align: left;
    margin: 0 auto 10px;
    padding-left: 22px;
    display: inline-block;
  }
  .verdict ol li {
    margin: 5px 0;
  }
  .verdict .row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin-top: 14px;
  }
  .verdict .row .btn {
    margin-left: 0;
  }
  .btn.ghost {
    background: var(--zh-surface);
    color: var(--zh-text);
  }
  .muted {
    color: var(--zh-muted);
    font-size: 13px;
  }

  /* waiting for the first analysis */
  .waiting {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 28px 16px;
    gap: 4px;
  }
  .waiting-card {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .waiting h3 {
    margin: 18px 0 4px;
    font-size: 20px;
    font-weight: 500;
  }
  .waiting p {
    margin: 0;
  }
  .waiting .btn {
    margin: 16px 0 0;
  }
  .radar.big {
    position: relative;
    left: auto;
    top: auto;
    transform: none;
    width: min(320px, 70vw);
    height: auto;
    border: 1px solid var(--zh-line);
  }
  .radar .rings {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: repeating-radial-gradient(
      circle,
      transparent 0 17%,
      var(--zh-line) 17% calc(17% + 1px)
    );
  }
  .radar .core {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 44px;
    height: 44px;
    margin: -22px 0 0 -22px;
    border-radius: 50%;
    background: var(--primary-color, #03a9f4);
    color: #fff;
    font-weight: 700;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* router planner */
  .plans {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .plan-intro {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 4px;
  }
  .plan-intro b {
    font-size: 15px;
  }
  .plan-intro span {
    color: var(--zh-muted);
    font-size: 13px;
  }
  .plan {
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    padding: 12px;
    border-radius: var(--zh-radius);
    border: 1px solid var(--zh-line);
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
  }
  .plan:hover {
    background: var(--zh-surface);
  }
  .plan.on {
    border-color: var(--zh-good);
    background: color-mix(in srgb, var(--zh-good) 9%, transparent);
  }
  .plan .rank {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--zh-surface);
    font-weight: 700;
  }
  .plan.best .rank {
    background: var(--zh-good);
    color: #fff;
  }
  .plan .pb {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    font-size: 12.5px;
    color: var(--zh-muted);
  }
  .plan .pb b {
    font-size: 15px;
    color: var(--zh-text);
  }
  .plan .pb em {
    font-style: normal;
    font-size: 11px;
    font-weight: 600;
    margin-left: 8px;
    padding: 1px 7px;
    border-radius: 999px;
    background: var(--zh-good);
    color: #fff;
    vertical-align: 2px;
  }
  .plan .res {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 3px;
  }
  .plan .res .chip {
    cursor: default;
    font-size: 11.5px;
    padding: 1px 8px;
  }
  .plan .ps {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-variant-numeric: tabular-nums;
  }
  .plan .ps .room {
    font-size: 16px;
    white-space: nowrap;
  }
  .plan .ps .room b {
    color: var(--zh-good);
    font-size: 20px;
  }
  .plan .ps .k {
    font-size: 11px;
    color: var(--zh-muted);
  }
  .plan .ps .net {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--zh-good);
  }
  .toast {
    position: fixed;
    left: 50%;
    bottom: calc(24px + env(safe-area-inset-bottom, 0px));
    transform: translateX(-50%);
    z-index: 30;
    background: var(--zh-text);
    color: var(--zh-card);
    padding: 10px 16px;
    border-radius: 10px;
    font-size: 14px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
    animation: alert-in 0.3s ease both;
  }
  .strip.marked {
    border-radius: 10px;
    box-shadow: 0 0 0 2px var(--primary-color, #03a9f4);
    padding: 8px 10px;
  }
  .strip .chip.on {
    background: var(--zh-bad);
    border-color: var(--zh-bad);
    color: #fff;
  }
  .strip .chip.on span {
    color: rgba(255, 255, 255, 0.85);
  }
  .plan-banner.focus-banner {
    background: color-mix(in srgb, var(--primary-color, #03a9f4) 10%, var(--zh-card));
    border-color: color-mix(in srgb, var(--primary-color, #03a9f4) 45%, transparent);
  }
  .plan-banner.focus-banner .pi {
    background: var(--primary-color, #03a9f4);
  }
  .action .foot .grow {
    flex: 1;
  }
  .action .foot .btn.on {
    box-shadow: 0 0 0 2px var(--zh-card), 0 0 0 4px var(--primary-color, #03a9f4);
  }
  .plan-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: var(--zh-radius);
    background: color-mix(in srgb, var(--zh-good) 12%, var(--zh-card));
    border: 1px solid color-mix(in srgb, var(--zh-good) 45%, transparent);
    animation: alert-in 0.4s ease both;
  }
  .plan-banner .pi {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    background: var(--zh-good);
    color: #fff;
    font-size: 22px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
  }
  .plan-banner .pt {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    font-size: 12.5px;
    color: var(--zh-muted);
  }
  .plan-banner .pt b {
    color: var(--zh-text);
    font-size: 14.5px;
  }
  .plan-banner .btn {
    margin-left: 0;
  }
  .planned-edge {
    stroke: var(--zh-good);
    stroke-width: 2.6;
    stroke-dasharray: 7 6;
    fill: none;
    animation: march 0.9s linear infinite;
  }
  @keyframes march {
    to {
      stroke-dashoffset: -13;
    }
  }
  .virtual {
    fill: var(--zh-good);
    stroke: var(--zh-card);
    stroke-width: 3;
  }
  .virtual-plus {
    stroke: #fff;
    stroke-width: 3;
    stroke-linecap: round;
  }
  .plan-pulse {
    stroke: var(--zh-good);
  }
  .plan-label {
    font-weight: 600;
    fill: var(--zh-good);
  }
  .map-wrap .plan-banner {
    flex: none;
  }

  .empty {
    text-align: center;
    color: var(--zh-muted);
    padding: 28px 12px;
  }
`;var ai=1800,li=500,G="coordinator",U=1e3,wt=560,Te=Math.cos(Math.PI/6);function di(d){history.pushState(null,"",d),window.dispatchEvent(new CustomEvent("location-changed",{detail:{replace:!1}}))}async function ci(d){let o=URL.createObjectURL(d);try{let e=await new Promise((r,s)=>{let a=new Image;a.onload=()=>r(a),a.onerror=()=>s(new Error("image")),a.src=o}),t=Math.min(1,ai/Math.max(e.naturalWidth,e.naturalHeight)),i=document.createElement("canvas");i.width=Math.round(e.naturalWidth*t),i.height=Math.round(e.naturalHeight*t);let n=i.getContext("2d");return n.fillStyle="#ffffff",n.fillRect(0,0,i.width,i.height),n.drawImage(e,0,0,i.width,i.height),i.toDataURL("image/jpeg",.86)}finally{URL.revokeObjectURL(o)}}function kt(d){return new Promise(o=>{let e=new Image;e.onload=()=>o({w:e.naturalWidth||1600,h:e.naturalHeight||1e3}),e.onerror=()=>o({w:1600,h:1e3}),e.src=d})}var S=class extends T{constructor(){super(...arguments);this.heat={};this.alerts=[];this.t=e=>e;this.live=!0;this._building=!1;this._edit=!1;this._busy=!1;this._confirmDelete=!1;this._allFloors=!1;this._sizes={};this._tip={x:0,y:0}}firstUpdated(){this._load()}updated(e){e.has("configEntryId")&&e.get("configEntryId")!==void 0&&this._load()}get _admin(){return this.hass?.user?.is_admin??!0}get _floors(){return this.report?.topology?.floors??[]}_message(e,t={}){let i={type:`zigbee_health/floorplan/${e}`,...t};return this.configEntryId&&(i.config_entry_id=this.configEntryId),i}async _load(){if(this.hass)try{let e=await this.hass.callWS(this._message("list"));for(let t of e.plans)this._sizes[t.plan_id]=await kt(t.image);this._plans=e.plans,(!this._active||!e.plans.some(t=>t.plan_id===this._active))&&(this._active=this._sorted[0]?.plan_id)}catch(e){this._plans=[],this._error=String(e?.message??e)}}_level(e){if(typeof e.level=="number")return e.level;let t=this._floors.find(i=>i.floor_id===e.floor_id);return t&&typeof t.level=="number"?t.level:(this._plans??[]).indexOf(e)}get _sorted(){return[...this._plans??[]].sort((e,t)=>this._level(e)-this._level(t))}get _current(){return this._plans?.find(e=>e.plan_id===this._active)}_key(e){return e===this.report?.topology?.coordinator?.ieee?G:e}_planOf(e){let t=this._key(e);return this._plans?.find(i=>t in i.positions)}_posOn(e,t){let i=this._sizes[e.plan_id],n=e.positions[this._key(t)];return!i||!n?null:{x:n[0]*i.w,y:n[1]*i.h}}_pos(e){let t=this._current;return t?this._posOn(t,e):null}_iso(e){let t=this._planOf(e);if(!t)return null;let i=this._sizes[t.plan_id],n=t.positions[this._key(e)];if(!i||!n)return null;let r=U*i.h/i.w,s=n[0]*U-U/2,a=n[1]*r-r/2,c=this._sorted.indexOf(t);return{x:(s-a)*Te,y:(s+a)*.5-c*wt}}_nextFreeFloor(){let e=new Set((this._plans??[]).map(t=>t.floor_id));return[...this._floors].sort((t,i)=>(t.level??0)-(i.level??0)).find(t=>!e.has(t.floor_id))}async _upload(e,t){let i=e.target,n=i.files?.[0];if(i.value="",!(!n||!this.hass)){this._busy=!0,this._error=void 0;try{let r=await ci(n),s=t??`plan_${Date.now().toString(36)}`,a={};if(!t){let p=this._nextFreeFloor();a.name=p?.name??this.t("floor.default_name",{n:(this._plans?.length??0)+1}),p&&(a.floor_id=p.floor_id,typeof p.level=="number"&&(a.level=p.level))}let c=await this.hass.callWS(this._message("save",{plan_id:s,image:r,...a}));this._sizes[s]=await kt(c.plan.image);let l=(this._plans??[]).filter(p=>p.plan_id!==s);this._plans=[...l,c.plan],this._active=s,this._building=!1,this._edit=!0}catch(r){this._error=String(r?.message??r)}finally{this._busy=!1}}}_update(e,t,i){let n={...e,...t};this._plans=(this._plans??[]).map(r=>r.plan_id===e.plan_id?n:r),this.hass?.callWS(this._message("save",{plan_id:e.plan_id,...i}))}_setPosition(e,t){let i=this._current;if(!i)return;let n={...i.positions};t?n[e]=t:delete n[e];let r={...i,positions:n};this._plans=(this._plans??[]).map(s=>s.plan_id===i.plan_id?r:s),window.clearTimeout(this._saveTimer),this._saveTimer=window.setTimeout(()=>{this.hass?.callWS(this._message("save",{plan_id:i.plan_id,positions:r.positions}))},li)}_linkFloor(e,t){let i=this._floors.find(s=>s.floor_id===t),n={floor_id:t||null},r={floor_id:t};i&&(n.name=i.name,r.name=i.name,typeof i.level=="number"&&(n.level=i.level,r.level=i.level)),this._update(e,n,r)}async _delete(){let e=this._current;if(!(!e||!this.hass)){if(!this._confirmDelete){this._confirmDelete=!0;return}this._confirmDelete=!1,await this.hass.callWS(this._message("delete",{plan_id:e.plan_id})),this._plans=(this._plans??[]).filter(t=>t.plan_id!==e.plan_id),this._active=this._sorted[0]?.plan_id,this._edit=!1}}_point(e){let t=this.renderRoot.querySelector(".floorbox svg"),i=this._current;if(!t||!i)return null;let n=this._sizes[i.plan_id],r=t.getScreenCTM();if(!r||!n)return null;let s=new DOMPoint(e.clientX,e.clientY).matrixTransform(r.inverse());return s.x<0||s.y<0||s.x>n.w||s.y>n.h?null:[s.x/n.w,s.y/n.h]}get _nodes(){return new Map((this.report?.topology?.nodes??[]).map(e=>[e.ieee,e]))}get _edges(){let e=this.report?.topology,t=(e?.links??[]).map(i=>({from:i.a,to:i.b,lqi:i.lqi,kind:"link"}));for(let i of e?.nodes??[])i.type==="end_device"&&i.parent&&i.state!=="dead"&&t.push({from:i.ieee,to:i.parent,lqi:i.parent_lqi,kind:"parent"});return t}_name(e){return e===this.report?.topology?.coordinator?.ieee?this.t("coordinator"):this._nodes.get(e)?.name??e}spark(e,t){let i=this.renderRoot.querySelector("g.traffic");if(!i||!this.layout)return;let n=K(this.layout,e),r=[],s;if(this._building){for(let m of n){let v=this._iso(m);v&&r.push(v)}s=1.5}else{let m=this._current;if(!m)return;for(let w of n){let M=this._posOn(m,w);if(M){r.push(M);continue}let x=this._planOf(w),R=r[r.length-1];x&&R&&r.push(this._portalPoint(m,x,R));break}let v=this._sizes[m.plan_id];s=Math.max(v.w,v.h)/900}if(r.length<2)return;let a=0;for(let m=1;m<r.length;m++)a+=Math.hypot(r[m].x-r[m-1].x,r[m].y-r[m-1].y);let c=Math.max(.7,a/(240*s)),l="http://www.w3.org/2000/svg",p=document.createElementNS(l,"circle");p.setAttribute("r",String(5*s)),p.setAttribute("class","spark");let _=document.createElementNS(l,"animateMotion");_.setAttribute("dur",`${c}s`),_.setAttribute("fill","freeze"),_.setAttribute("begin","indefinite"),_.setAttribute("path",`M${r.map(m=>`${m.x},${m.y}`).join(" L")}`),p.appendChild(_),window.setTimeout(()=>{i.appendChild(p),_.beginElement(),window.setTimeout(()=>p.remove(),c*1e3+60)},t)}_portalPoint(e,t,i){let n=this._sizes[e.plan_id],r=Math.max(n.w,n.h)/900,s=this._level(t)>this._level(e);return{x:i.x+26*r,y:i.y+(s?-58:58)*r}}render(){let e=this.t;if(!this._plans)return h`<div class="empty">${e("loading")}</div>`;let t=this._current;return t?h`${this._renderBar(t)}
      ${this._building?this._renderBuilding():this._renderPlan(t)}
      ${this._building?u:this._renderBelow(t)}
      ${this._error?h`<div class="err">${this._error}</div>`:u}`:this._renderUpload()}_renderUpload(){let e=this.t;return h`<div class="upload">
      <h3>${e("floor.empty_title")}</h3>
      <p>${e("floor.empty_text")}</p>
      ${this._admin?h`<label class="filebtn btn"
            >${this._busy?e("floor.uploading"):e("floor.upload")}
            <input type="file" accept="image/*" @change=${t=>this._upload(t)}
          /></label>`:h`<p>${e("floor.admin_only")}</p>`}
      ${this._error?h`<div class="err">${this._error}</div>`:u}
    </div>`}_renderBar(e){let t=this.t,i=[...this._sorted].reverse();return h`<div class="fbar">
      ${i.length>1?h`<button
            class="ftab building ${this._building?"on":""}"
            @click=${()=>{this._building=!this._building,this._edit=!1}}
          >
            ${y`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3 21 8 12 13 3 8z"/><path d="M3 12l9 5 9-5"/><path d="M3 16l9 5 9-5"/></svg>`}${t("floor.building")}
          </button>`:u}
      ${i.map(n=>h`<button
          class="ftab ${!this._building&&n.plan_id===e.plan_id?"on":""}"
          @click=${()=>{this._active=n.plan_id,this._building=!1,this._selected=void 0,this._confirmDelete=!1}}
        >
          ${n.name}
        </button>`)}
      ${this._admin&&this._edit?h`<label class="ftab filebtn"
            >+ ${t("floor.add")}
            <input type="file" accept="image/*" @change=${n=>this._upload(n)}
          /></label>`:u}
      <span class="spacer"></span>
      ${this._admin&&!this._building?h`<button
            class="ftab edit ${this._edit?"on":""}"
            @click=${()=>{this._edit=!this._edit,this._placing=void 0,this._selected=void 0,this._confirmDelete=!1}}
          >
            ${this._edit?t("floor.done"):t("floor.edit")}
          </button>`:u}
    </div>`}_renderPlan(e){let t=this._sizes[e.plan_id]??{w:1600,h:1e3},i=Math.max(t.w,t.h)/900,n=this.report?.topology?.coordinator?.ieee,r=Object.keys(e.positions).map(l=>l===G?n??l:l),s=this.plan?new Set(this.plan.improved.map(l=>l.ieee)):void 0,a=[],c=[];for(let l of this._edges){let p=this._posOn(e,l.from),_=this._posOn(e,l.to);if(p&&_){a.push({a:p,b:_,lqi:l.lqi,kind:l.kind});continue}let m=p??_,v=p?l.to:l.from,w=this._planOf(v);!m||!w||w.plan_id===e.plan_id||l.kind==="link"&&!c.every(M=>M.peer!==v)||c.push({from:m,at:this._portalPoint(e,w,m),peer:v,other:w,lqi:l.lqi})}return h`<div class="floorbox ${this._placing?"placing":""}">
      <svg
        viewBox="0 0 ${t.w} ${t.h}"
        class=${s?"dim":""}
        @dragover=${l=>l.preventDefault()}
        @drop=${l=>{l.preventDefault();let p=l.dataTransfer?.getData("text/plain"),_=this._point(l);p&&_&&this._setPosition(p,_),this._placing=void 0}}
        @click=${l=>{if(!this._edit||!this._placing)return;let p=this._point(l);p&&this._setPosition(this._placing,p),this._placing=void 0}}
        @pointermove=${l=>{if(!this._drag)return;let p=this._point(l);p&&this._setPosition(this._drag,p)}}
        @pointerup=${()=>this._drag=void 0}
        @pointerleave=${()=>{this._drag=void 0,this._hover=void 0}}
      >
        <image class="plan-img" href=${e.image} x="0" y="0" width=${t.w} height=${t.h}></image>
        ${a.map(l=>y`<path class="edge ${l.kind} lqi-${q(l.lqi)}" d="M${l.a.x},${l.a.y} L${l.b.x},${l.b.y}"></path>`)}
        ${c.map(l=>this._renderPortal(e,l,i))}
        ${this._renderPlanOverlay(i)}
        ${r.map(l=>this._renderDevice(l,this._pos(l),i,s,this._edit))}
        <g class="traffic"></g>
      </svg>
      ${this._renderTip()}
    </div>`}_renderPortal(e,t,i){let r=this._level(t.other)>this._level(e)?"M-6,3 L0,-4 L6,3":"M-6,-3 L0,4 L6,-3",s=`${t.other.name} \xB7 ${this._name(t.peer)}${t.lqi?` \xB7 ${t.lqi}`:""}`;return y`<path class="portal-stub lqi-${q(t.lqi)}" d="M${t.from.x},${t.from.y} L${t.at.x},${t.at.y}"></path>
      <g
        class="portal"
        transform="translate(${t.at.x} ${t.at.y}) scale(${i})"
        @click=${a=>{a.stopPropagation(),this._active=t.other.plan_id,this._hover=void 0}}
      >
        <circle r="11"></circle>
        <path class="arrow" d=${r}></path>
        <text class="label small" x="16" y="4">${s}</text>
      </g>`}_startDrag(e,t){this._edit&&(e.stopPropagation(),this._drag=t,this._selected=t,this._confirmDelete=!1)}_renderDevice(e,t,i,n,r){if(!t)return u;let s=this.report?.topology?.coordinator?.ieee;if(e===s||e===G)return y`<g
        class="node coord ${r?"edit":""} ${this._selected===G?"selected":""}"
        transform="translate(${t.x} ${t.y}) scale(${i})"
        @pointerdown=${x=>r&&this._startDrag(x,G)}
      >
        <circle class="shape" r="18"></circle>
        <path class="glyph" d="M-7,-6 h14 l-14,12 h14"></path>
      </g>`;let a=this._nodes.get(e);if(!a)return u;let c=a.type==="router",l=c?20:14,p=this.live?this.heat[a.ieee]??0:0,_=this.alerts.some(x=>x.ieee===a.ieee),m=a.kind==="part_time"?"part":a.kind==="unclear"?"unclear":"",v=a.kind==="unclear"&&a.state==="ok"?"unclear":a.state,w=!n||n.has(a.ieee),M=a.name.length>20?`${a.name.slice(0,19)}\u2026`:a.name;return y`<g
      class="node ${m} ${a.state} ${w&&n?"hl":""} ${r?"edit":""} ${this._drag===a.ieee?"drag":""} ${this._selected===a.ieee?"selected":""}"
      transform="translate(${t.x} ${t.y}) scale(${i})"
      @pointerdown=${x=>r&&this._startDrag(x,a.ieee)}
      @mouseenter=${x=>{if(this._edit)return;let R=this.renderRoot.querySelector(".floorbox").getBoundingClientRect();this._tip={x:x.clientX-R.left,y:x.clientY-R.top},this._hover=a.ieee}}
      @mouseleave=${()=>this._hover=void 0}
      @click=${x=>{if(this._edit){x.stopPropagation();return}a.device_id&&di(`/config/devices/device/${a.device_id}`)}}
    >
      ${p>.05?y`<circle class="heat" r=${l/2+3+p*6} style="opacity:${.12+p*.33}"></circle>`:u}
      ${_?y`<circle class="pulse alarm" r=${l/2}></circle>`:u}
      ${c?y`<rect class="shape st-${v}" x=${-l/2} y=${-l/2} width=${l} height=${l} rx="5"></rect>`:y`<circle class="shape st-${v}" r=${l/2}></circle>`}
      <text class="label small" y=${l/2+13} text-anchor="middle">${M}</text>
    </g>`}_renderBuilding(){let e=this._sorted,t=1.5,i=this.plan?new Set(this.plan.improved.map(v=>v.ieee)):void 0,n=1/0,r=1/0,s=-1/0,a=-1/0,c=e.map((v,w)=>{let M=this._sizes[v.plan_id]??{w:1600,h:1e3},x=U*M.h/M.w,R=-w*wt,L=[[-U/2,-x/2],[U/2,-x/2],[U/2,x/2],[-U/2,x/2]].map(([P,N])=>({x:(P-N)*Te,y:(P+N)*.5+R}));for(let P of L)n=Math.min(n,P.x),r=Math.min(r,P.y),s=Math.max(s,P.x),a=Math.max(a,P.y);return{plan:v,height:x,oy:R,corners:L}}),l=70,p=`${n-l} ${r-l} ${s-n+2*l} ${a-r+2*l}`,_=this._edges.map(v=>({e:v,a:this._iso(v.from),b:this._iso(v.to)})).filter(v=>!!v.a&&!!v.b),m=[...new Set(e.flatMap(v=>Object.keys(v.positions)))].map(v=>v===G?this.report?.topology?.coordinator?.ieee??v:v);return h`<div class="floorbox iso">
      <svg viewBox=${p} class=${i?"dim":""} @pointerleave=${()=>this._hover=void 0}>
        ${c.map(({plan:v,height:w,oy:M,corners:x})=>y`
            <g transform="matrix(${Te} 0.5 ${-Te} 0.5 0 ${M})">
              <image class="plan-img" href=${v.image} x=${-U/2} y=${-w/2} width=${U} height=${w} preserveAspectRatio="none"></image>
            </g>
            <polygon class="plane" points=${x.map(R=>`${R.x},${R.y}`).join(" ")}></polygon>
            <text class="plane-label" x=${x[3].x-20} y=${x[3].y} text-anchor="end">${v.name}</text>`)}
        ${_.map(({e:v,a:w,b:M})=>{let x=this._planOf(v.from)?.plan_id!==this._planOf(v.to)?.plan_id;return y`<path class="edge ${v.kind} ${x?"cross":""} lqi-${q(v.lqi)}" d="M${w.x},${w.y} L${M.x},${M.y}"></path>`})}
        ${m.map(v=>this._renderDevice(v,this._iso(v),t,i,!1))}
        <g class="traffic"></g>
      </svg>
      ${this._renderTip()}
    </div>`}_renderPlanOverlay(e){let t=this.plan;if(!t)return u;let i=t.improved.map(s=>this._pos(s.ieee)).filter(s=>!!s);if(!i.length)return u;let n=i.reduce((s,a)=>s+a.x,0)/i.length,r=i.reduce((s,a)=>s+a.y,0)/i.length;return y`<g class="plan-layer">
      ${i.map(s=>y`<path class="planned-edge" d="M${s.x},${s.y} L${n},${r}"></path>`)}
      <g transform="translate(${n} ${r}) scale(${e})">
        <circle class="pulse plan-pulse" r="13"></circle>
        <rect class="virtual" x="-14" y="-14" width="28" height="28" rx="7"></rect>
        <path class="virtual-plus" d="M-6,0 h12 M0,-6 v12"></path>
        <text class="label plan-label" y="32" text-anchor="middle">${this.t("plan.virtual",{room:t.area_name})}</text>
      </g>
    </g>`}_renderTip(){if(!this._hover||this._edit)return u;let e=this._nodes.get(this._hover);if(!e)return u;let t=this.t,i=e.parent?this._name(e.parent):void 0,n=e.parent?this._planOf(e.parent):void 0,r=this._planOf(e.ieee),s=n&&r&&n.plan_id!==r.plan_id;return h`<div class="tip" style="left:${this._tip.x}px;top:${this._tip.y}px">
      <b>${e.name}</b>
      <div class="k">${e.type==="router"?t(`kind.${e.kind??"always_on"}`):t("end_device")}${e.area?` \xB7 ${e.area}`:""}</div>
      <span class="pill">${t(`state.${e.state}`)}</span>
      ${i?h`<div class="row"><span class="k">${t("parent")}</span><span>${i}${s?` (${n.name})`:""}${e.parent_lqi?` \xB7 LQI ${e.parent_lqi}`:""}</span></div>`:u}
    </div>`}_renderBelow(e){let t=this.t,i=this.report?.topology,n=new Set((this._plans??[]).flatMap(m=>Object.keys(m.positions))),r=e.floor_id,s=(i?.nodes??[]).filter(m=>!n.has(m.ieee)),a=m=>!r||!m.floor_id||m.floor_id===r,c=this._allFloors||!r?s:s.filter(a),l=s.length-c.length,p=[...i?.coordinator&&!n.has(G)?[{id:G,name:t("coordinator"),other:!1}]:[],...c.sort((m,v)=>+!a(m)-+!a(v)||m.name.localeCompare(v.name,void 0,{numeric:!0})).map(m=>({id:m.ieee,name:m.name,other:!a(m)}))];if(!this._edit){let m=s.length+(n.has(G)?0:1);return m&&this._admin?h`<div class="hint">${t("floor.unplaced_hint",{n:m})}</div>`:u}let _=this._selected===G?t("coordinator"):this._nodes.get(this._selected??"")?.name;return h`
      ${this._selected&&_?h`<div class="selbar">
            <b>${_}</b>
            <button class="btn ghost" @click=${()=>{this._setPosition(this._selected,null),this._selected=void 0}}>${t("floor.remove")}</button>
          </div>`:u}
      <div class="unplaced">
        <h4>
          ${t("floor.unplaced",{n:p.length})}
          ${r?h`<label
                ><input
                  type="checkbox"
                  .checked=${this._allFloors}
                  @change=${m=>this._allFloors=m.target.checked}
                />${t("floor.all_floors",{n:l})}</label
              >`:u}
        </h4>
        <div class="hint">${t("floor.place_hint")}</div>
        <div class="chips">
          ${p.map(m=>h`<button
              class="chip ${this._placing===m.id?"on":""} ${m.other?"other":""}"
              draggable="true"
              @dragstart=${v=>{v.dataTransfer?.setData("text/plain",m.id),this._placing=m.id}}
              @click=${()=>this._placing=this._placing===m.id?void 0:m.id}
            >
              ${m.name}
            </button>`)}
        </div>
      </div>
      <div class="fbar">
        <input
          id="zh-floor-name"
          class="nameinput"
          .value=${e.name}
          @change=${m=>{let v=m.target.value.trim();v&&this._update(e,{name:v},{name:v})}}
        />
        ${this._floors.length?h`<select
              id="zh-floor-link"
              class="floorselect"
              @change=${m=>this._linkFloor(e,m.target.value)}
            >
              <option value="" ?selected=${!e.floor_id}>${t("floor.no_link")}</option>
              ${this._floors.map(m=>h`<option value=${m.floor_id} ?selected=${e.floor_id===m.floor_id}>
                  ${t("floor.linked",{name:m.name})}
                </option>`)}
            </select>`:u}
        <label class="ftab filebtn"
          >${t("floor.replace")}
          <input type="file" accept="image/*" @change=${m=>this._upload(m,e.plan_id)}
        /></label>
        <button class="ftab" @click=${()=>this._delete()}>
          ${this._confirmDelete?t("floor.confirm_delete"):t("floor.delete")}
        </button>
      </div>
    `}};S.styles=[V,F`
      :host {
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-height: 0;
        flex: 1;
      }
      .fbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
      }
      .fbar .spacer {
        flex: 1;
      }
      .ftab {
        border: 1px solid var(--zh-line);
        background: none;
        color: var(--zh-text);
        font: inherit;
        font-size: 13px;
        padding: 5px 12px;
        border-radius: 999px;
        cursor: pointer;
      }
      .ftab.on {
        background: var(--primary-color, #03a9f4);
        border-color: transparent;
        color: var(--text-primary-color, #fff);
      }
      .ftab.edit.on {
        background: var(--zh-ok);
      }
      .ftab.building {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .ftab.building svg {
        width: 16px;
        height: 16px;
      }
      .nameinput,
      .floorselect {
        font: inherit;
        font-size: 13px;
        padding: 5px 10px;
        border-radius: 999px;
        border: 1px solid var(--zh-line);
        background: var(--zh-surface);
        color: var(--zh-text);
      }
      .nameinput {
        width: 130px;
      }
      .floorbox {
        position: relative;
        flex: 1;
        min-height: 260px;
        border-radius: 10px;
        overflow: hidden;
        background: var(--zh-surface);
      }
      .floorbox svg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        touch-action: none;
      }
      .floorbox.placing svg {
        cursor: crosshair;
      }
      .plan-img {
        opacity: 0.92;
      }
      .iso .plan-img {
        opacity: 0.62;
      }
      .plane {
        fill: none;
        stroke: var(--zh-muted);
        stroke-width: 2;
        vector-effect: non-scaling-stroke;
        opacity: 0.6;
      }
      .plane-label {
        font-size: 30px;
        font-weight: 600;
        fill: var(--zh-text);
        paint-order: stroke;
        stroke: var(--zh-card);
        stroke-width: 6px;
      }
      .edge {
        vector-effect: non-scaling-stroke;
        animation: none;
      }
      .edge.link {
        stroke-width: 1.4;
        opacity: 0.35;
      }
      .edge.parent {
        stroke-width: 2.2;
      }
      .edge.cross {
        stroke-width: 3;
        stroke-dasharray: 6 5;
        opacity: 0.95;
      }
      .planned-edge {
        vector-effect: non-scaling-stroke;
      }
      .portal {
        cursor: pointer;
      }
      .portal circle {
        fill: var(--zh-card);
        stroke: var(--zh-part);
        stroke-width: 2.5;
      }
      .portal path.arrow {
        fill: none;
        stroke: var(--zh-part);
        stroke-width: 3;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .portal-stub {
        fill: none;
        stroke-width: 2.4;
        stroke-dasharray: 5 5;
        vector-effect: non-scaling-stroke;
      }
      .portal .label {
        fill: var(--zh-part);
        font-weight: 600;
      }
      .node.edit {
        cursor: grab;
      }
      .node.drag {
        cursor: grabbing;
      }
      .node.selected .shape {
        stroke: var(--primary-color, #03a9f4);
        stroke-width: 3.5;
      }
      .upload {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: 10px;
        padding: 30px 20px;
        border: 2px dashed var(--zh-line);
        border-radius: 14px;
      }
      .upload h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 500;
      }
      .upload p {
        margin: 0;
        color: var(--zh-muted);
        max-width: 50ch;
        font-size: 13.5px;
      }
      .filebtn input {
        display: none;
      }
      .filebtn {
        display: inline-block;
        cursor: pointer;
      }
      .unplaced h4 {
        margin: 0 0 6px;
        font-size: 13px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .unplaced h4 label {
        font-weight: 400;
        color: var(--zh-muted);
        display: inline-flex;
        gap: 5px;
        align-items: center;
      }
      .unplaced .chip.on {
        border-color: var(--primary-color, #03a9f4);
        background: color-mix(in srgb, var(--primary-color, #03a9f4) 14%, transparent);
      }
      .unplaced .chip.other {
        opacity: 0.6;
      }
      .unplaced .chips {
        max-height: 96px;
        overflow-y: auto;
      }
      .hint {
        font-size: 12.5px;
        color: var(--zh-muted);
      }
      .selbar {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
      }
      .selbar .btn {
        margin-left: 0;
      }
      .err {
        color: var(--zh-bad);
        font-size: 13px;
      }
    `],f([$({attribute:!1})],S.prototype,"hass",2),f([$({attribute:!1})],S.prototype,"report",2),f([$({attribute:!1})],S.prototype,"layout",2),f([$({attribute:!1})],S.prototype,"heat",2),f([$({attribute:!1})],S.prototype,"alerts",2),f([$({attribute:!1})],S.prototype,"plan",2),f([$({attribute:!1})],S.prototype,"t",2),f([$({attribute:!1})],S.prototype,"configEntryId",2),f([$({attribute:!1})],S.prototype,"live",2),f([b()],S.prototype,"_plans",2),f([b()],S.prototype,"_active",2),f([b()],S.prototype,"_building",2),f([b()],S.prototype,"_edit",2),f([b()],S.prototype,"_placing",2),f([b()],S.prototype,"_selected",2),f([b()],S.prototype,"_drag",2),f([b()],S.prototype,"_hover",2),f([b()],S.prototype,"_busy",2),f([b()],S.prototype,"_error",2),f([b()],S.prototype,"_confirmDelete",2),f([b()],S.prototype,"_allFloors",2),S=f([I("zigbee-health-floor")],S);var Y="coordinator";function Ce(d){return`${d}_${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`}function C(d,o=.01){return Math.round(d/o)*o}function hi(d){let o=0;for(let e=0;e<d.length;e++){let[t,i]=d[e],[n,r]=d[(e+1)%d.length];o+=t*r-n*i}return o/2}function Ne(d){let o=hi(d);if(Math.abs(o)<1e-6){let i=d.length||1;return[d.reduce((n,r)=>n+r[0],0)/i,d.reduce((n,r)=>n+r[1],0)/i]}let e=0,t=0;for(let i=0;i<d.length;i++){let[n,r]=d[i],[s,a]=d[(i+1)%d.length],c=n*a-s*r;e+=(n+s)*c,t+=(r+a)*c}return[e/(6*o),t/(6*o)]}function zt(d,o){let e=!1;for(let t=0,i=o.length-1;t<o.length;i=t++){let[n,r]=o[t],[s,a]=o[i];r>d[1]!=a>d[1]&&d[0]<(s-n)*(d[1]-r)/(a-r)+n&&(e=!e)}return e}function j(d,o){return Math.hypot(d[0]-o[0],d[1]-o[1])}function Mt(d){if(d.length!==4)return null;let o=[...new Set(d.map(n=>C(n[0],.001)))],e=[...new Set(d.map(n=>C(n[1],.001)))];if(o.length!==2||e.length!==2)return null;let t=Math.min(...o),i=Math.min(...e);return{x:t,y:i,w:Math.max(...o)-t,h:Math.max(...e)-i}}function tt(d){let o=d.flatMap(r=>r.rooms.flatMap(s=>s.points));if(!o.length)return null;let e=o.map(r=>r[0]),t=o.map(r=>r[1]),i=Math.min(...e),n=Math.min(...t);return{x:i,y:n,w:Math.max(...e)-i||1,h:Math.max(...t)-n||1}}function St(d,o,e,t){let i=null,n=e;for(let r of o){let s=j(d,r);s<n&&(i=r,n=s)}return i?[i[0],i[1]]:[C(d[0],t),C(d[1],t)]}function pi(d){let[o,e]=Ne(d.points),t=d.points.map(s=>s[0]),i=d.points.map(s=>s[1]),n=[];for(let s=Math.min(...t)+.6/2;s<Math.max(...t);s+=.6)for(let a=Math.min(...i)+.6/2;a<Math.max(...i);a+=.6)zt([s,a],d.points)&&n.push([s,a]);let r=zt([o,e],d.points)?[o,e]:n[0]??[o,e];return n.sort((s,a)=>j(s,r)-j(a,r)),n.length?n:[[o,e]]}function De(d,o){let e=new Map;for(let[s,a]of Object.entries(d.positions))d.floors.some(c=>c.id===a.floor)&&e.set(s,{floor:a.floor,x:a.x,y:a.y,auto:!1});let t=new Map;for(let s of d.floors)for(let a of s.rooms)a.area_id&&!t.has(a.area_id)&&t.set(a.area_id,{floor:s,room:a});let i=new Map,n=[...o].sort((s,a)=>+(a.type==="router")-+(s.type==="router")||s.name.localeCompare(a.name,void 0,{numeric:!0})),r=new Map;for(let s of n){if(e.has(s.ieee)||!s.area_id)continue;let a=t.get(s.area_id);if(!a)continue;let c=r.get(a.room.id);c||(c=pi(a.room),r.set(a.room.id,c));let l=i.get(a.room.id)??0;i.set(a.room.id,l+1);let[p,_]=c[l%c.length];e.set(s.ieee,{floor:a.floor.id,x:p,y:_,auto:!0})}return e}var Et=[206,150,32,280,0,180,110,330,55,240];function Rt(d){let o=0;for(let e of d.area_id??d.name)o=o*31+e.charCodeAt(0)>>>0;return Et[o%Et.length]}function ye(d){let o=0;for(let e of[...d].sort((t,i)=>t.elevation-i.elevation))e.elevation=C(o),o+=e.height;return d}function de(d){return JSON.parse(JSON.stringify(d))}function xe(d){history.pushState(null,"",d),window.dispatchEvent(new CustomEvent("location-changed",{detail:{replace:!1}}))}function Q(d,o){if(!d)return o("never");let e=Math.max(0,(Date.now()-Date.parse(d))/6e4);return e<1?o("just_now"):e<60?o("minutes_ago",{n:Math.round(e)}):e<2880?o("hours_ago",{n:Math.round(e/60)}):o("days_ago",{n:Math.round(e/1440)})}function Le(d,o){d.dispatchEvent(new CustomEvent("zh-device",{detail:{ieee:o},bubbles:!0,composed:!0}))}var $e=.05,At=12,ui=700,fi=60,Pt=2.6,mi=2e3;async function gi(d){let o=URL.createObjectURL(d);try{let e=await new Promise((r,s)=>{let a=new Image;a.onload=()=>r(a),a.onerror=()=>s(new Error("image")),a.src=o}),t=Math.min(1,mi/Math.max(e.naturalWidth,e.naturalHeight)),i=document.createElement("canvas");i.width=Math.round(e.naturalWidth*t),i.height=Math.round(e.naturalHeight*t);let n=i.getContext("2d");return n.fillStyle="#fff",n.fillRect(0,0,i.width,i.height),n.drawImage(e,0,0,i.width,i.height),{url:i.toDataURL("image/jpeg",.85),aspect:i.height/i.width}}finally{URL.revokeObjectURL(o)}}function Be(d){return`${d.toFixed(2).replace(".",",")} m`}var z=class extends T{constructor(){super(...arguments);this.heat={};this.alerts=[];this.t=e=>e;this.live=!0;this._edit=!1;this._tool="select";this._draft=[];this._vb={x:-1,y:-1,w:14,h:10};this._legacy=!1;this._confirmDelete=!1;this._undo=[];this._tip={x:0,y:0};this._bgAspect={};this._images={};this._pointers=new Map;this._fitted=!1;this._onKey=e=>{if(!this._edit)return;let t=e.composedPath()[0];t&&["INPUT","SELECT","TEXTAREA"].includes(t.tagName)||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"?(e.preventDefault(),this._undoLast()):e.key==="Escape"?(this._draft=[],this._rectStart=void 0,this._room=void 0,this._vertex=void 0):e.key==="Enter"&&this._tool==="poly"?this._closePolygon():(e.key==="Delete"||e.key==="Backspace")&&this._room&&this._deleteRoom())}}connectedCallback(){super.connectedCallback(),window.addEventListener("keydown",this._onKey)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("keydown",this._onKey)}firstUpdated(){this._load()}updated(e){e.has("_b")&&this._b&&!this._fitted&&(this._fit(),this._fitted=!0)}get _admin(){return this.hass?.user?.is_admin??!0}_msg(e,t={}){let i={type:`zigbee_health/building/${e}`,...t};return this.configEntryId&&(i.config_entry_id=this.configEntryId),i}async _load(){if(this.hass)try{let e=await this.hass.callWS(this._msg("get")),t=e.building;t&&ye(t.floors),this._images=e.images??{};for(let i of t?.floors??[])await this._measureBackground(i);this._b=t,this._floor=this._sortedFloors[0]?.id}catch(e){this._b=null,this._error=String(e?.message??e)}}async _measureBackground(e){let t=this._images[e.id];!t||this._bgAspect[e.id]||await new Promise(i=>{let n=new Image;n.onload=()=>{this._bgAspect[e.id]=n.naturalHeight/(n.naturalWidth||1),i()},n.onerror=()=>i(),n.src=t})}get _sortedFloors(){return[...this._b?.floors??[]].sort((e,t)=>e.elevation-t.elevation)}get _current(){return this._b?.floors.find(e=>e.id===this._floor)}get _haFloors(){return this.report?.topology?.floors??[]}get _areas(){return this.report?.topology?.areas??[]}get _nodes(){return new Map((this.report?.topology?.nodes??[]).map(e=>[e.ieee,e]))}get _placed(){let e=[this._b,this.report?.topology];if(this._placedCache&&this._placedCache.key[0]===e[0]&&this._placedCache.key[1]===e[1])return this._placedCache.value;let t=this._b?De(this._b,this.report?.topology?.nodes??[]):new Map;return this._placedCache={key:e,value:t},t}_keyOf(e){return e===this.report?.topology?.coordinator?.ieee?Y:e}_at(e){return this._placed.get(this._keyOf(e))}_change(e){if(!this._b)return;this._undo.push(de(this._b)),this._undo.length>fi&&this._undo.shift();let t=de(this._b);e(t),ye(t.floors),this._b=t,this._scheduleSave()}_live(e){if(!this._b)return;let t=de(this._b);e(t),this._b=t,this._scheduleSave()}_scheduleSave(){window.clearTimeout(this._saveTimer),this._saveTimer=window.setTimeout(()=>{!this._b||!this.hass||this.hass.callWS(this._msg("save",{building:this._b})).catch(e=>{this._error=String(e?.message??e)})},ui)}_undoLast(){let e=this._undo.pop();e&&(this._b=e,this._room=void 0,this._vertex=void 0,this._scheduleSave())}_fit(){let e=tt(this._b?.floors??[]);if(!e){this._vb={x:-1,y:-1,w:14,h:10};return}let t=Math.max(1,Math.max(e.w,e.h)*.08);this._vb={x:e.x-t,y:e.y-t,w:e.w+2*t,h:e.h+2*t}}_svg(){return this.renderRoot.querySelector(".canvas svg")}_toM(e){let i=this._svg()?.getScreenCTM();if(!i)return null;let n=new DOMPoint(e.clientX,e.clientY).matrixTransform(i.inverse());return[n.x,n.y]}_pxToM(){let e=this._svg()?.getScreenCTM();return e?1/e.a:.02}_snap(e,t){let i=[];for(let n of this._b?.floors??[])if(!(n.id!==this._floor&&n.id!==this._below?.id))for(let r of n.rooms)r.points.forEach((s,a)=>{t&&r.id===t.room&&(t.vertex===void 0||t.vertex===a)||i.push(s)});return i.push(...this._draft),St(e,i,At*this._pxToM(),$e)}get _below(){let e=this._sortedFloors,t=e.findIndex(i=>i.id===this._floor);return t>0?e[t-1]:void 0}_startBuilding(){let e=[...this._haFloors].sort((i,n)=>(i.level??0)-(n.level??0))[0],t={id:Ce("floor"),name:e?.name??this.t("draw.floor_name",{n:1}),floor_id:e?.floor_id??null,elevation:0,height:Pt,rooms:[],background:null};this._b={floors:[t],positions:{}},this._undo=[],this._floor=t.id,this._edit=!0,this._tool="rect",this._fit(),this._scheduleSave()}_addFloor(){let e=this._sortedFloors,t=e[e.length-1],i=new Set(e.map(s=>s.floor_id)),n=[...this._haFloors].sort((s,a)=>(s.level??0)-(a.level??0)).find(s=>!i.has(s.floor_id)),r={id:Ce("floor"),name:n?.name??this.t("draw.floor_name",{n:e.length+1}),floor_id:n?.floor_id??null,elevation:t?t.elevation+t.height:0,height:Pt,rooms:[],background:null};this._change(s=>s.floors.push(r)),this._floor=r.id,this._tool="rect",this._room=void 0}_addRoom(e){let t=this._floor;if(!t)return;let i=(this._current?.rooms.length??0)+1,n={id:Ce("room"),name:this.t("draw.room_name",{n:i}),area_id:null,points:e};this._change(r=>r.floors.find(s=>s.id===t)?.rooms.push(n)),this._room=n.id,this._vertex=void 0,this._tool="select"}_closePolygon(){this._draft.length>=3&&this._addRoom(this._draft),this._draft=[]}_updateRoom(e,t,i=!1){let n=r=>{let s=r.floors.flatMap(a=>a.rooms).find(a=>a.id===e);s&&t(s)};i?this._live(n):this._change(n)}_deleteRoom(){let e=this._room;e&&(this._change(t=>{for(let i of t.floors)i.rooms=i.rooms.filter(n=>n.id!==e)}),this._room=void 0,this._vertex=void 0)}_duplicateRoom(){let e=this._current?.rooms.find(t=>t.id===this._room);e&&this._addRoom(e.points.map(([t,i])=>[C(t+.5),C(i+.5)]))}_setDevice(e,t){let i=this._floor,n=r=>{t&&i?r.positions[e]={floor:i,x:C(t[0]),y:C(t[1])}:delete r.positions[e]};this._live(n)}async _uploadBackground(e){let t=e.target,i=t.files?.[0];t.value="";let n=this._floor;if(!i||!n)return;let{url:r,aspect:s}=await gi(i);try{await this.hass?.callWS(this._msg("image",{floor:n,image:r}))}catch(c){this._error=String(c?.message??c);return}this._bgAspect[n]=s,this._images={...this._images,[n]:r};let a=tt(this._b?.floors??[]);this._change(c=>{let l=c.floors.find(p=>p.id===n);l&&!l.background&&(l.background={x:a?.x??0,y:a?.y??0,width:a?Math.max(a.w,8):12,opacity:.5})})}_removeBackground(e){let{[e]:t,...i}=this._images;this._images=i,this.hass?.callWS(this._msg("image",{floor:e,image:null})).catch(()=>{}),this._change(n=>{let r=n.floors.find(s=>s.id===e);r&&(r.background=null)})}_down(e){if(this._pointers.set(e.pointerId,[e.clientX,e.clientY]),this._pointers.size===2){this._startPinch();return}if(this._pointers.size>2||this._pinch)return;let t=this._toM(e);if(!t)return;let i=e.target,n=i.getAttribute("data-room"),r=i.getAttribute("data-vertex"),s=i.getAttribute("data-mid"),a=i.closest("[data-device]")?.getAttribute("data-device")??null;if(this._edit&&this._tool==="rect"){this._rectStart=this._snap(t),this._cursor=this._rectStart;return}if(!(this._edit&&this._tool==="poly")){if(this._edit&&this._tool==="devices"&&a){this._device=a,this._drag={kind:"device",key:a},e.target.setPointerCapture?.(e.pointerId);return}if(this._edit&&this._tool==="select"){if(r!==null&&this._room){this._vertex=Number(r),this._undo.push(de(this._b)),this._drag={kind:"vertex",start:t};return}if(s!==null&&this._room){let c=Number(s),l=this._snap(t);this._updateRoom(this._room,p=>p.points.splice(c+1,0,l)),this._vertex=c+1,this._drag={kind:"vertex",start:t};return}if(n){this._room=n,this._vertex=void 0;let c=this._current?.rooms.find(l=>l.id===n);c&&(this._undo.push(de(this._b)),this._drag={kind:"room",start:t,points:c.points.map(l=>[...l])});return}this._room=void 0,this._vertex=void 0}this._drag={kind:"pan",start:[e.clientX,e.clientY],vb:{...this._vb}}}}_startPinch(){if(this._drag&&(this._drag.kind==="vertex"||this._drag.kind==="room")){let i=this._undo.pop();i&&(this._b=i)}this._drag=void 0,this._rectStart=void 0;let[e,t]=[...this._pointers.values()];this._pinch={distance:j(e,t)||1,mid:[(e[0]+t[0])/2,(e[1]+t[1])/2]}}_pinchMove(){let e=this._pinch,i=this._svg()?.getScreenCTM();if(!e||!i)return;let[n,r]=[...this._pointers.values()],s=j(n,r)||1,a=[(n[0]+r[0])/2,(n[1]+r[1])/2],c=Math.min(4,Math.max(.25,e.distance/s)),l=1/i.a,p=new DOMPoint(a[0],a[1]).matrixTransform(i.inverse()),_=this._vb;this._vb={x:p.x-(p.x-_.x)*c-(a[0]-e.mid[0])*l,y:p.y-(p.y-_.y)*c-(a[1]-e.mid[1])*l,w:_.w*c,h:_.h*c},this._pinch={distance:s,mid:a}}_release(e){if(this._pointers.delete(e.pointerId),this._pinch){this._pointers.size<2&&(this._pinch=void 0),this._drag=void 0;return}this._up()}_move(e){if(this._pointers.has(e.pointerId)&&this._pointers.set(e.pointerId,[e.clientX,e.clientY]),this._pinch){this._pointers.size>=2&&this._pinchMove();return}let t=this._toM(e);if(!t)return;this._edit&&(this._tool==="rect"||this._tool==="poly")&&(this._cursor=this._snap(t));let i=this._drag;if(i)if(i.kind==="pan"){let n=this._pxToM();this._vb={...i.vb,x:i.vb.x-(e.clientX-i.start[0])*n,y:i.vb.y-(e.clientY-i.start[1])*n}}else if(i.kind==="vertex"&&this._room&&this._vertex!==void 0){let n=this._snap(t,{room:this._room,vertex:this._vertex}),r=this._vertex;this._updateRoom(this._room,s=>s.points[r]=n,!0)}else if(i.kind==="room"&&this._room){let n=C(t[0]-i.start[0],$e),r=C(t[1]-i.start[1],$e);this._updateRoom(this._room,s=>s.points=i.points.map(([a,c])=>[C(a+n),C(c+r)]),!0)}else i.kind==="device"&&this._setDevice(i.key,[C(t[0],$e),C(t[1],$e)])}_up(){if(this._rectStart&&this._cursor){let[e,t]=this._rectStart,[i,n]=this._cursor;if(Math.abs(i-e)>=.3&&Math.abs(n-t)>=.3){let[r,s]=[Math.min(e,i),Math.max(e,i)],[a,c]=[Math.min(t,n),Math.max(t,n)];this._addRoom([[r,a],[s,a],[s,c],[r,c]])}this._rectStart=void 0}this._drag=void 0}_click(e){if(!this._edit)return;let t=this._toM(e);if(t)if(this._tool==="poly"){let i=this._snap(t);this._draft.length>=3&&j(i,this._draft[0])<At*this._pxToM()?this._closePolygon():this._draft=[...this._draft,i]}else this._tool==="devices"&&!e.target.closest("[data-device]")&&this._device&&!this._at(this._device)&&this._setDevice(this._device,t)}_wheel(e){e.preventDefault();let t=this._toM(e);if(!t)return;let i=e.deltaY>0?1.12:1/1.12,n=this._vb;this._vb={x:t[0]-(t[0]-n.x)*i,y:t[1]-(t[1]-n.y)*i,w:n.w*i,h:n.h*i}}spark(e,t){let i=this.renderRoot.querySelector("g.traffic");if(!i||!this.layout||!this._floor||this._legacy)return;let n=[];for(let p of K(this.layout,e)){let _=this._at(p);if(_&&_.floor===this._floor){n.push([_.x,_.y]);continue}let m=n[n.length-1];_&&m&&n.push(this._portalPoint(_.floor,m));break}if(n.length<2)return;let r=0;for(let p=1;p<n.length;p++)r+=j(n[p],n[p-1]);let s=Math.max(.6,r/5),a="http://www.w3.org/2000/svg",c=document.createElementNS(a,"circle");c.setAttribute("r",String(Math.max(.09,this._vb.w/160))),c.setAttribute("class","spark");let l=document.createElementNS(a,"animateMotion");l.setAttribute("dur",`${s}s`),l.setAttribute("fill","freeze"),l.setAttribute("begin","indefinite"),l.setAttribute("path",`M${n.map(p=>`${p[0]},${p[1]}`).join(" L")}`),c.appendChild(l),window.setTimeout(()=>{i.appendChild(c),l.beginElement(),window.setTimeout(()=>c.remove(),s*1e3+60)},t)}_portalPoint(e,t){let n=(this._b?.floors.find(r=>r.id===e)?.elevation??0)>(this._current?.elevation??0);return[t[0]+.35,t[1]+(n?-.8:.8)]}render(){let e=this.t;if(this._legacy)return h`<button class="linkbtn" @click=${()=>this._legacy=!1}>← ${e("draw.back")}</button>
        <zigbee-health-floor
          .hass=${this.hass}
          .report=${this.report}
          .layout=${this.layout}
          .heat=${this.heat}
          .alerts=${this.alerts}
          .plan=${this.plan}
          .t=${e}
          .live=${this.live}
          .configEntryId=${this.configEntryId}
        ></zigbee-health-floor>`;if(this._b===void 0)return h`<div class="empty">${e("loading")}</div>`;if(!this._b||!this._b.floors.length)return this._renderStart();let t=this._current??this._sortedFloors[0];return h`${this._renderBar(t)} ${this._renderCanvas(t)} ${this._renderPanels(t)}
      ${this._error?h`<div class="err">${this._error}</div>`:u}`}_renderStart(){let e=this.t;return h`<div class="start">
      <h3>${e("draw.start_title")}</h3>
      <p>${e("draw.start_text")}</p>
      <div class="row">
        ${this._admin?h`<button class="btn" @click=${()=>this._startBuilding()}>${e("draw.start")}</button>`:h`<p>${e("floor.admin_only")}</p>`}
      </div>
      <button class="linkbtn" @click=${()=>this._legacy=!0}>${e("draw.use_image")}</button>
    </div>`}_renderBar(e){let t=this.t,i=[...this._sortedFloors].reverse(),n=(r,s)=>h`<button
        class=${this._tool===r?"on":""}
        @click=${()=>{this._tool=r,this._draft=[],this._rectStart=void 0,r!=="select"&&(this._vertex=void 0)}}
      >
        ${s}
      </button>`;return h`<div class="toolbar">
        ${i.map(r=>h`<button
            class="ftab ${r.id===e.id?"on":""}"
            @click=${()=>{this._floor=r.id,this._room=void 0,this._vertex=void 0,this._draft=[],this._confirmDelete=!1}}
          >
            ${r.name}
          </button>`)}
        ${this._edit?h`<button class="ftab" @click=${()=>this._addFloor()}>+ ${t("floor.add")}</button>`:u}
        <span class="spacer"></span>
        ${this._admin?h`<button
              class="ftab edit ${this._edit?"on":""}"
              @click=${()=>{this._edit=!this._edit,this._tool="select",this._draft=[],this._room=void 0,this._device=void 0}}
            >
              ${this._edit?t("floor.done"):t("floor.edit")}
            </button>`:u}
      </div>
      ${this._edit?h`<div class="toolbar">
            <div class="tools">
              ${n("select",t("draw.tool_select"))} ${n("rect",t("draw.tool_rect"))}
              ${n("poly",t("draw.tool_poly"))} ${n("devices",t("draw.tool_devices"))}
            </div>
            <button class="ftab" ?disabled=${!this._undo.length} @click=${()=>this._undoLast()}>
              ↶ ${t("draw.undo")}
            </button>
            <button class="ftab" @click=${()=>this._fit()}>${t("draw.fit")}</button>
            <span class="hint">${t(`draw.help_${this._tool}`)}</span>
          </div>`:u}`}_renderCanvas(e){let t=this._vb,i=this._edit&&(this._tool==="rect"||this._tool==="poly");return h`<div class="canvas ${i?"drawing":""}">
      <svg
        viewBox="${t.x} ${t.y} ${t.w} ${t.h}"
        class="${this._edit?"editing":""} ${this._tool==="devices"&&this._edit?"devices-mode":""} ${this.plan||this.marked?"dim":""}"
        @pointerdown=${n=>this._down(n)}
        @pointermove=${n=>this._move(n)}
        @pointerup=${n=>this._release(n)}
        @pointercancel=${n=>this._release(n)}
        @pointerleave=${n=>{this._release(n),this._hover=void 0}}
        @click=${n=>this._click(n)}
        @dblclick=${()=>this._tool==="poly"&&this._closePolygon()}
        @wheel=${n=>this._wheel(n)}
        @dragover=${n=>n.preventDefault()}
        @drop=${n=>{n.preventDefault();let r=n.dataTransfer?.getData("text/plain"),s=this._toM(n);r&&s&&this._setDevice(r,s)}}
      >
        ${this._edit?this._renderGrid():u}
        ${this._renderBackground(e)}
        ${this._edit&&this._below?this._below.rooms.map(n=>y`<polygon class="ghost" points=${n.points.map(r=>r.join(",")).join(" ")}></polygon>`):u}
        ${e.rooms.map(n=>this._renderRoom(n))}
        ${this._renderLinks(e)}
        ${this._renderPlanOverlay(e)}
        ${this._renderDevices(e)}
        ${this._edit?this._renderEditing(e):u}
        <g class="traffic"></g>
      </svg>
      ${this._renderTip()}
    </div>`}_renderGrid(){let e=this._vb,t={x:e.x-e.w,y:e.y-e.h,w:e.w*3,h:e.h*3},i=[],n=[],r=t.w>40?1:.5;for(let c=Math.floor(t.x);c<=t.x+t.w;c+=r)(c%1===0?n:i).push(c);let s=[],a=[];for(let c=Math.floor(t.y);c<=t.y+t.h;c+=r)(c%1===0?a:s).push(c);return y`<g>
      ${i.map(c=>y`<line class="grid-minor" x1=${c} y1=${t.y} x2=${c} y2=${t.y+t.h}></line>`)}
      ${s.map(c=>y`<line class="grid-minor" x1=${t.x} y1=${c} x2=${t.x+t.w} y2=${c}></line>`)}
      ${n.map(c=>y`<line class="grid-major" x1=${c} y1=${t.y} x2=${c} y2=${t.y+t.h}></line>`)}
      ${a.map(c=>y`<line class="grid-major" x1=${t.x} y1=${c} x2=${t.x+t.w} y2=${c}></line>`)}
    </g>`}_renderBackground(e){let t=e.background,i=this._images[e.id];if(!t||!i)return u;let n=this._bgAspect[e.id]??.7;return y`<image href=${i} x=${t.x} y=${t.y} width=${t.width} height=${t.width*n} opacity=${t.opacity} preserveAspectRatio="none" style="pointer-events:none"></image>`}_renderRoom(e){let t=Rt(e),[i,n]=Ne(e.points),r=this._pxToM(),s=Math.max(.3,13*r),a=Math.max(.2,10.5*r),c=this._areas.find(p=>p.area_id===e.area_id)?.name,l=this._edit&&this._room===e.id;return y`<g>
      <polygon
        class="zroom ${l?"sel":""} ${e.area_id&&this.marked?.areas.includes(e.area_id)?"focus":""}"
        data-room=${e.id}
        points=${e.points.map(p=>p.join(",")).join(" ")}
        style="fill:hsla(${t},70%,60%,0.16);stroke:hsla(${t},45%,45%,0.9)"
      ></polygon>
      <text class="room-name" x=${i} y=${n} text-anchor="middle" style="font-size:${s}px;stroke-width:${s/5}px">${e.name}</text>
      ${this._edit&&!e.area_id?y`<text class="room-area" x=${i} y=${n+s} text-anchor="middle" style="font-size:${a}px">${this.t("draw.no_area")}</text>`:c&&c!==e.name?y`<text class="room-area" x=${i} y=${n+s} text-anchor="middle" style="font-size:${a}px">${c}</text>`:u}
    </g>`}_renderEditing(e){let t=[],i=e.rooms.find(a=>a.id===this._room),n=this._pxToM(),r=n*6,s=`font-size:${Math.max(.22,11*n)}px;stroke-width:${Math.max(.05,3*n)}px`;if(i&&this._tool==="select"){let a=i.points;a.forEach((c,l)=>{let p=a[(l+1)%a.length],_=(c[0]+p[0])/2,m=(c[1]+p[1])/2,v=j(c,p),[w,M]=Ne(a),x=_-w,R=m-M,L=Math.hypot(x,R)||1;t.push(y`<text class="dim-label" style=${s} x=${_+x/L*.28} y=${m+R/L*.28+.08} text-anchor="middle">${Be(v)}</text>`,y`<circle class="mid" data-mid=${l} cx=${_} cy=${m} r=${r*.7}></circle>`)}),a.forEach((c,l)=>t.push(y`<circle class="handle ${this._vertex===l?"on":""}" data-vertex=${l} cx=${c[0]} cy=${c[1]} r=${r}></circle>`))}if(this._rectStart&&this._cursor){let[a,c]=this._rectStart,[l,p]=this._cursor,_=Math.min(a,l),m=Math.min(c,p),v=Math.abs(l-a),w=Math.abs(p-c);t.push(y`<rect class="draft" x=${_} y=${m} width=${v} height=${w}></rect>`,y`<text class="dim-label" style=${s} x=${_+v/2} y=${m-.15} text-anchor="middle">${Be(v)}</text>`,y`<text class="dim-label" style=${s} x=${_+v+.15} y=${m+w/2} text-anchor="start">${Be(w)}</text>`)}if(this._tool==="poly"&&this._draft.length){let a=this._cursor?[...this._draft,this._cursor]:this._draft;if(t.push(y`<polyline class="draft" points=${a.map(c=>c.join(",")).join(" ")}></polyline>`),this._cursor){let c=this._draft[this._draft.length-1],l=j(c,this._cursor);t.push(y`<text class="dim-label" style=${s} x=${(c[0]+this._cursor[0])/2} y=${(c[1]+this._cursor[1])/2-.12} text-anchor="middle">${Be(l)}</text>`)}this._draft.forEach(c=>t.push(y`<circle class="handle" cx=${c[0]} cy=${c[1]} r=${r*.8}></circle>`))}return t}_renderLinks(e){let t=this.report?.topology;if(!t)return u;let i=a=>{let c=this._at(a);return c&&c.floor===e.id?[c.x,c.y]:null},n=[],r=new Set,s=(a,c,l,p)=>{let _=i(a),m=i(c);if(_&&m){n.push(y`<path class="edge ${p} lqi-${q(l)}" d="M${_[0]},${_[1]} L${m[0]},${m[1]}"></path>`);return}let v=_??m,w=_?c:a,M=this._at(w);if(!v||!M||M.floor===e.id||r.has(`${v}|${w}`))return;r.add(`${v}|${w}`);let x=this._portalPoint(M.floor,v),R=this._b?.floors.find(Z=>Z.id===M.floor),L=(R?.elevation??0)>e.elevation,P=w===t.coordinator?.ieee?this.t("coordinator"):this._nodes.get(w)?.name??w,N=Math.max(.12,this._vb.w/110);n.push(y`<path class="portal-stub lqi-${q(l)}" d="M${v[0]},${v[1]} L${x[0]},${x[1]}"></path>`,y`<g class="portal" @click=${Z=>{Z.stopPropagation(),this._floor=M.floor}}>
          <circle cx=${x[0]} cy=${x[1]} r=${N}></circle>
          <path d=${L?`M${x[0]-N*.5},${x[1]+N*.25} L${x[0]},${x[1]-N*.35} L${x[0]+N*.5},${x[1]+N*.25}`:`M${x[0]-N*.5},${x[1]-N*.25} L${x[0]},${x[1]+N*.35} L${x[0]+N*.5},${x[1]-N*.25}`}></path>
          <title>${R?.name??""} · ${P}${l?` \xB7 LQI ${l}`:""}</title>
        </g>`)};for(let a of t.links)s(a.a,a.b,a.lqi,"link");for(let a of t.nodes)a.type==="end_device"&&a.parent&&a.state!=="dead"&&s(a.ieee,a.parent,a.parent_lqi,"parent");return n}_renderDevices(e){let t=this.report?.topology;if(!t)return u;let i=this._pxToM(),n=Math.max(.16,Math.min(.32,this._vb.w/55),9*i),r=Math.max(n*.62,10.5*i),s=this.plan?new Set(this.plan.improved.map(l=>l.ieee)):this.marked?new Set(this.marked.ieees):void 0,a=[],c=t.coordinator?.ieee;if(c){let l=this._at(c);l&&l.floor===e.id&&a.push(y`<g class="node coord ${this._device===Y?"dsel":""}" data-device=${Y}>
          <circle class="shape" cx=${l.x} cy=${l.y} r=${n*.95}></circle>
          <path class="glyph" style="stroke-width:${n*.16}" d="M${l.x-n*.4},${l.y-n*.35} h${n*.8} l${-n*.8},${n*.7} h${n*.8}"></path>
        </g>`)}for(let l of t.nodes){let p=this._at(l.ieee);if(!p||p.floor!==e.id)continue;let _=l.type==="router",m=_?n*1.25:n*.9,v=this.live?this.heat[l.ieee]??0:0,w=this.alerts.some(L=>L.ieee===l.ieee),M=l.kind==="part_time"?"part":l.kind==="unclear"?"unclear":"",x=l.kind==="unclear"&&l.state==="ok"?"unclear":l.state,R=!s||s.has(l.ieee);a.push(y`<g
        class="node ${M} ${l.state} ${R&&s?"hl":""} ${this._device===l.ieee?"dsel":""}"
        data-device=${l.ieee}
        @mouseenter=${L=>{if(this._edit)return;let P=this.renderRoot.querySelector(".canvas").getBoundingClientRect();this._tip={x:L.clientX-P.left,y:L.clientY-P.top},this._hover=l.ieee}}
        @mouseleave=${()=>this._hover=void 0}
        @click=${()=>{if(this._edit){this._device=l.ieee;return}Le(this,l.ieee)}}
      >
        ${v>.05?y`<circle class="heat" cx=${p.x} cy=${p.y} r=${m/2+n*(.2+v*.4)} style="opacity:${.12+v*.33}"></circle>`:u}
        ${w?y`<circle class="pulse alarm" cx=${p.x} cy=${p.y} r=${m/2}></circle>`:u}
        ${_?y`<rect class="shape st-${x}" x=${p.x-m/2} y=${p.y-m/2} width=${m} height=${m} rx=${m*.22}></rect>`:y`<circle class="shape st-${x}" cx=${p.x} cy=${p.y} r=${m/2}></circle>`}
        ${_||i<.02?y`<text class="dev-label" x=${p.x} y=${p.y+m/2+r*1.1} text-anchor="middle" style="font-size:${r}px">${l.name}</text>`:u}
      </g>`)}return a}_renderPlanOverlay(e){let t=this.plan;if(!t)return u;let i=t.improved.map(a=>this._at(a.ieee)).filter(a=>!!a&&a.floor===e.id);if(!i.length)return u;let n=i.reduce((a,c)=>a+c.x,0)/i.length,r=i.reduce((a,c)=>a+c.y,0)/i.length,s=Math.max(.2,this._vb.w/45);return y`<g class="plan-layer">
      ${i.map(a=>y`<path class="planned-edge" d="M${a.x},${a.y} L${n},${r}"></path>`)}
      <rect class="virtual" x=${n-s/2} y=${r-s/2} width=${s} height=${s} rx=${s*.25} style="stroke-width:${s*.1}"></rect>
      <path class="virtual-plus" style="stroke-width:${s*.12}" d="M${n-s*.22},${r} h${s*.44} M${n},${r-s*.22} v${s*.44}"></path>
      <text class="dev-label plan-label" x=${n} y=${r+s*1.1} text-anchor="middle" style="font-size:${s*.45}px">${this.t("plan.virtual",{room:t.area_name})}</text>
    </g>`}_renderTip(){if(!this._hover||this._edit)return u;let e=this._nodes.get(this._hover);if(!e)return u;let t=this.t,i=this.report?.topology?.coordinator?.ieee,n=e.parent===i?t("coordinator"):this._nodes.get(e.parent??"")?.name;return h`<div class="tip" style="left:${this._tip.x}px;top:${this._tip.y}px">
      <b>${e.name}</b>
      <div class="k">${e.type==="router"?t(`kind.${e.kind??"always_on"}`):t("end_device")}${e.area?` \xB7 ${e.area}`:""}</div>
      <span class="pill">${t(`state.${e.state}`)}</span>
      ${n?h`<div class="row"><span class="k">${t("parent")}</span><span>${n}${e.parent_lqi?` \xB7 LQI ${e.parent_lqi}`:""}</span></div>`:u}
    </div>`}_renderPanels(e){let t=this.t;if(!this._edit){let n=this._unplaced().length,r=this._b?.floors.flatMap(s=>s.rooms).filter(s=>!s.area_id).length??0;return h`<div class="hint">
        ${r?t("draw.hint_link",{n:r}):u}
        ${n&&this._admin?t("draw.hint_unplaced",{n}):u}
      </div>`}let i=e.rooms.find(n=>n.id===this._room);return h`${this._tool==="devices"?this._renderDevicePanel():u}
      ${i&&this._tool==="select"?this._renderRoomPanel(i):u}
      ${this._renderFloorPanel(e)}`}_renderRoomPanel(e){let t=this.t,i=Mt(e.points),n=new Set((this._b?.floors??[]).flatMap(s=>s.rooms).filter(s=>s.id!==e.id).map(s=>s.area_id)),r=(s,a)=>{!i||!(s>.2)||!(a>.2)||this._updateRoom(e.id,c=>{c.points=[[i.x,i.y],[C(i.x+s),i.y],[C(i.x+s),C(i.y+a)],[i.x,C(i.y+a)]]})};return h`<div class="panel">
      <b>${t("draw.room")}</b>
      <label
        >${t("draw.name")}
        <input
          id="zh-room-name"
          type="text"
          .value=${e.name}
          @change=${s=>{let a=s.target.value.trim();a&&this._updateRoom(e.id,c=>c.name=a)}}
      /></label>
      <label
        >${t("draw.area")}
        <select
          id="zh-room-area"
          @change=${s=>{let a=s.target.value||null,c=this._areas.find(l=>l.area_id===a)?.name;this._updateRoom(e.id,l=>{let p=/^(Raum|Room) \d+$/.test(l.name);l.area_id=a,c&&p&&(l.name=c)})}}
        >
          <option value="" ?selected=${!e.area_id}>${t("draw.no_area_option")}</option>
          ${this._areas.map(s=>h`<option value=${s.area_id} ?selected=${e.area_id===s.area_id}>
              ${s.name}${n.has(s.area_id)?" \u2713":""}
            </option>`)}
        </select></label
      >
      ${i?h`<label
              >${t("draw.width")}
              <input
                id="zh-room-w"
                type="number"
                step="0.01"
                min="0.3"
                .value=${i.w.toFixed(2)}
                @change=${s=>r(Number(s.target.value),i.h)}
              />m</label
            >
            <label
              >${t("draw.depth")}
              <input
                id="zh-room-h"
                type="number"
                step="0.01"
                min="0.3"
                .value=${i.h.toFixed(2)}
                @change=${s=>r(i.w,Number(s.target.value))}
              />m</label
            >`:h`<span class="hint">${t("draw.area_size",{m:Math.abs(this._area(e)).toFixed(1).replace(".",",")})}</span>`}
      ${this._vertex!==void 0&&e.points.length>3?h`<button
            class="btn ghost"
            @click=${()=>{let s=this._vertex;this._updateRoom(e.id,a=>a.points.splice(s,1)),this._vertex=void 0}}
          >
            ${t("draw.delete_point")}
          </button>`:u}
      <button class="btn ghost" @click=${()=>this._duplicateRoom()}>${t("draw.duplicate")}</button>
      <button class="btn ghost" @click=${()=>this._deleteRoom()}>${t("draw.delete_room")}</button>
    </div>`}_area(e){let t=0,i=e.points;for(let n=0;n<i.length;n++){let r=i[(n+1)%i.length];t+=i[n][0]*r[1]-r[0]*i[n][1]}return t/2}_unplaced(){let e=this.report?.topology;if(!e)return[];let t=this._placed,i=e.nodes.filter(n=>!t.has(n.ieee)).sort((n,r)=>n.name.localeCompare(r.name,void 0,{numeric:!0})).map(n=>({key:n.ieee,name:n.name}));return e.coordinator&&!t.has(Y)&&i.unshift({key:Y,name:this.t("coordinator")}),i}_renderDevicePanel(){let e=this.t,t=this._unplaced(),i=this._device,n=i?this._placed.get(i):void 0,r=i===Y?e("coordinator"):i?this._nodes.get(i)?.name:void 0;return h`<div class="panel">
      ${i&&r?h`<b>${r}</b>
            ${n?h`<span class="hint">${n.auto?e("draw.auto_placed"):e("draw.manual_placed")}</span>
                  ${n.auto?u:h`<button class="btn ghost" @click=${()=>this._setDevice(i,null)}>
                        ${e("draw.auto_again")}
                      </button>`}`:h`<span class="hint">${e("draw.click_to_place")}</span>`}`:h`<span class="hint">${e("draw.devices_help")}</span>`}
      ${t.length?h`<div style="flex-basis:100%">
            <div class="hint">${e("floor.unplaced",{n:t.length})}</div>
            <div class="chips">
              ${t.map(s=>h`<button
                  class="chip ${this._device===s.key?"on":""}"
                  draggable="true"
                  @dragstart=${a=>a.dataTransfer?.setData("text/plain",s.key)}
                  @click=${()=>this._device=s.key}
                >
                  ${s.name}
                </button>`)}
            </div>
          </div>`:u}
    </div>`}_renderFloorPanel(e){let t=this.t,i=n=>this._change(r=>{let s=r.floors.find(a=>a.id===e.id);s&&n(s)});return h`<div class="panel">
      <b>${t("draw.floor")}</b>
      <label
        >${t("draw.name")}
        <input
          id="zh-floor-name"
          type="text"
          .value=${e.name}
          @change=${n=>{let r=n.target.value.trim();r&&i(s=>s.name=r)}}
      /></label>
      ${this._haFloors.length?h`<label
            >${t("draw.ha_floor")}
            <select
              id="zh-floor-ha"
              @change=${n=>{let r=n.target.value||null,s=this._haFloors.find(a=>a.floor_id===r);i(a=>{a.floor_id=r,s&&(a.name=s.name)})}}
            >
              <option value="" ?selected=${!e.floor_id}>–</option>
              ${this._haFloors.map(n=>h`<option value=${n.floor_id} ?selected=${e.floor_id===n.floor_id}>${n.name}</option>`)}
            </select></label
          >`:u}
      <label
        >${t("draw.height")}
        <input
          id="zh-floor-height"
          type="number"
          step="0.05"
          min="1"
          max="10"
          .value=${e.height.toFixed(2)}
          @change=${n=>{let r=Number(n.target.value);r>=1&&r<=10&&i(s=>s.height=r)}}
        />m</label
      >
      <label class="ftab filebtn"
        >${this._images[e.id]?t("draw.bg_replace"):t("draw.bg_add")}
        <input type="file" accept="image/*" @change=${n=>this._uploadBackground(n)}
      /></label>
      ${e.background&&this._images[e.id]?h`<label
              >${t("draw.bg_width")}
              <input
                id="zh-bg-width"
                type="number"
                step="0.1"
                min="0.5"
                .value=${e.background.width.toFixed(1)}
                @change=${n=>{let r=Number(n.target.value);r>=.5&&i(s=>s.background&&(s.background.width=r))}}
              />m</label
            >
            <label
              >${t("draw.bg_opacity")}
              <input
                id="zh-bg-opacity"
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                .value=${String(e.background.opacity)}
                @change=${n=>{let r=Number(n.target.value);i(s=>s.background&&(s.background.opacity=r))}}
            /></label>
            <button class="btn ghost" @click=${()=>this._removeBackground(e.id)}>
              ${t("draw.bg_remove")}
            </button>`:u}
      <button
        class="btn ghost"
        @click=${()=>{if(!this._confirmDelete){this._confirmDelete=!0;return}this._confirmDelete=!1;let{[e.id]:n,...r}=this._images;this._images=r,this._change(s=>{s.floors=s.floors.filter(a=>a.id!==e.id);for(let[a,c]of Object.entries(s.positions))c.floor===e.id&&delete s.positions[a]}),this._floor=this._sortedFloors[0]?.id}}
      >
        ${this._confirmDelete?t("floor.confirm_delete"):t("floor.delete")}
      </button>
    </div>`}};z.styles=[V,F`
      :host {
        display: flex;
        flex-direction: column;
        gap: 10px;
        flex: 1;
        min-height: 0;
      }
      .toolbar,
      .panel,
      .hint,
      .start,
      .err {
        flex-shrink: 0;
      }
      .pulse,
      .spark,
      .virtual,
      .glyph {
        vector-effect: non-scaling-stroke;
      }
      .pulse.alarm {
        stroke-width: 3;
      }
      .toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
      }
      .toolbar .spacer {
        flex: 1;
      }
      .ftab {
        border: 1px solid var(--zh-line);
        background: none;
        color: var(--zh-text);
        font: inherit;
        font-size: 13px;
        padding: 5px 12px;
        border-radius: 999px;
        cursor: pointer;
        white-space: nowrap;
      }
      .ftab.on {
        background: var(--primary-color, #03a9f4);
        border-color: transparent;
        color: var(--text-primary-color, #fff);
      }
      .ftab.edit.on {
        background: var(--zh-ok);
      }
      .ftab:disabled {
        opacity: 0.4;
        cursor: default;
      }
      .tools {
        display: inline-flex;
        padding: 3px;
        gap: 2px;
        border-radius: 999px;
        background: var(--zh-surface);
      }
      .tools button {
        border: none;
        background: none;
        color: var(--zh-muted);
        font: inherit;
        font-size: 13px;
        padding: 5px 11px;
        border-radius: 999px;
        cursor: pointer;
      }
      .tools button.on {
        background: var(--zh-card);
        color: var(--zh-text);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
      }
      .canvas {
        position: relative;
        flex: 1;
        min-height: 300px;
        border-radius: 10px;
        overflow: hidden;
        background: var(--zh-surface);
      }
      .canvas svg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        touch-action: none;
        user-select: none;
      }
      .canvas.drawing svg {
        cursor: crosshair;
      }
      .grid-minor {
        stroke: var(--zh-line);
        stroke-width: 0.6;
        vector-effect: non-scaling-stroke;
        opacity: 0.5;
      }
      .grid-major {
        stroke: var(--zh-line);
        stroke-width: 1;
        vector-effect: non-scaling-stroke;
      }
      .zroom {
        stroke-width: 2;
        vector-effect: non-scaling-stroke;
        cursor: default;
      }
      .editing .zroom {
        cursor: move;
      }
      .zroom.focus {
        stroke: var(--primary-color, #03a9f4) !important;
        stroke-width: 4;
        animation: room-focus 1.6s ease-in-out infinite;
      }
      @keyframes room-focus {
        50% {
          stroke-opacity: 0.35;
        }
      }
      .zroom.sel {
        stroke: var(--primary-color, #03a9f4) !important;
        stroke-width: 3;
      }
      .ghost {
        fill: none;
        stroke: var(--zh-muted);
        stroke-dasharray: 4 4;
        stroke-width: 1.2;
        vector-effect: non-scaling-stroke;
        opacity: 0.6;
      }
      .room-name {
        font-size: 0.3px;
        font-weight: 600;
        fill: var(--zh-text);
        pointer-events: none;
        paint-order: stroke;
        stroke: var(--zh-card);
        stroke-width: 0.06px;
      }
      .room-area {
        font-size: 0.2px;
        fill: var(--zh-muted);
        pointer-events: none;
      }
      .dim-label {
        font-size: 0.22px;
        font-weight: 600;
        fill: var(--primary-color, #03a9f4);
        pointer-events: none;
        paint-order: stroke;
        stroke: var(--zh-card);
        stroke-width: 0.06px;
      }
      .handle {
        fill: var(--zh-card);
        stroke: var(--primary-color, #03a9f4);
        stroke-width: 2;
        vector-effect: non-scaling-stroke;
        cursor: grab;
      }
      .handle.on {
        fill: var(--primary-color, #03a9f4);
      }
      .mid {
        fill: var(--primary-color, #03a9f4);
        opacity: 0.5;
        cursor: copy;
      }
      .draft {
        fill: color-mix(in srgb, var(--primary-color, #03a9f4) 12%, transparent);
        stroke: var(--primary-color, #03a9f4);
        stroke-width: 2;
        stroke-dasharray: 6 4;
        vector-effect: non-scaling-stroke;
      }
      .edge {
        vector-effect: non-scaling-stroke;
        animation: none;
      }
      .edge.link {
        stroke-width: 1.4;
        opacity: 0.35;
      }
      .edge.parent {
        stroke-width: 2.2;
      }
      .planned-edge {
        vector-effect: non-scaling-stroke;
      }
      .portal-stub {
        fill: none;
        stroke-width: 2.4;
        stroke-dasharray: 5 5;
        vector-effect: non-scaling-stroke;
      }
      .portal {
        cursor: pointer;
      }
      .portal circle {
        fill: var(--zh-card);
        stroke: var(--zh-part);
        stroke-width: 2.5;
        vector-effect: non-scaling-stroke;
      }
      .portal path {
        fill: none;
        stroke: var(--zh-part);
        stroke-width: 2.5;
        vector-effect: non-scaling-stroke;
        stroke-linecap: round;
      }
      .portal text,
      .dev-label {
        font-size: 0.2px;
        fill: var(--zh-text);
        paint-order: stroke;
        stroke: var(--zh-card);
        stroke-width: 0.05px;
        pointer-events: none;
      }
      .portal text {
        fill: var(--zh-part);
        font-weight: 600;
      }
      .node .shape {
        stroke-width: 2;
        vector-effect: non-scaling-stroke;
      }
      .node.auto-place .shape {
        stroke-dasharray: none;
      }
      .node.dsel .shape {
        stroke: var(--primary-color, #03a9f4);
        stroke-width: 3.5;
      }
      .devices-mode .node {
        cursor: grab;
      }
      .panel {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        border-radius: 10px;
        background: var(--zh-surface);
        font-size: 13px;
      }
      .panel b {
        margin-right: 4px;
      }
      .panel label {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--zh-muted);
      }
      .panel input[type="text"],
      .panel input[type="number"],
      .panel select {
        font: inherit;
        font-size: 13px;
        padding: 5px 8px;
        border-radius: 8px;
        border: 1px solid var(--zh-line);
        background: var(--zh-card);
        color: var(--zh-text);
      }
      .panel input[type="number"] {
        width: 76px;
      }
      .panel input[type="text"] {
        width: 150px;
      }
      .panel .btn {
        margin-left: 0;
      }
      .hint {
        font-size: 12.5px;
        color: var(--zh-muted);
      }
      .start {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: 10px;
        padding: 30px 20px;
        border: 2px dashed var(--zh-line);
        border-radius: 14px;
      }
      .start h3 {
        margin: 0;
        font-size: 19px;
        font-weight: 500;
      }
      .start p {
        margin: 0;
        color: var(--zh-muted);
        max-width: 52ch;
        font-size: 13.5px;
      }
      .start .row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;
      }
      .start .btn {
        margin-left: 0;
      }
      .linkbtn {
        border: none;
        background: none;
        color: var(--primary-color, #03a9f4);
        font: inherit;
        font-size: 13px;
        cursor: pointer;
        padding: 0;
      }
      .chips {
        max-height: 90px;
        overflow-y: auto;
      }
      .filebtn input {
        display: none;
      }
      .filebtn {
        cursor: pointer;
      }
      .err {
        color: var(--zh-bad);
        font-size: 13px;
      }
    `],f([$({attribute:!1})],z.prototype,"hass",2),f([$({attribute:!1})],z.prototype,"report",2),f([$({attribute:!1})],z.prototype,"layout",2),f([$({attribute:!1})],z.prototype,"heat",2),f([$({attribute:!1})],z.prototype,"alerts",2),f([$({attribute:!1})],z.prototype,"plan",2),f([$({attribute:!1})],z.prototype,"marked",2),f([$({attribute:!1})],z.prototype,"t",2),f([$({attribute:!1})],z.prototype,"configEntryId",2),f([$({attribute:!1})],z.prototype,"live",2),f([b()],z.prototype,"_b",2),f([b()],z.prototype,"_floor",2),f([b()],z.prototype,"_edit",2),f([b()],z.prototype,"_tool",2),f([b()],z.prototype,"_room",2),f([b()],z.prototype,"_vertex",2),f([b()],z.prototype,"_device",2),f([b()],z.prototype,"_draft",2),f([b()],z.prototype,"_cursor",2),f([b()],z.prototype,"_rectStart",2),f([b()],z.prototype,"_vb",2),f([b()],z.prototype,"_hover",2),f([b()],z.prototype,"_legacy",2),f([b()],z.prototype,"_confirmDelete",2),f([b()],z.prototype,"_error",2),f([b()],z.prototype,"_images",2),z=f([I("zigbee-health-building")],z);var we;function _i(){if(window.zigbeeHealth3d)return Promise.resolve(window.zigbeeHealth3d.mount);if(!we){let d=new URL(import.meta.url),o=new URL("./zigbee-health-3d.js",d);o.search=d.search,we=import(o.href).then(()=>{if(!window.zigbeeHealth3d)throw new Error("3d bundle");return window.zigbeeHealth3d.mount}),we.catch(()=>we=void 0)}return we}var D=class extends T{constructor(){super(...arguments);this.heat={};this.alerts=[];this.t=e=>e;this.live=!0;this._status="loading";this._hidden=[];this._links=!0}firstUpdated(){this._init()}disconnectedCallback(){super.disconnectedCallback(),this._scene?.dispose(),this._scene=void 0}connectedCallback(){super.connectedCallback(),this.hasUpdated&&!this._scene&&this._building&&this._mount()}async _init(){if(this.hass){try{let e={type:"zigbee_health/building/get"};this.configEntryId&&(e.config_entry_id=this.configEntryId);let t=await this.hass.callWS(e);this._building=t.building,this._building&&ye(this._building.floors)}catch{this._building=null}if(!this._building?.floors.some(e=>e.rooms.length)){this._status="ready";return}await this._mount()}}async _mount(){try{let e=await _i();await this.updateComplete;let t=this.renderRoot.querySelector(".scene");if(!t||this._scene)return;this._scene=e(t,this._data(),{hover:(i,n,r)=>this._hover=i?{ieee:i,x:n,y:r}:void 0,click:i=>Le(this,i)}),this._status="ready"}catch{this._status="failed"}}_placedRecord(){let e=[this._building,this.report?.topology];if(this._placed&&this._placed.key[0]===e[0]&&this._placed.key[1]===e[1])return this._placed.value;let t=Object.fromEntries(De(this._building,this.report?.topology?.nodes??[]));return this._placed={key:e,value:t},t}_data(){let e=getComputedStyle(this),t=(i,n)=>e.getPropertyValue(i).trim()||n;return{building:this._building,placed:this._placedRecord(),coordinatorKey:Y,topology:this.report?.topology??{coordinator:null,nodes:[],links:[],unknown_parent:[],unknown_neighbors:[]},heat:this.live?this.heat:{},alerts:this.alerts,hidden:this._hidden,showLinks:this._links,focus:this.marked?{ieees:this.marked.ieees,areas:this.marked.areas}:null,colors:{good:t("--zh-good","#43a047"),ok:t("--zh-ok","#ffa000"),bad:t("--zh-bad","#db4437"),info:t("--zh-info","#039be5"),part:t("--zh-part","#8e6bd8"),muted:t("--zh-muted","#727272")},dark:this.hass?.themes?.darkMode??window.matchMedia?.("(prefers-color-scheme: dark)").matches??!1,coordinatorName:this.t("coordinator")}}updated(e){this._scene&&["report","heat","alerts","_hidden","_links","live","hass","marked"].some(t=>e.has(t))&&this._scene.update(this._data())}spark(e,t){if(!this._scene||!this.layout)return;let i=this.report?.topology?.coordinator?.ieee,n=K(this.layout,e);i&&n[n.length-1]!==i||window.setTimeout(()=>this._scene?.spark(n),t)}render(){let e=this.t,t=[...this._building?.floors??[]].sort((n,r)=>r.elevation-n.elevation),i=this._building!==void 0&&!this._building?.floors.some(n=>n.rooms.length);return h`${t.length&&!i?h`<div class="toolbar">
            ${t.map(n=>h`<button
                class="ftab ${this._hidden.includes(n.id)?"":"on"}"
                @click=${()=>this._hidden=this._hidden.includes(n.id)?this._hidden.filter(r=>r!==n.id):[...this._hidden,n.id]}
              >
                ${n.name}
              </button>`)}
            <button class="ftab ${this._links?"on":""}" @click=${()=>this._links=!this._links}>
              ${e("3d.links")}
            </button>
            <span class="spacer"></span>
            <button class="ftab" @click=${()=>this._scene?.reset()}>${e("3d.reset")}</button>
          </div>`:u}
      <div class="stage">
        <div class="scene"></div>
        ${i?h`<div class="msg">${e("3d.empty")}</div>`:this._status==="loading"?h`<div class="msg">${e("3d.loading")}</div>`:this._status==="failed"?h`<div class="msg">${e("3d.failed")}</div>`:h`<div class="hint">${e("3d.hint")}</div>`}
        ${this._renderTip()}
      </div>`}_renderTip(){let e=this._hover;if(!e)return u;let t=this.t,i=this.report?.topology;if(e.ieee===i?.coordinator?.ieee)return h`<div class="tip" style="left:${e.x}px;top:${e.y}px"><b>${t("coordinator")}</b></div>`;let n=i?.nodes.find(s=>s.ieee===e.ieee);if(!n)return u;let r=n.parent===i?.coordinator?.ieee?t("coordinator"):i?.nodes.find(s=>s.ieee===n.parent)?.name;return h`<div class="tip" style="left:${e.x}px;top:${e.y}px">
      <b>${n.name}</b>
      <div class="k">${n.type==="router"?t(`kind.${n.kind??"always_on"}`):t("end_device")}${n.area?` \xB7 ${n.area}`:""}</div>
      <span class="pill">${t(`state.${n.state}`)}</span>
      ${r?h`<div class="row"><span class="k">${t("parent")}</span><span>${r}${n.parent_lqi?` \xB7 LQI ${n.parent_lqi}`:""}</span></div>`:u}
    </div>`}};D.styles=[V,F`
      :host {
        display: flex;
        flex-direction: column;
        gap: 10px;
        flex: 1;
        min-height: 0;
      }
      .toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
      }
      .toolbar .spacer {
        flex: 1;
      }
      .ftab {
        border: 1px solid var(--zh-line);
        background: none;
        color: var(--zh-text);
        font: inherit;
        font-size: 13px;
        padding: 5px 12px;
        border-radius: 999px;
        cursor: pointer;
      }
      .ftab.on {
        background: var(--primary-color, #03a9f4);
        border-color: transparent;
        color: var(--text-primary-color, #fff);
      }
      .stage {
        position: relative;
        flex: 1;
        min-height: 320px;
        border-radius: 10px;
        overflow: hidden;
        background: radial-gradient(ellipse at 50% 30%, var(--zh-card), var(--zh-surface));
      }
      .scene {
        position: absolute;
        inset: 0;
      }
      .hint {
        position: absolute;
        left: 12px;
        bottom: 10px;
        font-size: 12px;
        color: var(--zh-muted);
        pointer-events: none;
      }
      .msg {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--zh-muted);
        text-align: center;
        padding: 20px;
      }
    `],f([$({attribute:!1})],D.prototype,"hass",2),f([$({attribute:!1})],D.prototype,"report",2),f([$({attribute:!1})],D.prototype,"layout",2),f([$({attribute:!1})],D.prototype,"heat",2),f([$({attribute:!1})],D.prototype,"alerts",2),f([$({attribute:!1})],D.prototype,"t",2),f([$({attribute:!1})],D.prototype,"configEntryId",2),f([$({attribute:!1})],D.prototype,"live",2),f([$({attribute:!1})],D.prototype,"marked",2),f([b()],D.prototype,"_building",2),f([b()],D.prototype,"_status",2),f([b()],D.prototype,"_hidden",2),f([b()],D.prototype,"_links",2),f([b()],D.prototype,"_hover",2),D=f([I("zigbee-health-3d")],D);var B=class extends T{constructor(){super(...arguments);this.t=e=>e;this._busy=null;this._name="";this._confirmRemove=!1;this._force=!1;this._onKey=e=>{e.key==="Escape"&&this._close()}}connectedCallback(){super.connectedCallback(),window.addEventListener("keydown",this._onKey)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("keydown",this._onKey)}willUpdate(e){e.has("ieee")&&(this._name=this._node?.name??"",this._confirmRemove=!1,this._force=this._node?.state==="dead",this._error=void 0,this._done=void 0)}get _node(){return this.report?.topology?.nodes.find(e=>e.ieee===this.ieee)}get _admin(){return this.hass?.user?.is_admin??!0}_close(){this.dispatchEvent(new CustomEvent("close"))}async _run(e,t,i){if(!this.hass||!this.ieee)return!1;this._busy=e,this._error=void 0,this._done=void 0;try{let n={type:"zigbee_health/device/update",ieee:this.ieee,...t};return this.configEntryId&&(n.config_entry_id=this.configEntryId),await this.hass.callWS(n),this._done=i,this.dispatchEvent(new CustomEvent("changed")),!0}catch(n){let r=String(n?.message??n);return this._error=this.t("device.failed",{error:r}),!1}finally{this._busy=null}}async _remove(){let e=this._node?.name??"";await this._run("remove",{action:"remove",force:this._force},"")&&(this.dispatchEvent(new CustomEvent("removed",{detail:{name:e}})),this._close())}render(){let e=this._node;return this.ieee?h`<div class="backdrop" @click=${()=>this._close()}></div>
      <aside class="drawer" role="dialog" aria-label=${e?.name??""}>
        ${e?this._renderNode(e):this._renderGone()}
      </aside>`:u}_renderGone(){return h`<div class="head">
        <div class="grow"><h2>${this.t("device.gone")}</h2></div>
        <button class="close" @click=${()=>this._close()} aria-label=${this.t("device.close")}>×</button>
      </div>`}_renderNode(e){let t=this.t,i=this.report?.topology,n=e.type==="router",r=e.parent===i?.coordinator?.ieee?t("coordinator"):i?.nodes.find(c=>c.ieee===e.parent)?.name,s=(this.report?.findings??[]).filter(c=>c.ieee===e.ieee),a=e.state==="dead"?"var(--zh-bad)":e.state==="ok"?"var(--zh-good)":e.state==="part_time_router"?"var(--zh-part)":e.state==="weak"||e.state==="battery"?"var(--zh-ok)":"var(--zh-muted)";return h`<div class="head">
        <span class="dot ${n?"router":""}" style="color:${a}"></span>
        <div class="grow">
          <h2>${e.name}</h2>
          <div class="sub">
            ${t(n?`kind.${e.kind??"always_on"}`:"end_device")} · ${t(`state.${e.state}`)}
          </div>
        </div>
        <button class="close" @click=${()=>this._close()} aria-label=${t("device.close")}>×</button>
      </div>
      <div class="body">
        <section>
          <div class="facts">
            <span class="k">${t("last_seen")}</span><span>${Q(e.last_seen,t)}</span>
            <span class="k">${t("device.area")}</span><span>${e.area??"\u2013"}</span>
            ${r?h`<span class="k">${t("parent")}</span>
                  <span>${r}${e.parent_lqi?` \xB7 LQI ${e.parent_lqi}`:""}</span>`:u}
            ${n?h`<span class="k">${t("device.children")}</span><span>${e.children.length}</span>`:u}
            ${e.battery!==null?h`<span class="k">${t("device.battery")}</span><span>${e.battery} %</span>`:u}
          </div>
        </section>
        ${s.length?h`<section>
              <h3>${t("device.findings")}</h3>
              ${s.map(c=>h`<div class="finding sev-${c.severity}">${t(`finding.${c.type}`,c.placeholders)}</div>`)}
            </section>`:u}
        ${this._done?h`<div class="msg ok">${this._done}</div>`:u}
        ${this._error?h`<div class="msg err">${this._error}</div>`:u}
        ${this._admin?this._renderActions(e):h`<div class="note">${t("device.admin_only")}</div>`}
        ${e.device_id?h`<button class="link" @click=${()=>xe(`/config/devices/device/${e.device_id}`)}>
              ${t("device.open_ha")} →
            </button>`:u}
      </div>`}_renderActions(e){let t=this.t,i=this.report?.topology?.areas??[],n=e.state==="ignored";return h`<section>
        <h3>${t("device.area")}</h3>
        <div class="row">
          <select
            id="zh-dev-area"
            ?disabled=${this._busy!==null||!e.device_id}
            @change=${r=>{let s=r.target.value||null,a=i.find(c=>c.area_id===s)?.name??"\u2013";this._run("area",{action:"area",area_id:s},t("device.area_done",{area:a}))}}
          >
            <option value="" ?selected=${!e.area_id}>${t("draw.no_area_option")}</option>
            ${i.map(r=>h`<option value=${r.area_id} ?selected=${e.area_id===r.area_id}>${r.name}</option>`)}
          </select>
        </div>
        <div class="note">${t("device.area_note")}</div>
      </section>
      <section>
        <h3>${t("device.name")}</h3>
        <div class="row">
          <input
            id="zh-dev-name"
            type="text"
            maxlength="100"
            .value=${this._name}
            @input=${r=>this._name=r.target.value}
            @keydown=${r=>r.key==="Enter"&&this._rename(e)}
          />
          <button
            class="btn"
            ?disabled=${this._busy!==null||!this._name.trim()||this._name.trim()===e.name}
            @click=${()=>this._rename(e)}
          >
            ${this._busy==="rename"?"\u2026":t("device.rename")}
          </button>
        </div>
        <div class="note">${t("device.rename_note")}</div>
      </section>
      <section>
        <h3>${t("device.monitoring")}</h3>
        <div class="row">
          <button
            class="btn ghost"
            ?disabled=${this._busy!==null}
            @click=${()=>this._run("ignore",{action:n?"unignore":"ignore"},t(n?"device.unignore_done":"device.ignore_done"))}
          >
            ${t(n?"device.unignore":"device.ignore")}
          </button>
        </div>
        <div class="note">${t(n?"device.unignore_note":"device.ignore_note")}</div>
      </section>
      <section>
        <h3>${t("device.remove_title")}</h3>
        ${this._confirmRemove?h`<div class="danger">
              <b>${t("device.remove_confirm",{name:e.name})}</b>
              <div class="note">${t("device.remove_note")}</div>
              <label>
                <input
                  type="checkbox"
                  .checked=${this._force}
                  @change=${r=>this._force=r.target.checked}
                />
                <span>${t("device.force")}</span>
              </label>
              <div class="row">
                <button class="btn ghost" ?disabled=${this._busy!==null} @click=${()=>this._confirmRemove=!1}>
                  ${t("device.cancel")}
                </button>
                <button class="btn bad" ?disabled=${this._busy!==null} @click=${()=>this._remove()}>
                  ${this._busy==="remove"?t("device.removing"):t("device.remove")}
                </button>
              </div>
            </div>`:h`<button class="btn outline-bad" @click=${()=>this._confirmRemove=!0}>
              ${t("device.remove")} …
            </button>`}
      </section>`}_rename(e){let t=this._name.trim();!t||t===e.name||this._busy||this._run("rename",{action:"rename",name:t},this.t("device.rename_done",{name:t}))}};B.styles=[V,F`
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.25);
        z-index: 20;
        animation: fade 0.2s ease both;
      }
      .drawer {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(400px, 100vw);
        z-index: 21;
        background: var(--zh-card);
        color: var(--zh-text);
        box-shadow: -8px 0 30px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        animation: slide 0.25s ease both;
        padding-top: env(safe-area-inset-top, 0px);
        padding-bottom: env(safe-area-inset-bottom, 0px);
      }
      @keyframes slide {
        from {
          transform: translateX(100%);
        }
      }
      @keyframes fade {
        from {
          opacity: 0;
        }
      }
      .head {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 18px 18px 12px;
        border-bottom: 1px solid var(--zh-line);
      }
      .head .dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        margin-top: 6px;
        flex: none;
        background: currentColor;
      }
      .head .router {
        border-radius: 4px;
      }
      .head h2 {
        margin: 0;
        font-size: 19px;
        font-weight: 500;
        word-break: break-word;
      }
      .head .sub {
        font-size: 13px;
        color: var(--zh-muted);
        margin-top: 2px;
      }
      .head .grow {
        flex: 1;
        min-width: 0;
      }
      .close {
        border: none;
        background: none;
        color: var(--zh-muted);
        font-size: 24px;
        line-height: 1;
        cursor: pointer;
        padding: 2px 6px;
      }
      .body {
        flex: 1;
        overflow-y: auto;
        padding: 14px 18px 24px;
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      h3 {
        margin: 0 0 8px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--zh-muted);
      }
      .facts {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 6px 14px;
        font-size: 14px;
      }
      .facts .k {
        color: var(--zh-muted);
      }
      .finding {
        padding: 8px 10px;
        border-radius: 8px;
        background: var(--zh-surface);
        border-left: 3px solid var(--zh-muted);
        font-size: 13.5px;
        margin-bottom: 6px;
      }
      .finding.sev-critical {
        border-left-color: var(--zh-bad);
      }
      .finding.sev-warning {
        border-left-color: var(--zh-ok);
      }
      .row {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .row > input,
      .row > select {
        flex: 1;
        min-width: 0;
        font: inherit;
        font-size: 14px;
        padding: 8px 10px;
        border-radius: 8px;
        border: 1px solid var(--zh-line);
        background: var(--zh-card);
        color: var(--zh-text);
      }
      .row .btn {
        margin-left: 0;
        white-space: nowrap;
      }
      .note {
        font-size: 12.5px;
        color: var(--zh-muted);
        margin-top: 6px;
      }
      .danger {
        border: 1px solid color-mix(in srgb, var(--zh-bad) 40%, transparent);
        background: color-mix(in srgb, var(--zh-bad) 7%, var(--zh-card));
        border-radius: 10px;
        padding: 12px;
        font-size: 13.5px;
      }
      .danger label {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        margin: 10px 0;
        font-size: 13px;
      }
      .btn:disabled {
        opacity: 0.45;
        cursor: default;
      }
      .btn.bad {
        background: var(--zh-bad);
        color: #fff;
      }
      .btn.outline-bad {
        background: none;
        color: var(--zh-bad);
        border: 1px solid color-mix(in srgb, var(--zh-bad) 50%, transparent);
      }
      .msg {
        font-size: 13px;
        padding: 8px 10px;
        border-radius: 8px;
      }
      .msg.err {
        color: var(--zh-bad);
        background: color-mix(in srgb, var(--zh-bad) 8%, transparent);
      }
      .msg.ok {
        color: var(--zh-good);
        background: color-mix(in srgb, var(--zh-good) 10%, transparent);
      }
      .link {
        border: none;
        background: none;
        color: var(--primary-color, #03a9f4);
        font: inherit;
        font-size: 14px;
        cursor: pointer;
        padding: 0;
        text-align: left;
      }
    `],f([$({attribute:!1})],B.prototype,"hass",2),f([$({attribute:!1})],B.prototype,"report",2),f([$({attribute:!1})],B.prototype,"ieee",2),f([$({attribute:!1})],B.prototype,"t",2),f([$({attribute:!1})],B.prototype,"configEntryId",2),f([b()],B.prototype,"_busy",2),f([b()],B.prototype,"_error",2),f([b()],B.prototype,"_done",2),f([b()],B.prototype,"_name",2),f([b()],B.prototype,"_confirmRemove",2),f([b()],B.prototype,"_force",2),B=f([I("zigbee-health-device")],B);var H=class extends T{constructor(){super(...arguments);this.narrow=!1}firstUpdated(){this.renderRoot.querySelector("zigbee-health-card")?.setConfig({type:"custom:zigbee-health-card",config_entry_id:this.panel?.config?.config_entry_id})}render(){return h`<div class="toolbar">
        <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
        <div class="title">${this.panel?.config?.title??"Zigbee Health"}</div>
      </div>
      <div class="content">
        <zigbee-health-card
          .hass=${this.hass}
          .panelMode=${!0}
          .narrow=${this.narrow}
        ></zigbee-health-card>
      </div>`}};H.styles=F`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--primary-background-color, #fafafa);
      color: var(--primary-text-color);
      font-family: var(--paper-font-body1_-_font-family, Roboto, system-ui, sans-serif);
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 56px;
      padding: 0 12px;
      padding-top: env(safe-area-inset-top, 0px);
      box-sizing: content-box;
      flex: none;
      background: var(--app-header-background-color, var(--primary-color, #03a9f4));
      color: var(--app-header-text-color, #fff);
      border-bottom: var(--app-header-border-bottom, none);
    }
    .title {
      font-size: 20px;
      font-weight: 400;
      margin-left: 8px;
    }
    .content {
      flex: 1;
      min-height: 0;
      padding: 16px;
      box-sizing: border-box;
      overflow: auto;
    }
    zigbee-health-card {
      display: block;
      height: 100%;
    }
  `,f([$({attribute:!1})],H.prototype,"hass",2),f([$({type:Boolean})],H.prototype,"narrow",2),f([$({attribute:!1})],H.prototype,"panel",2),H=f([I("zigbee-health-panel")],H);var vi={title:"Zigbee-Netz",loading:"Lade Auswertung \u2026",not_ready:"Die erste Auswertung l\xE4uft noch (Datensammlung nach dem Start).",error:"Bericht konnte nicht geladen werden","level.stable":"Stabil","level.degraded":"Mit Aussetzern zu rechnen","level.fragile":"Fragil","level.paused":"Pausiert \u2013 Zigbee2MQTT offline",devices:"Ger\xE4te",last_scan:"Letzter Scan",never:"noch nie","tab.map":"Netzkarte","tab.actions":"Ma\xDFnahmen","tab.findings":"Befunde","tab.rooms":"R\xE4ume","tab.devices":"Ger\xE4te",search:"Ger\xE4t oder Raum suchen \u2026","tile.dead":"Tot","tile.offline":"Offline","tile.routers_part_time":"Teilzeit-Router","tile.battery_critical":"Batterie","tile.weak_links":"Schwach","tile.routers_always_on":"Router aktiv","state.ok":"OK","state.weak":"Schwache Verbindung","state.battery":"Batterie","state.offline":"Offline","state.dead":"Tot","state.part_time_router":"Teilzeit-Router","state.ignored":"Ignoriert","kind.always_on":"Router, dauerhaft aktiv","kind.part_time":"Teilzeit-Router","kind.unclear":"Router, im letzten Scan nicht erreichbar",end_device:"Batterieger\xE4t",coordinator:"Koordinator",parent:"Verbunden \xFCber",battery:"Batterie",battery_empty:"Batterie leer ca.",last_seen:"Zuletzt gesehen",area:"Raum",children:"Kinder",labels:"Namen",live:"Live",per_minute:"{n} Nachr./min","tab.plan":"Planer","view.map":"Netzkarte","view.floor":"Grundriss","floor.empty_title":"Dein Netz auf dem Grundriss","floor.empty_text":"Lade einen Grundriss hoch \u2013 eine Zeichnung, ein Foto oder ein Screenshot aus einem Planungs-Tool \u2013 und ziehe die Ger\xE4te an ihren Platz. Danach siehst du Funkwege, Live-Verkehr und Probleme direkt in deiner Wohnung.","floor.upload":"Grundriss hochladen","floor.uploading":"Wird hochgeladen \u2026","floor.admin_only":"Einen Grundriss kann ein Administrator hochladen.","floor.default_name":"Etage {n}","floor.add":"Etage","floor.edit":"Bearbeiten","floor.done":"Fertig","floor.unplaced":"Noch nicht platziert \xB7 {n}","floor.unplaced_hint":"{n} Ger\xE4te sind noch nicht platziert \u2013 \xFCber \u201EBearbeiten\u201C auf den Plan ziehen.","floor.place_hint":"Ger\xE4t auf den Plan ziehen \u2013 oder antippen und dann auf die Stelle tippen. Platzierte Ger\xE4te lassen sich verschieben.","floor.remove":"Vom Plan entfernen","floor.replace":"Bild ersetzen","floor.delete":"Etage l\xF6schen","floor.confirm_delete":"Wirklich l\xF6schen?","floor.building":"Geb\xE4ude","floor.all_floors":"auch andere Etagen ({n})","floor.no_link":"Keine HA-Etage","floor.linked":"HA-Etage: {name}","device.close":"Schlie\xDFen","device.gone":"Ger\xE4t nicht mehr im Netz","device.area":"Bereich","device.children":"Angebundene Ger\xE4te","device.battery":"Batterie","device.findings":"Befunde","device.admin_only":"\xC4ndern kann ein Administrator.","device.open_ha":"In Home Assistant \xF6ffnen","device.area_note":"Das Ger\xE4t steht danach auf dem Grundriss im passenden Raum.","device.area_done":"Bereich gesetzt: {area}","device.name":"Name","device.rename":"Umbenennen","device.rename_note":"Benennt das Ger\xE4t in Zigbee2MQTT und die Entit\xE4ten in Home Assistant um.","device.rename_done":"Umbenannt in \u201E{name}\u201C","device.monitoring":"\xDCberwachung","device.ignore":"Ger\xE4t ignorieren","device.unignore":"Wieder \xFCberwachen","device.ignore_note":"F\xFCr Ger\xE4te, die absichtlich aus sind (z. B. Weihnachtsdeko). Es erzeugt dann keine Befunde mehr.","device.unignore_note":"Das Ger\xE4t wird im Moment ignoriert und erzeugt keine Befunde.","device.ignore_done":"Ger\xE4t wird ignoriert","device.unignore_done":"Ger\xE4t wird wieder \xFCberwacht","device.remove_title":"Aus Zigbee2MQTT entfernen","device.remove":"Entfernen","device.remove_confirm":"\u201E{name}\u201C wirklich aus Zigbee2MQTT entfernen?","device.remove_note":"Das Ger\xE4t verschwindet aus Zigbee2MQTT und Home Assistant. Um es wieder zu nutzen, musst du es neu anlernen.","device.force":"Erzwingen \u2013 n\xF6tig, wenn das Ger\xE4t nicht mehr antwortet (bei toten Ger\xE4ten vorausgew\xE4hlt)","device.cancel":"Abbrechen","device.removing":"Wird entfernt \u2026","device.removed":"\u201E{name}\u201C wurde entfernt","device.failed":"Hat nicht geklappt: {error}","focus.show":"Zeigen","focus.planner":"Im Planer ansehen","focus.remove_in_repairs":"Entfernen \u2026","focus.marked":"{n} Ger\xE4te markiert","focus.rooms":"{n} R\xE4ume","focus.clear":"Markierung aufheben","view.3d":"3D","draw.start_title":"Zeichne dein Zuhause","draw.start_text":"Zeichne die R\xE4ume als Rechtecke oder freie Formen, Ma\xDFe in Metern. Verkn\xFCpfe jeden Raum mit einem Home-Assistant-Bereich \u2013 die Ger\xE4te stellen sich dann von selbst hinein. Mehrere Etagen, 3D-Ansicht zum Drehen inklusive.","draw.start":"Grundriss zeichnen","draw.use_image":"Stattdessen ein Bild als Grundriss verwenden","draw.back":"Zur\xFCck zum gezeichneten Grundriss","draw.floor_name":"Etage {n}","draw.room_name":"Raum {n}","draw.tool_select":"Ausw\xE4hlen","draw.tool_rect":"Rechteck","draw.tool_poly":"Freie Form","draw.tool_devices":"Ger\xE4te","draw.undo":"R\xFCckg\xE4ngig","draw.fit":"Einpassen","draw.help_select":"Raum anklicken zum Bearbeiten \xB7 Ecken ziehen \xB7 Punkt auf einer Kante zieht eine neue Ecke \xB7 Entf l\xF6scht","draw.help_rect":"Rechteck aufziehen \u2013 rastet an Ecken anderer R\xE4ume ein. Ma\xDFe danach exakt eintippen.","draw.help_poly":"Ecken nacheinander klicken \xB7 Doppelklick, Enter oder erster Punkt schlie\xDFt den Raum \xB7 Esc bricht ab","draw.help_devices":"Ger\xE4te verschieben oder aus der Liste auf den Plan ziehen","draw.room":"Raum","draw.name":"Name","draw.area":"Bereich","draw.no_area":"kein Bereich verkn\xFCpft","draw.no_area_option":"\u2013 kein Bereich \u2013","draw.width":"Breite","draw.depth":"Tiefe","draw.area_size":"{m} m\xB2","draw.delete_point":"Ecke l\xF6schen","draw.duplicate":"Duplizieren","draw.delete_room":"Raum l\xF6schen","draw.floor":"Etage","draw.ha_floor":"HA-Etage","draw.height":"Raumh\xF6he","draw.bg_add":"Bild hinterlegen","draw.bg_replace":"Bild ersetzen","draw.bg_width":"Bildbreite","draw.bg_opacity":"Deckkraft","draw.bg_remove":"Bild entfernen","draw.auto_placed":"automatisch im Raum seines Bereichs","draw.manual_placed":"von Hand platziert","draw.auto_again":"Wieder automatisch","draw.click_to_place":"Auf den Plan klicken, um es abzulegen","draw.devices_help":"Ger\xE4te stehen automatisch im Raum ihres Bereichs. Zum Feintunen einfach verschieben.","draw.hint_link":"{n} R\xE4ume sind noch mit keinem Bereich verkn\xFCpft. ","draw.hint_unplaced":"{n} Ger\xE4te haben noch keinen Platz (kein Bereich oder Raum fehlt).","3d.hint":"Ziehen zum Drehen \xB7 Rechtsklick oder zwei Finger zum Verschieben \xB7 Mausrad oder Zwei-Finger-Geste zum Zoomen","3d.empty":"F\xFCr die 3D-Ansicht zuerst unter \u201EGrundriss\u201C die R\xE4ume zeichnen.","3d.loading":"3D wird geladen \u2026","3d.failed":"3D-Ansicht konnte nicht geladen werden.","3d.reset":"Ansicht zur\xFCcksetzen","3d.links":"Funkwege","check.button":"Netz-Check","check.first_title":"Dein erster Netz-Check l\xE4uft","check.found":"{n} Zigbee-Ger\xE4te gefunden","check.scanning":"Netzwerkkarte wird erstellt","check.ready_in":"Auswertung in {time}","check.almost":"Gleich fertig \u2026","check.now":"Jetzt auswerten","check.step.coordinator":"Koordinator verbunden","check.step.devices":"{n} Ger\xE4te gefunden","check.step.routers":"Router und Wandschalter gepr\xFCft","check.step.links":"Funkverbindungen bewertet","check.step.batteries":"Batterien gepr\xFCft","check.step.measures":"Ma\xDFnahmen berechnet","check.of":"von 100","check.todo":"{n} Dinge, die dein Netz sp\xFCrbar verbessern:","check.todo_one":"Eine Sache, die dein Netz sp\xFCrbar verbessert:","check.nothing":"Alles im gr\xFCnen Bereich \u2013 nichts zu tun.","check.scan_started":"Die Netzwerkkarte wird im Hintergrund aktualisiert (dauert einige Minuten).","check.to_map":"Netzkarte ansehen","check.to_actions":"Ma\xDFnahmen","check.to_plan":"Router-Planer","plan.loading":"Simuliere jeden Raum \u2026","plan.no_areas":"Weise deinen Zigbee-Ger\xE4ten R\xE4ume zu \u2013 der Planer rechnet pro Raum.","plan.title":"Wo bringt die n\xE4chste Zigbee-Steckdose am meisten?","plan.subtitle":"Simulation mit deinem echten Netz \u2013 es wird nichts ver\xE4ndert.","plan.all_good":"Alle R\xE4ume sind gut versorgt \u2013 eine weitere Steckdose bringt kaum etwas.","plan.best":"beste Wahl","plan.improved":"{n} Ger\xE4te bekommen eine bessere Verbindung","plan.improved_one":"1 Ger\xE4t bekommt eine bessere Verbindung","plan.no_devices":"Keine Ger\xE4te mit schlechter Verbindung","plan.room_score":"Raum","plan.network":"Netz +{n}","plan.virtual":"Neue Steckdose \xB7 {room}","plan.banner":"Plan: Zigbee-Steckdose in {room}","plan.discard":"Verwerfen","plan.resolved.room_without_router":"behebt \u201Ekein Router im Raum\u201C","plan.resolved.weak_link":"{n}\xD7 schwache Verbindung weg","plan.resolved.children_on_part_time_router":"unabh\xE4ngig vom Wandschalter","plan.resolved.too_few_routers":"genug Router im Netz","plan.resolved.overloaded_parent":"entlastet einen Router","plan.resolved.part_time_router":"Teilzeit-Router entsch\xE4rft","plan.resolved.disappeared":"{n} Ger\xE4te wieder erreichbar","alert.title":"{name} ist ausgeschaltet","alert.children":"{n} Ger\xE4te verlieren ihre Verbindung: {names}","alert.child":"{names} verliert die Verbindung","alert.no_children":"Router nicht erreichbar \u2013 Ger\xE4te in der N\xE4he betroffen",legend_lqi:"Linkqualit\xE4t",legend_good:"gut",legend_ok:"mittel",legend_bad:"schwach",unreachable:"Nicht erreichbar",unknown_parent:"Eltern-Router unbekannt",days_ago:"vor {n} T.",hours_ago:"vor {n} Std.",minutes_ago:"vor {n} Min.",just_now:"gerade eben",no_actions:"Nichts zu tun \u2013 dein Netz ist in Ordnung.",no_findings:"Keine offenen Befunde.",no_rooms:"Weise deinen Zigbee-Ger\xE4ten R\xE4ume zu, um die Raum-Auswertung zu sehen.",open_repairs:"Beheben",scan_now:"Jetzt scannen",scan_started:"Scan gestartet \u2013 dauert einige Minuten",refresh:"Aktualisieren","severity.critical":"Kritisch","severity.warning":"Warnung","severity.info":"Info","room.end_devices":"Batterieger\xE4te","room.always_on":"Router aktiv","room.part_time":"Teilzeit","room.weakest":"Schw\xE4chste LQI","room.without_area":"Ohne Raum","rec.add_router":"Zigbee-Steckdose oder anderen immer aktiven Router erg\xE4nzen","rec.fix_part_time_router":"Teilzeit-Router dauerhaft mit Strom versorgen","rec.assign_area":"Ger\xE4ten einen Raum zuweisen","action.remove_dead":"{count} tote Ger\xE4te aus Zigbee2MQTT entfernen","action.replace_batteries":"{count} Batterien tauschen","action.power_part_time_routers":"{count} Teilzeit-Router dauerhaft mit Strom versorgen","action.add_router_rooms":"Router in {count} R\xE4umen erg\xE4nzen","action.add_routers":"{count} weitere dauerhaft aktive Router erg\xE4nzen","action.improve_backbone":"Anbindung von {count} Routern verbessern","action.check_disappeared":"{count} verschwundene Ger\xE4te pr\xFCfen","action.improve_weak_links":"{count} schwache Verbindungen verbessern","action.reduce_reporting":"Meldeintervall von {count} Ger\xE4ten reduzieren","action.check_unstable":"{count} instabile Ger\xE4te pr\xFCfen","action.hint.remove_dead":"Tote Ger\xE4te bremsen die Netzwerkkarte und verwirren Automationen. \xDCber \u201EBeheben\u201C gesammelt entfernen.","action.hint.replace_batteries":"Leere Batterien sind der h\xE4ufigste Grund f\xFCr Aussetzer.","action.hint.power_part_time_routers":"Lampen am Wandschalter rei\xDFen L\xFCcken ins Netz. Dauerstrom oder Zigbee-Taster statt Schalter.","action.hint.add_router_rooms":"Eine Zigbee-Steckdose pro Raum macht Batterieger\xE4te deutlich stabiler.","action.hint.add_routers":"Empfohlen: h\xF6chstens 8 Batterieger\xE4te pro dauerhaft aktivem Router.","action.hint.improve_backbone":"Router dazwischen setzen oder Koordinator zentraler platzieren.","action.hint.check_disappeared":"Batterie oder Stromversorgung pr\xFCfen.","action.hint.improve_weak_links":"Router n\xE4her an die Ger\xE4te stellen.","action.hint.reduce_reporting":"Reporting in Zigbee2MQTT reduzieren.","action.hint.check_unstable":"Eltern-Router und Firmware pr\xFCfen.","finding.dead_device":"{name} nicht erreichbar","finding.disappeared":"{name} meldet sich nicht mehr","finding.battery_low":"Batterie von {name} vermutlich leer","finding.battery_forecast":"Batterie von {name} bald leer","finding.part_time_router":"{name} wird regelm\xE4\xDFig ausgeschaltet","finding.children_on_part_time_router":"{count} Ger\xE4te h\xE4ngen an {name}","finding.weak_link":"Schwache Verbindung von {name}","finding.weak_backbone":"{name} schlecht angebunden","finding.degradation":"Verbindung von {name} wird schlechter","finding.unstable_device":"{name} ist instabil","finding.message_flood":"{name} sendet sehr viel","finding.network_message_flood":"Sehr viel Funkverkehr","finding.overloaded_parent":"{name} versorgt viele Ger\xE4te","finding.room_without_router":"Kein dauerhaft aktiver Router in {room}","finding.too_few_routers":"Zu wenige Router im Netz","finding.prerequisite_missing":"Z2M-Option \u201E{option}\u201C ausgeschaltet","finding.outdated_firmware":"Koordinator-Firmware veraltet","finding.interview_incomplete":"{name} nicht vollst\xE4ndig angelernt","finding.unsupported_device":"{name} wird nicht unterst\xFCtzt","finding.devices_without_area":"{count} Ger\xE4te ohne Raum"},Tt={title:"Zigbee network",loading:"Loading analysis \u2026",not_ready:"The first analysis is still running (data collection after start).",error:"Could not load the report","level.stable":"Stable","level.degraded":"Expect dropouts","level.fragile":"Fragile","level.paused":"Paused \u2013 Zigbee2MQTT offline",devices:"devices",last_scan:"Last scan",never:"never","tab.map":"Network map","tab.actions":"Measures","tab.findings":"Findings","tab.rooms":"Rooms","tab.devices":"Devices",search:"Search device or area \u2026","tile.dead":"Dead","tile.offline":"Offline","tile.routers_part_time":"Part-time routers","tile.battery_critical":"Battery","tile.weak_links":"Weak","tile.routers_always_on":"Routers on","state.ok":"OK","state.weak":"Weak connection","state.battery":"Battery","state.offline":"Offline","state.dead":"Dead","state.part_time_router":"Part-time router","state.ignored":"Ignored","kind.always_on":"Router, always on","kind.part_time":"Part-time router","kind.unclear":"Router, not reachable in the last scan",end_device:"Battery device",coordinator:"Coordinator",parent:"Connected via",battery:"Battery",battery_empty:"Battery empty approx.",last_seen:"Last seen",area:"Area",children:"Children",labels:"Names",live:"Live",per_minute:"{n} msg/min","tab.plan":"Planner","view.map":"Network map","view.floor":"Floor plan","floor.empty_title":"Your network on the floor plan","floor.empty_text":"Upload a floor plan \u2013 a drawing, a photo or a screenshot from a planning tool \u2013 and drag your devices to their place. Then you see radio links, live traffic and problems right in your home.","floor.upload":"Upload floor plan","floor.uploading":"Uploading \u2026","floor.admin_only":"An administrator can upload a floor plan.","floor.default_name":"Floor {n}","floor.add":"Floor","floor.edit":"Edit","floor.done":"Done","floor.unplaced":"Not placed yet \xB7 {n}","floor.unplaced_hint":'{n} devices are not placed yet \u2013 drag them onto the plan via "Edit".',"floor.place_hint":"Drag a device onto the plan \u2013 or tap it and then tap the spot. Placed devices can be moved.","floor.remove":"Remove from plan","floor.replace":"Replace image","floor.delete":"Delete floor","floor.confirm_delete":"Really delete?","floor.building":"Building","floor.all_floors":"other floors too ({n})","floor.no_link":"No HA floor","floor.linked":"HA floor: {name}","device.close":"Close","device.gone":"Device is no longer in the network","device.area":"Area","device.children":"Connected devices","device.battery":"Battery","device.findings":"Findings","device.admin_only":"An administrator can make changes.","device.open_ha":"Open in Home Assistant","device.area_note":"The device then stands in the matching room on the floor plan.","device.area_done":"Area set: {area}","device.name":"Name","device.rename":"Rename","device.rename_note":"Renames the device in Zigbee2MQTT and its entities in Home Assistant.","device.rename_done":'Renamed to "{name}"',"device.monitoring":"Monitoring","device.ignore":"Ignore device","device.unignore":"Monitor again","device.ignore_note":"For devices that are off on purpose (e.g. seasonal decoration). It no longer creates findings.","device.unignore_note":"The device is currently ignored and creates no findings.","device.ignore_done":"Device is ignored","device.unignore_done":"Device is monitored again","device.remove_title":"Remove from Zigbee2MQTT","device.remove":"Remove","device.remove_confirm":'Really remove "{name}" from Zigbee2MQTT?',"device.remove_note":"The device disappears from Zigbee2MQTT and Home Assistant. To use it again you have to pair it again.","device.force":"Force \u2013 needed when the device no longer responds (preselected for dead devices)","device.cancel":"Cancel","device.removing":"Removing \u2026","device.removed":'"{name}" was removed',"device.failed":"That did not work: {error}","focus.show":"Show","focus.planner":"Open in planner","focus.remove_in_repairs":"Remove \u2026","focus.marked":"{n} devices marked","focus.rooms":"{n} rooms","focus.clear":"Clear marking","view.3d":"3D","draw.start_title":"Draw your home","draw.start_text":"Draw rooms as rectangles or free shapes, sizes in metres. Link each room to a Home Assistant area and devices place themselves. Several storeys and a rotatable 3D view included.","draw.start":"Draw floor plan","draw.use_image":"Use an image as floor plan instead","draw.back":"Back to the drawn floor plan","draw.floor_name":"Floor {n}","draw.room_name":"Room {n}","draw.tool_select":"Select","draw.tool_rect":"Rectangle","draw.tool_poly":"Free shape","draw.tool_devices":"Devices","draw.undo":"Undo","draw.fit":"Fit","draw.help_select":"Click a room to edit \xB7 drag corners \xB7 drag a dot on an edge to add a corner \xB7 Del deletes","draw.help_rect":"Drag a rectangle \u2013 snaps to corners of other rooms. Type exact sizes afterwards.","draw.help_poly":"Click corners one by one \xB7 double-click, Enter or the first point closes the room \xB7 Esc cancels","draw.help_devices":"Move devices or drag them from the list onto the plan","draw.room":"Room","draw.name":"Name","draw.area":"Area","draw.no_area":"no area linked","draw.no_area_option":"\u2013 no area \u2013","draw.width":"Width","draw.depth":"Depth","draw.area_size":"{m} m\xB2","draw.delete_point":"Delete corner","draw.duplicate":"Duplicate","draw.delete_room":"Delete room","draw.floor":"Floor","draw.ha_floor":"HA floor","draw.height":"Ceiling height","draw.bg_add":"Add background image","draw.bg_replace":"Replace image","draw.bg_width":"Image width","draw.bg_opacity":"Opacity","draw.bg_remove":"Remove image","draw.auto_placed":"placed automatically in its area's room","draw.manual_placed":"placed by hand","draw.auto_again":"Automatic again","draw.click_to_place":"Click on the plan to drop it","draw.devices_help":"Devices stand in the room of their area automatically. Drag to fine-tune.","draw.hint_link":"{n} rooms are not linked to an area yet. ","draw.hint_unplaced":"{n} devices have no spot yet (no area, or the room is missing).","3d.hint":"Drag to rotate \xB7 right-click or two fingers to pan \xB7 wheel or pinch to zoom","3d.empty":'Draw the rooms under "Floor plan" first to get the 3D view.',"3d.loading":"Loading 3D \u2026","3d.failed":"The 3D view could not be loaded.","3d.reset":"Reset view","3d.links":"Radio links","check.button":"Network check","check.first_title":"Your first network check is running","check.found":"{n} Zigbee devices found","check.scanning":"building the network map","check.ready_in":"Analysis in {time}","check.almost":"Almost done \u2026","check.now":"Analyse now","check.step.coordinator":"Coordinator connected","check.step.devices":"{n} devices found","check.step.routers":"Routers and wall switches checked","check.step.links":"Radio links rated","check.step.batteries":"Batteries checked","check.step.measures":"Measures calculated","check.of":"of 100","check.todo":"{n} things that will noticeably improve your network:","check.todo_one":"One thing that will noticeably improve your network:","check.nothing":"All good \u2013 nothing to do.","check.scan_started":"The network map is being refreshed in the background (takes a few minutes).","check.to_map":"View network map","check.to_actions":"Measures","check.to_plan":"Router planner","plan.loading":"Simulating every room \u2026","plan.no_areas":"Assign areas to your Zigbee devices \u2013 the planner works per room.","plan.title":"Where does the next Zigbee plug help most?","plan.subtitle":"Simulated with your real network \u2013 nothing is changed.","plan.all_good":"All rooms are well covered \u2013 another plug would hardly help.","plan.best":"best choice","plan.improved":"{n} devices get a better connection","plan.improved_one":"1 device gets a better connection","plan.no_devices":"No devices with a poor connection","plan.room_score":"Room","plan.network":"Network +{n}","plan.virtual":"New plug \xB7 {room}","plan.banner":"Plan: Zigbee plug in {room}","plan.discard":"Discard","plan.resolved.room_without_router":'fixes "no router in room"',"plan.resolved.weak_link":"{n}\xD7 weak link gone","plan.resolved.children_on_part_time_router":"independent of the wall switch","plan.resolved.too_few_routers":"enough routers","plan.resolved.overloaded_parent":"relieves a router","plan.resolved.part_time_router":"part-time router defused","plan.resolved.disappeared":"{n} devices reachable again","alert.title":"{name} was switched off","alert.children":"{n} devices are losing their connection: {names}","alert.child":"{names} is losing its connection","alert.no_children":"Router unreachable \u2013 devices nearby affected",legend_lqi:"Link quality",legend_good:"good",legend_ok:"fair",legend_bad:"weak",unreachable:"Unreachable",unknown_parent:"Parent unknown",days_ago:"{n} d ago",hours_ago:"{n} h ago",minutes_ago:"{n} min ago",just_now:"just now",no_actions:"Nothing to do \u2013 your network is fine.",no_findings:"No open findings.",no_rooms:"Assign areas to your Zigbee devices to see the room analysis.",open_repairs:"Fix",scan_now:"Scan now",scan_started:"Scan started \u2013 takes a few minutes",refresh:"Refresh","severity.critical":"Critical","severity.warning":"Warning","severity.info":"Info","room.end_devices":"Battery devices","room.always_on":"Routers on","room.part_time":"Part-time","room.weakest":"Weakest LQI","room.without_area":"No area","rec.add_router":"Add a Zigbee plug or another always-on router","rec.fix_part_time_router":"Keep the part-time router powered","rec.assign_area":"Assign an area to the devices","action.remove_dead":"Remove {count} dead devices from Zigbee2MQTT","action.replace_batteries":"Replace {count} batteries","action.power_part_time_routers":"Keep {count} part-time routers powered","action.add_router_rooms":"Add routers in {count} rooms","action.add_routers":"Add {count} more always-on routers","action.improve_backbone":"Improve the connection of {count} routers","action.check_disappeared":"Check {count} devices that went quiet","action.improve_weak_links":"Improve {count} weak connections","action.reduce_reporting":"Reduce reporting of {count} devices","action.check_unstable":"Check {count} unstable devices","action.hint.remove_dead":'Dead devices slow down the network map and confuse automations. Remove them in one go via "Fix".',"action.hint.replace_batteries":"Empty batteries are the most common cause of dropouts.","action.hint.power_part_time_routers":"Lamps on wall switches tear holes into the mesh. Keep them powered or use a Zigbee button.","action.hint.add_router_rooms":"One Zigbee plug per room makes battery devices much more stable.","action.hint.add_routers":"Recommended: at most 8 battery devices per always-on router.","action.hint.improve_backbone":"Add a router in between or place the coordinator more centrally.","action.hint.check_disappeared":"Check battery or power supply.","action.hint.improve_weak_links":"Place routers closer to the devices.","action.hint.reduce_reporting":"Reduce reporting in Zigbee2MQTT.","action.hint.check_unstable":"Check the parent routers and firmware.","finding.dead_device":"{name} unreachable","finding.disappeared":"{name} has gone quiet","finding.battery_low":"Battery of {name} probably empty","finding.battery_forecast":"Battery of {name} empty soon","finding.part_time_router":"{name} is regularly switched off","finding.children_on_part_time_router":"{count} devices depend on {name}","finding.weak_link":"Weak connection of {name}","finding.weak_backbone":"{name} poorly connected","finding.degradation":"Connection of {name} getting worse","finding.unstable_device":"{name} is unstable","finding.message_flood":"{name} sends very much","finding.network_message_flood":"Very high radio traffic","finding.overloaded_parent":"{name} serves many devices","finding.room_without_router":"No always-on router in {room}","finding.too_few_routers":"Too few routers","finding.prerequisite_missing":'Z2M option "{option}" disabled',"finding.outdated_firmware":"Coordinator firmware outdated","finding.interview_incomplete":"{name} not paired completely","finding.unsupported_device":"{name} is not supported","finding.devices_without_area":"{count} devices without area"};function Ct(d){let o=(d??"en").startsWith("de")?vi:Tt;return(e,t)=>{let i=o[e]??Tt[e]??e;for(let[n,r]of Object.entries(t??{}))i=i.split(`{${n}}`).join(String(r));return i}}var bi=6e4,yi=240,xi=90,$i=60,Nt=4200,Ie=["coordinator","devices","routers","links","batteries","measures"],Dt="zigbee-health-check-seen",Lt="zigbee-health-view",Bt=[{key:"dead",color:"var(--zh-bad)",filter:d=>d.state==="dead"},{key:"offline",color:"var(--zh-muted)",filter:d=>d.state==="offline"},{key:"routers_part_time",color:"var(--zh-part)",filter:d=>d.kind==="part_time"||d.kind==="unclear"},{key:"battery_critical",color:"#f57c00",filter:d=>d.state==="battery"},{key:"weak_links",color:"var(--zh-ok)",filter:d=>d.state==="weak"},{key:"routers_always_on",color:"var(--zh-good)",filter:d=>d.kind==="always_on"}],wi=["critical","warning","info"],It=["dead","offline","part_time_router","battery","weak","ignored","ok"],Ot={stable:"var(--zh-good)",degraded:"var(--zh-ok)",fragile:"var(--zh-bad)",paused:"var(--zh-muted)"},ki=y`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="2.2" fill="currentColor"/><path d="M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 19.1a10 10 0 0 1 0-14.2M19.1 4.9a10 10 0 0 1 0 14.2"/></svg>`,zi=y`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2z"/></svg>`,Ei=y`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/></svg>`,E=class extends T{constructor(){super(...arguments);this.panelMode=!1;this.narrow=!1;this._query="";this._tab="map";this._labels=!1;this._loading=!1;this._alerts=[];this._live=!0;this._heat={};this._rate=null;this._countUp=0;this._planLoading=!1;this._readyAt=0;this._view=(()=>{try{let e=localStorage.getItem(Lt);return e==="floor"||e==="3d"?e:"map"}catch{return"map"}})();this._tipPos={x:0,y:0};this._subscribing=!1;this._rateWindow=[];this._sparks=0;this._onDeviceEvent=e=>{let t=e.detail?.ieee;t&&(this._device=t)}}static getConfigElement(){return document.createElement("zigbee-health-card-editor")}static getStubConfig(){return{}}setConfig(e){this._config={...e},this._tab=e.default_tab??"map",this._labels=e.show_labels??!1,this._live=e.live??!0}getCardSize(){return 10}getGridOptions(){return{columns:12,min_columns:6,rows:"auto"}}connectedCallback(){super.connectedCallback(),this.addEventListener("zh-device",this._onDeviceEvent),this._timer=window.setInterval(()=>void this._load(),bi),this._decayTimer=window.setInterval(()=>this._tick(),1e3),this.hass&&(this._load(),this._subscribe())}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("zh-device",this._onDeviceEvent),window.clearInterval(this._timer),window.clearInterval(this._decayTimer),this._unsubTraffic?.(),this._unsubTraffic=void 0}updated(e){e.has("hass")&&!e.get("hass")&&this.hass&&(this._load(),this._subscribe())}async _subscribe(){if(!(!this.hass?.connection||this._unsubTraffic||this._subscribing)){this._subscribing=!0;try{let e={type:"zigbee_health/traffic"};this._config?.config_entry_id&&(e.config_entry_id=this._config.config_entry_id),this._unsubTraffic=await this.hass.connection.subscribeMessage(t=>this._onTraffic(t),e)}catch{}finally{this._subscribing=!1}}}_onTraffic(e){e.alerts&&(this._alerts=e.alerts);let t=Object.entries(e.counts??{});if(!t.length)return;let i=t.reduce((r,[,s])=>r+s,0);this._rateWindow[this._rateWindow.length-1]=(this._rateWindow[this._rateWindow.length-1]??0)+i;let n={...this._heat};for(let[r,s]of t)if(n[r]=Math.min(1,(n[r]??0)+.45*s),this._live&&(this._tab==="map"||this.panelMode)){let a=this._view==="floor"?this.renderRoot.querySelector("zigbee-health-building"):this._view==="3d"?this.renderRoot.querySelector("zigbee-health-3d"):null;for(let c=0;c<Math.min(s,3);c++)a?a.spark(r,c*160):this._spark(r,c*160)}this._heat=n}_tick(){if(this._report&&!this._report.ready&&this.requestUpdate(),this._rateWindow.push(0),this._rateWindow.length>$i&&this._rateWindow.shift(),this._unsubTraffic&&this._rateWindow.length>=5){let i=this._rateWindow.length,n=this._rateWindow.reduce((r,s)=>r+s,0);this._rate=Math.round(n/i*60)}let e=Object.entries(this._heat);if(!e.length)return;let t={};for(let[i,n]of e){let r=n*.82;r>.04&&(t[i]=r)}this._heat=t}_spark(e,t){let i=this._layout,n=this.renderRoot.querySelector("g.traffic");if(!i||!n||this._sparks>=xi)return;let r=K(i,e).map(_=>i.placed.get(_)).filter(_=>!!_);if(r.length<2)return;let s=0;for(let _=1;_<r.length;_++)s+=Math.hypot(r[_].x-r[_-1].x,r[_].y-r[_-1].y);let a=Math.max(.7,s/yi),c="http://www.w3.org/2000/svg",l=document.createElementNS(c,"circle");l.setAttribute("r","4"),l.setAttribute("class",`spark ${r[0].node?.type==="router"?"router":""}`);let p=document.createElementNS(c,"animateMotion");p.setAttribute("dur",`${a}s`),p.setAttribute("fill","freeze"),p.setAttribute("begin","indefinite"),p.setAttribute("path",`M${r.map(_=>`${_.x},${_.y}`).join(" L")}`),l.appendChild(p),this._sparks++,window.setTimeout(()=>{n.appendChild(l),p.beginElement(),window.setTimeout(()=>{l.remove(),this._sparks--},a*1e3+60)},t)}get _t(){return Ct(this.hass?.locale?.language??this.hass?.language)}async _load(){if(!(!this.hass||this._loading)){this._loading=!0;try{let e={format:"full"};this._config?.config_entry_id&&(e.config_entry_id=this._config.config_entry_id);let t=await this.hass.callWS({type:"call_service",domain:"zigbee_health",service:"get_report",service_data:e,return_response:!0}),i=this._report?.ready;this._report=t.response,this._layout=this._report.topology?et(this._report.topology):void 0,this._error=void 0,this._report.ready||(this._readyAt=Date.now()+(this._report.warmup_left??0)*1e3),this._report.ready&&i===!1?this._runCheck(!0):this._maybeFirstCheck()}catch(e){this._error=e instanceof Error?e.message:String(e?.message??e)}finally{this._loading=!1}}}async _runCheck(e=!1){if(!this.hass||this._check)return;this.panelMode||(this._tab="map"),this._plan=void 0,this._check={phase:"sweep",step:0,scanStarted:!1};let t=Date.now(),i=window.setInterval(()=>{this._check?.phase==="sweep"&&this._check.step<Ie.length-1&&(this._check={...this._check,step:this._check.step+1})},Nt/Ie.length),n=e?this._report:void 0;if(!e)try{let s={type:"zigbee_health/check"};this._config?.config_entry_id&&(s.config_entry_id=this._config.config_entry_id),n=await this.hass.callWS(s)}catch{n=this._report}let r=Nt-(Date.now()-t);r>0&&await new Promise(s=>window.setTimeout(s,r)),window.clearInterval(i),n?.ready&&(this._report=n,this._layout=n.topology?et(n.topology):void 0,this._plans=void 0),this._check={phase:"reveal",step:Ie.length,scanStarted:!!n?.scan_started},this._animateScore(n?.score??this._report?.score??0)}_animateScore(e){let t=performance.now(),i=1300,n=r=>{let s=Math.min(1,(r-t)/i);this._countUp=Math.round(e*(1-Math.pow(1-s,3))),s<1&&requestAnimationFrame(n)};requestAnimationFrame(n)}_closeCheck(e){this._check=void 0,e&&(this._tab=e);try{localStorage.setItem(Dt,"1")}catch{}}_maybeFirstCheck(){if(!this.panelMode||this._check||!this._report?.ready)return;let e=!0;try{e=localStorage.getItem(Dt)==="1"}catch{e=!0}e||this._runCheck(!0)}async _loadPlans(){if(!(!this.hass||this._planLoading)){this._planLoading=!0;try{let e={type:"zigbee_health/plan"};this._config?.config_entry_id&&(e.config_entry_id=this._config.config_entry_id);let t=await this.hass.callWS(e);this._plans=t.plans}catch{this._plans=[]}finally{this._planLoading=!1}}}_selectPlan(e){this._plan=this._plan?.area_id===e?.area_id?void 0:e,this._focus=void 0,this._filter=void 0,this._hover=void 0,this._plan&&!this.panelMode&&(this._tab="map")}_showFocus(e,t,i){let r=(this._report?.topology?.nodes??[]).filter(s=>s.area_id&&i.includes(s.area_id)).map(s=>s.ieee);this._focus={title:e,ieees:[...new Set([...t,...r])],areas:i},this._check=void 0,this._plan=void 0,this._filter=void 0,this._hover=void 0,this.panelMode||(this._tab="map"),this.updateComplete.then(()=>this.renderRoot.querySelector(".strip.marked")?.scrollIntoView({block:"nearest",behavior:"smooth"}))}async _planFor(e){this._tab="plan",this._check=void 0,this._plans||await this._loadPlans();let t=this._plans?.find(i=>e.includes(i.area_id));t&&(this._plan=void 0,this._selectPlan(t))}_renderFocusBanner(){let e=this._focus;if(!e||this._plan)return u;let t=this._t;return h`<div class="plan-banner focus-banner">
      <span class="pi">!</span>
      <span class="pt">
        <b>${e.title}</b>
        <span>${t("focus.marked",{n:e.ieees.length})}${e.areas.length?` \xB7 ${t("focus.rooms",{n:e.areas.length})}`:""}</span>
      </span>
      <button class="btn ghost" @click=${()=>this._focus=void 0}>${t("focus.clear")}</button>
    </div>`}_openDevice(e){e&&(this._device=e.ieee)}_renderDevicePanel(){return this._device?h`<zigbee-health-device
      .hass=${this.hass}
      .report=${this._report}
      .ieee=${this._device}
      .t=${this._t}
      .configEntryId=${this._config?.config_entry_id}
      @close=${()=>this._device=void 0}
      @changed=${()=>void this._load()}
      @removed=${e=>{this._toast=this._t("device.removed",{name:e.detail.name}),window.setTimeout(()=>this._toast=void 0,6e3),window.setTimeout(()=>void this._load(),2500)}}
    ></zigbee-health-device>
    ${u}`:u}_renderToast(){return this._toast?h`<div class="toast" role="status">${this._toast}</div>`:u}render(){let e=this._t,t=this._report;return t?t.ready?this.panelMode?h`${this._renderPanel(t)} ${this._renderDevicePanel()} ${this._renderToast()}`:h`<ha-card>
      <div class="wrap">
        ${this._renderHeader(t)} ${this._renderAlerts()} ${this._renderTiles(t)}
        ${this._renderTabs(t,["map","actions","plan","findings","rooms"])}
        ${this._tab==="map"?this._renderMap(t):this._tab==="actions"?this._renderActions(t):this._tab==="plan"?this._renderPlans():this._tab==="findings"?this._renderFindings(t):this._renderRooms(t)}
      </div>
    ${this._renderDevicePanel()} ${this._renderToast()}
    </ha-card>`:this._renderWaiting(t):h`<ha-card><div class="empty">${this._error?`${e("error")}: ${this._error}`:e("loading")}</div></ha-card>`}_renderPanel(e){this._tab==="map"&&(this._tab="actions");let t=this._tab==="actions"?this._renderActions(e):this._tab==="plan"?this._renderPlans():this._tab==="findings"?this._renderFindings(e):this._tab==="rooms"?this._renderRooms(e):this._renderDevices(e);return h`<div class="panel-layout ${this.narrow?"narrow":""}">
      <ha-card class="map-card"><div class="wrap map-wrap">${this._renderMap(e)}</div></ha-card>
      <div class="side">
        <ha-card>
          <div class="wrap">
            ${this._renderHeader(e)} ${this._renderAlerts()} ${this._renderTiles(e)}
          </div>
        </ha-card>
        <ha-card class="side-content">
          <div class="wrap">
            ${this._renderTabs(e,["actions","plan","findings","rooms","devices"])}
            ${t}
          </div>
        </ha-card>
      </div>
    </div>`}_renderWaiting(e){let t=this._t,i=Math.max(0,Math.round((this._readyAt-Date.now())/1e3)),n=Math.floor(i/60),r=String(i%60).padStart(2,"0"),s=h`<div class="waiting">
      <div class="radar big"><div class="sweep"></div><div class="rings"></div><div class="core">Z</div></div>
      <h3>${t("check.first_title")}</h3>
      <p>
        ${t("check.found",{n:e.devices_found??0})}
        ${e.scanning?h` · ${t("check.scanning")}`:u}
      </p>
      <p class="muted">${i>0?t("check.ready_in",{time:`${n}:${r}`}):t("check.almost")}</p>
      <button class="btn" @click=${()=>this._runCheck()}>${t("check.now")}</button>
    </div>`;return this.panelMode?h`<ha-card class="waiting-card">${s}</ha-card>`:h`<ha-card><div class="wrap">${s}</div></ha-card>`}_renderCheckOverlay(e){let t=this._check;if(!t)return u;let i=this._t;if(t.phase==="sweep"){let s=e.topology?.nodes.length??0;return h`<div class="check-overlay">
        <div class="radar"><div class="sweep"></div></div>
        <ul class="steps">
          ${Ie.map((a,c)=>h`<li class=${c<t.step?"done":c===t.step?"run":""}>
              <i></i>${i(`check.step.${a}`,{n:s})}
            </li>`)}
        </ul>
      </div>`}let n=e.level??"stable",r=e.actions??[];return h`<div class="check-overlay reveal">
      <div class="verdict">
        <div class="big" style="color:${Ot[n]}">${this._countUp}</div>
        <div class="of">${i("check.of")}</div>
        <div class="lvl lvl-${n}">${i(`level.${n}`)}</div>
        <p class="lead">
          ${r.length?i(r.length===1?"check.todo_one":"check.todo",{n:r.length}):i("check.nothing")}
        </p>
        <ol>
          ${r.map(s=>h`<li>${i(`action.${s.key}`,{count:s.count})}</li>`)}
        </ol>
        ${t.scanStarted?h`<p class="muted">${i("check.scan_started")}</p>`:u}
        <div class="row">
          <button class="btn ghost" @click=${()=>this._closeCheck()}>${i("check.to_map")}</button>
          ${r.length?h`<button class="btn" @click=${()=>this._closeCheck("actions")}>
                ${i("check.to_actions")}
              </button>`:u}
          <button class="btn ghost" @click=${()=>{this._closeCheck("plan"),this._loadPlans()}}>${i("check.to_plan")}</button>
        </div>
      </div>
    </div>`}_renderPlans(){let e=this._t;if(this._planLoading&&!this._plans)return h`<div class="empty">${e("plan.loading")}</div>`;let t=this._plans??[];if(!t.length)return h`<div class="empty">${e("plan.no_areas")}</div>`;let i=t.filter(n=>n.impact>0);return h`<div class="plans">
      <div class="plan-intro">
        <b>${e("plan.title")}</b>
        <span>${e("plan.subtitle")}</span>
      </div>
      ${i.length?u:h`<div class="empty">${e("plan.all_good")}</div>`}
      ${i.map((n,r)=>h`<button
          class="plan ${this._plan?.area_id===n.area_id?"on":""} ${r===0?"best":""}"
          @click=${()=>this._selectPlan(n)}
        >
          <span class="rank">${r+1}</span>
          <span class="pb">
            <b>${n.area_name}${r===0?h`<em>${e("plan.best")}</em>`:u}</b>
            <span>${n.improved.length?e(n.improved.length===1?"plan.improved_one":"plan.improved",{n:n.improved.length}):e("plan.no_devices")}</span>
            <span class="res">
              ${Object.entries(n.resolved).map(([s,a])=>h`<span class="chip">${e(`plan.resolved.${s}`,{n:a})}</span>`)}
            </span>
          </span>
          <span class="ps">
            <span class="room">${n.room_score_before} → <b>${n.room_score_after}</b></span>
            <span class="k">${e("plan.room_score")}</span>
            ${n.gain>0?h`<span class="net">${e("plan.network",{n:n.gain})}</span>`:u}
          </span>
        </button>`)}
    </div>`}_planPosition(e){let t=this._layout;if(!t)return null;let i=e.improved.map(a=>t.placed.get(a.ieee)).filter(a=>!!a);if(!i.length)return null;let n=i.reduce((a,c)=>a+Math.cos(c.angle),0),r=i.reduce((a,c)=>a+Math.sin(c.angle),0),s=Math.atan2(r,n);return{x:400+205*Math.cos(s),y:400+205*Math.sin(s)}}_renderPlanOverlay(){let e=this._plan,t=this._layout;if(!e||!t)return u;let i=this._planPosition(e);return i?y`<g class="plan-layer">
      ${e.improved.map(n=>{let r=t.placed.get(n.ieee);return r?y`<path class="planned-edge" d="M${r.x},${r.y} L${i.x},${i.y}"></path>`:u})}
      <circle class="pulse plan-pulse" cx=${i.x} cy=${i.y} r="13"></circle>
      <rect class="virtual" x=${i.x-14} y=${i.y-14} width="28" height="28" rx="7"></rect>
      <path class="virtual-plus" d="M${i.x-6},${i.y} h12 M${i.x},${i.y-6} v12"></path>
      <text class="label plan-label" x=${i.x} y=${i.y+32} text-anchor="middle">${this._t("plan.virtual",{room:e.area_name})}</text>
    </g>`:u}_renderPlanBanner(){let e=this._plan;if(!e)return u;let t=this._t;return h`<div class="plan-banner">
      <span class="pi">+</span>
      <span class="pt">
        <b>${t("plan.banner",{room:e.area_name})}</b>
        <span>
          ${t(e.improved.length===1?"plan.improved_one":"plan.improved",{n:e.improved.length})}
          · ${t("plan.room_score")} ${e.room_score_before} → ${e.room_score_after}
          ${e.gain>0?h` · ${t("plan.network",{n:e.gain})}`:u}
        </span>
      </span>
      <button class="btn ghost" @click=${()=>this._selectPlan(void 0)}>${t("plan.discard")}</button>
    </div>`}_renderDevices(e){let t=this._t,i=e.topology;if(!i)return h`<div class="empty">${t("not_ready")}</div>`;let n=new Map(i.nodes.map(l=>[l.ieee,l])),r=i.coordinator?.ieee,s=this._query.trim().toLowerCase(),a=i.nodes.filter(l=>!s||l.name.toLowerCase().includes(s)||(l.area??"").toLowerCase().includes(s)).sort((l,p)=>It.indexOf(l.state)-It.indexOf(p.state)||l.name.localeCompare(p.name,void 0,{numeric:!0})),c=l=>l.parent===r?t("coordinator"):l.parent?n.get(l.parent)?.name??"?":l.type==="router"?"\u2013":t("unknown_parent");return h`<input
        id="zh-search"
        class="search"
        type="search"
        placeholder=${t("search")}
        .value=${this._query}
        @input=${l=>this._query=l.target.value}
      />
      <div class="devlist">
        ${a.map(l=>h`<button class="dev" @click=${()=>this._openDevice(l)}>
            <span class="dot st-${l.kind==="unclear"&&l.state==="ok"?"unclear":l.state} ${l.type}"></span>
            <span class="dn">
              <b>${l.name}</b>
              <span
                >${t(`state.${l.state}`)}${l.area?` \xB7 ${l.area}`:""} ·
                ${l.type==="router"?t(`kind.${l.kind??"always_on"}`):t("end_device")}</span
              >
            </span>
            <span class="dm">
              <span>${c(l)}${l.parent_lqi?h` · <b class="lqi-t lqi-${q(l.parent_lqi)}">${l.parent_lqi}</b>`:u}</span>
              <span>${l.battery!==null?`${Math.round(l.battery)} % \xB7 `:""}${Q(l.last_seen,t)}</span>
            </span>
          </button>`)}
      </div>`}_renderHeader(e){let t=this._t,i=e.score??0,n=e.level??"paused",r=2*Math.PI*36,s=e.topology?.nodes.length??e.counts?.devices??0;return h`<div class="head">
      <div class="gauge">
        <svg viewBox="0 0 84 84">
          <circle class="track" cx="42" cy="42" r="36"></circle>
          <circle
            class="value"
            cx="42"
            cy="42"
            r="36"
            stroke=${Ot[n]}
            stroke-dasharray="${r*i/100} ${r}"
          ></circle>
        </svg>
        <div class="num">${e.ready?i:"\u2013"}<small>/ 100</small></div>
      </div>
      <div class="headtext">
        <h2 class="title">${this._config?.title??t("title")}</h2>
        <div class="level lvl-${n}"><span class="dot"></span>${t(`level.${n}`)}</div>
        <div class="sub">
          ${s} ${t("devices")} · ${t("last_scan")} ${Q(e.last_scan,t)}${this._rate!==null?h` · <span class="live-rate"><i></i>${t("per_minute",{n:this._rate})}</span>`:u}
        </div>
      </div>
      <div class="btns">
        <button class="checkbtn" title=${t("check.button")} @click=${()=>this._runCheck()}>
          ${ki}<span>${t("check.button")}</span>
        </button>
        <button class="iconbtn ${this._loading?"busy":""}" title=${t("refresh")} @click=${()=>this._load()}>
          ${Ei}
        </button>
      </div>
    </div>`}_renderAlerts(){if(!this._alerts.length)return u;let e=this._t;return h`${this._alerts.map(t=>h`<button
        class="alert"
        @click=${()=>{this.panelMode||(this._tab="map"),this._filter=void 0,this._hover=t.ieee}}
      >
        <span class="bolt">${zi}</span>
        <span class="at">
          <b>${e("alert.title",{name:t.name})}</b>
          <span
            >${t.children.length>1?e("alert.children",{n:t.children.length,names:t.children.join(", ")}):t.children.length===1?e("alert.child",{names:t.children[0]}):e("alert.no_children")}
            · ${Q(t.since,e)}</span
          >
        </span>
      </button>`)}`}_renderTiles(e){let t=this._t;return h`<div class="tiles">
      ${Bt.map(i=>{let n=e.counts?.[i.key]??0,r=n===0&&i.key!=="routers_always_on";return h`<button
          class="tile ${this._filter===i.key?"active":""} ${r?"zero":""}"
          style="--accent:${i.color}"
          @click=${()=>{this._filter=this._filter===i.key?void 0:i.key,i.key!=="dead"&&!this.panelMode&&(this._tab="map")}}
        >
          <div class="n">${n}</div>
          <div class="l">${t(`tile.${i.key}`)}</div>
        </button>`})}
    </div>`}_renderTabs(e,t){let i=this._t,n=(e.findings??[]).filter(r=>r.severity!=="info").length;return h`<div class="tabs" role="tablist">
      ${t.map(r=>h`<button
          role="tab"
          class=${this._tab===r?"on":""}
          @click=${()=>{this._tab=r,r==="plan"&&!this._plans&&this._loadPlans()}}
        >
          ${i(`tab.${r}`)}${r==="findings"&&n?h`<span class="badge">${n}</span>`:u}
        </button>`)}
    </div>`}_highlight(){let e=this._layout;if(e){if(this._plan)return new Set(this._plan.improved.map(t=>t.ieee));if(this._hover)return $t(e,this._hover);if(this._focus)return new Set(this._focus.ieees);if(this._filter){let t=Bt.find(n=>n.key===this._filter),i=this._report?.topology?.nodes??[];if(t)return new Set(i.filter(t.filter).map(n=>n.ieee))}}}_renderMap(e){let t=this._layout,i=e.topology;if(!t||!i)return h`<div class="empty">${this._t("not_ready")}</div>`;let n=this._t,r=this._highlight(),s=t.placed,a=l=>!!r&&r.has(l.from)&&r.has(l.to)&&l.kind!=="mesh",c=h`<div class="viewswitch" role="group">
      ${["map","floor","3d"].map(l=>h`<button
          class=${this._view===l?"on":""}
          @click=${()=>{this._view=l;try{localStorage.setItem(Lt,l)}catch{}}}
        >
          ${n(`view.${l}`)}
        </button>`)}
    </div>`;return this._view==="floor"?h`${c} ${this._renderPlanBanner()} ${this._renderFocusBanner()}
        <zigbee-health-building
          .marked=${this._focus}
          .hass=${this.hass}
          .report=${e}
          .layout=${t}
          .heat=${this._heat}
          .alerts=${this._alerts}
          .plan=${this._plan}
          .t=${n}
          .live=${this._live}
          .configEntryId=${this._config?.config_entry_id}
        ></zigbee-health-building>`:this._view==="3d"?h`${c} ${this._renderFocusBanner()}
        <zigbee-health-3d
          .marked=${this._focus}
          .hass=${this.hass}
          .report=${e}
          .layout=${t}
          .heat=${this._heat}
          .alerts=${this._alerts}
          .t=${n}
          .live=${this._live}
          .configEntryId=${this._config?.config_entry_id}
        ></zigbee-health-3d>`:h`${c} ${this._renderPlanBanner()} ${this._renderFocusBanner()}<div class="mapbox">
        <svg
          class="map ${r?"dim":""} ${this._check?.phase==="sweep"?"checking":""}"
          viewBox="-60 -20 920 840"
          @mouseleave=${()=>this._hover=void 0}
        >
          ${[150,240,330].map(l=>y`<circle class="guide" cx=${400} cy=${400} r=${l}></circle>`)}
          ${t.unknownAngle!==null?y`<text class="group-label" x=${400+392*Math.cos(t.unknownAngle)} y=${400+392*Math.sin(t.unknownAngle)+4} text-anchor=${Math.cos(t.unknownAngle)>.2?"start":Math.cos(t.unknownAngle)<-.2?"end":"middle"}>${n("unknown_parent")}</text>`:u}
          <g>
            ${t.edges.map(l=>{let p=s.get(l.from),_=s.get(l.to);return!p||!_?u:y`<path
                class="edge ${l.kind} lqi-${q(l.lqi)} ${a(l)?"hl":""}"
                d=${this._edgePath(p,_,l)}
              ></path>`})}
          </g>
          <g>${[...s.values()].map(l=>this._renderNode(l,r))}</g>
          ${this._renderPlanOverlay()}
          <g class="traffic"></g>
        </svg>
        ${this._renderTip()} ${this._renderCheckOverlay(e)}
      </div>
      <div class="legend">
        <span>${y`<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="var(--primary-color,#03a9f4)"/></svg>`}${n("coordinator")}</span>
        <span>${y`<svg viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="3" class="st-ok"/></svg>`}${n("kind.always_on")}</span>
        <span>${y`<svg viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="3" class="st-part_time_router" stroke="var(--zh-part)" stroke-dasharray="3 2" stroke-width="1.6"/></svg>`}${n("kind.part_time")}</span>
        <span>${y`<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5" class="st-ok"/></svg>`}${n("end_device")}</span>
        <span
          >${n("legend_lqi")}<span class="bar"
            ><span style="background:var(--zh-bad)"></span><span style="background:var(--zh-ok)"></span
            ><span style="background:var(--zh-good)"></span></span
        ></span>
        ${this._unsubTraffic?h`<label class="switch live"
              ><input
                type="checkbox"
                .checked=${this._live}
                @change=${l=>this._live=l.target.checked}
              />${n("live")}</label
            >`:u}
        <label class="switch"
          ><input
            type="checkbox"
            .checked=${this._labels}
            @change=${l=>this._labels=l.target.checked}
          />${n("labels")}</label
        >
      </div>
      ${this._renderDead(t.dead)}`}_edgePath(e,t,i){if(i.kind==="mesh"||i.kind==="backbone"){let n=(e.x+t.x)/2,r=(e.y+t.y)/2,s=i.kind==="mesh"?.25:.12,a=n+(400-n)*s,c=r+(400-r)*s;return`M${e.x},${e.y} Q${a},${c} ${t.x},${t.y}`}return`M${e.x},${e.y} L${t.x},${t.y}`}_renderNode(e,t){let i=e.node,n=!!t&&t.has(e.id),r=g=>{let k=this.renderRoot.querySelector(".mapbox").getBoundingClientRect();this._tipPos={x:g.clientX-k.left,y:g.clientY-k.top},this._hover=e.id};if(!i)return y`<g class="node coord ${n?"hl":""}" @mouseenter=${r}>
        <circle class="shape" cx=${e.x} cy=${e.y} r="24"></circle>
        <path class="glyph" d="M${e.x-9},${e.y-8} h18 l-18,16 h18"></path>
      </g>`;let s=i.type==="router",a=i.kind==="part_time"?"part":i.kind==="unclear"?"unclear":"",c=i.kind==="unclear"&&i.state==="ok"?"unclear":i.state,l=s?20:13,p=i.state==="offline"||i.state==="battery"||i.kind==="part_time"&&i.children.length>0,_=s||this._labels||n,m=this._live?this._heat[e.id]??0:0,v=this._alerts.some(g=>g.ieee===e.id),w=Math.cos(e.angle),M=Math.sin(e.angle),x=l/2+7,R=e.x+w*x,L=e.y+M*x+4+(Math.abs(w)<.35?M*6:0),P=w>.35?"start":w<-.35?"end":"middle",N=this._layout?.unknownParent.has(i.ieee)??!1,Z=i.name.length>22?`${i.name.slice(0,21)}\u2026`:i.name;return y`<g
      class="node ${a} ${i.state} ${N?"orphan":""} ${v?"alerted":""} ${n?"hl":""} ${this._hover===e.id?"sel":""}"
      @mouseenter=${r}
      @click=${()=>this._openDevice(i)}
    >
      ${m>.05?y`<circle class="heat" cx=${e.x} cy=${e.y} r=${l/2+3+m*6} style="opacity:${.12+m*.33}"></circle>`:u}
      ${v?y`<circle class="pulse alarm" cx=${e.x} cy=${e.y} r=${l/2}></circle>`:u}
      ${p&&!v?y`<circle class="pulse" cx=${e.x} cy=${e.y} r=${l/2} stroke=${i.state==="offline"?"var(--zh-muted)":i.state==="battery"?"#f57c00":"var(--zh-part)"}></circle>`:u}
      ${s?y`<rect class="shape st-${c}" x=${e.x-l/2} y=${e.y-l/2} width=${l} height=${l} rx="5"></rect>`:y`<circle class="shape st-${c}" cx=${e.x} cy=${e.y} r=${l/2}></circle>`}
      ${_?y`<text class="label ${s?"":"small"}" x=${R} y=${L} text-anchor=${P}>${Z}</text>`:u}
    </g>`}_renderTip(){let e=this._layout;if(!this._hover||!e)return u;let t=this._t,i=e.placed.get(this._hover);if(!i)return u;let n=i.node,r=`left:${this._tipPos.x}px;top:${this._tipPos.y}px`;if(!n){let c=this._report?.topology?.nodes.filter(l=>l.parent===i.id).length??0;return h`<div class="tip" style=${r}>
        <b>${this._report?.topology?.coordinator?.name??t("coordinator")}</b>
        <div class="k">${t("coordinator")}</div>
        <div class="row"><span class="k">${t("children")}</span><span>${c}</span></div>
      </div>`}let s=n.parent===e.coordinatorId?t("coordinator"):this._report?.topology?.nodes.find(c=>c.ieee===n.parent)?.name,a=n.type==="router"?t(`kind.${n.kind??"always_on"}`):t("end_device");return h`<div class="tip" style=${r}>
      <b>${n.name}</b>
      <div class="k">${a}${n.area?` \xB7 ${n.area}`:""}</div>
      <span class="pill"><i class="st-${n.state}" style="background:currentColor"></i>${t(`state.${n.state}`)}</span>
      ${s?h`<div class="row"><span class="k">${t("parent")}</span><span>${s}${n.parent_lqi?` \xB7 LQI ${n.parent_lqi}`:""}</span></div>`:n.type==="end_device"?h`<div class="row"><span class="k">${t("parent")}</span><span>${t("unknown_parent")}</span></div>`:u}
      ${n.children.length?h`<div class="row"><span class="k">${t("children")}</span><span>${n.children.length}</span></div>`:u}
      ${n.battery!==null?h`<div class="row"><span class="k">${t("battery")}</span><span>${Math.round(n.battery)} %</span></div>`:u}
      ${n.battery_empty?h`<div class="row"><span class="k">${t("battery_empty")}</span><span>${new Date(n.battery_empty).toLocaleDateString()}</span></div>`:u}
      ${n.last_seen?h`<div class="row"><span class="k">${t("last_seen")}</span><span>${Q(n.last_seen,t)}</span></div>`:u}
    </div>`}_renderDead(e){if(!e.length)return u;let t=this._t,i=[...e].sort((r,s)=>Date.parse(r.last_seen??"")-Date.parse(s.last_seen??"")||0),n=new Set(this._focus?.ieees??[]);return h`<div class="strip ${i.some(r=>n.has(r.ieee))?"marked":""}">
      <h4><i></i>${t("unreachable")} · ${e.length}</h4>
      <div class="chips">
        ${i.map(r=>h`<button class="chip ${n.has(r.ieee)?"on":""}" @click=${()=>this._openDevice(r)}>
            ${r.name}<span>${Q(r.last_seen,t)}</span>
          </button>`)}
      </div>
    </div>`}_renderActions(e){let t=this._t,i=e.actions??[];if(!i.length)return h`<div class="empty">${t("no_actions")}</div>`;let n=this.hass?.user?.is_admin??!0;return h`<div class="actions">
      ${i.map((r,s)=>h`<div class="action">
          <div class="no">${s+1}</div>
          <div class="t">${t(`action.${r.key}`,{count:r.count})}</div>
          <div class="h">${t(`action.hint.${r.key}`)}</div>
          <div class="foot">
            ${r.items.slice(0,8).map(a=>h`<span class="chip">${a}</span>`)}
            ${r.items.length>8?h`<span class="chip">+${r.items.length-8}</span>`:u}
            <span class="grow"></span>
            ${r.ieees?.length||r.area_ids?.length?h`<button
                  class="btn ${this._focus?.title===t(`action.${r.key}`,{count:r.count})?"on":""}"
                  @click=${()=>this._showFocus(t(`action.${r.key}`,{count:r.count}),r.ieees??[],r.area_ids??[])}
                >
                  ${t("focus.show")}
                </button>`:u}
            ${r.key==="add_router_rooms"||r.key==="add_routers"?h`<button class="btn ghost" @click=${()=>this._planFor(r.area_ids??[])}>
                  ${t("focus.planner")}
                </button>`:u}
            ${n&&r.key==="remove_dead"?h`<button class="btn ghost" @click=${()=>xe("/config/repairs")}>
                  ${t("focus.remove_in_repairs")}
                </button>`:u}
          </div>
        </div>`)}
    </div>`}_findingTitle(e){return this._t(`finding.${e.type}`,e.placeholders)}_renderFindings(e){let t=this._t,i=e.findings??[];if(!i.length)return h`<div class="empty">${t("no_findings")}</div>`;let n=new Map((e.topology?.nodes??[]).map(r=>[r.ieee,r]));return h`${wi.map(r=>{let s=i.filter(a=>a.severity===r);return s.length?h`<div class="group">
        <h4>${t(`severity.${r}`)} · ${s.length}</h4>
        ${s.map(a=>{let c=a.ieee?n.get(a.ieee):void 0,l=a.placeholders.room&&a.placeholders.room!=="-"?a.placeholders.room:"";return h`<div
            class="finding sev-${a.severity}"
            @click=${()=>c?this._openDevice(c):a.area_id?this._showFocus(this._findingTitle(a),a.related,[a.area_id]):xe("/config/repairs")}
          >
            <div>
              <div class="ft">${this._findingTitle(a)}</div>
              ${l||c?.last_seen?h`<div class="fs">${[l,c?.last_seen?`${t("last_seen")} ${Q(c.last_seen,t)}`:""].filter(Boolean).join(" \xB7 ")}</div>`:u}
            </div>
          </div>`})}
      </div>`:u})}`}_renderRooms(e){let t=this._t,i=(e.rooms??[]).filter(r=>r.area_id!==null);if(!i.length)return h`<div class="empty">${t("no_rooms")}</div>`;let n=r=>r>=80?"var(--zh-good)":r>=55?"var(--zh-ok)":"var(--zh-bad)";return h`<div class="rooms">
      ${[...i].sort((r,s)=>r.score-s.score).map(r=>h`<div class="room">
            <div class="rh">${r.area_name??t("room.without_area")}<span style="color:${n(r.score)}">${r.score}</span></div>
            <div class="bar"><div style="width:${r.score}%;background:${n(r.score)}"></div></div>
            <div class="stats">
              <span>${t("room.end_devices")} <b>${r.end_devices}</b></span>
              <span>${t("room.always_on")} <b>${r.always_on_routers}</b></span>
              ${r.part_time_routers?h`<span>${t("room.part_time")} <b>${r.part_time_routers}</b></span>`:u}
              ${r.weakest_lqi!==null?h`<span>${t("room.weakest")} <b>${r.weakest_lqi}</b></span>`:u}
            </div>
            ${r.recommendation?h`<div class="rec">→ ${t(`rec.${r.recommendation}`)}</div>`:u}
          </div>`)}
    </div>`}};E.styles=V,f([$({attribute:!1})],E.prototype,"hass",2),f([$({attribute:!1})],E.prototype,"panelMode",2),f([$({attribute:!1})],E.prototype,"narrow",2),f([b()],E.prototype,"_config",2),f([b()],E.prototype,"_query",2),f([b()],E.prototype,"_report",2),f([b()],E.prototype,"_error",2),f([b()],E.prototype,"_tab",2),f([b()],E.prototype,"_hover",2),f([b()],E.prototype,"_filter",2),f([b()],E.prototype,"_labels",2),f([b()],E.prototype,"_loading",2),f([b()],E.prototype,"_alerts",2),f([b()],E.prototype,"_live",2),f([b()],E.prototype,"_heat",2),f([b()],E.prototype,"_rate",2),f([b()],E.prototype,"_check",2),f([b()],E.prototype,"_countUp",2),f([b()],E.prototype,"_plans",2),f([b()],E.prototype,"_planLoading",2),f([b()],E.prototype,"_plan",2),f([b()],E.prototype,"_focus",2),f([b()],E.prototype,"_device",2),f([b()],E.prototype,"_toast",2),f([b()],E.prototype,"_view",2),E=f([I("zigbee-health-card")],E);window.customCards=window.customCards??[];window.customCards.some(d=>d.type==="zigbee-health-card")||window.customCards.push({type:"zigbee-health-card",name:"Zigbee Health",description:"Zigbee network map, measures, findings and rooms",preview:!0});export{E as ZigbeeHealthCard};
/*! Bundled license information:

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
lit-html/lit-html.js:
lit-element/lit-element.js:
@lit/reactive-element/decorators/custom-element.js:
@lit/reactive-element/decorators/property.js:
@lit/reactive-element/decorators/state.js:
@lit/reactive-element/decorators/event-options.js:
@lit/reactive-element/decorators/base.js:
@lit/reactive-element/decorators/query.js:
@lit/reactive-element/decorators/query-all.js:
@lit/reactive-element/decorators/query-async.js:
@lit/reactive-element/decorators/query-assigned-nodes.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/is-server.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-assigned-elements.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
