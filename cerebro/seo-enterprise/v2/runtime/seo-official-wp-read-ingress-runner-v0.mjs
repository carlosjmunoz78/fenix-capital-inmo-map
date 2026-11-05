import fs from 'node:fs';
import {ActionGatewayV1} from '../../../gateway/action-gateway-v1.mjs';
import {attachSeoOfficialDraftReadIngressLab} from './seo-official-wp-read-ingress-lab-v0.mjs';
const [,,journal,report]=process.argv;
if(!journal||!report)throw Error('WP_INTAKE_RUNNER_OUTPUTS_REQUIRED');
const site_origin='https://fenixcapital.es',company_id='fenix';
const html='<h2>Ejemplo ficticio de artículo en borrador</h2>'+('<p>Contenido ficticio para verificar el circuito del Gateway.</p>'.repeat(7));
const post={ID:52656,type:'post',status:'draft',title:'Prueba de lectura de borrador',
 slug:'fixture-borrador-lab-52656',permalink:site_origin+'/?p=52656',content:html};
const seo={post_id:52656,post_status:'draft',
 seo_title:'Título SEO del fixture de laboratorio de CEREBRO',
 meta_description:'Meta descripción sintética para validar lectura de WordPress y revisión en un JOB-001, sin publicación ni cambios.',
 focus_keyphrase:'lectura de borradores'};
let reads=0;
const gateway=new ActionGatewayV1();
const ingress=attachSeoOfficialDraftReadIngressLab({
 actionGateway:gateway,job_journal_path:journal,
 verifyTrustedWordPressConnector:async()=>({verified:true,company_id,site_origin,
  access:'READ_ONLY',provider:'CONNECTED_WORDPRESS',assurance:'SERVER_VERIFIED',session_active:true}),
 readPost:async()=>{reads++;return post},
 readYoast:async()=>[seo]});
const first=await ingress.observe({post_id:52656});
const repeat=await ingress.observe({post_id:52656});
if(first.status!=='ACTION_EXECUTED'||first.result.status!=='WP_OFFICIAL_DRAFT_REVIEW_RECEIVED_LAB'||
 !repeat.result.duplicate||reads!==2)throw Error('WP_DRAFT_INGRESS_LAB_FAILED');
const result={status:'WP_DRAFT_INGRESS_LAB_PROVED',
 source:'SYNTHETIC_PROVIDER_NOT_LIVE_WP',company_id,
 referenced_real_post_id_only:52656,reads,job_id:first.result.job_id,
 duplicate_detected:repeat.result.duplicate,wordPress_connector_live_bound:false,
 gateway_prod_deployed:false,wordpress_hooks_mutated:false,
 owner_approvals_created:0,wordpress_external_writes:0,
 autonomous_publications:0,additional_eur:0};
fs.writeFileSync(report,JSON.stringify(result,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify(result));
