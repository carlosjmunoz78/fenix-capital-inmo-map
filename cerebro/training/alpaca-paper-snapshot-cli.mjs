import {captureAlpacaPaperSnapshot} from './alpaca-paper-snapshot.mjs';

try {
  const snapshot=await captureAlpacaPaperSnapshot();
  process.stdout.write(`${JSON.stringify(snapshot,null,2)}\n`);
} catch (error) {
  process.stderr.write(`RED: ${error?.message||'snapshot failed'}\n`);
  process.exitCode=1;
}
