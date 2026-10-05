const assert=require('node:assert/strict'),compact=require('./compact-css.cjs');
const source='/* heading */\n .a  .b {\n content: "/*literal*/  two  spaces\\\"";\n width: calc(100% -  20px);\n --pair: 1px  2px;\n background: url("data:text/plain;a b");\n }';
const result=compact(source);assert.equal(result,'.a .b { content: "/*literal*/  two  spaces\\\""; width: calc(100% - 20px); --pair: 1px 2px; background: url("data:text/plain;a b"); }');assert.ok(result.length<source.length);assert.equal(compact(result),result);assert.equal(compact('a/**/b'),'a b');assert.throws(()=>compact('/*broken'));assert.throws(()=>compact('a{content:"broken}'));
console.log('PASS CSS compaction preserves strings, escapes, selector and calc token spacing and rejects incomplete syntax');
