import {voiceActivityFrame,voiceActivityThreshold} from '../src/cerebroVoice.ts';

function assert(condition,message){
 if(!condition)throw new Error(message);
}

{
 const threshold=voiceActivityThreshold(0.005,0.01);
 assert(threshold>=0.035,'minimum anti-noise threshold must be enforced');
 assert(threshold<=0.04,'quiet-room threshold should remain sensitive enough for speech');
}

{
 const threshold=voiceActivityThreshold(0.01,0.03);
 assert(threshold>=0.063,'speaker echo floor must strongly raise the barge-in threshold');
}

{
 let consecutive=0;
 let triggered=false;
 for(const rms of [0.08,0.082,0.081,0.085,0.084,0.083,0.086,0.082]){
  const frame=voiceActivityFrame(rms,0.065,consecutive,8);
  consecutive=frame.consecutive;
  triggered=frame.triggered;
 }
 assert(triggered,'sustained user voice must trigger interruption');
}

{
 let consecutive=0;
 let triggered=false;
 for(const rms of [0.08,0.02,0.081,0.02,0.085,0.02,0.086,0.02]){
  const frame=voiceActivityFrame(rms,0.065,consecutive,8);
  consecutive=frame.consecutive;
  triggered=triggered||frame.triggered;
 }
 assert(!triggered,'isolated noise spikes must not trigger interruption');
}

console.log('GREEN CEREBRO local VAD barge-in behavioral corpus');
