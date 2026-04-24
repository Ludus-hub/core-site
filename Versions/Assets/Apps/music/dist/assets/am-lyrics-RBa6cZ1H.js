import{Y as Be}from"./index-CQr--9fV.js";function Ne(T,Z){for(var K=0;K<Z.length;K++){const H=Z[K];if(typeof H!="string"&&!Array.isArray(H)){for(const G in H)if(G!=="default"&&!(G in T)){const et=Object.getOwnPropertyDescriptor(H,G);et&&Object.defineProperty(T,G,et.get?et:{enumerable:!0,get:()=>H[G]})}}}return Object.freeze(Object.defineProperty(T,Symbol.toStringTag,{value:"Module"}))}var re={},ae;function qe(){if(ae)return re;ae=1;function T(h,t,i,e){var s=arguments.length,n=s<3?t:e===null?e=Object.getOwnPropertyDescriptor(t,i):e,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(h,t,i,e);else for(var a=h.length-1;a>=0;a--)(r=h[a])&&(n=(s<3?r(n):s>3?r(t,i,n):r(t,i))||n);return s>3&&n&&Object.defineProperty(t,i,n),n}typeof SuppressedError=="function"&&SuppressedError;const Z=globalThis,K=Z.ShadowRoot&&(Z.ShadyCSS===void 0||Z.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,H=Symbol(),G=new WeakMap;let et=class{constructor(t,i,e){if(this._$cssResult$=!0,e!==H)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=i}get styleSheet(){let t=this.o;const i=this.t;if(K&&t===void 0){const e=i!==void 0&&i.length===1;e&&(t=G.get(i)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),e&&G.set(i,t))}return t}toString(){return this.cssText}};const le=h=>new et(typeof h=="string"?h:h+"",void 0,H),ce=(h,...t)=>{const i=h.length===1?h[0]:t.reduce((e,s,n)=>e+(r=>{if(r._$cssResult$===!0)return r.cssText;if(typeof r=="number")return r;throw Error("Value passed to 'css' function must be a 'css' function result: "+r+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+h[n+1],h[0]);return new et(i,h,H)},de=(h,t)=>{if(K)h.adoptedStyleSheets=t.map(i=>i instanceof CSSStyleSheet?i:i.styleSheet);else for(const i of t){const e=document.createElement("style"),s=Z.litNonce;s!==void 0&&e.setAttribute("nonce",s),e.textContent=i.cssText,h.appendChild(e)}},Wt=K?h=>h:h=>h instanceof CSSStyleSheet?(t=>{let i="";for(const e of t.cssRules)i+=e.cssText;return le(i)})(h):h;const{is:he,defineProperty:ue,getOwnPropertyDescriptor:pe,getOwnPropertyNames:me,getOwnPropertySymbols:fe,getPrototypeOf:ye}=Object,gt=globalThis,Ut=gt.trustedTypes,ge=Ut?Ut.emptyScript:"",be=gt.reactiveElementPolyfillSupport,ot=(h,t)=>h,bt={toAttribute(h,t){switch(t){case Boolean:h=h?ge:null;break;case Object:case Array:h=h==null?h:JSON.stringify(h)}return h},fromAttribute(h,t){let i=h;switch(t){case Boolean:i=h!==null;break;case Number:i=h===null?null:Number(h);break;case Object:case Array:try{i=JSON.parse(h)}catch{i=null}}return i}},kt=(h,t)=>!he(h,t),Ot={attribute:!0,type:String,converter:bt,reflect:!1,useDefault:!1,hasChanged:kt};Symbol.metadata??=Symbol("metadata"),gt.litPropertyMetadata??=new WeakMap;let it=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,i=Ot){if(i.state&&(i.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((i=Object.create(i)).wrapped=!0),this.elementProperties.set(t,i),!i.noAccessor){const e=Symbol(),s=this.getPropertyDescriptor(t,e,i);s!==void 0&&ue(this.prototype,t,s)}}static getPropertyDescriptor(t,i,e){const{get:s,set:n}=pe(this.prototype,t)??{get(){return this[i]},set(r){this[i]=r}};return{get:s,set(r){const a=s?.call(this);n?.call(this,r),this.requestUpdate(t,a,e)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??Ot}static _$Ei(){if(this.hasOwnProperty(ot("elementProperties")))return;const t=ye(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(ot("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(ot("properties"))){const i=this.properties,e=[...me(i),...fe(i)];for(const s of e)this.createProperty(s,i[s])}const t=this[Symbol.metadata];if(t!==null){const i=litPropertyMetadata.get(t);if(i!==void 0)for(const[e,s]of i)this.elementProperties.set(e,s)}this._$Eh=new Map;for(const[i,e]of this.elementProperties){const s=this._$Eu(i,e);s!==void 0&&this._$Eh.set(s,i)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const i=[];if(Array.isArray(t)){const e=new Set(t.flat(1/0).reverse());for(const s of e)i.unshift(Wt(s))}else t!==void 0&&i.push(Wt(t));return i}static _$Eu(t,i){const e=i.attribute;return e===!1?void 0:typeof e=="string"?e:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),this.renderRoot!==void 0&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,i=this.constructor.elementProperties;for(const e of i.keys())this.hasOwnProperty(e)&&(t.set(e,this[e]),delete this[e]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return de(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,i,e){this._$AK(t,e)}_$ET(t,i){const e=this.constructor.elementProperties.get(t),s=this.constructor._$Eu(t,e);if(s!==void 0&&e.reflect===!0){const n=(e.converter?.toAttribute!==void 0?e.converter:bt).toAttribute(i,e.type);this._$Em=t,n==null?this.removeAttribute(s):this.setAttribute(s,n),this._$Em=null}}_$AK(t,i){const e=this.constructor,s=e._$Eh.get(t);if(s!==void 0&&this._$Em!==s){const n=e.getPropertyOptions(s),r=typeof n.converter=="function"?{fromAttribute:n.converter}:n.converter?.fromAttribute!==void 0?n.converter:bt;this._$Em=s;const a=r.fromAttribute(i,n.type);this[s]=a??this._$Ej?.get(s)??a,this._$Em=null}}requestUpdate(t,i,e,s=!1,n){if(t!==void 0){const r=this.constructor;if(s===!1&&(n=this[t]),e??=r.getPropertyOptions(t),!((e.hasChanged??kt)(n,i)||e.useDefault&&e.reflect&&n===this._$Ej?.get(t)&&!this.hasAttribute(r._$Eu(t,e))))return;this.C(t,i,e)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,i,{useDefault:e,reflect:s,wrapped:n},r){e&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,r??i??this[t]),n!==!0||r!==void 0)||(this._$AL.has(t)||(this.hasUpdated||e||(i=void 0),this._$AL.set(t,i)),s===!0&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(i){Promise.reject(i)}const t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[s,n]of this._$Ep)this[s]=n;this._$Ep=void 0}const e=this.constructor.elementProperties;if(e.size>0)for(const[s,n]of e){const{wrapped:r}=n,a=this[s];r!==!0||this._$AL.has(s)||a===void 0||this.C(s,void 0,n,a)}}let t=!1;const i=this._$AL;try{t=this.shouldUpdate(i),t?(this.willUpdate(i),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(i)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(i)}willUpdate(t){}_$AE(t){this._$EO?.forEach(i=>i.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(i=>this._$ET(i,this[i])),this._$EM()}updated(t){}firstUpdated(t){}};it.elementStyles=[],it.shadowRootOptions={mode:"open"},it[ot("elementProperties")]=new Map,it[ot("finalized")]=new Map,be?.({ReactiveElement:it}),(gt.reactiveElementVersions??=[]).push("2.1.2");const Tt=globalThis,Bt=h=>h,vt=Tt.trustedTypes,Nt=vt?vt.createPolicy("lit-html",{createHTML:h=>h}):void 0,qt="$lit$",Y=`lit$${Math.random().toFixed(9).slice(2)}$`,Dt="?"+Y,ve=`<${Dt}>`,Q=document,lt=()=>Q.createComment(""),ct=h=>h===null||typeof h!="object"&&typeof h!="function",Lt=Array.isArray,xe=h=>Lt(h)||typeof h?.[Symbol.iterator]=="function",Et=`[ 	
\f\r]`,dt=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,jt=/-->/g,Ht=/>/g,X=RegExp(`>|${Et}(?:([^\\s"'>=/]+)(${Et}*=${Et}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),Gt=/'/g,Yt=/"/g,Vt=/^(?:script|style|textarea|title)$/i,Zt=h=>(t,...i)=>({_$litType$:h,strings:t,values:i}),M=Zt(1),Kt=Zt(2),st=Symbol.for("lit-noChange"),z=Symbol.for("lit-nothing"),Qt=new WeakMap,J=Q.createTreeWalker(Q,129);function Xt(h,t){if(!Lt(h)||!h.hasOwnProperty("raw"))throw Error("invalid template strings array");return Nt!==void 0?Nt.createHTML(t):t}const we=(h,t)=>{const i=h.length-1,e=[];let s,n=t===2?"<svg>":t===3?"<math>":"",r=dt;for(let a=0;a<i;a++){const o=h[a];let c,l,d=-1,y=0;for(;y<o.length&&(r.lastIndex=y,l=r.exec(o),l!==null);)y=r.lastIndex,r===dt?l[1]==="!--"?r=jt:l[1]!==void 0?r=Ht:l[2]!==void 0?(Vt.test(l[2])&&(s=RegExp("</"+l[2],"g")),r=X):l[3]!==void 0&&(r=X):r===X?l[0]===">"?(r=s??dt,d=-1):l[1]===void 0?d=-2:(d=r.lastIndex-l[2].length,c=l[1],r=l[3]===void 0?X:l[3]==='"'?Yt:Gt):r===Yt||r===Gt?r=X:r===jt||r===Ht?r=dt:(r=X,s=void 0);const u=r===X&&h[a+1].startsWith("/>")?" ":"";n+=r===dt?o+ve:d>=0?(e.push(c),o.slice(0,d)+qt+o.slice(d)+Y+u):o+Y+(d===-2?a:u)}return[Xt(h,n+(h[i]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),e]};class ht{constructor({strings:t,_$litType$:i},e){let s;this.parts=[];let n=0,r=0;const a=t.length-1,o=this.parts,[c,l]=we(t,i);if(this.el=ht.createElement(c,e),J.currentNode=this.el.content,i===2||i===3){const d=this.el.content.firstChild;d.replaceWith(...d.childNodes)}for(;(s=J.nextNode())!==null&&o.length<a;){if(s.nodeType===1){if(s.hasAttributes())for(const d of s.getAttributeNames())if(d.endsWith(qt)){const y=l[r++],u=s.getAttribute(d).split(Y),m=/([.?@])?(.*)/.exec(y);o.push({type:1,index:n,name:m[2],strings:u,ctor:m[1]==="."?$e:m[1]==="?"?Ae:m[1]==="@"?ke:xt}),s.removeAttribute(d)}else d.startsWith(Y)&&(o.push({type:6,index:n}),s.removeAttribute(d));if(Vt.test(s.tagName)){const d=s.textContent.split(Y),y=d.length-1;if(y>0){s.textContent=vt?vt.emptyScript:"";for(let u=0;u<y;u++)s.append(d[u],lt()),J.nextNode(),o.push({type:2,index:++n});s.append(d[y],lt())}}}else if(s.nodeType===8)if(s.data===Dt)o.push({type:2,index:n});else{let d=-1;for(;(d=s.data.indexOf(Y,d+1))!==-1;)o.push({type:7,index:n}),d+=Y.length-1}n++}}static createElement(t,i){const e=Q.createElement("template");return e.innerHTML=t,e}}function nt(h,t,i=h,e){if(t===st)return t;let s=e!==void 0?i._$Co?.[e]:i._$Cl;const n=ct(t)?void 0:t._$litDirective$;return s?.constructor!==n&&(s?._$AO?.(!1),n===void 0?s=void 0:(s=new n(h),s._$AT(h,i,e)),e!==void 0?(i._$Co??=[])[e]=s:i._$Cl=s),s!==void 0&&(t=nt(h,s._$AS(h,t.values),s,e)),t}class Se{constructor(t,i){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=i}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:i},parts:e}=this._$AD,s=(t?.creationScope??Q).importNode(i,!0);J.currentNode=s;let n=J.nextNode(),r=0,a=0,o=e[0];for(;o!==void 0;){if(r===o.index){let c;o.type===2?c=new ut(n,n.nextSibling,this,t):o.type===1?c=new o.ctor(n,o.name,o.strings,this,t):o.type===6&&(c=new Te(n,this,t)),this._$AV.push(c),o=e[++a]}r!==o?.index&&(n=J.nextNode(),r++)}return J.currentNode=Q,s}p(t){let i=0;for(const e of this._$AV)e!==void 0&&(e.strings!==void 0?(e._$AI(t,e,i),i+=e.strings.length-2):e._$AI(t[i])),i++}}class ut{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,i,e,s){this.type=2,this._$AH=z,this._$AN=void 0,this._$AA=t,this._$AB=i,this._$AM=e,this.options=s,this._$Cv=s?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const i=this._$AM;return i!==void 0&&t?.nodeType===11&&(t=i.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,i=this){t=nt(this,t,i),ct(t)?t===z||t==null||t===""?(this._$AH!==z&&this._$AR(),this._$AH=z):t!==this._$AH&&t!==st&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):xe(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==z&&ct(this._$AH)?this._$AA.nextSibling.data=t:this.T(Q.createTextNode(t)),this._$AH=t}$(t){const{values:i,_$litType$:e}=t,s=typeof e=="number"?this._$AC(t):(e.el===void 0&&(e.el=ht.createElement(Xt(e.h,e.h[0]),this.options)),e);if(this._$AH?._$AD===s)this._$AH.p(i);else{const n=new Se(s,this),r=n.u(this.options);n.p(i),this.T(r),this._$AH=n}}_$AC(t){let i=Qt.get(t.strings);return i===void 0&&Qt.set(t.strings,i=new ht(t)),i}k(t){Lt(this._$AH)||(this._$AH=[],this._$AR());const i=this._$AH;let e,s=0;for(const n of t)s===i.length?i.push(e=new ut(this.O(lt()),this.O(lt()),this,this.options)):e=i[s],e._$AI(n),s++;s<i.length&&(this._$AR(e&&e._$AB.nextSibling,s),i.length=s)}_$AR(t=this._$AA.nextSibling,i){for(this._$AP?.(!1,!0,i);t!==this._$AB;){const e=Bt(t).nextSibling;Bt(t).remove(),t=e}}setConnected(t){this._$AM===void 0&&(this._$Cv=t,this._$AP?.(t))}}class xt{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,i,e,s,n){this.type=1,this._$AH=z,this._$AN=void 0,this.element=t,this.name=i,this._$AM=s,this.options=n,e.length>2||e[0]!==""||e[1]!==""?(this._$AH=Array(e.length-1).fill(new String),this.strings=e):this._$AH=z}_$AI(t,i=this,e,s){const n=this.strings;let r=!1;if(n===void 0)t=nt(this,t,i,0),r=!ct(t)||t!==this._$AH&&t!==st,r&&(this._$AH=t);else{const a=t;let o,c;for(t=n[0],o=0;o<n.length-1;o++)c=nt(this,a[e+o],i,o),c===st&&(c=this._$AH[o]),r||=!ct(c)||c!==this._$AH[o],c===z?t=z:t!==z&&(t+=(c??"")+n[o+1]),this._$AH[o]=c}r&&!s&&this.j(t)}j(t){t===z?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class $e extends xt{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===z?void 0:t}}class Ae extends xt{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==z)}}class ke extends xt{constructor(t,i,e,s,n){super(t,i,e,s,n),this.type=5}_$AI(t,i=this){if((t=nt(this,t,i,0)??z)===st)return;const e=this._$AH,s=t===z&&e!==z||t.capture!==e.capture||t.once!==e.once||t.passive!==e.passive,n=t!==z&&(e===z||s);s&&this.element.removeEventListener(this.name,this,e),n&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class Te{constructor(t,i,e){this.element=t,this.type=6,this._$AN=void 0,this._$AM=i,this.options=e}get _$AU(){return this._$AM._$AU}_$AI(t){nt(this,t)}}const Le=Tt.litHtmlPolyfillSupport;Le?.(ht,ut),(Tt.litHtmlVersions??=[]).push("3.3.2");const Ee=(h,t,i)=>{const e=i?.renderBefore??t;let s=e._$litPart$;if(s===void 0){const n=i?.renderBefore??null;e._$litPart$=s=new ut(t.insertBefore(lt(),n),n,void 0,i??{})}return s._$AI(h),s};const Ct=globalThis;class pt extends it{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const i=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=Ee(i,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return st}}pt._$litElement$=!0,pt.finalized=!0,Ct.litElementHydrateSupport?.({LitElement:pt});const Ce=Ct.litElementPolyfillSupport;Ce?.({LitElement:pt}),(Ct.litElementVersions??=[]).push("4.2.2");const Me={attribute:!0,type:String,converter:bt,reflect:!1,hasChanged:kt},Ie=(h=Me,t,i)=>{const{kind:e,metadata:s}=i;let n=globalThis.litPropertyMetadata.get(s);if(n===void 0&&globalThis.litPropertyMetadata.set(s,n=new Map),e==="setter"&&((h=Object.create(h)).wrapped=!0),n.set(i.name,h),e==="accessor"){const{name:r}=i;return{set(a){const o=t.get.call(this);t.set.call(this,a),this.requestUpdate(r,o,h,!0,a)},init(a){return a!==void 0&&this.C(r,void 0,h,a),a}}}if(e==="setter"){const{name:r}=i;return function(a){const o=this[r];t.call(this,a),this.requestUpdate(r,o,h,!0,a)}}throw Error("Unsupported decorator location: "+e)};function U(h){return(t,i)=>typeof i=="object"?Ie(h,t,i):((e,s,n)=>{const r=s.hasOwnProperty(n);return s.constructor.createProperty(n,e),r?Object.getOwnPropertyDescriptor(s,n):void 0})(h,t,i)}function D(h){return U({...h,state:!0,attribute:!1})}const Pe=(h,t,i)=>(i.configurable=!0,i.enumerable=!0,Reflect.decorate&&typeof t!="object"&&Object.defineProperty(h,t,i),i);function _e(h,t){return(i,e,s)=>{const n=r=>r.renderRoot?.querySelector(h)??null;return Pe(i,e,{get(){return n(this)}})}}const V={GOOGLE:{MAX_RETRIES:3,RETRY_DELAY_MS:1e3}};class tt{static delay(t){return new Promise(i=>{setTimeout(i,t)})}static isPurelyLatinScript(t){return/^[\u0000-\u007F\u0080-\u00FF\u0100-\u017F\u0180-\u024F]*$/.test(t)}static async translate(t,i){if(!t||Array.isArray(t)&&t.length===0)return Array.isArray(t)?[]:"";const e=Array.isArray(t),s=e?t:[t],n=[],r=[];if(s.forEach((m,p)=>{m&&m.trim()&&(n.push(p),r.push(m))}),r.length===0)return e?s:s[0];const a=1500,o=new Array(r.length).fill("");let c=[],l=[],d=0;const y=async(m,p)=>{if(m.length===0)return;const g=m.join(`
`);let x=0,b=!1;for(;x<V.GOOGLE.MAX_RETRIES&&!b;)try{const w=`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${i}&dt=t&q=${encodeURIComponent(g)}`,$=await fetch(w);if(!$.ok)throw new Error(`Status ${$.status}`);const S=((await $.json())?.[0]?.map(L=>L?.[0]).join("")||"").split(`
`);p.forEach((L,P)=>{P<S.length?o[L]=S[P]:o[L]=m[P]}),b=!0}catch{x+=1,x<V.GOOGLE.MAX_RETRIES?await tt.delay(V.GOOGLE.RETRY_DELAY_MS*2**(x-1)):p.forEach(($,I)=>{o[$]=m[I]})}};for(let m=0;m<r.length;m+=1){const p=r[m];d+p.length>a&&(await y(c,l),c=[],l=[],d=0),c.push(p),l.push(m),d+=p.length}c.length>0&&await y(c,l);const u=[...s];return n.forEach((m,p)=>{u[m]=o[p]}),e?u:u[0]}static async romanize(t){const i=Array.isArray(t)?t:t.data||t.content;return i?i.some(s=>s.isWordSynced!==!1&&Array.isArray(s.text)&&s.text.length>1)?this.romanizeWordSynced(i):this.romanizeLineSynced(i):t}static async romanizeWordSynced(t){return Promise.all(t.map(async i=>{if(!i.text||!Array.isArray(i.text)||i.text.length===0||i.romanizedText)return i;const e=i.text.map(r=>r.text).join(""),[s]=await this.romanizeTexts([e]),n=i.text.map(r=>({...r,romanizedText:r.romanizedText}));return{...i,text:n,romanizedText:s||""}}))}static async romanizeLineSynced(t){const i=t.map(s=>s.romanizedText?"":Array.isArray(s.text)&&s.text.length>0?s.text.map(n=>n.text).join(""):""),e=await this.romanizeTexts(i);return t.map((s,n)=>({...s,romanizedText:e[n]||""}))}static async romanizeTexts(t){const i=t.join(" ");if(tt.isPurelyLatinScript(i))return t;const e=[];for(const s of t)if(!s||tt.isPurelyLatinScript(s))e.push(s);else{let n=0,r=!1,a=null;for(;n<V.GOOGLE.MAX_RETRIES&&!r;)try{const o=`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=rm&q=${encodeURIComponent(s)}`,d=(await(await fetch(o)).json())?.[0]?.[0]?.[3]||s;e.push(d),r=!0}catch(o){a=o,console.warn(`GoogleService: Error romanizing text "${s}" (attempt ${n+1}/${V.GOOGLE.MAX_RETRIES}):`,o),n+=1,n<V.GOOGLE.MAX_RETRIES&&await tt.delay(V.GOOGLE.RETRY_DELAY_MS*2**(n-1))}r||(console.error(`GoogleService: Failed to romanize text "${s}" after ${V.GOOGLE.MAX_RETRIES} attempts. Last error:`,a),e.push(s))}return e}}const Jt="1.1.4",mt=7e3,te=["https://lyricsplus.binimum.org","https://lyricsplus.atomix.one","https://lyricsplus-seven.vercel.app","https://lyricsplus.prjktla.workers.dev","https://lyrics-plus-backend.vercel.app"],Re="apple,lyricsplus,musixmatch,spotify,musixmatch-word",ze=["https://arran.monochrome.tf","https://api.monochrome.tf/","https://triton.squid.wtf","https://wolf.qqdl.site","https://maus.qqdl.site","https://vogel.qqdl.site","https://katze.qqdl.site","https://hund.qqdl.site","https://tidal.kinoplus.online","https://hifi-one.spotisaver.net","https://hifi-two.spotisaver.net"],Fe="https://fetch-genius.samidy.workers.dev/";class f extends pt{constructor(){super(...arguments),this.downloadFormat="auto",this.highlightColor="#ffffff",this.hoverBackgroundColor="rgba(255, 255, 255, 0.13)",this.autoScroll=!0,this.interpolate=!0,this.showRomanization=!1,this.showTranslation=!1,this._currentTime=0,this.isLoading=!1,this.activeLineIndices=[],this.activeMainWordIndices=new Map,this.activeBackgroundWordIndices=new Map,this.mainWordProgress=new Map,this.backgroundWordProgress=new Map,this.lyricsSource=null,this.availableSources=[],this.currentSourceIndex=0,this.isFetchingAlternatives=!1,this.hasFetchedAllProviders=!1,this.mainWordAnimations=new Map,this.backgroundWordAnimations=new Map,this.lastInstrumentalIndex=null,this.isUserScrolling=!1,this.isProgrammaticScroll=!1,this.isClickSeeking=!1,this.cachedLyricsLines=[],this.activeLineIds=new Set,this.currentPrimaryActiveLine=null,this.lastPrimaryActiveLine=null,this.scrollAnimationState=null,this.currentScrollOffset=0,this.animatingLines=[],this.lastActiveIndex=0,this.visibleLineIds=new Set}async toggleRomanization(){this.showRomanization=!this.showRomanization,await this.applyRomanization()}async applyRomanization(){if(this.showRomanization&&this.lyrics&&this.lyrics.some(i=>!i.romanizedText&&(!i.text||!i.text.some(e=>e.romanizedText)))){this.isLoading=!0;try{const i=await tt.romanize(this.lyrics);this.lyrics=i}catch(i){console.error("Romanization failed",i)}finally{this.isLoading=!1}}}async toggleTranslation(){this.showTranslation=!this.showTranslation,await this.applyTranslation()}async applyTranslation(){if(this.showTranslation&&this.lyrics&&this.lyrics.some(i=>!i.translation)){this.isLoading=!0;try{const i=this.lyrics.map(r=>r.translation?"":r.text.map(a=>a.text).join(""));if(i.every(r=>!r)){this.isLoading=!1;return}const e=await tt.translate(i,"en"),s=Array.isArray(e)?e:[e],n=this.lyrics.map((r,a)=>r.translation?r:{...r,translation:s[a]||void 0});this.lyrics=n}catch(i){console.error("Translation failed",i)}finally{this.isLoading=!1}}}set currentTime(t){const i=this._currentTime;this._currentTime=t,i!==t&&this.lyrics&&this._onTimeChanged(i,t)}get currentTime(){return this._currentTime}connectedCallback(){super.connectedCallback(),this.fetchLyrics()}disconnectedCallback(){super.disconnectedCallback(),this.animationFrameId&&cancelAnimationFrame(this.animationFrameId),this.userScrollTimeoutId&&clearTimeout(this.userScrollTimeoutId)}async fetchLyrics(){this.isLoading=!0,this.lyrics=void 0,this.lyricsSource=null,this.availableSources=[],this.currentSourceIndex=0,this.isFetchingAlternatives=!1,this.hasFetchedAllProviders=!1;try{const t=await this.resolveSongMetadata(),i=!!this.musicId&&!this.songTitle&&!this.songArtist&&!this.query,e=[];if(t?.metadata&&!i){const s=t.metadata.title?.trim()||"",n=t.metadata.artist?.trim()||"",r=await f.fetchLyricsFromYouLyPlus(s,n,t.metadata);r&&r.length>0&&e.push(...r)}if(e.length===0&&t?.metadata){const s=await f.fetchLyricsFromTidal(t.metadata,t.catalogIsrc);s&&s.lines.length>0&&e.push({lines:s.lines,source:"Tidal"})}if(e.length===0&&t?.metadata){const s=await f.fetchLyricsFromLrclib(t.metadata);s&&s.lines.length>0&&e.push({lines:s.lines,source:"LRCLIB"})}if(e.length===0&&t?.metadata){const s=await f.fetchLyricsFromGenius(t.metadata);s&&s.lines.length>0&&e.push({lines:s.lines,source:"Genius"})}if(this.hasFetchedAllProviders=e.length===0||e.some(s=>s.source==="LRCLIB"||s.source==="Tidal"||s.source==="Genius"),e.length>0){this.availableSources=f.mergeAndSortSources(e),this.currentSourceIndex=0,this.lyrics=this.availableSources[0].lines,this.lyricsSource=this.availableSources[0].source,await this.onLyricsLoaded();return}this.lyrics=void 0,this.lyricsSource=null}finally{this.isLoading=!1}}async onLyricsLoaded(){this.activeLineIndices=[],this.activeMainWordIndices.clear(),this.activeBackgroundWordIndices.clear(),this.mainWordProgress.clear(),this.backgroundWordProgress.clear(),this.mainWordAnimations.clear(),this.backgroundWordAnimations.clear(),this.lyricsContainer&&(this.isProgrammaticScroll=!0,this.lyricsContainer.scrollTop=0,window.setTimeout(()=>{this.isProgrammaticScroll=!1},100)),await this.autoProcessLyrics()}async autoProcessLyrics(){this.showRomanization&&await this.applyRomanization(),this.showTranslation&&await this.applyTranslation()}static getRankForCollected(t,i){const e=t.toLowerCase(),s=i.some(a=>a.text&&Array.isArray(a.text)&&a.text.length>1),n=i.length>0&&i.every(a=>a.timestamp===0&&a.endtime===0),r=e.includes("qq")||e.includes("lyricsplus");return e.includes("apple")&&s?1:r&&s?2:e.includes("musixmatch")&&s?3:e.includes("tidal")&&s?4:e.includes("lrclib")&&s?5:e.includes("apple")&&!s&&!n?6:r&&!s&&!n?7:e.includes("musixmatch")&&!s&&!n?8:e.includes("tidal")&&!s&&!n?9:e.includes("lrclib")&&!s&&!n?10:e.includes("apple")&&n?11:r&&n?12:e.includes("musixmatch")&&n?13:e.includes("tidal")&&n?14:e.includes("lrclib")&&n?15:e.includes("genius")?16:20}static mergeAndSortSources(t){const i=new Map;for(const e of t){const s=e.source.toLowerCase().includes("lyricsplus")?"QQ":e.source;i.has(s)||i.set(s,{...e,source:s})}return Array.from(i.values()).sort((e,s)=>f.getRankForCollected(e.source,e.lines)-f.getRankForCollected(s.source,s.lines))}async switchSource(){if(!this.isFetchingAlternatives){if(!this.hasFetchedAllProviders){this.isFetchingAlternatives=!0;try{const t=await this.resolveSongMetadata();if(t?.metadata){const i=[];if(!this.availableSources.some(e=>e.source.toLowerCase().includes("tidal"))){const e=await f.fetchLyricsFromTidal(t.metadata,t.catalogIsrc);e&&e.lines.length>0&&i.push({lines:e.lines,source:"Tidal"})}if(!this.availableSources.some(e=>e.source.toLowerCase().includes("lrclib"))){const e=await f.fetchLyricsFromLrclib(t.metadata);e&&e.lines.length>0&&i.push({lines:e.lines,source:"LRCLIB"})}if(!this.availableSources.some(e=>e.source.toLowerCase().includes("genius"))){const e=await f.fetchLyricsFromGenius(t.metadata);e&&e.lines.length>0&&i.push({lines:e.lines,source:"Genius"})}i.length>0&&(this.availableSources=f.mergeAndSortSources([...this.availableSources,...i]),this.currentSourceIndex=this.availableSources.findIndex(e=>e.source===this.lyricsSource),this.currentSourceIndex===-1&&(this.currentSourceIndex=0))}}finally{this.hasFetchedAllProviders=!0,this.isFetchingAlternatives=!1}}this.availableSources.length>1&&(this.currentSourceIndex=(this.currentSourceIndex+1)%this.availableSources.length,this.lyrics=this.availableSources[this.currentSourceIndex].lines,this.lyricsSource=this.availableSources[this.currentSourceIndex].source,await this.onLyricsLoaded())}}async resolveSongMetadata(){const t={title:this.songTitle?.trim()??"",artist:this.songArtist?.trim()??"",album:this.songAlbum?.trim()||void 0,durationMs:void 0};typeof this.songDurationMs=="number"&&this.songDurationMs>0?t.durationMs=this.songDurationMs:typeof this.duration=="number"&&this.duration>0&&(t.durationMs=this.duration);const i=null;let e=this.musicId,s;if(this.query&&(!t.title||!t.artist||!t.album)){const d=f.parseQueryMetadata(this.query);d&&(!t.title&&d.title&&(t.title=d.title),!t.artist&&d.artist&&(t.artist=d.artist),!t.album&&d.album&&(t.album=d.album))}let n=null;this.query&&(!t.title||!t.artist)&&(n=await f.searchLyricsPlusCatalog(this.query),n&&(!t.title&&n.title&&(t.title=n.title),!t.artist&&n.artist&&(t.artist=n.artist),!t.album&&n.album&&(t.album=n.album),t.durationMs==null&&typeof n.durationMs=="number"&&n.durationMs>0&&(t.durationMs=n.durationMs),!e&&n.id?.appleMusic&&(e=n.id.appleMusic),!s&&n.isrc&&(s=n.isrc)));const r=t.title?.trim()??"",a=t.artist?.trim()??"",o=t.album?.trim(),c=typeof t.durationMs=="number"&&Number.isFinite(t.durationMs)&&t.durationMs>0?Math.round(t.durationMs):void 0;return{metadata:r&&a?{title:r,artist:a,album:o||void 0,durationMs:c}:void 0,appleId:e,appleSong:i,catalogIsrc:s}}static parseQueryMetadata(t){const i=t?.trim();if(!i)return null;const e={},s=i.split(/\s[-–—]\s/);if(s.length>=2){const[r,...a]=s,o=a.join(" - "),c=r.trim(),l=o.trim();if(c&&l)return e.title=c,e.artist=l,e}const n=i.split(/\s+[bB]y\s+/);if(n.length===2){const[r,a]=n.map(o=>o.trim());if(r&&a)return e.title=r,e.artist=a,e}return null}static async searchLyricsPlusCatalog(t){const i=t?.trim();if(!i)return null;for(const e of te){const n=`${e.endsWith("/")?e.slice(0,-1):e}/v1/songlist/search?q=${encodeURIComponent(i)}`;try{const r=await fetch(n);if(r.ok){const a=await r.json();let o=[];const c=a;if(Array.isArray(c?.results)?o=c.results:Array.isArray(a)&&(o=a),o.length>0)return o.find(d=>d?.id&&d.id.appleMusic)??o[0]}}catch{}}return null}static async fetchLyricsFromYouLyPlus(t,i,e={}){if(!t||!i)return[];const s=new URLSearchParams({title:t,artist:i});e.album&&s.append("album",e.album),e.durationMs&&e.durationMs>0&&s.append("duration",Math.round(e.durationMs/1e3).toString()),s.append("source",Re);const n=(c,l)=>{const d=c.toLowerCase(),y=l.some(p=>p.text&&Array.isArray(p.text)&&p.text.length>1),u=l.length>0&&l.every(p=>p.timestamp===0&&p.endtime===0),m=d.includes("qq")||d.includes("lyricsplus");return d.includes("apple")&&y?1:m&&y?2:d.includes("musixmatch")&&y?3:d.includes("apple")&&!y&&!u?4:m&&!y&&!u?5:d.includes("musixmatch")&&!y&&!u?6:d.includes("apple")&&u?7:m&&u?8:d.includes("musixmatch")&&u?9:10},r=[];try{const c=new URLSearchParams({track:t,artist:i});e.album&&c.append("album",e.album),e.durationMs&&e.durationMs>0&&c.append("duration",Math.round(e.durationMs/1e3).toString());const l=`https://lyrics-api.binimum.org/?${c.toString()}`,d=await fetch(l);if(d.ok){const y=await d.json();if(y.results&&y.results.length>0){const u=y.results[0];if(u.timing_type==="word"&&u.lyricsUrl){const m=await fetch(u.lyricsUrl);if(m.ok){const p=await m.text(),g=f.parseTTML(p);if(g&&g.length>0)return r.push({lines:g,source:"BiniLyrics"}),r}}else{const m=new URLSearchParams(s);m.set("source","qq");const p=`https://lyricsplus.binimum.org/v2/lyrics/get?${m.toString()}`;try{const g=await fetch(p);if(g.ok){const x=await g.json(),b=f.convertKPoeLyrics(x),w=b?.some($=>$.text&&Array.isArray($.text)&&$.text.length>1);if(b&&b.length>0&&w)return r.push({lines:b,source:"QQ (Cache Fallback)"}),r}}catch{}if(u.lyricsUrl){const g=await fetch(u.lyricsUrl);if(g.ok){const x=await g.text(),b=f.parseTTML(x);if(b&&b.length>0)return r.push({lines:b,source:"Apple Music (Cache Fallback)"}),r}}}}}}catch(c){console.error("Cache API failed",c)}const a=[...te].sort(()=>Math.random()-.5).slice(0,2);for(const c of a){const d=`${c.endsWith("/")?c.slice(0,-1):c}/v2/lyrics/get?${s.toString()}`;let y=null;try{const u=await fetch(d);u.ok&&(y=await u.json())}catch{y=null}if(y){const u=f.convertKPoeLyrics(y);if(u&&u.length>0){const m=y?.metadata?.source||y?.metadata?.provider||"LyricsPlus (KPoe)",p=n(m,u),g={lines:u,source:m};if(r.push(g),p===1)break}}}if(!r.some(c=>n(c.source,c.lines)<=2))try{const c=new URLSearchParams(s);c.set("source","qq");const l=`https://lyricsplus.binimum.org/v2/lyrics/get?${c.toString()}`,d=await fetch(l);if(d.ok){const y=await d.json();if(y){const u=f.convertKPoeLyrics(y),m=y?.metadata?.source||y?.metadata?.provider||"LyricsPlus (KPoe)";u&&u.length>0&&r.push({lines:u,source:m})}}}catch{}return r}static parseLrcSubtitles(t){if(!t||typeof t!="string")return[];const i=[],e=t.split(`
`),s=[];for(const n of e){const r=n.match(/^\[(\d{1,3}):(\d{2})\.(\d{2,3})\]\s?(.*)$/);if(!r)continue;const a=parseInt(r[1],10),o=parseInt(r[2],10);let c=parseInt(r[3],10);r[3].length===3&&(c=Math.round(c/10));const l=(a*60+o)*1e3+c*10,d=r[4]||"";s.push({timestamp:l,text:d})}for(let n=0;n<s.length;n+=1){const{timestamp:r,text:a}=s[n],o=n+1<s.length?s[n+1].timestamp:r+5e3;if(!a.trim())continue;const c={text:a,part:!1,timestamp:r,endtime:o,lineSynced:!0};i.push({text:[c],background:!1,backgroundText:[],oppositeTurn:!1,timestamp:r,endtime:o,isWordSynced:!1})}return i}static async fetchLyricsFromTidal(t,i){const e=t.title?.trim(),s=t.artist?.trim();if(!e||!s)return null;const r=[...ze].sort(()=>Math.random()-.5).slice(0,2);for(const a of r)try{const o=a.endsWith("/")?a.slice(0,-1):a,c=`${e} ${s}`,l=new URLSearchParams({s:c}),d=await fetch(`${o}/search/?${l.toString()}`);if(!d.ok)continue;const u=(await d.json())?.data?.items;if(!Array.isArray(u)||u.length===0)continue;let m=u[0];if(i){const w=u.find($=>$.isrc&&$.isrc.toLowerCase()===i.toLowerCase());w&&(m=w)}const p=m?.id;if(!p)continue;const g=await fetch(`${o}/lyrics/?id=${p}`);if(!g.ok)continue;const x=await g.json(),b=x?.lyrics?.subtitles;if(b&&typeof b=="string"){const w=f.parseLrcSubtitles(b);if(w.length>0){const $=x?.lyrics?.lyricsProvider||"Tidal";return{lines:w,source:`Tidal (${$})`}}}}catch{}return null}static async fetchLyricsFromLrclib(t){const i=t.title?.trim(),e=t.artist?.trim();if(!i||!e)return null;try{const s=`${e} ${i}`,n=new URLSearchParams({q:s}),r=await fetch(`https://lrclib.net/api/search?${n.toString()}`,{headers:{"User-Agent":`apple-music-web-components/${Jt}`}});if(!r.ok)return null;const a=await r.json();if(!Array.isArray(a)||a.length===0)return null;const c=a.find(l=>l.syncedLyrics&&typeof l.syncedLyrics=="string")||a[0];if(c.syncedLyrics){const l=f.parseLrcSubtitles(c.syncedLyrics);if(l.length>0)return{lines:l,source:"LRCLIB"}}if(c.plainLyrics&&typeof c.plainLyrics=="string"){const l=c.plainLyrics.split(`
`).filter(d=>d.trim());if(l.length>0)return{lines:l.map(y=>({text:[{text:y,part:!1,timestamp:0,endtime:0}],background:!1,backgroundText:[],oppositeTurn:!1,timestamp:0,endtime:0,isWordSynced:!1})),source:"LRCLIB (unsynced)"}}}catch{}return null}static async fetchLyricsFromGenius(t){const i=t.title?.trim(),e=t.artist?.trim();if(!i||!e)return null;try{const s=new URLSearchParams({title:i,artist:e}),n=await fetch(`${Fe}?${s.toString()}`);if(!n.ok)return null;const r=await n.json();if(r.lyrics){const a=r.lyrics.split(`
`).map(o=>o.trim()).filter(o=>o&&!o.startsWith("["));if(a.length>0)return{lines:a.map(c=>({text:[{text:c,part:!1,timestamp:0,endtime:0}],background:!1,backgroundText:[],oppositeTurn:!1,timestamp:0,endtime:0,isWordSynced:!1})),source:"Genius"}}}catch{console.error("No Genius lyrics found")}return null}static calculateLineAlignments(t,i){const e=new Array(t.length).fill(void 0);let s=!0,n=null,r=0,a=0;if(t.forEach((o,c)=>{let l;if(o){let d=i[o];d||(o==="v1000"?d="group":o==="v2000"?d="other":d="person"),d==="group"?l="start":(n===null?d==="other"?s=!1:s=!0:o!==n&&(s=!s),l=s?"start":"end",n=o)}l&&(a+=1,l==="end"&&(r+=1)),e[c]=l}),a>0&&Math.round(r/a*100)>=85){const o=c=>c==="start"?"end":c==="end"?"start":c;for(let c=0;c<e.length;c+=1)e[c]=o(e[c])}return e}static parseTTML(t){try{const e=new DOMParser().parseFromString(t,"text/xml"),s={},n={},r={},a=e.getElementsByTagName("ttm:agent");for(let p=0;p<a.length;p+=1){const g=a[p],x=g.getAttribute("xml:id"),b=g.getAttribute("type");x&&b&&(r[x]=b)}const o=e.getElementsByTagName("translation");for(let p=0;p<o.length;p+=1){const g=o[p].getElementsByTagName("text");for(let x=0;x<g.length;x+=1){const b=g[x],w=b.getAttribute("for");w&&b.textContent&&(s[w]=b.textContent)}}const c=e.getElementsByTagName("transliteration");for(let p=0;p<c.length;p+=1){const g=c[p].getElementsByTagName("text");for(let x=0;x<g.length;x+=1){const b=g[x],w=b.getAttribute("for");w&&b.textContent&&(n[w]=b.textContent.trim().replace(/\s+/g," "))}}const l=p=>{if(!p)return 0;const g=p.split(":");let x=0;return g.length===2?x=parseInt(g[0],10)*60+parseFloat(g[1]):g.length===3?x=parseInt(g[0],10)*3600+parseInt(g[1],10)*60+parseFloat(g[2]):x=parseFloat(g[0]),Math.round(x*1e3)},d=[],y=e.getElementsByTagName("p"),u=[];for(let p=0;p<y.length;p+=1)u.push(y[p].getAttribute("ttm:agent")||void 0);const m=f.calculateLineAlignments(u,r);for(let p=0;p<y.length;p+=1){const g=y[p],x=g.getAttribute("itunes:key"),b=l(g.getAttribute("begin")),w=l(g.getAttribute("end"));let $;g.parentNode&&g.parentNode.tagName==="div"&&($=g.parentNode.getAttribute("itunes:songPart")||void 0);const I=[],R=[],S=g.getElementsByTagName("span");if(S.length>0)for(let P=0;P<S.length;P+=1){const v=S[P];if(v.getAttribute("ttm:role")==="x-bg"){const F=v.getElementsByTagName("span");for(let A=0;A<F.length;A+=1){const _=F[A];let B=_.textContent||"";const N=_.nextSibling;N&&N.nodeType===3&&/^\s/.test(N.textContent||"")&&!B.endsWith(" ")&&(B+=" "),R.push({text:B,timestamp:l(_.getAttribute("begin")),endtime:l(_.getAttribute("end")),part:!1})}continue}if(v.parentNode&&v.parentNode.getAttribute?.("ttm:role")==="x-bg")continue;let k=v.textContent||"";const E=v.nextSibling;E&&E.nodeType===3&&/^\s/.test(E.textContent||"")&&!k.endsWith(" ")&&(k+=" "),I.push({text:k,timestamp:l(v.getAttribute("begin")),endtime:l(v.getAttribute("end")),part:!1})}else I.push({text:g.textContent?.trim()||"",timestamp:b,endtime:w,part:!1,lineSynced:!0});const L=m[p];d.push({text:I,background:R.length>0,backgroundText:R,timestamp:b,endtime:w,isWordSynced:S.length>0,alignment:L,songPart:$,translation:x?s[x]:void 0,romanizedText:x?n[x]:void 0,oppositeTurn:L==="end"})}return d}catch(i){return console.error("Failed to parse TTML",i),null}}static convertKPoeLyrics(t){if(!t)return null;let i=null;if(Array.isArray(t?.lyrics)?i=t.lyrics:Array.isArray(t?.data?.lyrics)?i=t.data.lyrics:Array.isArray(t?.data)&&(i=t.data),!i||i.length===0)return null;const e=i.filter(c=>!!c),s=[],n=t.type==="Line"||t.type==="line",r={};t.metadata?.agents&&Object.entries(t.metadata.agents).forEach(([c,l])=>{const d=l.alias||c;r[d]=l.type});const a=e.map(c=>c.element?.singer),o=f.calculateLineAlignments(a,r);for(let c=0;c<e.length;c+=1){const l=e[c],d=f.toMilliseconds(l.time),y=f.toMilliseconds(l.duration),u=o[c],m=typeof l.text=="string"?l.text:"",p=f.toMilliseconds(l.time),g=f.toMilliseconds(l.duration),b=f.toMilliseconds(l.endTime)||p+(g||0),w=Array.isArray(l.syllabus)?l.syllabus.filter(k=>!!k):[],$=[],I=[];if(!n&&w.length>0)for(const k of w){const E=f.toMilliseconds(k.time,p),F=f.toMilliseconds(k.duration),A=F===0&&w.length===1?b:E+F,_={text:typeof k.text=="string"?k.text:"",part:!!k.part,timestamp:E,endtime:A};k.isBackground?I.push(_):$.push(_)}$.length===0&&m&&$.push({text:m,part:!1,timestamp:p,endtime:b||p,lineSynced:n});const R=$.length>0||I.length>0,{transliteration:S}=l;let L;S&&(L=S.text,Array.isArray(S.syllabus)&&S.syllabus.length===$.length&&S.syllabus.forEach((k,E)=>{$[E].romanizedText=k.text}));const P=l.translation?.text,v={text:$,background:I.length>0,backgroundText:I,oppositeTurn:u==="end"||(Array.isArray(l.element)?l.element.includes("opposite")||l.element.includes("right"):!1),timestamp:p,endtime:d+y,isWordSynced:n?!1:R,alignment:u,songPart:l.element?.songPart,romanizedText:L,translation:P};s.push(v)}return s}static toMilliseconds(t,i=0){const e=Number(t);return!Number.isFinite(e)||Number.isNaN(e)?i:Number.isInteger(e)?Math.max(0,Math.round(e)):Math.round(e*1e3)}firstUpdated(){this.lyricsContainer&&(this.lyricsContainer.addEventListener("wheel",this.handleUserScroll.bind(this),{passive:!0}),this.lyricsContainer.addEventListener("touchmove",this.handleUserScroll.bind(this),{passive:!0}))}_onTimeChanged(t,i){const e=Math.abs(i-t),s=this.findActiveLineIndices(i),n=this.activeLineIndices,r=!f.arraysEqual(s,n);if(r||e>.5){if(this.lyricsContainer){for(const a of n)if(!s.includes(a)){const o=this.lyricsContainer.querySelector(`#lyrics-line-${a}`);o&&(o.classList.remove("active"),f.resetSyllables(o))}for(const a of s)if(!n.includes(a)){const o=this.lyricsContainer.querySelector(`#lyrics-line-${a}`);o&&(o.classList.add("active"),o.classList.remove("pre-active"))}}if(this.startAnimationFromTime(i),this.lyricsContainer&&this.activeLineIndices.length>0){const a=this.activeLineIndices[0],o=this.lyricsContainer.querySelector(`#lyrics-line-${a}`);o&&o!==this.currentPrimaryActiveLine&&(this.lastPrimaryActiveLine=this.currentPrimaryActiveLine,this.currentPrimaryActiveLine=o,this.updatePositionClasses(o))}this._handleActiveLineScroll(n)}if(this.lyricsContainer){for(const l of this.activeLineIndices){const d=this.lyricsContainer.querySelector(`#lyrics-line-${l}`);d&&f.updateSyllablesForLine(d,i)}this.lyricsContainer.querySelectorAll(".lyrics-gap.active").forEach(l=>{f.updateSyllablesForLine(l,i)}),this.lyricsContainer.querySelectorAll(".lyrics-gap").forEach(l=>{const d=parseFloat(l.getAttribute("data-start-time")||"0"),y=parseFloat(l.getAttribute("data-end-time")||"0"),u=i>=d&&i<y,m=l.classList.contains("active"),p=l.classList.contains("gap-exiting"),g=600,x=m&&!p&&i>=y-g;u&&!m&&!p?(l.classList.remove("gap-exiting"),l.classList.add("active"),l.querySelectorAll(".lyrics-syllable").forEach(w=>{const $=parseFloat(w.getAttribute("data-end-time")||"0");i>$&&w.classList.add("finished")})):x?(l.classList.add("gap-exiting"),l.classList.remove("active"),setTimeout(()=>{l.classList.remove("gap-exiting")},800)):m&&!u?(l.classList.remove("active"),l.classList.remove("gap-exiting")):p&&i<y-g&&l.classList.remove("gap-exiting")});const c=this.findInstrumentalGapAt(i);if(c?this.lastInstrumentalIndex=c.insertBeforeIndex:this.lastInstrumentalIndex!==null&&(this.lastInstrumentalIndex=null),!r&&this.activeLineIndices.length>0){const l=this.activeLineIndices[0],d=this.lyricsContainer.querySelector(`#lyrics-line-${l}`);d&&d!==this.currentPrimaryActiveLine&&(this.lastPrimaryActiveLine=this.currentPrimaryActiveLine,this.currentPrimaryActiveLine=d,this.updatePositionClasses(d))}if(this.autoScroll&&!this.isUserScrolling&&!this.isClickSeeking&&this.lyrics&&this.activeLineIndices.length===0)for(let d=0;d<this.lyrics.length;d+=1){const u=this.lyrics[d].timestamp-i,m=this.lyricsContainer.querySelector(`#lyrics-line-${d}`);if(u>0&&u<=500){m&&(m.classList.add("pre-active"),m!==this.currentPrimaryActiveLine&&this.scrollToActiveLineYouLy(m));break}else m&&m.classList.remove("pre-active")}}}updated(t){if(t.has("lyrics")&&(this._updateCharTimingData(),this.lyricsContainer&&this.lyrics)){const i=this.findActiveLineIndices(this.currentTime);for(const e of i){const s=this.lyricsContainer.querySelector(`#lyrics-line-${e}`);s&&s.classList.add("active")}}if(t.has("duration")&&this.duration===-1){this.currentTime=0,this.activeLineIndices=[],this.activeMainWordIndices.clear(),this.activeBackgroundWordIndices.clear(),this.mainWordProgress.clear(),this.backgroundWordProgress.clear(),this.mainWordAnimations.clear(),this.backgroundWordAnimations.clear(),this.isUserScrolling=!1,this.animationFrameId&&(cancelAnimationFrame(this.animationFrameId),this.animationFrameId=void 0),this.userScrollTimeoutId&&(clearTimeout(this.userScrollTimeoutId),this.userScrollTimeoutId=void 0),this.lyricsContainer&&(this.lyricsContainer.scrollTop=0);return}(t.has("query")||t.has("musicId")||t.has("isrc")||t.has("songTitle")||t.has("songArtist")||t.has("songAlbum")||t.has("songDurationMs"))&&!t.has("currentTime")&&this.fetchLyrics(),t.has("currentTime")&&this.lyrics}_handleActiveLineScroll(t){if(!this.autoScroll||this.isUserScrolling||this.isClickSeeking||this.activeLineIndices.length===0)return;const i=this.activeLineIndices.filter(n=>!t.includes(n));if(i.length===0)return;const e=i[i.length-1],s=this.lyricsContainer?.querySelector(`#lyrics-line-${e}`);s?this.scrollToActiveLineYouLy(s):this.currentPrimaryActiveLine?this.scrollToActiveLineYouLy(this.currentPrimaryActiveLine):this.scrollToActiveLine()}_getTextWidth(t,i){return this._textWidthCanvas||(this._textWidthCanvas=document.createElement("canvas"),this._textWidthCtx=this._textWidthCanvas.getContext("2d",{willReadFrequently:!0})),this._textWidthCtx?(this._textWidthCtx.font=i,this._textWidthCtx.measureText(t).width):0}_updateCharTimingData(){if(!this.shadowRoot)return;const t=this.shadowRoot.querySelector(".lyrics-syllable");if(!t)return;const i=getComputedStyle(t),{font:e}=i,s=parseFloat(i.fontSize),n=this.shadowRoot.querySelectorAll(".lyrics-word.growable");n&&n.forEach(r=>{const a=r.querySelectorAll(".lyrics-syllable-wrap"),o=[];a.forEach(c=>{const l=c.querySelector(".lyrics-syllable");l&&o.push(l)}),o.forEach(c=>{const l=c.querySelectorAll(".char");if(l.length===0)return;const y=Array.from(l).map(w=>w.textContent||"").map(w=>this._getTextWidth(w,e)),u=y.reduce((w,$)=>w+$,0),m=parseFloat(c.dataset.duration||"0"),p=m>0?u/m:0,g=.375*s,x=p>0?g/p:100;let b=0;l.forEach((w,$)=>{const I=y[$],R=w;if(u>0){const S=b/u,L=I/u;R.dataset.wipeStart=S.toFixed(4),R.dataset.wipeDuration=L.toFixed(4),R.dataset.preWipeArrival=(m*S).toFixed(2),R.dataset.preWipeDuration=x.toFixed(2)}b+=I})})})}static arraysEqual(t,i){return t.length===i.length&&t.every((e,s)=>e===i[s])}handleUserScroll(){this.isProgrammaticScroll||this.isClickSeeking||(this.isUserScrolling=!0,this.lyricsContainer?.classList.add("user-scrolling"),this.userScrollTimeoutId&&clearTimeout(this.userScrollTimeoutId),this.userScrollTimeoutId=window.setTimeout(()=>{this.isUserScrolling=!1,this.userScrollTimeoutId=void 0,this.activeLineIndices.length>0&&this.scrollToActiveLine()},2e3))}findActiveLineIndices(t){if(!this.lyrics)return[];const i=[];for(let e=0;e<this.lyrics.length;e+=1){const s=this.lyrics[e];let n=s.endtime;if(e<this.lyrics.length-1){const r=this.lyrics[e+1].timestamp;r-s.endtime<mt&&n<r&&(n=Math.max(n,r-500))}t>=s.timestamp&&t<=n&&i.push(e)}return i}findInstrumentalGapAt(t){if(!this.lyrics||this.lyrics.length===0)return null;const i=this.lyrics[0];if(t>=0&&t<i.timestamp){const s=i.timestamp;return s-0>=mt?{insertBeforeIndex:0,gapStart:0,gapEnd:s}:null}for(let e=0;e<this.lyrics.length-1;e+=1){const s=this.lyrics[e],n=this.lyrics[e+1],r=s.endtime,a=n.timestamp;if(t>r&&t<a)return a-r>=mt?{insertBeforeIndex:e+1,gapStart:r,gapEnd:a}:null}return null}findAllInstrumentalGaps(){if(!this.lyrics||this.lyrics.length===0)return[];const t=[],i=this.lyrics[0];i.timestamp>=mt&&t.push({insertBeforeIndex:0,gapStart:0,gapEnd:i.timestamp});for(let e=0;e<this.lyrics.length-1;e+=1){const s=this.lyrics[e],n=this.lyrics[e+1],r=s.endtime,a=n.timestamp;a-r>=mt&&t.push({insertBeforeIndex:e+1,gapStart:r,gapEnd:a})}return t}startAnimationFromTime(t){if(this.animationFrameId&&(cancelAnimationFrame(this.animationFrameId),this.animationFrameId=void 0),!this.lyrics)return;const i=this.findActiveLineIndices(t);if(f.arraysEqual(i,this.activeLineIndices)||(this.activeLineIndices=i),this.activeMainWordIndices.clear(),this.activeBackgroundWordIndices.clear(),this.mainWordAnimations.clear(),this.backgroundWordAnimations.clear(),this.mainWordProgress.clear(),this.backgroundWordProgress.clear(),i.length!==0){for(const e of i){const s=this.lyrics[e];let n=-1;for(let a=0;a<s.text.length;a+=1)if(t>=s.text[a].timestamp&&t<=s.text[a].endtime){n=a;break}this.activeMainWordIndices.set(e,n);let r=-1;if(s.backgroundText){for(let a=0;a<s.backgroundText.length;a+=1)if(t>=s.backgroundText[a].timestamp&&t<=s.backgroundText[a].endtime){r=a;break}}this.activeBackgroundWordIndices.set(e,r)}this.setupAnimations(),this.interpolate&&this.animateProgress()}}updateActiveLineAndWords(){if(!this.lyrics)return;const t=this.findActiveLineIndices(this.currentTime);f.arraysEqual(t,this.activeLineIndices)||(this.activeLineIndices=t),this.activeMainWordIndices.clear(),this.activeBackgroundWordIndices.clear();for(const i of t){const e=this.lyrics[i];let s=-1;for(let r=0;r<e.text.length;r+=1)if(this.currentTime>=e.text[r].timestamp&&this.currentTime<=e.text[r].endtime){s=r;break}this.activeMainWordIndices.set(i,s);let n=-1;if(e.backgroundText){for(let r=0;r<e.backgroundText.length;r+=1)if(this.currentTime>=e.backgroundText[r].timestamp&&this.currentTime<=e.backgroundText[r].endtime){n=r;break}}this.activeBackgroundWordIndices.set(i,n)}}setupAnimations(){if(this.activeLineIndices.length===0||!this.lyrics){this.mainWordAnimations.clear(),this.backgroundWordAnimations.clear();return}for(const t of this.activeLineIndices){const i=this.lyrics[t],e=this.activeMainWordIndices.get(t)??-1,s=this.activeBackgroundWordIndices.get(t)??-1;if(e!==-1){const n=i.text[e],r=n.endtime-n.timestamp,a=this.currentTime-n.timestamp;this.mainWordAnimations.set(t,{startTime:performance.now()-a,duration:r})}else this.mainWordAnimations.set(t,{startTime:0,duration:0});if(s!==-1&&i.backgroundText){const n=i.backgroundText[s],r=n.endtime-n.timestamp,a=this.currentTime-n.timestamp;this.backgroundWordAnimations.set(t,{startTime:performance.now()-a,duration:r})}else this.backgroundWordAnimations.set(t,{startTime:0,duration:0})}}handleLineClick(t){this.lyricsContainer&&(this.lyricsContainer.querySelectorAll(".lyrics-line").forEach(n=>{f.resetSyllables(n),n.classList.remove("scroll-animate"),n.style.removeProperty("--scroll-delta"),n.style.removeProperty("--lyrics-line-delay")}),this.lyricsContainer.classList.remove("wheel-scrolling")),this.scrollAnimationState&&(this.scrollAnimationState.isAnimating=!1,this.scrollAnimationState.pendingUpdate=null),this.scrollUnlockTimeout&&(clearTimeout(this.scrollUnlockTimeout),this.scrollUnlockTimeout=void 0),this.scrollAnimationTimeout&&(clearTimeout(this.scrollAnimationTimeout),this.scrollAnimationTimeout=void 0),this.userScrollTimeoutId&&(clearTimeout(this.userScrollTimeoutId),this.userScrollTimeoutId=void 0),this.isUserScrolling=!1,this.currentPrimaryActiveLine=null,this.lastPrimaryActiveLine=null,this.activeLineIds.clear(),this.animatingLines=[];const i=this.lyricsContainer?.querySelector(`.lyrics-line[data-start-time="${t.timestamp*1e3}"]`);i&&this.lyricsContainer&&(this.currentPrimaryActiveLine=i,this.currentScrollOffset=-this.lyricsContainer.scrollTop,this.isClickSeeking=!0,this.clickSeekTimeout&&clearTimeout(this.clickSeekTimeout),this.clickSeekTimeout=setTimeout(()=>{this.isClickSeeking=!1},800),this.scrollToActiveLineYouLy(i,!0));const e=new CustomEvent("line-click",{detail:{timestamp:t.timestamp},bubbles:!0,composed:!0});this.dispatchEvent(e)}static getBackgroundTextPlacement(t){if(!t.backgroundText||t.backgroundText.length===0||t.text.length===0)return"after";const i=t.text[0].timestamp;return t.backgroundText[0].timestamp<i?"before":"after"}scrollToActiveLine(){if(!this.lyricsContainer||this.activeLineIndices.length===0)return;const t=Math.min(...this.activeLineIndices),i=this.lyricsContainer.querySelector(`.lyrics-line:nth-child(${t+1})`);if(i){const e=this.lyricsContainer.clientHeight,s=i.offsetTop,n=i.clientHeight,r=i.querySelector(".background-text.before");let a=0;r&&(a=r.clientHeight/2);const o=s-e/2+n/2-a;requestAnimationFrame(()=>{this.isProgrammaticScroll=!0,this.lyricsContainer?.scrollTo({top:o,behavior:"smooth"}),setTimeout(()=>{this.isProgrammaticScroll=!1},100)})}}scrollToInstrumental(t){if(!this.lyricsContainer)return;const i=this.lyricsContainer.querySelector(`#gap-${t}`);if(i){const s=this.getScrollPaddingTop()-i.offsetTop;this.isProgrammaticScroll=!0,this.animateScrollYouLy(s,!1),setTimeout(()=>{this.isProgrammaticScroll=!1},250)}}getScrollPaddingTop(){if(!this.lyricsContainer)return 0;const i=getComputedStyle(this).getPropertyValue("--lyrics-scroll-padding-top")||"25%";return i.includes("%")?this.lyricsContainer.clientHeight*(parseFloat(i)/100):parseFloat(i)||0}animateScrollYouLy(t,i=!1){if(!this.lyricsContainer)return;const e=this.lyricsContainer;this.scrollAnimationState||(this.scrollAnimationState={isAnimating:!1,pendingUpdate:null},this.animatingLines=[]);const s=this.scrollAnimationState;if(s.isAnimating&&!i){s.pendingUpdate=t;return}this.scrollUnlockTimeout&&(clearTimeout(this.scrollUnlockTimeout),this.scrollUnlockTimeout=void 0),this.scrollAnimationTimeout&&(clearTimeout(this.scrollAnimationTimeout),this.scrollAnimationTimeout=void 0);const{animatingLines:n}=this,r=Math.max(0,-t),o=-e.scrollTop-t;if(this.currentScrollOffset=t,Math.abs(e.scrollTop-r)<1&&Math.abs(o)<1){s.isAnimating=!1,s.pendingUpdate=null;return}if(i){for(const S of n)S.classList.remove("scroll-animate"),S.style.removeProperty("--scroll-delta"),S.style.removeProperty("--lyrics-line-delay");n.length=0,e.scrollTo({top:r,behavior:"smooth"}),s.isAnimating=!1,s.pendingUpdate=null;return}for(const S of n)S.classList.remove("scroll-animate");n.length=0;const c=this.lyricsContainer.querySelectorAll(".lyrics-line"),l=Array.from(c),d=this.currentPrimaryActiveLine||this.lastPrimaryActiveLine||l[0];if(!d)return;const y=l.indexOf(d);if(y===-1)return;const u=30,m=10,p=15,g=l.length,x=Math.max(0,y-m),b=Math.min(g,y+p);let w=0,$=0;const I=[];for(let S=x;S<b;S+=1){const L=l[S];S>=y&&($+=1);const P=S>=y?($-1)*u:0;L.style.setProperty("--scroll-delta",`${o}px`),L.style.setProperty("--lyrics-line-delay",`${P}ms`),I.push(L);const v=400+P;v>w&&(w=v)}e.getBoundingClientRect();for(const S of I)S.classList.add("scroll-animate"),n.push(S);s.isAnimating=!0;const R=400;this.scrollUnlockTimeout=setTimeout(()=>{if(s.isAnimating=!1,s.pendingUpdate!==null){const S=s.pendingUpdate;s.pendingUpdate=null,this.animateScrollYouLy(S,!1)}},R),this.scrollAnimationTimeout=setTimeout(()=>{for(let S=0;S<n.length;S+=1){const L=n[S];L.classList.remove("scroll-animate"),L.style.removeProperty("--scroll-delta"),L.style.removeProperty("--lyrics-line-delay")}n.length=0,this.scrollAnimationTimeout=void 0},w+50),e.scrollTo({top:r,behavior:"instant"})}updatePositionClasses(t){if(!this.lyricsContainer)return;const i=["lyrics-activest","post-active-line","next-active-line","prev-1","prev-2","prev-3","prev-4","next-1","next-2","next-3","next-4"];this.lyricsContainer.querySelectorAll(`.${i.join(", .")}`).forEach(n=>n.classList.remove(...i)),t.classList.add("lyrics-activest");const e=Array.from(this.lyricsContainer.querySelectorAll(".lyrics-line")),s=e.indexOf(t);for(let n=Math.max(0,s-4);n<=Math.min(e.length-1,s+4);n+=1){const r=n-s;if(r!==0){const a=e[n];r===-1?a.classList.add("post-active-line"):r===1?a.classList.add("next-active-line"):r<0?a.classList.add(`prev-${Math.abs(r)}`):a.classList.add(`next-${r}`)}}}scrollToActiveLineYouLy(t,i=!1){if(!t||!this.lyricsContainer)return;const e=this.getScrollPaddingTop(),s=e-t.offsetTop,n=this.lyricsContainer.getBoundingClientRect().top;if(!(!i&&Math.abs(t.getBoundingClientRect().top-n-e)<1)){if(!i){const r=this.lyricsContainer;if(r.scrollTop+r.clientHeight>=r.scrollHeight-50)return}this.lyricsContainer.classList.remove("not-focused","user-scrolling"),this.isProgrammaticScroll=!0,this.isUserScrolling=!1,this.userScrollTimeoutId&&(clearTimeout(this.userScrollTimeoutId),this.userScrollTimeoutId=void 0),setTimeout(()=>{this.isProgrammaticScroll=!1},600),this.animateScrollYouLy(s,i)}}static updateSyllableAnimation(t){if(t.classList.contains("highlight"))return;const{classList:i}=t,e=i.contains("rtl-text"),s=Array.from(t.querySelectorAll("span.char")),n=t.parentElement?.parentElement,r=n?Array.from(n.querySelectorAll("span.char")):[],a=n?.classList.contains("growable"),o=t.getAttribute("data-syllable-index")==="0",c=o,l=t.closest(".lyrics-gap")!==null,d=parseFloat(t.getAttribute("data-duration")||"0")||300,y=parseFloat(t.getAttribute("data-word-duration")||t.getAttribute("data-duration")||"0")||d,u=new Map,m=[];if(a&&o&&r.length>0){const p=y,g=p*.09,x=p*1.5;r.forEach(b=>{const w=parseFloat(b.dataset.horizontalOffset||"0"),$=parseFloat(b.dataset.syllableCharIndex||"0"),I=g*$,R=b.dataset.maxScale||"1.1",S=b.dataset.shadowIntensity||"0.6",L=b.dataset.translateYPeak||"-2";u.set(b,`grow-dynamic ${x}ms ease-in-out ${I}ms forwards`),m.push({element:b,property:"--char-offset-x",value:`${w}`}),m.push({element:b,property:"--max-scale",value:R}),m.push({element:b,property:"--shadow-intensity",value:S}),m.push({element:b,property:"--translate-y-peak",value:`${L}`})})}if(s.length>0)s.forEach((p,g)=>{const x=parseFloat(p.dataset.wipeStart||"0"),b=parseFloat(p.dataset.wipeDuration||"0"),w=d*x,$=d*b,I=c&&g===0;let R;I?R=e?"start-wipe-rtl":"start-wipe":R=e?"wipe-rtl":"wipe";const S=u.get(p)||p.style.animation||"",L=[];S&&S.includes("grow-dynamic")&&L.push(S.split(",")[0].trim()),$>0&&L.push(`${R} ${$}ms linear ${w}ms forwards`),u.set(p,L.join(", "))});else{const p=parseFloat(t.getAttribute("data-wipe-ratio")||"1"),g=d*p;let x;if(c?x=e?"start-wipe-rtl":"start-wipe":x=e?"wipe-rtl":"wipe",t.classList.contains("line-synced"))return;const w=`${l?"fade-gap":x} ${g}ms ${l?"ease-out":"linear"} forwards`;t.style.animation=w}i.remove("pre-highlight"),i.add("highlight");for(const[p,g]of u.entries())p.style.animation=g;for(const p of m)p.element.style.setProperty(p.property,p.value)}static resetSyllable(t){t&&(t.style.animation="",t.style.removeProperty("--pre-wipe-duration"),t.style.removeProperty("--pre-wipe-delay"),t.style.transition="none",t.style.backgroundColor="var(--lyplus-text-secondary)",t.querySelectorAll("span.char").forEach(i=>{const e=i;e.style.animation="",e.style.transition="none",e.style.backgroundColor="var(--lyplus-text-secondary)"}),t.classList.remove("highlight","finished","pre-highlight","cleanup"),requestAnimationFrame(()=>{t.style.removeProperty("background-color"),t.style.removeProperty("transition"),t.querySelectorAll("span.char").forEach(i=>{const e=i;e.style.removeProperty("background-color"),e.style.removeProperty("transition")})}))}static resetSyllables(t){t&&(t._cachedSyllableElements=null,Array.from(t.getElementsByClassName("lyrics-syllable")).forEach(i=>f.resetSyllable(i)))}static updateSyllablesForLine(t,i){let e=t._cachedSyllableElements;e||(e=Array.from(t.querySelectorAll(".lyrics-syllable")),t._cachedSyllableElements=e);for(let s=0;s<e.length;s+=1){const n=e[s],r=parseFloat(n.getAttribute("data-start-time")||"0"),a=parseFloat(n.getAttribute("data-end-time")||"0");if(r){const{classList:o}=n,c=o.contains("highlight"),l=o.contains("finished"),d=o.contains("pre-highlight"),y=c||l||d;if(!(i<r-1e3&&!y)){let u=!1;d&&s>0&&(e[s-1].classList.contains("highlight")||(o.remove("pre-highlight"),n.style.removeProperty("--pre-wipe-duration"),n.style.removeProperty("--pre-wipe-delay"),n.style.animation="",u=!0)),u||(i>=r&&i<=a?(c||f.updateSyllableAnimation(n),l&&o.remove("finished")):i>a?l||(c||f.updateSyllableAnimation(n),o.add("finished")):(c||l)&&f.resetSyllable(n))}}}}animateProgress(){const t=performance.now();let i=!1;if(!this.lyrics||this.activeLineIndices.length===0){this.animationFrameId&&(cancelAnimationFrame(this.animationFrameId),this.animationFrameId=void 0);return}for(const e of this.activeLineIndices){const s=this.lyrics[e],n=this.mainWordAnimations.get(e);if(n&&n.duration>0){const a=t-n.startTime;if(a>=0){const o=Math.min(1,a/n.duration);if(this.mainWordProgress.set(e,o),o<1)i=!0;else{const c=this.activeMainWordIndices.get(e)??-1,l=c+1;if(c!==-1&&l<s.text.length){const d=s.text[c],y=s.text[l];this.activeMainWordIndices.set(e,l);const u=y.timestamp-d.endtime,m=y.endtime-y.timestamp;this.mainWordAnimations.set(e,{startTime:performance.now()+u,duration:m}),i=!0}else this.mainWordAnimations.set(e,{startTime:0,duration:0})}}else this.mainWordProgress.set(e,0),i=!0}const r=this.backgroundWordAnimations.get(e);if(r&&r.duration>0){const a=t-r.startTime;if(a>=0){const o=Math.min(1,a/r.duration);if(this.backgroundWordProgress.set(e,o),o<1)i=!0;else{const c=this.activeBackgroundWordIndices.get(e)??-1;if(s.backgroundText&&c!==-1&&c<s.backgroundText.length-1){const l=c+1,d=s.backgroundText[c],y=s.backgroundText[l];this.activeBackgroundWordIndices.set(e,l);const u=y.timestamp-d.endtime,m=y.endtime-y.timestamp;this.backgroundWordAnimations.set(e,{startTime:performance.now()+u,duration:m}),i=!0}else this.backgroundWordAnimations.set(e,{startTime:0,duration:0})}}else this.backgroundWordProgress.set(e,0),i=!0}}i?this.animationFrameId=requestAnimationFrame(this.animateProgress.bind(this)):this.animationFrameId&&(cancelAnimationFrame(this.animationFrameId),this.animationFrameId=void 0)}generateLRC(){if(!this.lyrics)return"";let t="";this.songTitle&&(t+=`[ti:${this.songTitle}]
`),this.songArtist&&(t+=`[ar:${this.songArtist}]
`),this.songAlbum&&(t+=`[al:${this.songAlbum}]
`),this.lyricsSource&&(t+=`[re:${this.lyricsSource}]
`);for(const i of this.lyrics)if(i.text&&i.text.length>0){const e=f.formatTimestampLRC(i.timestamp),s=i.text.map(n=>n.text).join("").trim();t+=`[${e}]${s}
`}return t}generateTTML(){if(!this.lyrics)return"";let t=`<?xml version="1.0" encoding="UTF-8"?>
`;t+=`<tt xmlns="http://www.w3.org/ns/ttml" xmlns:itunes="http://music.apple.com/lyrics">
`,t+=`  <body>
`;let i;for(let e=0;e<this.lyrics.length;e+=1){const s=this.lyrics[e],n=s.songPart;(n!==i||e===0)&&(e>0&&(t+=`    </div>
`),i=n,i?t+=`    <div itunes:song-part="${i}">
`:t+=`    <div>
`);const r=f.formatTimestampTTML(s.timestamp),a=f.formatTimestampTTML(s.endtime);t+=`      <p begin="${r}" end="${a}">
`;for(const o of s.text){const c=f.formatTimestampTTML(o.timestamp),l=f.formatTimestampTTML(o.endtime),d=o.text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");t+=`        <span begin="${c}" end="${l}">${d}</span>
`}t+=`      </p>
`}return this.lyrics.length>0&&(t+=`    </div>
`),t+=`  </body>
`,t+="</tt>",t}static formatTimestampLRC(t){const i=t/1e3,e=Math.floor(i/60),s=Math.floor(i%60),n=Math.floor(t%1e3/10),r=a=>a.toString().padStart(2,"0");return`${r(e)}:${r(s)}.${r(n)}`}static formatTimestampTTML(t){const i=t/1e3,e=Math.floor(i/3600),s=Math.floor(i%3600/60),n=Math.floor(i%60),r=Math.floor(t%1e3),a=(o,c=2)=>o.toString().padStart(c,"0");return`${a(e)}:${a(s)}:${a(n)}.${a(r,3)}`}downloadLyrics(){if(!this.lyrics||this.lyrics.length===0)return;const t=this.lyrics.some(c=>c.isWordSynced!==!1);let i="",e=this.downloadFormat;e==="auto"&&(e=t?"ttml":"lrc");let s="";if(e==="ttml"?(i=this.generateTTML(),s="application/xml"):(i=this.generateLRC(),s="text/plain"),!i)return;const n=new Blob([i],{type:s}),r=URL.createObjectURL(n),a=document.createElement("a");a.href=r;const o=this.songTitle?`${this.songTitle}${this.songArtist?` - ${this.songArtist}`:""}.${e}`:`lyrics.${e}`;a.download=o,document.body.appendChild(a),a.click(),document.body.removeChild(a),URL.revokeObjectURL(r)}render(){this.fontFamily&&(this.style.fontFamily=this.fontFamily),this.style.setProperty("--hover-background-color",this.hoverBackgroundColor),this.style.setProperty("--highlight-color",this.highlightColor);const t=this.lyricsSource??"Unavailable",i=this.lyrics&&this.lyrics.length>0?this.lyrics.every(s=>s.timestamp===0&&s.endtime===0):!1,e=()=>{if(this.isLoading)return M`
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
        `;if(!this.lyrics||this.lyrics.length===0)return M`<div class="no-lyrics">No lyrics found.</div>`;const s=this.findAllInstrumentalGaps(),n=new Map(s.map(r=>[r.insertBeforeIndex,r]));return this.lyrics.map((r,a)=>{const o=`lyrics-line-${a}`,c=r.text[0]?.timestamp||0,l=r.text[r.text.length-1]?.endtime||0,y=r.backgroundText&&r.backgroundText.length>0?M`<p class="background-vocal-container">
              ${r.backgroundText.map((v,k)=>{const E=v.timestamp,F=v.endtime,A=F-E,_=this.showRomanization&&v.romanizedText&&v.romanizedText.trim()!==v.text.trim()?M`<span
                        class="lyrics-syllable transliteration ${v.lineSynced?"line-synced":""}"
                        data-start-time="${E}"
                        data-end-time="${F}"
                        data-duration="${A}"
                        data-syllable-index="0"
                        data-wipe-ratio="1"
                        >${v.romanizedText}</span
                      >`:"";return M`<span class="lyrics-word">
                  <span class="lyrics-syllable-wrap">
                    <span
                      class="lyrics-syllable ${v.lineSynced?"line-synced":""}"
                      data-start-time="${E}"
                      data-end-time="${F}"
                      data-duration="${A}"
                      data-syllable-index="${k}"
                      >${v.text}</span
                    >
                    ${_}
                  </span>
                </span>`})}
            </p>`:"",u=[];for(const v of r.text)v.part&&u.length>0?u[u.length-1].push(v):u.push([v]);const m=new Array(u.length).fill(!1),p=new Array(u.length).fill(""),g=new Array(u.length).fill(0),x=new Array(u.length).fill(0),b=new Array(u.length).fill(0),w=new Array(u.length).fill(0);{let v=0;for(;v<u.length;){let k=v;for(;k<u.length-1;){const C=u[k],q=C[C.length-1].text;if(/\s$/.test(q))break;k+=1}const E=u.slice(v,k+1).flatMap(C=>C.map(q=>q.text)).join("").trim(),F=u[v][0].timestamp,A=u[k],_=A[A.length-1].endtime,B=_-F,N=/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(E),W=/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0590-\u05FF]/.test(E),rt=E.includes("-"),ft=!N&&!W&&!rt&&E.length<=7&&E.length>0&&B>=900&&B>=E.length*300&&(E.length>=4||B/E.length>=600);let O=0;for(let C=v;C<=k;C+=1){m[C]=ft,p[C]=E,g[C]=B,x[C]=O,b[C]=F,w[C]=_;const q=u[C].map(j=>j.text).join("");O+=q.replace(/\s/g,"").length}v=k+1}}const $=M`<p class="main-vocal-container">
          ${u.map((v,k)=>{const E=m[k];if(E&&x[k]>0)return"";const F=v.some(A=>A.lineSynced);if(E&&p[k].length>0){const A=p[k],_=g[k],B=b[k],N=w[k],W=A.length;let rt="";for(let O=k;O<u.length&&!(O>k&&x[O]===0||O>k&&!m[O]);O+=1)rt+=u[O].map(C=>C.text).join("");const ft=M`${rt.split("").map((O,C)=>{if(O===" ")return" ";const q=C/W,j=1e3,ie=Math.min(1,Math.max(0,(_-j)/(5e3-j)))**3,It=W>5,wt=_<1500;let yt=0;if(It||wt){let At=0;It&&(At+=Math.min((W-5)/3,1)*.4),wt&&(At+=Math.max(0,1-(_-1e3)/500)*.4),yt=Math.min(At,.85)}const St=1-(W>1?C/(W-1):0)*yt,_t=ie*St,at=1+(W<=3?.07:.05)+_t*.1,ne=.4+_t*.4,Rt=-((at-1)/.13)*6,zt=((C+.5)/W-.5)*2*((at-1)*25);return M`<span
                    class="char"
                    data-char-index="${C}"
                    data-syllable-char-index="${C}"
                    data-wipe-start="${q.toFixed(4)}"
                    data-wipe-duration="${(1/W).toFixed(4)}"
                    data-horizontal-offset="${zt.toFixed(2)}"
                    data-max-scale="${at.toFixed(3)}"
                    data-shadow-intensity="${ne.toFixed(3)}"
                    data-translate-y-peak="${Rt.toFixed(3)}"
                    >${O}</span
                  >`})}`;return M`<span class="lyrics-word growable">
                <span class="lyrics-syllable-wrap">
                  <span
                    class="lyrics-syllable ${F?"line-synced":""}"
                    data-start-time="${B}"
                    data-end-time="${N}"
                    data-duration="${_}"
                    data-syllable-index="0"
                    data-wipe-ratio="1"
                    >${ft}</span
                  >
                </span>
              </span>`}if(v.length===1){const A=v[0],_=A.timestamp,B=A.endtime,N=B-_,W=A.text||"",rt=W.trim(),ft=this.showRomanization&&A.romanizedText&&A.romanizedText.trim()!==A.text.trim()?M`<span
                      class="lyrics-syllable transliteration ${A.lineSynced?"line-synced":""}"
                      data-start-time="${_}"
                      data-end-time="${B}"
                      data-duration="${N}"
                      data-syllable-index="0"
                      data-wipe-ratio="1"
                      >${A.romanizedText}</span
                    >`:"",O=E?M`${W.split("").map((C,q)=>{if(C===" ")return" ";const j=rt.length,ee=q/W.length,Mt=1e3,wt=Math.min(1,Math.max(0,(N-Mt)/(5e3-Mt)))**3,yt=j>5,Pt=N<1500;let St=0;if(yt||Pt){let Ft=0;yt&&(Ft+=Math.min((j-5)/3,1)*.4),Pt&&(Ft+=Math.max(0,1-(N-1e3)/500)*.4),St=Math.min(Ft,.85)}const se=1-(j>1?q/(j-1):0)*St,at=wt*se,$t=1+(j<=3?.07:.05)+at*.1,Rt=.4+at*.4,zt=-(($t-1)/.13)*6,Oe=((q+.5)/j-.5)*2*(($t-1)*25);return M`<span
                      class="char"
                      data-char-index="${q}"
                      data-syllable-char-index="${q}"
                      data-wipe-start="${ee.toFixed(4)}"
                      data-wipe-duration="${(1/W.length).toFixed(4)}"
                      data-horizontal-offset="${Oe.toFixed(2)}"
                      data-max-scale="${$t.toFixed(3)}"
                      data-shadow-intensity="${Rt.toFixed(3)}"
                      data-translate-y-peak="${zt.toFixed(3)}"
                      >${C}</span
                    >`})}`:W;return M`<span
                class="lyrics-word ${E?"growable":""}"
              >
                <span class="lyrics-syllable-wrap">
                  <span
                    class="lyrics-syllable ${A.lineSynced?"line-synced":""}"
                    data-start-time="${_}"
                    data-end-time="${B}"
                    data-duration="${N}"
                    data-syllable-index="0"
                    data-wipe-ratio="1"
                    >${O}</span
                  >
                  ${ft}
                </span>
              </span>`}return M`<span
              class="lyrics-word ${E?"growable":""} allow-break"
            >
              ${v.map((A,_)=>M`
                  <span class="lyrics-syllable-wrap">
                    <span
                      class="lyrics-syllable ${F?"line-synced":""}"
                      data-start-time="${A.timestamp}"
                      data-end-time="${A.endtime}"
                      data-duration="${A.endtime-A.timestamp}"
                      data-syllable-index="${_}"
                      data-wipe-ratio="1"
                      >${A.text}</span
                    >
                    ${this.showRomanization&&A.romanizedText&&A.romanizedText.trim()!==A.text.trim()?M`<span
                          class="lyrics-syllable transliteration ${F?"line-synced":""}"
                          data-start-time="${A.timestamp}"
                          data-end-time="${A.endtime}"
                          data-duration="${A.endtime-A.timestamp}"
                          data-syllable-index="0"
                          data-wipe-ratio="1"
                          >${A.romanizedText}</span
                        >`:""}
                  </span>
                `)}
            </span>`})}
        </p>`,I=r.text.map(v=>v.text).join("").trim(),R=this.showTranslation&&r.translation&&r.translation.trim()!==I?M`<div class="lyrics-translation-container">
                ${r.translation}
              </div>`:"",S=this.showRomanization&&r.romanizedText&&!r.text.some(v=>v.romanizedText)&&r.romanizedText.trim()!==I?M`<div class="lyrics-romanization-container">
                ${r.romanizedText}
              </div>`:"";let L=null;const P=n.get(a);if(P){const v=(P.gapEnd-P.gapStart)/3;L=M`<div
            id="gap-${a}"
            class="lyrics-line lyrics-gap"
            data-start-time="${P.gapStart}"
            data-end-time="${P.gapEnd}"
          >
            <div class="lyrics-line-container">
              <p class="main-vocal-container">
                <span class="lyrics-word">
                  <span class="lyrics-syllable-wrap">
                    <span
                      class="lyrics-syllable"
                      data-start-time="${P.gapStart}"
                      data-end-time="${P.gapStart+v}"
                      data-duration="${v}"
                      data-wipe-ratio="1"
                      data-syllable-index="0"
                    ></span>
                  </span>
                  <span class="lyrics-syllable-wrap">
                    <span
                      class="lyrics-syllable"
                      data-start-time="${P.gapStart+v}"
                      data-end-time="${P.gapStart+v*2}"
                      data-duration="${v}"
                      data-wipe-ratio="1"
                      data-syllable-index="1"
                    ></span>
                  </span>
                  <span class="lyrics-syllable-wrap">
                    <span
                      class="lyrics-syllable"
                      data-start-time="${P.gapStart+v*2}"
                      data-end-time="${P.gapEnd}"
                      data-duration="${v}"
                      data-wipe-ratio="1"
                      data-syllable-index="2"
                    ></span>
                  </span>
                </span>
              </p>
            </div>
          </div>`}return M`
          ${L}
          <div
            id="${o}"
            class="lyrics-line ${r.alignment==="end"?"singer-right":"singer-left"}"
            data-start-time="${c}"
            data-end-time="${l}"
            @click=${()=>this.handleLineClick(r)}
            tabindex="0"
            @keydown=${v=>{(v.key==="Enter"||v.key===" ")&&this.handleLineClick(r)}}
          >
            <div class="lyrics-line-container">
              ${$} ${y}
              ${R} ${S}
            </div>
          </div>
        `})};return M`
      <div
        class="lyrics-container ${i?"is-unsynced":"blur-inactive-enabled"} ${this.isUserScrolling?"user-scrolling":""}"
      >
        ${!this.isLoading&&this.lyrics&&this.lyrics.length>0?M`
              <div class="lyrics-header">
                <div class="header-controls">
                  <button
                    class="download-button ${this.showRomanization?"active":""}"
                    @click=${this.toggleRomanization}
                    title="Toggle Romanization"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="lucide lucide-speech-icon lucide-speech"
                    >
                      <path
                        d="M8.8 20v-4.1l1.9.2a2.3 2.3 0 0 0 2.164-2.1V8.3A5.37 5.37 0 0 0 2 8.25c0 2.8.656 3.054 1 4.55a5.77 5.77 0 0 1 .029 2.758L2 20"
                      />
                      <path d="M19.8 17.8a7.5 7.5 0 0 0 .003-10.603" />
                      <path d="M17 15a3.5 3.5 0 0 0-.025-4.975" />
                    </svg>
                  </button>
                  <button
                    class="download-button ${this.showTranslation?"active":""}"
                    @click=${this.toggleTranslation}
                    title="Toggle Translation"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="lucide lucide-languages-icon lucide-languages"
                    >
                      <path d="m5 8 6 6" />
                      <path d="m4 14 6-6 2-3" />
                      <path d="M2 5h12" />
                      <path d="M7 2h1" />
                      <path d="m22 22-5-10-5 10" />
                      <path d="M14 18h6" />
                    </svg>
                  </button>
                </div>
                <div class="download-controls">
                  <select
                    class="format-select"
                    @change=${s=>{this.downloadFormat=s.target.value}}
                    .value=${this.downloadFormat}
                    @click=${s=>s.stopPropagation()}
                  >
                    <option value="auto">Auto</option>
                    <option value="lrc">LRC</option>
                    <option value="ttml">TTML</option>
                  </select>
                  <button
                    class="download-button"
                    @click=${this.downloadLyrics}
                    title="Download Lyrics"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="lucide lucide-download-icon lucide-download"
                    >
                      <path d="M12 15V3" />
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <path d="m7 10 5 5 5-5" />
                    </svg>
                  </button>
                </div>
              </div>
            `:""}
        ${e()}
        ${this.isLoading?"":M`
              <footer class="lyrics-footer">
                <div class="footer-content">
                  <span
                    class="source-info"
                    style="display: flex; align-items: center; gap: 8px;"
                  >
                    Source: ${t}
                    ${this.availableSources&&this.availableSources.length>1||!this.hasFetchedAllProviders?M`
                          <button
                            class="download-button"
                            title="Switch Lyrics Source"
                            style="font-family: inherit; font-size: 11px; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.2); background: transparent; cursor: pointer; color: #aaa; display: inline-flex; align-items: center;"
                            @click=${this.switchSource}
                            ?disabled=${this.isFetchingAlternatives}
                          >
                            <svg
                              style="margin-right: 4px; ${this.isFetchingAlternatives?"animation: spin 1s linear infinite;":""}"
                              xmlns="http://www.w3.org/2000/svg"
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              class="lucide lucide-arrow-down-up-icon lucide-arrow-down-up"
                            >
                              ${this.isFetchingAlternatives?Kt`<path
                                    d="M21 12a9 9 0 1 1-6.219-8.56"
                                  ></path>`:Kt`<path d="m3 16 4 4 4-4"></path
                                    ><path d="M7 20V4"></path
                                    ><path d="m21 8-4-4-4 4"></path
                                    ><path d="M17 4v16"></path>`}
                            </svg>
                            ${this.isFetchingAlternatives?"Switching...":"Switch"}
                          </button>
                        `:""}
                  </span>
                  <span class="version-info">
                    v${Jt} •

                    <a
                      href="https://github.com/uimaxbai/apple-music-web-components"
                      target="_blank"
                      rel="noopener noreferrer"
                      >Star me on GitHub</a
                    >
                  </span>
                </div>
              </footer>
            `}
      </div>
    `}}return f.styles=ce`
    /* ==========================================================================
       YOULYPLUS-INSPIRED STYLING - Design Tokens & Variables
       ========================================================================== */
    :host {
      --lyplus-lyrics-palette: var(
        --am-lyrics-highlight-color,
        var(--highlight-color, #ffffff)
      );
      --lyplus-text-primary: var(--lyplus-lyrics-palette);
      /* Use color-mix with the text color rather than just opacity so it adapts */
      --lyplus-text-secondary: color-mix(
        in srgb,
        var(--lyplus-lyrics-palette),
        transparent 45%
      );

      --lyplus-padding-base: 1em;
      --lyplus-padding-line: 10px;
      --lyplus-padding-gap: 0.3em;
      --lyplus-border-radius-base: 0.6em;
      --lyplus-gap-dot-size: 0.4em;
      --lyplus-gap-dot-margin: 0.08em;

      --lyplus-font-size-base: 32px;
      --lyplus-font-size-base-grow: 24.5;
      --lyplus-font-size-subtext: 0.6em;

      --lyplus-blur-amount: 0.07em;
      --lyplus-blur-amount-near: 0.035em;
      --lyplus-fade-gap-timing-function: ease-out;

      --lyrics-scroll-padding-top: 25%;

      display: block;
      font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
        Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      background: transparent;
      height: 100%;
      overflow: hidden;
      font-weight: bold;
      color: var(--lyplus-text-primary);
    }

    /* ==========================================================================
       CONTAINER & SCROLL BEHAVIOR
       ========================================================================== */
    .lyrics-container {
      padding: 20px;
      padding-top: 80px;
      border-radius: 8px;
      background-color: transparent;
      width: 100%;
      height: 100%;
      max-height: 100vh;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      box-sizing: border-box;
      scrollbar-width: none;
      transform: translateZ(0);
    }

    .lyrics-container::-webkit-scrollbar {
      display: none;
    }

    /* Disable transitions during touch-scrolling for 1:1 feedback */
    .lyrics-container.touch-scrolling .lyrics-line,
    .lyrics-container.touch-scrolling .lyrics-plus-metadata {
      transition: none !important;
    }

    /* Apply smooth gliding transition for mouse-wheel scrolling */
    .lyrics-container.wheel-scrolling .lyrics-line {
      transition: transform 0.3s ease-out !important;
    }

    .lyrics-line.scroll-animate {
      transition: none !important; /* Prevent conflict with scroll animation */
      animation-name: lyrics-scroll;
      animation-duration: 400ms;
      animation-timing-function: cubic-bezier(0.41, 0, 0.12, 0.99);
      animation-fill-mode: both;
      animation-delay: var(--lyrics-line-delay, 0ms);
    }

    .lyrics-container.user-scrolling .lyrics-line {
      --lyrics-line-delay: 0ms !important;
      transition-delay: 0ms !important;
    }

    /* ==========================================================================
       LYRICS LINE BASE STYLES
       ========================================================================== */
    .lyrics-line {
      padding: var(--lyplus-padding-line);
      opacity: 0.8;
      color: var(--lyplus-text-secondary);
      font-size: var(--lyplus-font-size-base);
      cursor: pointer;
      transform-origin: left;
      transform: translateZ(1px);
      transition:
        opacity 0.3s ease,
        transform 0.4s cubic-bezier(0.41, 0, 0.12, 0.99)
          var(--lyrics-line-delay, 0ms),
        filter 0.3s ease;
      will-change: transform, filter, opacity;
      content-visibility: auto;
      text-rendering: optimizeLegibility;
      overflow-wrap: break-word;
      mix-blend-mode: lighten;
      border-radius: var(--lyplus-border-radius-base);
    }

    .lyrics-line:not(.scroll-animate) {
      animation: none;
    }

    /* --- Line Container & Vocal Containers --- */
    .lyrics-line-container {
      overflow-wrap: break-word;
      transform-origin: left;
      transform: scale3d(0.93, 0.93, 0.95);
      transition:
        transform 0.7s ease,
        background-color 0.7s,
        color 0.7s;
    }

    .lyrics-line.active .lyrics-line-container,
    .lyrics-line.pre-active .lyrics-line-container {
      transform: scale3d(1.001, 1.001, 1);
      will-change: transform;
      transition:
        transform 0.5s ease,
        background-color 0.18s,
        color 0.18s;
    }

    .main-vocal-container {
      transform-origin: 5% 50%;
      margin: 0;
    }

    .background-vocal-container {
      max-height: 0;
      padding-top: 0.2em;
      overflow: visible;
      opacity: 0;
      font-size: var(--lyplus-font-size-subtext);
      transition:
        max-height 0.3s,
        opacity 0.6s,
        padding 0.6s;
      margin: 0;
    }

    .lyrics-line.active .background-vocal-container {
      max-height: 4em;
      opacity: 1;
      transition:
        max-height 0.6s,
        opacity 0.6s,
        padding 0.6s;
      will-change: max-height, opacity, padding;
    }

    /* --- Line States & Modifiers --- */
    .lyrics-line.active {
      opacity: 1;
      color: var(--lyplus-text-primary);
      will-change: transform, opacity;
    }

    .lyrics-line.singer-right {
      text-align: end;
    }

    .lyrics-line.singer-right .lyrics-line-container,
    .lyrics-line.singer-right .main-vocal-container {
      transform-origin: right;
    }

    .lyrics-line.rtl-text {
      direction: rtl;
    }

    /* --- Unsynced (Plain Text) Lyrics Overrides --- */
    .lyrics-container.is-unsynced .lyrics-line {
      opacity: 1 !important;
      color: var(--lyplus-text-primary) !important;
      filter: none !important;
      transform: none !important;
      cursor: default;
    }

    .lyrics-container.is-unsynced .lyrics-line-container {
      transform: none !important;
      background-color: transparent !important;
    }

    .lyrics-container.is-unsynced .lyrics-syllable {
      color: var(--lyplus-text-primary) !important;
      background-color: transparent !important;
      -webkit-background-clip: unset !important;
      background-clip: unset !important;
      -webkit-text-fill-color: unset !important;
      text-fill-color: unset !important;
      text-shadow: none !important;
      filter: none !important;
      opacity: 1 !important;
      transform: none !important;
    }

    @media (hover: hover) and (pointer: fine) {
      .lyrics-line:hover {
        background: var(--hover-background-color, rgba(255, 255, 255, 0.13));
      }
      .lyrics-container.is-unsynced .lyrics-line:hover {
        background: transparent !important;
      }
    }

    /* --- Blur Effect for Inactive Lines --- */
    .lyrics-container.blur-inactive-enabled:not(.not-focused)
      .lyrics-line:not(.active):not(.pre-active):not(.lyrics-gap) {
      filter: blur(var(--lyplus-blur-amount));
    }

    .lyrics-container.blur-inactive-enabled:not(.not-focused)
      .lyrics-line.post-active-line:not(.lyrics-gap):not(.active):not(
        .pre-active
      ),
    .lyrics-container.blur-inactive-enabled:not(.not-focused)
      .lyrics-line.next-active-line:not(.lyrics-gap):not(.active):not(
        .pre-active
      ),
    .lyrics-container.blur-inactive-enabled:not(.not-focused)
      .lyrics-line.lyrics-activest:not(.active):not(.lyrics-gap):not(
        .pre-active
      ) {
      filter: blur(var(--lyplus-blur-amount-near));
    }

    /* Unblur all lines when user is scrolling */
    .lyrics-container.user-scrolling .lyrics-line {
      filter: none !important;
      opacity: 0.8 !important;
    }

    /* Unblur early for pre-active lines */
    .lyrics-container.blur-inactive-enabled .lyrics-line.pre-active {
      filter: blur(0px) !important;
      opacity: var(--lyplus-primary-opacity);
    }

    /* ==========================================================================
       WORD & SYLLABLE STYLES
       ========================================================================== */
    .lyrics-word:not(.allow-break) {
      display: inline-block;
      vertical-align: baseline;
    }

    .lyrics-word.allow-break {
      display: inline;
    }

    .lyrics-syllable-wrap {
      display: inline;
    }

    .lyrics-syllable-wrap:has(.lyrics-syllable.transliteration) {
      display: inline-flex;
      flex-direction: column;
      align-items: start;
    }

    .lyrics-syllable {
      display: inline-block;
      vertical-align: baseline;
      color: transparent;
      background-color: var(--lyplus-text-secondary);
      white-space: pre-wrap;
      font-variant-ligatures: none;
      font-feature-settings: 'liga' 0;
      background-clip: text;
      -webkit-background-clip: text;
      transition:
        color 0.7s,
        background-color 0.7s,
        transform 0.7s ease;
    }

    /* --- Syllable States --- */
    .lyrics-syllable.finished {
      background-color: var(--lyplus-text-primary);
      transition: transform 1s ease !important;
    }

    .lyrics-syllable.finished:has(.char) {
      background-color: transparent;
    }

    .lyrics-line:not(.active) .lyrics-syllable.finished {
      transition: color 0.18s;
    }

    .lyrics-line.active:not(.lyrics-gap) .lyrics-syllable {
      transform: translateY(0.001%) translateZ(1px);
      transition:
        transform 1s ease,
        background-color 0.5s,
        color 0.5s;
      will-change: transform, background;
    }

    /* --- Wipe Highlight Effect --- */
    .lyrics-line.active:not(.lyrics-gap)
      .lyrics-syllable.highlight:not(:has(.char)),
    .lyrics-line.active:not(.lyrics-gap)
      .lyrics-syllable.pre-highlight:not(:has(.char)) {
      background-repeat: no-repeat;
      background-image:
        linear-gradient(
          90deg,
          #ffffff00 0%,
          var(--lyplus-text-primary, #fff) 50%,
          #0000 100%
        ),
        linear-gradient(
          90deg,
          var(--lyplus-text-primary, #fff) 100%,
          #0000 100%
        );
      background-size:
        0.5em 100%,
        0% 100%;
      background-position:
        -0.5em 0%,
        -0.25em 0%;
    }

    .lyrics-line.active:not(.lyrics-gap) .lyrics-syllable.highlight.rtl-text,
    .lyrics-line.active:not(.lyrics-gap)
      .lyrics-syllable.pre-highlight.rtl-text {
      direction: rtl;
      background-image:
        linear-gradient(
          -90deg,
          var(--lyplus-text-primary) 0%,
          transparent 100%
        ),
        linear-gradient(
          -90deg,
          var(--lyplus-text-primary) 100%,
          transparent 100%
        );
      background-position:
        calc(100% + 0.5em) 0%,
        right;
    }

    .lyrics-line.active:not(.lyrics-gap)
      .lyrics-word:not(.growable)
      .lyrics-syllable.highlight,
    .lyrics-word.growable .lyrics-syllable.cleanup .char {
      transform: translateY(-3.5%) translateZ(1px);
    }

    .lyrics-line.active:not(.lyrics-gap) .lyrics-syllable.highlight.finished {
      background-image: none;
    }

    .lyrics-syllable.pre-highlight {
      animation-name: pre-wipe-universal;
      animation-duration: var(--pre-wipe-duration);
      animation-delay: var(--pre-wipe-delay);
      animation-timing-function: linear;
      animation-fill-mode: forwards;
    }

    .lyrics-syllable.pre-highlight.rtl-text {
      animation-name: pre-wipe-universal-rtl;
    }

    .lyrics-syllable.transliteration {
      font-size: var(--lyplus-font-size-subtext);
      white-space: pre-wrap;
      pointer-events: none;
      user-select: none;
    }

    /* Syllable with chars: make syllable transparent, chars handle color */
    .lyrics-line .lyrics-syllable:has(span.char):not(.finished) {
      background-color: transparent;
      color: transparent;
    }

    .lyrics-syllable span.char {
      display: inline-block;
      background-color: var(--lyplus-text-secondary);
      white-space: break-spaces;
      font-variant-ligatures: none;
      font-feature-settings: 'liga' 0;
      background-clip: text;
      -webkit-background-clip: text;
      transition:
        color 0.7s,
        background-color 0.7s,
        transform 0.7s ease;
    }

    .lyrics-syllable.finished span.char {
      transition: color 0.18s;
      background-color: var(--lyplus-text-primary);
    }

    /* Active char spans: structural only, wipe animation sets gradient */
    .lyrics-line.active .lyrics-syllable span.char {
      background-clip: text;
      -webkit-background-clip: text;
      background-repeat: no-repeat;
      background-image:
        linear-gradient(
          90deg,
          #ffffff00 0%,
          var(--lyplus-text-primary, #fff) 50%,
          #0000 100%
        ),
        linear-gradient(
          90deg,
          var(--lyplus-text-primary, #fff) 100%,
          #0000 100%
        );
      background-size:
        0.5em 100%,
        0% 100%;
      background-position:
        -0.5em 0%,
        -0.25em 0%;
      transform-origin: 50% 80%;
      transform: matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
      transition:
        transform 0.7s ease,
        color 0.18s;
      will-change: background, transform;
    }

    .lyrics-line.active .lyrics-syllable span.char.highlight {
      background-image:
        linear-gradient(
          -90deg,
          var(--lyplus-text-primary, #fff) 0%,
          #0000 100%
        ),
        linear-gradient(
          -90deg,
          var(--lyplus-text-primary, #fff) 100%,
          #0000 100%
        );
      background-position:
        calc(100% + 0.5em) 0%,
        calc(100% + 0.25em) 0%;
    }

    .lyrics-line.active .lyrics-syllable.pre-highlight span.char {
      background-image:
        linear-gradient(
          90deg,
          #ffffff00 0%,
          var(--lyplus-text-primary, #fff) 50%,
          #0000 100%
        ),
        linear-gradient(
          90deg,
          var(--lyplus-text-primary, #fff) 100%,
          #0000 100%
        );
      background-size:
        0.75em 100%,
        0% 100%;
      background-position:
        -0.85em 0%,
        -0.25em 0%;
    }

    /* ==========================================================================
       INSTRUMENTAL GAP STYLES
       ========================================================================== */
    .lyrics-gap {
      height: 0;
      padding: 0 var(--lyplus-padding-gap);
      overflow: hidden;
      opacity: 0;
      box-sizing: content-box;
      background-clip: unset;
      transition:
        padding 0.3s 0.5s,
        height 0.3s 0.5s,
        opacity 0.2s 0.5s,
        transform 0.3s var(--lyrics-line-delay, 0ms);
    }

    .lyrics-gap.active {
      height: 1.3em;
      padding: var(--lyplus-padding-gap);
      opacity: 1;
      overflow: visible;
      transition:
        padding 0.3s,
        height 0.3s,
        opacity 0.2s 0.3s,
        transform 0.3s;
      will-change: height, opacity, padding;
    }

    /* Exiting state: keep gap visible while dots animate out */
    .lyrics-gap.gap-exiting {
      height: 1.3em;
      padding: var(--lyplus-padding-gap);
      opacity: 1;
      overflow: visible;
      transition:
        padding 0.3s 0.5s,
        height 0.3s 0.5s,
        opacity 0.2s 0.5s,
        transform 0.3s;
    }

    .lyrics-gap .main-vocal-container {
      transform: translateY(-25%) scale(1) translateZ(0);
    }

    /* Jump animation plays during exit */
    .lyrics-gap.gap-exiting .main-vocal-container {
      animation: gap-ended 0.8s ease forwards;
    }

    .lyrics-gap:not(.active):not(.gap-exiting) .main-vocal-container {
      transform: translateY(-25%) scale(0) translateZ(0);
    }

    .lyrics-gap:not(.active):not(.gap-exiting)
      .main-vocal-container
      .lyrics-word {
      animation-play-state: paused;
    }

    .lyrics-gap.active .main-vocal-container .lyrics-word {
      animation: gap-loop 4s ease infinite alternate;
      will-change: transform;
    }

    .lyrics-gap .lyrics-syllable {
      display: inline-block;
      width: var(--lyplus-gap-dot-size);
      height: var(--lyplus-gap-dot-size);
      background-color: var(--lyplus-text-primary);
      border-radius: 50%;
      margin: 0 var(--lyplus-gap-dot-margin);
    }

    /* Line-synced lyrics should fade in instantly/quickly instead of wiping */
    .lyrics-syllable.line-synced {
      background: transparent !important;
      color: var(--lyplus-text-secondary) !important;
    }

    .lyrics-line.active .lyrics-syllable.line-synced {
      animation: fade-in-line 0.2s ease-out forwards !important;
      color: var(--lyplus-text-primary) !important;
    }

    @keyframes fade-in-line {
      from {
        opacity: 0.5;
        color: var(--lyplus-text-secondary);
      }
      to {
        opacity: 1;
        color: var(--lyplus-lyrics-palette);
      }
    }

    .lyrics-gap .lyrics-syllable {
      background-color: var(--lyplus-text-secondary);
      background-clip: unset;
    }

    .lyrics-gap.active .lyrics-syllable.highlight,
    .lyrics-gap.active .lyrics-syllable.finished,
    .lyrics-gap.gap-exiting .lyrics-syllable,
    .lyrics-gap:not(.active).post-active-line .lyrics-syllable,
    .lyrics-gap:not(.active).lyrics-activest .lyrics-syllable {
      background-color: var(--lyplus-text-primary);
      animation: none !important;
      opacity: 1;
    }

    .lyrics-gap.active .lyrics-syllable.finished {
      animation: none !important;
    }

    /* ==========================================================================
       METADATA & FOOTER STYLES
       ========================================================================== */
    .lyrics-plus-metadata {
      display: block;
      position: relative;
      box-sizing: border-box;
      font-weight: normal;
      transform: translateY(var(--lyrics-scroll-offset, 0px)) translateZ(1px);
      transition:
        opacity 0.3s ease,
        transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)
          var(--lyrics-line-delay, 0ms),
        filter 0.3s ease;
    }

    .lyrics-plus-empty {
      display: block;
      height: 100vh;
      transform: translateY(var(--lyrics-scroll-offset, 0px)) translateZ(1px);
    }

    .lyrics-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      text-align: left;
      font-size: 0.8em;
      color: rgba(255, 255, 255, 0.5);
      padding: 10px 0;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      margin-top: 10px;
      font-weight: normal;
    }

    .lyrics-footer p {
      margin: 5px 0;
    }

    .lyrics-footer a {
      color: rgba(255, 255, 255, 0.7);
      text-decoration: none;
    }

    .lyrics-footer a:hover {
      text-decoration: underline;
    }

    .footer-content {
      display: flex;
      align-items: flex-start;
      flex-direction: column;
      gap: 8px;
    }

    .footer-controls {
      display: flex;
      align-items: center;
    }

    /* ==========================================================================
       HEADER & CONTROLS
       ========================================================================== */
    .lyrics-header {
      display: flex;
      padding: 10px 0;
      margin-bottom: 10px;
      gap: 10px;
      justify-content: space-between;
      align-items: center;
    }

    .lyrics-header .download-button {
      background: none;
      border: none;
      cursor: pointer;
      color: #aaa;
      padding: 0;
      margin-left: 10px;
      vertical-align: middle;
      display: inline-flex;
      align-items: center;
      font-family: inherit;
    }

    .lyrics-header .download-button:hover {
      color: rgba(255, 255, 255, 0.9);
    }

    .header-controls {
      display: flex;
      gap: 8px;
    }

    .download-controls {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .control-button {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 4px;
      padding: 2px 8px;
      font-size: 0.8em;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      transition: all 0.2s;
      font-weight: normal;
    }

    .control-button:hover {
      color: rgba(255, 255, 255, 0.9);
      border-color: rgba(255, 255, 255, 0.5);
    }

    .control-button.active {
      background-color: var(--lyplus-text-primary);
      border-color: var(--lyplus-text-primary);
      color: #000;
    }

    .format-select {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 4px;
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.8em;
      margin-left: 10px;
      padding: 2px 5px;
      cursor: pointer;
      font-weight: normal;
      font-family: inherit;
    }

    .format-select:hover {
      color: rgba(255, 255, 255, 0.9);
      border-color: rgba(255, 255, 255, 0.5);
    }

    .format-select option {
      background: #1a1a1a;
      color: #fff;
    }

    /* ==========================================================================
       TRANSLATION & ROMANIZATION
       ========================================================================== */
    .lyrics-translation-container,
    .lyrics-romanization-container {
      padding-top: 0.2em;
      opacity: 0.8;
      font-size: var(--lyplus-font-size-subtext);
      overflow-wrap: break-word;
      pointer-events: none;
      user-select: none;
      transition:
        opacity 0.3s ease,
        color 0.3s;
      font-weight: normal;
    }

    .lyrics-romanization-container {
      direction: ltr !important;
    }

    .lyrics-romanization-container.rtl-text {
      direction: rtl !important;
    }

    .lyrics-romanization-container .lyrics-syllable {
      white-space: pre-wrap;
    }

    .lyrics-translation-container {
      opacity: 0.5;
    }

    .main-line-wrapper.small {
      font-size: 0.5em;
      opacity: 0.8;
      display: block;
      margin-bottom: 0px;
    }

    .translation-line {
      font-size: 1em;
      font-weight: bold;
      display: block;
      margin-top: 0px;
      line-height: 1.1;
    }

    .romanized-line {
      font-size: 0.5em;
      color: rgba(255, 255, 255, 0.5);
      display: block;
      margin-top: 2px;
      font-weight: normal;
    }

    /* ==========================================================================
       SKELETON LOADING
       ========================================================================== */
    @keyframes skeleton-loading {
      0% {
        background-color: rgba(255, 255, 255, 0.1);
      }
      100% {
        background-color: rgba(255, 255, 255, 0.2);
      }
    }

    .skeleton-line {
      height: 2.5em;
      margin: 20px 0;
      border-radius: 8px;
      animation: skeleton-loading 1s linear infinite alternate;
      opacity: 0.7;
      width: 60%;
    }

    .skeleton-line:nth-child(even) {
      width: 80%;
    }
    .skeleton-line:nth-child(3n) {
      width: 50%;
    }
    .skeleton-line:nth-child(5n) {
      width: 70%;
    }

    .no-lyrics {
      color: rgba(255, 255, 255, 0.5);
      font-size: 1.2em;
      text-align: center;
      padding: 2em;
      font-weight: normal;
    }

    /* ==========================================================================
       KEYFRAME ANIMATIONS
       ========================================================================== */

    /* Wipe animation for syllables */
    @keyframes wipe {
      from {
        background-size:
          0.75em 100%,
          0% 100%;
        background-position:
          -0.375em 0%,
          left;
      }
      to {
        background-size:
          0.75em 100%,
          100% 100%;
        background-position:
          calc(100% + 0.375em) 0%,
          left;
      }
    }

    @keyframes start-wipe {
      0% {
        background-size:
          0.75em 100%,
          0% 100%;
        background-position:
          -0.375em 0%,
          left;
      }
      100% {
        background-size:
          0.75em 100%,
          100% 100%;
        background-position:
          calc(100% + 0.375em) 0%,
          left;
      }
    }

    @keyframes wipe-rtl {
      from {
        background-size:
          0.75em 100%,
          0% 100%;
        background-position:
          calc(100% + 0.375em) 0%,
          calc(100% + 0.36em);
      }
      to {
        background-size:
          0.75em 100%,
          100% 100%;
        background-position:
          -0.75em 0%,
          right;
      }
    }

    @keyframes start-wipe-rtl {
      0% {
        background-size:
          0.75em 100%,
          0% 100%;
        background-position:
          calc(100% + 0.75em) 0%,
          calc(100% + 0.5em);
      }
      100% {
        background-size:
          0.75em 100%,
          100% 100%;
        background-position:
          -0.75em 0%,
          right;
      }
    }

    @keyframes pre-wipe-universal {
      from {
        background-size:
          0.75em 100%,
          0% 100%;
        background-position:
          -0.75em 0%,
          left;
      }
      to {
        background-size:
          0.75em 100%,
          0% 100%;
        background-position:
          -0.375em 0%,
          left;
      }
    }

    @keyframes pre-wipe-universal-rtl {
      from {
        background-size:
          0.75em 100%,
          0% 100%;
        background-position:
          calc(100% + 0.75em) 0%,
          right;
      }
      to {
        background-size:
          0.75em 100%,
          0% 100%;
        background-position:
          calc(100% + 0.375em) 0%,
          right;
      }
    }

    @keyframes pre-wipe-char {
      from {
        background-size:
          0.75em 100%,
          0% 100%;
        background-position:
          -0.85em 0%,
          left;
      }
      to {
        background-size:
          0.75em 100%,
          0% 100%;
        background-position:
          -0.85em 0%,
          left;
      }
    }

    /* Gap dot animations */
    @keyframes gap-loop {
      from {
        transform: scale(1.15);
      }
      to {
        transform: scale(0.85);
      }
    }

    @keyframes gap-ended {
      0% {
        transform: translateY(-25%) scale(1) translateZ(0);
      }
      35% {
        transform: translateY(-25%) scale(1.2) translateZ(0);
      }
      100% {
        transform: translateY(-25%) scale(0) translateZ(0);
      }
    }

    @keyframes fade-gap {
      from {
        background-color: var(--lyplus-text-secondary);
      }
      to {
        background-color: var(--lyplus-text-primary);
      }
    }

    /* Scroll animation — class is removed and re-added (with a forced
       reflow in between) to reliably restart the animation each time */
    @keyframes lyrics-scroll {
      from {
        transform: translateY(var(--scroll-delta)) translateZ(1px);
      }
      to {
        transform: translateY(0) translateZ(1px);
      }
    }

    /* Character grow animation - exact copy from YouLyPlus */
    @keyframes grow-dynamic {
      0% {
        transform: matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
        filter: drop-shadow(
          0 0 0
            color-mix(in srgb, var(--lyplus-lyrics-palette), transparent 100%)
        );
      }
      25%,
      30% {
        transform: matrix3d(
          calc(var(--max-scale) * calc(var(--lyplus-font-size-base-grow) / 25)),
          0,
          0,
          0,
          0,
          calc(var(--max-scale) * calc(var(--lyplus-font-size-base-grow) / 25)),
          0,
          0,
          0,
          0,
          1,
          0,
          calc(
            var(--char-offset-x, 0) *
              calc(var(--lyplus-font-size-base-grow) / 25)
          ),
          var(--translate-y-peak, -2),
          0,
          1
        );
        filter: drop-shadow(
          0 0 0.1em
            color-mix(
              in srgb,
              var(--lyplus-lyrics-palette),
              transparent calc((1 - var(--shadow-intensity, 1)) * 100%)
            )
        );
      }
      100% {
        transform: translateY(-3.5%) translateZ(1px);
        filter: drop-shadow(
          0 0 0
            color-mix(in srgb, var(--lyplus-lyrics-palette), transparent 100%)
        );
      }
    }

    @keyframes grow-static {
      0%,
      100% {
        transform: scale3d(1.01, 1.01, 1.1) translateY(-0.05%);
        text-shadow: 0 0 0
          color-mix(in srgb, var(--lyplus-lyrics-palette), transparent 100%);
      }
      30%,
      40% {
        transform: scale3d(1.1, 1.1, 1.1) translateY(-0.05%);
        text-shadow: 0 0 0.3em
          color-mix(in srgb, var(--lyplus-lyrics-palette), transparent 50%);
      }
    }

    /* Fade in animation */
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 0.7;
        transform: translateY(0);
      }
    }

    /* Legacy support */
    .opposite-turn {
      text-align: right;
    }

    .singer-right {
      text-align: right;
      justify-content: flex-end;
    }

    .singer-left {
      text-align: left;
      justify-content: flex-start;
    }

    /* Legacy progress-text for backward compatibility */
    .progress-text {
      position: relative;
      display: inline-block;
      background: linear-gradient(
        to right,
        var(--lyplus-text-primary) 0%,
        var(--lyplus-text-primary) var(--line-progress, 0%),
        var(--lyplus-text-secondary) var(--line-progress, 0%),
        var(--lyplus-text-secondary) 100%
      );
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      color: var(--lyplus-text-secondary);
      transform: translate3d(0, 0, 0);
      will-change: background-size;
    }

    .progress-text::before {
      display: none;
    }

    .active-line {
      font-weight: bold;
    }

    .background-text {
      display: block;
      color: var(--lyplus-text-secondary);
      font-size: 0.8em;
      font-style: normal;
      margin: 0;
      flex-shrink: 0;
      line-height: 1.1;
    }

    .background-text.before {
      order: -1;
    }

    .background-text.after {
      order: 1;
    }

    .instrumental-line {
      display: inline-flex;
      align-items: baseline;
      gap: 8px;
      color: var(--lyplus-text-secondary);
      font-size: 0.9em;
      padding: 4px 10px;
      animation: fadeInUp 220ms ease;
      font-weight: normal;
    }

    .instrumental-duration {
      color: var(--lyplus-text-secondary);
      font-size: 0.8em;
    }
  `,T([U({type:String})],f.prototype,"query",void 0),T([U({type:String})],f.prototype,"musicId",void 0),T([U({type:String})],f.prototype,"isrc",void 0),T([U({type:String,attribute:"song-title"})],f.prototype,"songTitle",void 0),T([D()],f.prototype,"downloadFormat",void 0),T([U({type:String,attribute:"song-artist"})],f.prototype,"songArtist",void 0),T([U({type:String,attribute:"song-album"})],f.prototype,"songAlbum",void 0),T([U({type:Number,attribute:"song-duration"})],f.prototype,"songDurationMs",void 0),T([U({type:String,attribute:"highlight-color"})],f.prototype,"highlightColor",void 0),T([U({type:String,attribute:"hover-background-color"})],f.prototype,"hoverBackgroundColor",void 0),T([U({type:String,attribute:"font-family"})],f.prototype,"fontFamily",void 0),T([U({type:Boolean})],f.prototype,"autoScroll",void 0),T([U({type:Boolean})],f.prototype,"interpolate",void 0),T([D()],f.prototype,"showRomanization",void 0),T([D()],f.prototype,"showTranslation",void 0),T([U({type:Number})],f.prototype,"duration",void 0),T([U({type:Number,attribute:"currenttime",hasChanged:()=>!1})],f.prototype,"currentTime",null),T([D()],f.prototype,"isLoading",void 0),T([D()],f.prototype,"lyrics",void 0),T([D()],f.prototype,"lyricsSource",void 0),T([D()],f.prototype,"availableSources",void 0),T([D()],f.prototype,"currentSourceIndex",void 0),T([D()],f.prototype,"isFetchingAlternatives",void 0),T([D()],f.prototype,"hasFetchedAllProviders",void 0),T([_e(".lyrics-container")],f.prototype,"lyricsContainer",void 0),T([D()],f.prototype,"isUserScrolling",void 0),window.customElements.define("am-lyrics",f),re}var oe=qe();const De=Be(oe),Ye=Ne({__proto__:null,default:De},[oe]);export{Ye as a};
//# sourceMappingURL=am-lyrics-RBa6cZ1H.js.map
