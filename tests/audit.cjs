const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
assert.equal(scripts.length,1,'Expected one application script');
assert.doesNotThrow(()=>new Function(scripts[0][1]),'Application JavaScript must parse');

const script=scripts[0][1];
const dataStart=script.indexOf('function bohrSVG(');
const dataEnd=script.indexOf('/* =========================================================================\n   SCOREBOARD');
assert.ok(dataStart>=0&&dataEnd>dataStart,'Question data block must be discoverable');
const sandbox={};
vm.createContext(sandbox);
vm.runInContext(script.slice(dataStart,dataEnd)+`;globalThis.auditData={CHEM_S1,CHEM_S2,CHEM_S3,TRIVIA_S1,TRIVIA_S2,TRIVIA_S3,SECTIONS};`,sandbox);
const d=sandbox.auditData;

assert.deepEqual([d.CHEM_S1.length,d.CHEM_S2.length,d.CHEM_S3.length],[5,5,5],'Each round must have five chemistry questions');
assert.deepEqual([d.TRIVIA_S1.length,d.TRIVIA_S2.length,d.TRIVIA_S3.length],[5,5,5],'Each round must have five wildcard questions');
assert.ok(d.SECTIONS.every(s=>s.items.length===10),'Each round must contain ten items');
assert.ok(d.SECTIONS.every(s=>s.items.every((item,i)=>item.type===(i%2===0?'chem':'trivia'))),'Chemistry and wildcard questions must alternate');

for(const q of [...d.CHEM_S1,...d.CHEM_S2,...d.CHEM_S3]) assert.ok(q.q&&q.solution,`${q.skill}: question and solution are required`);
for(const q of [...d.TRIVIA_S1,...d.TRIVIA_S2,...d.TRIVIA_S3]){
  assert.equal(q.choices.length,4,`${q.category}: expected four choices`);
  assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4,`${q.category}: answer index must be valid`);
  assert.ok(q.q&&q.explanation,`${q.category}: question and explanation are required`);
}

assert.match(html,/sessionStorage\.setItem\(GAME_KEY/,'In-round progress must survive a reload');
assert.match(html,/class="play-dashboard"/,'Scores and timer must share one compact control dock');
assert.match(html,/prefers-reduced-motion/,'Reduced motion must be supported');
assert.match(html,/button:focus-visible/,'Keyboard focus must be visible');
assert.doesNotMatch(html,/[✅❌🔥⚡🧪📝✓]/u,'UI must not use emoji or checkmark glyphs');
assert.doesNotMatch(html,/[—–]|&mdash;/,'Student-facing copy must not use em or en dashes');

console.log('audit.cjs: all review-game checks passed');
