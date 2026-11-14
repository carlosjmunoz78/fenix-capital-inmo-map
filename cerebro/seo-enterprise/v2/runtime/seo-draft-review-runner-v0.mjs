/** Executes one synthetic proof of persistent review queue in isolated GitHub runner. */
import fs from 'node:fs';
import {buildSeoDraftReviewPacket,queueSeoDraftReviewLab} from './seo-draft-review-queue-v0.mjs';
const [,,journal,report]=process.argv;
if(!journal||!report)throw Error('REVIEW_OUTPUT_PATHS_REQUIRED');
const post={ID:52656,title:'Fixture SEO draft Cordoba',type:'post',status:'draft',
 slug:'fixture-seo-review-52656',permalink:'https://fenixcapital.es/?p=52656',
 content:'<h2>Fixture de revisión</h2><p>Una simulación aislada sin información de clientes.</p>'.repeat(5)};
const yoast={post_id:52656,post_status:'draft',seo_title:'Fixture de revisión WordPress sin publicación',
 meta_description:'Descripción ficticia para verificar que la cola de revisión exige la aprobación autenticada del propietario y nunca publica.',
 focus_keyphrase:'revisión WordPress Córdoba'};
const packet=buildSeoDraftReviewPacket({post,yoast});
const first=queueSeoDraftReviewLab({file_path:journal,packet});
const replay=queueSeoDraftReviewLab({file_path:journal,packet});
if(!first.newly_queued||replay.newly_queued||first.job_id!==replay.job_id)
 throw Error('REVIEW_QUEUE_IDEMPOTENCY_FAILED');
const result={status:'LAB_DRAFT_REVIEW_QUEUE_VERIFIED',
 reference_wp_post_id:52656,source:'SYNTHETIC_FIXTURE_NOT_REAL_POST_CONTENT',
 queued:first.newly_queued,idempotent_second_call:!replay.newly_queued,
 job_id:first.job_id,owner_approval_count:0,
 independent_visual_review:false,real_iam_owner_verified:false,
 wordpress_production_writes:0,real_publishes:0,extra_eur:0};
fs.writeFileSync(report,JSON.stringify(result,null,2)+'\n',{mode:0o600});
process.stdout.write(JSON.stringify(result)+'\n');
