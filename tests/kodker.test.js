const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const K = require('../docs/kodker.js');

function out(src) {
  const lines = [];
  const r = K.run(src, { print: (t) => lines.push(t) });
  return { ...r, lines };
}

test('چاپ و ژمارەی کوردی', () => {
  const r = out('چاپ(١٢ + ٣٫٥)');
  assert.ok(r.ok, r.error);
  assert.deepStrictEqual(r.lines, ['15.5']);
});

test('دەق دەستکاری ناکرێت', () => {
  const r = out('چاپ("ئەگەر و یان ١٢٣")');
  assert.deepStrictEqual(r.lines, ['ئەگەر و یان ١٢٣']);
});

test('کۆمێنت دەستکاری ناکرێت', () => {
  assert.ok(K.transpile('// ئەگەر x { \nچاپ(١)').includes('// ئەگەر x { '));
});

test('ئەگەر بێ کەوانە', () => {
  assert.strictEqual(K.transpile('ئەگەر x > ٥ { }'), 'if (x > 5) { }');
});

test('ئەگەرنا ئەگەر', () => {
  const js = K.transpile('ئەگەر a { } ئەگەرنا ئەگەر b { } ئەگەرنا { }');
  assert.strictEqual(js, 'if (a) { } else if (b) { } else { }');
});

test('بۆ ... لە ... تا', () => {
  const r = out('گۆڕاو s = ٠\nبۆ i لە ١ تا ٤ { s += i }\nچاپ(s)');
  assert.deepStrictEqual(r.lines, ['10']);
});

test('بۆ بە هەنگاوی نەرێنی', () => {
  const r = out('بۆ i لە ٣ تا ١ هەنگاو -١ { چاپ(i) }');
  assert.deepStrictEqual(r.lines, ['3', '2', '1']);
});

test('بۆ هەر', () => {
  const r = out('بۆ هەر x لە [١، ٢، ٣] { چاپ(x * ٢) }');
  assert.deepStrictEqual(r.lines, ['2', '4', '6']);
});

test('بازنەی لەناو بازنە', () => {
  const r = out('گۆڕاو n = ٠\nبۆ i لە ١ تا ٣ { بۆ j لە ١ تا ٣ هەنگاو ٢ { n++ } }\nچاپ(n)');
  assert.deepStrictEqual(r.lines, ['6']);
});

test('هەتا، بشکێنە', () => {
  const r = out('گۆڕاو i = ٠\nهەتا ڕاست { i++\nئەگەر i == ٥ { بشکێنە } }\nچاپ(i)');
  assert.deepStrictEqual(r.lines, ['5']);
});

test('و / یان / نەک', () => {
  const r = out('چاپ(ڕاست و هەڵە، ڕاست یان هەڵە، نەک هەڵە)');
  assert.deepStrictEqual(r.lines, ['هەڵە ڕاست ڕاست']);
});

test('میتۆدی لیست', () => {
  const r = out('نەگۆڕ l = [٣، ١، ٢]\nl.زیادبکە(٠)\nچاپ(l.درێژی، l.ڕیزبکە())');
  assert.deepStrictEqual(r.lines, ['4 [0, 1, 2, 3]']);
});

test('پۆل', () => {
  const r = out('پۆل A { کۆنستراکتەر(x) { ئەمە.x = x } دوو() { گەڕێنەوە ئەمە.x * ٢ } }\nچاپ(نوێ A(٤).دوو())');
  assert.deepStrictEqual(r.lines, ['8']);
});

test('ناوی کوردی بۆ گۆڕاو و ئەگەر لەگەڵ ي/ك عەرەبی', () => {
  const r = out('نەگۆڕ كورد = ١\nچاپ(کورد)');
  assert.ok(r.ok, r.error);
});

test('نیشانە نادیارەکانی RTL دەسڕدرێنەوە', () => {
  const r = out('‏چاپ(‎١)');
  assert.deepStrictEqual(r.lines, ['1']);
});

test('گۆڕاوی هاوناو لەگەڵ فەنکشنی ئامادەکراو ڕێگەپێدراوە', () => {
  const r = out('گۆڕاو گرد = ٣\nچاپ(گرد)');
  assert.ok(r.ok, r.error);
});

test('هەڵەی پێناسە نەکراو بە کوردی', () => {
  const r = out('چاپ(نەزانراو)');
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /پێناسە نەکراوە/);
});

test('هەڵەی نەگۆڕ', () => {
  const r = out('نەگۆڕ a = ١\na = ٢');
  assert.match(r.error, /نەگۆڕ/);
});

test('شێوازی هەڵەی بۆ', () => {
  const r = out('بۆ i لە ١ { }');
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /شێوازی «بۆ»/);
});

test('سنووری دەرچوون', () => {
  const r = K.run('هەتا ڕاست { چاپ(١) }', { print() {}, maxLines: 100 });
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /زۆر درێژ/);
});

test('format', () => {
  assert.strictEqual(K.format([1, 'a', null, true]), '[1, "a", هیچ, ڕاست]');
  assert.strictEqual(K.format({ a: 1 }), '{ a: 1 }');
});

test('هەموو نموونەکان کار دەکەن', () => {
  const dir = path.join(__dirname, '..', 'examples');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.kd'));
  assert.ok(files.length >= 9);
  for (const f of files) {
    const r = out(fs.readFileSync(path.join(dir, f), 'utf8'));
    assert.ok(r.ok, `${f}: ${r.error}`);
    assert.ok(r.lines.length > 0 || r.gfx, `${f}: نە دەرچوونی هەیە نە وێنە`);
  }
});

test('docs/examples.js نوێیە', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'docs', 'examples.js'), 'utf8');
  const dir = path.join(__dirname, '..', 'examples');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.kd'))) {
    assert.ok(src.includes(JSON.stringify(fs.readFileSync(path.join(dir, f), 'utf8').trimEnd() + '\n').slice(1, -1)), `${f} لە docs/examples.js نییە، npm run build بکە`);
  }
});

test('هایلایت: دەقەکە بە تەواوی دەپارێزرێت', () => {
  const src = '// کۆمێنت\nئەگەر x > ٥ { چاپ("a<b&c") }‏\nبۆ i لە ١ تا ٣ {}';
  const html = K.highlight(src);
  const plain = html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  assert.strictEqual(plain, src);
  assert.match(html, /<span class="t-k">ئەگەر<\/span>/);
  assert.match(html, /<span class="t-f">چاپ<\/span>/);
  assert.match(html, /<span class="t-s">"a&lt;b&amp;c"<\/span>/);
  assert.match(html, /<span class="t-n">٥<\/span>/);
  assert.match(html, /<span class="t-c">\/\/ کۆمێنت<\/span>/);
});

test('هایلایت: ناوی کار و میتۆد', () => {
  const html = K.highlight('کار کۆ() {}\nل.زیادبکە(١)');
  assert.match(html, /<span class="t-d">کۆ<\/span>/);
  assert.match(html, /<span class="t-p">زیادبکە<\/span>/);
});

test('وانەکان: وەڵامی هەر وانەیەک دەبێت تێپەڕێت', () => {
  const { lessons, check, simulateSync } = require('../docs/lessons.js');
  assert.ok(lessons.length >= 115);
  for (const [i, l] of lessons.entries()) {
    const r = out(l.solution);
    assert.ok(r.ok, `وانە ${i + 1}: ${r.error}`);
    const c = check(l, r.lines, l.solution, K, r.gfx, l.game ? simulateSync(l, l.solution, K) : undefined);
    assert.ok(c.ok, `وانە ${i + 1} (${l.title}): ${c.reason} ${JSON.stringify(c.got)}`);
    // کۆدی دەستپێک نابێت خۆی بەخۆی تێپەڕێت
    const s = out(l.starter);
    assert.ok(!check(l, s.lines, l.starter, K, s.gfx, l.game ? simulateSync(l, l.starter, K) : undefined).ok, `وانە ${i + 1}: کۆدی دەستپێک پێشتر وەڵامە`);
  }
});

// ── تەواوکردنی خۆکار ──
const labels = (src, pos) => {
  const r = K.completions(src, pos === undefined ? src.length : pos);
  return r ? r.items.map((i) => i.label) : null;
};

test('تەواوکردن: فەنکشنی ئامادەکراو و وشە سەرەکییەکان', () => {
  assert.deepStrictEqual(labels('چا'), ['چاپ']);
  // وشە سەرەکییەکان یەکەمن، پاشان فەنکشنەکان (لەوانە فەنکشنەکانی کێشان)
  assert.deepStrictEqual(labels('ئە'), ['ئەمە', 'ئەگەر', 'ئەگەرنا', 'ئەستووریبکە', 'ئەستێرە', 'ئەستێرەهێڵ']);
});

test('تەواوکردن: ڕیزبەندی (وشە، فەنکشن، گۆڕاو)', () => {
  const l = labels('گۆڕاو چاپکەر = ١\nچا');
  assert.deepStrictEqual(l, ['چاپ', 'چاپکەر']);
});

test('تەواوکردن: میتۆدی دوای خاڵ', () => {
  const r = K.completions('ل.زی', 4);
  assert.deepStrictEqual(r.items.map((i) => [i.label, i.template]), [['زیادبکە', 'زیادبکە($0)']]);
  const d = K.completions('ل.در', 4);
  assert.deepStrictEqual(d.items.map((i) => [i.label, i.template]), [['درێژی', 'درێژی']]);
});

test('تەواوکردن: گۆڕاوەکانی ناو کۆدەکە', () => {
  assert.deepStrictEqual(labels('گۆڕاو ژمارەکان = ١\nژم'), ['ژمارەکان']);
});

test('تەواوکردن: تایبەتمەندییەکانی ئۆبجێکت دوای خاڵ', () => {
  assert.deepStrictEqual(labels('ئەمە.پانی = ١\nئەمە.پا'), ['پاککەرەوە', 'پاڵاوتن', 'پانی']);
});

test('تەواوکردن: نە لە ناو دەق، نە کۆمێنت، نە کاتی ناونانی نوێ', () => {
  assert.strictEqual(labels('چاپ("چا'), null);
  assert.strictEqual(labels('// چا'), null);
  assert.strictEqual(labels('گۆڕاو چا'), null);
  assert.strictEqual(labels('کار چا'), null);
  assert.strictEqual(labels('بۆ چا'), null);
});

test('تەواوکردن: نە لە ناوەڕاستی وشە، نە بێ پێشگر', () => {
  assert.strictEqual(labels('چاپ', 2), null);
  assert.strictEqual(labels(''), null);
  assert.strictEqual(labels('چاپ('), null);
});

test('تەواوکردن: وشەی تەواو و بێ قاڵب پێشنیار نابێت، بەڵام قاڵبەکان دەمێننەوە', () => {
  assert.strictEqual(labels('ل.درێژی'), null);          // میتۆدی بێ قاڵب
  assert.strictEqual(labels('هیچ'), null);               // وشەی بێ قاڵب
  const tpl = (src, label) => K.completions(src, src.length).items.find((i) => i.label === label).template;
  assert.strictEqual(tpl('بۆ', 'بۆ'), 'بۆ i لە ١ تا $0 {\n  \n}');   // «بۆ» تەواو نووسراوە، بەڵام قاڵبی هەیە
  assert.strictEqual(tpl('کار', 'کار'), 'کار $0() {\n  \n}');
});

test('تەواوکردن: پیتی عەرەبی (ك) یەکدەخرێت', () => {
  assert.deepStrictEqual(labels('كا'), ['کار']);
});

test('تەواوکردن: قاڵبی ئەگەر و ڕێژەی شوێن', () => {
  const r = K.completions('ئەگە', 4);
  const it = r.items.find((i) => i.label === 'ئەگەر');
  assert.strictEqual(it.template, 'ئەگەر $0 {\n  \n}');
  assert.strictEqual(r.from, 0);
  assert.strictEqual(r.to, 4);
});

test('تەواوکردن: from/to لە ناوەڕاستی کۆد', () => {
  const src = 'چاپ(١)\nهەڕە';
  const r = K.completions(src, src.length);
  assert.strictEqual(r.from, 7);
  assert.strictEqual(src.slice(r.from, r.to), 'هەڕە');
  assert.deepStrictEqual(r.items.map((i) => i.label), ['هەڕەمەکی']);
});

test('تەواوکردن: هەموو قاڵبەکان $0 یان کۆدی دروستن', () => {
  for (const kw of ['ئەگەر', 'ئەگەرنا', 'هەتا', 'بۆ', 'کار', 'پۆل', 'تاقیبکەرەوە']) {
    const r = K.completions(kw.slice(0, -1) + 'X'.repeat(0), kw.length - 1);
    assert.ok(r, kw);
    const it = r.items.find((i) => i.label === kw);
    assert.ok(it && it.template.includes('$0'), kw + ' قاڵبی نییە');
  }
});

// ── کێشان ──
const draw = (src) => { const r = K.run(src, { print() {} }); return { ...r, cmds: r.gfx ? r.gfx.frames.flat() : [] }; };

test('کێشان: بێ فەرمانی کێشان gfx نییە', () => {
  assert.strictEqual(K.run('چاپ(١)', { print() {} }).gfx, null);
});

test('کێشان: شێوەکان و ڕەنگی کوردی', () => {
  const r = draw('قەبارە(٣٠٠، ٢٠٠)\nڕەنگبکە("سوور")\nبازنە(٥٠، ٦٠، ٢٠)\nلاکێش(١، ٢، ٣، ٤)\nنووسین("سڵاو"، ١٠٠، ٥٠)');
  assert.ok(r.ok, r.error);
  assert.strictEqual(r.gfx.width, 300);
  assert.strictEqual(r.gfx.height, 200);
  assert.deepStrictEqual(r.cmds, [
    ['fill', '#ed2024'], ['circle', 50, 60, 20, 'f'], ['rect', 1, 2, 3, 4, 'f'], ['text', 'سڵاو', 100, 50, 24],
  ]);
});

test('کێشان: قەڵەمی کیسە چوارگۆشە دەکێشێت', () => {
  const r = draw('قەبارە(٢٠٠، ٢٠٠)\nبۆ i لە ١ تا ٤ {\n  پێشەوە(٥٠)\n  بۆڕاست(٩٠)\n}');
  assert.ok(r.ok, r.error);
  const lines = r.cmds.filter((c) => c[0] === 'line').map((c) => c.slice(1).map((n) => Math.round(n)));
  assert.deepStrictEqual(lines, [[100, 100, 100, 50], [100, 50, 150, 50], [150, 50, 150, 100], [150, 100, 100, 100]]);
});

test('کێشان: قەڵەم بەرز = نەکێشان', () => {
  const r = draw('قەڵەمبەرز()\nپێشەوە(٣٠)\nقەڵەمدابنێ()\nپێشەوە(٣٠)');
  assert.strictEqual(r.cmds.filter((c) => c[0] === 'line').length, 1);
});

test('کێشان: فریم و ئەنیمەیشن', () => {
  const r = draw('بۆ x لە ١ تا ٥ {\n  بازنە(x * ١٠، ٥٠، ٥)\n  فریم()\n}');
  assert.strictEqual(r.gfx.frames.length, 5);                 // فریمی بەتاڵی کۆتایی لادەبرێت
  assert.ok(r.gfx.frames.every((f) => f.length === 1));
});

test('کێشان: ڕەنگی پەلکەزێڕینە و rgb', () => {
  const r = draw('ڕەنگبکە(ڕەنگی(١، ٢، ٣))\nڕەنگبکە(پەلکەزێڕینە(-٣٠، ٠٫٥))');
  assert.deepStrictEqual(r.cmds, [['fill', 'rgb(1,2,3)'], ['fill', 'hsla(330,85%,55%,0.5)']]);
});

test('کێشان: هەڵەی کوردی بۆ ژمارەی هەڵە و سنووردارکردن', () => {
  assert.match(draw('بازنە("x"، ١، ٢)').error, /ژمارەیەک پێویستە/);
  assert.match(draw('ڕەنگبکە(٥)').error, /ڕەنگ دەبێت دەق بێت/);
  const lim = draw('هەتا ڕاست {\n  بازنە(١، ١، ١)\n  فریم()\n}');
  assert.strictEqual(lim.ok, false);
  assert.match(lim.error, /کێشانەکە زۆر گەورە/);
  assert.ok(lim.gfx && lim.gfx.frames.length > 1);          // ئەوەی کێشرابوو دەمێنێتەوە
});

test('کێشان: لە کاتی هەڵەدا ئەوەی کێشرابوو دەمێنێتەوە', () => {
  const r = draw('بازنە(١، ٢، ٣)\nچاپ(نەزانراو)');
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.cmds.length, 1);
});

test('کێشان: هایلایت و تەواوکردن فەرمانەکانی کێشان دەناسن', () => {
  assert.match(K.highlight('بازنە(١، ٢، ٣)'), /<span class="t-f">بازنە<\/span>/);
  assert.ok(labels('بازن').includes('بازنە'));
});

test('canvas.js: فەرمانەکان بە دروستی لەسەر ctx جێبەجێ دەبن', () => {
  const C = require('../docs/canvas.js');
  const calls = [];
  const ctx = new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : (...a) => calls.push([k, ...a])),
    set: (t, k, v) => { t[k] = v; calls.push(['set:' + k, v]); return true; },
  });
  C.apply(ctx, ['fill', '#ed2024'], 100, 100);
  C.apply(ctx, ['rect', 1, 2, 3, 4, 'f'], 100, 100);
  C.apply(ctx, ['rect', 1, 2, 3, 4, 's'], 100, 100);
  C.apply(ctx, ['circle', 5, 5, 3, 'f'], 100, 100);
  C.apply(ctx, ['sun', 50, 50, 10], 100, 100);
  C.apply(ctx, ['text', 'سڵاو', 10, 20, 30], 100, 100);
  assert.deepStrictEqual(calls.filter((c) => c[0] === 'set:fillStyle')[0], ['set:fillStyle', '#ed2024']);
  assert.ok(calls.some((c) => c[0] === 'fillRect' && c[1] === 1));
  assert.ok(calls.some((c) => c[0] === 'strokeRect'));
  assert.strictEqual(calls.filter((c) => c[0] === 'lineTo').length, 42);   // خۆر: ٢١ تیشک × ٢
  assert.ok(calls.some((c) => c[0] === 'fillText' && c[1] === 'سڵاو'));
});

test('وانەکان: پێکهاتە (id ی یەکتا، بەش، کات، ئاست، بیرت بێت)', () => {
  const { lessons, chapters, LEVELS } = require('../docs/lessons.js');
  const ids = lessons.map((l) => l.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'id دووبارەیە');
  const chapterIds = new Set(chapters.map((c) => c.id));
  for (const l of lessons) {
    assert.ok(chapterIds.has(l.chapter), `${l.id}: بەشی نەناسراو`);
    assert.ok(l.minutes > 0 && l.minutes <= 20, `${l.id}: کات`);
    assert.ok(LEVELS[l.level], `${l.id}: ئاست`);
    assert.ok(Array.isArray(l.recap) && l.recap.length >= 2, `${l.id}: «بیرت بێت» کەمە`);
    assert.ok(l.hint && l.solution && l.task && l.body && l.starter, `${l.id}: بەشێک کەمە`);
    assert.ok(l.expect || l.expectDraw || l.expectAny || l.minFrames || l.verify || l.verifyGame, `${l.id}: پشکنینی نییە`);
  }
  // هەر بەشێک لانیکەم یەک وانەی هەیە، و وانەکان بە ڕیزی بەشەکان دانراون
  const order = chapters.map((c) => c.id);
  let last = -1;
  for (const l of lessons) {
    const i = order.indexOf(l.chapter);
    assert.ok(i >= last, `${l.id}: ڕیزبەندی بەشەکان هەڵەیە`);
    last = i;
  }
  for (const c of chapters) assert.ok(lessons.some((l) => l.chapter === c.id), c.id);
});

test('وانەکان: پێشکەوتنی کۆن (ژمارە) دەگۆڕدرێت بۆ id', () => {
  const { lessons, legacyToIds, LEGACY_ORDER } = require('../docs/lessons.js');
  assert.deepStrictEqual(legacyToIds([0, 4, 13]), ['hello', 'if', 'animation']);
  assert.deepStrictEqual(legacyToIds([99]), []);
  for (const id of LEGACY_ORDER) assert.ok(lessons.some((l) => l.id === id), 'وانەی کۆن نەماوە: ' + id);
});

test('وانەکان: پشکنینی expectAny و ژمارەی ڕیزی هەڵە', () => {
  const { lessons, check } = require('../docs/lessons.js');
  const flag = lessons.find((l) => l.id === 'project-flag');
  const noMark = draw('قەبارە(٤٠٠، ٢٦٠)\nلاکێش(٠، ٠، ٤٠٠، ٨٠)\nلاکێش(٠، ٨٠، ٤٠٠، ٨٠)\nلاکێش(٠، ١٦٠، ٤٠٠، ٨٠)');
  const r = check(flag, [], 'لاکێش', K, noMark.gfx);
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /نیشانەیەک/);
});

test('وانەی هەڕەمەکی: هەر جارێک وەڵامەکە تێدەپەڕێت (٣٠ جار)', () => {
  const { lessons, check } = require('../docs/lessons.js');
  const l = lessons.find((x) => x.id === 'random');
  for (let i = 0; i < 30; i++) {
    const r = out(l.solution);
    assert.ok(check(l, r.lines, l.solution, K, r.gfx).ok, r.lines.join(','));
  }
  // ژمارەی هەڵە و ژمارەی ڕیزی هەڵە ڕەت دەکرێنەوە
  assert.match(check(l, ['1', '2', '3'], 'هەڕەمەکی بۆ', K).reason, /٥ ڕیز/);
  assert.match(check(l, ['1', '2', '3', '4', '9'], 'هەڕەمەکی بۆ', K).reason, /١ تا ٦/);
});

test('ژمارەی وانەکان لە README و پەڕە دروستە (بۆ ئەوەی هەرگیز نەگۆڕدرێت بێ نوێکردنەوە)', () => {
  const { lessons } = require('../docs/lessons.js');
  const kd = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
  const n = kd(lessons.length);
  const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  assert.ok(read('README.md').includes(n + ' وانە'), 'README: ژمارەی وانەکان هەڵەیە، پێویستە ' + n + ' بێت');
  assert.ok(read('docs/index.html').includes('<b>' + n + '</b><span>وانە</span>'), 'index.html: ئامار');
  assert.ok(read('docs/index.html').includes(n + ' وانە'), 'index.html: تایبەتمەندی');
  assert.ok(read('docs/tutorial.html').includes(n + ' وانە'), 'tutorial.html: meta');
  const { chapters } = require('../docs/lessons.js');
  const nc = kd(chapters.length) + ' بەش';
  assert.ok(read('README.md').includes(nc), 'README: ژمارەی بەشەکان، پێویستە «' + nc + '» هەبێت');
  assert.ok(read('docs/index.html').includes(nc), 'index.html: ژمارەی بەشەکان');
  assert.ok(read('docs/tutorial.html').includes(nc), 'tutorial.html: ژمارەی بەشەکان');
});

test('هەموو وانەکان: بەکارهێنانی وشەی ناسراو، بێ ڕیزی دووبارە لە بەرنامەی وەڵامدا', () => {
  const { lessons } = require('../docs/lessons.js');
  for (const l of lessons) {
    // هەموو وشەی mustUse دەبێت لە وەڵامەکەی خۆیدا بەکارهاتبێت (ئەگەر نا وانەکە ناتەواوە)
    const words = new Set(K.tokenize(l.solution).filter((t) => t.type === 'word').map((t) => t.text));
    for (const w of l.mustUse || []) assert.ok(words.has(w), `${l.id}: «${w}» لە وەڵامەکەدا نییە`);
  }
});

test('وانەکانی «دۆزینەوەی هەڵە»: کۆدی دەستپێک ئەو هەڵەیە دەدات کە لە وانەکەدا باسکراوە', () => {
  const { lessons } = require('../docs/lessons.js');
  const run = (id) => { const l = lessons.find((x) => x.id === id); return out(l.starter); };
  assert.deepStrictEqual(run('debug-loop').lines, ['11']);
  assert.deepStrictEqual(run('debug-condition').lines, ['باش', 'باش', 'کەوتوو']);
  assert.deepStrictEqual(run('debug-function').lines, ['9', 'ئەنجام: نەناسراو', '5', 'ئەنجام: نەناسراو']);
  const scope = run('scope');
  assert.strictEqual(scope.ok, false);
  assert.match(scope.error, /پێناسە نەکراوە/);
});

test('وانەکان: mustNotUse (ئەگەری کورت بێ ئەگەر)', () => {
  const { lessons, check } = require('../docs/lessons.js');
  const l = lessons.find((x) => x.id === 'ternary');
  const alt = 'نەگۆڕ ژمارەکان = [٧، ١٢، ٣]\nبۆ هەر ن لە ژمارەکان {\n  ئەگەر ن % ٢ == ٠ { چاپ(ن + ": جووت") } ئەگەرنا { چاپ(ن + ": تاک") }\n}\n';
  const r = out(alt);
  const c = check(l, r.lines, alt, K);
  assert.strictEqual(c.ok, false);
  assert.match(c.reason, /نابێت/);
});

test('ئەگەری کورت (؟ :) کار دەکات', () => {
  const r = out('چاپ(٥ > ٣ ؟ "ڕاست" : "هەڵە")\nچاپ(٥ < ٣ ؟ "یەک" : "دوو")');
  assert.ok(r.ok, r.error);
  assert.deepStrictEqual(r.lines, ['ڕاست', 'دوو']);
});

test('کلیلەکان و نرخەکان (فەرمانی ئۆبجێکت)', () => {
  const r = out('نەگۆڕ ک = { ا: ١، ب: ٢ }\nچاپ(کلیلەکان(ک))\nچاپ(نرخەکان(ک))\nبۆ هەر ن لە کلیلەکان(ک) { چاپ(ن + "=" + ک[ن]) }');
  assert.ok(r.ok, r.error);
  assert.deepStrictEqual(r.lines, ['["ا", "ب"]', '[1, 2]', 'ا=1', 'ب=2']);
  assert.match(K.highlight('کلیلەکان(ک)'), /<span class="t-f">کلیلەکان<\/span>/);
});

test('وانەی تۆپی جووڵاو: دڵنیا دەبێتەوە لە گەڕانەوە و مانەوە لە کانڤاسدا', () => {
  const { lessons, check } = require('../docs/lessons.js');
  const b = lessons.find((x) => x.id === 'bounce');
  const verdict = (src) => { const r = out(src); return check(b, r.lines, src, K, r.gfx); };
  const base = 'قەبارە(٣٠٠، ١٠٠)\nگۆڕاو x = ٣٠\nبۆ t لە ١ تا ٦٠ {\n  پاککەرەوە()\n  بازنە(x، ٥٠، ٢٠)\n  x += ';
  // ئەو تۆپەی کە لە کانڤاس دەرناچێت بەڵام ناگەڕێتەوە
  const slow = verdict(base + '١\n  ئەگەر x > ٢٨٠ { x = x }\n  فریم()\n}\n');
  assert.strictEqual(slow.ok, false);
  assert.match(slow.reason, /ئاڕاستەکەی بگۆڕێت/);
  // ئەو تۆپەی لە کانڤاس دەردەچێت
  const off = verdict(base + '١٠\n  ئەگەر x > ٥٠٠ { x = x }\n  فریم()\n}\n');
  assert.strictEqual(off.ok, false);
  assert.match(off.reason, /دەرچوو/);
  assert.ok(verdict(b.solution).ok);
});

test('ئەلگۆریتمەکان: ئەنجامە زانستییەکان (کۆلاتز ٢٧ = ١١١، گەڕانی دووانەیی = ٦، GCD)', () => {
  const { lessons } = require('../docs/lessons.js');
  const lines = (id) => out(lessons.find((x) => x.id === id).solution).lines;
  assert.deepStrictEqual(lines('collatz'), ['6: 8', '27: 111']);
  assert.deepStrictEqual(lines('binary-search'), ['6', '-1']);
  assert.deepStrictEqual(lines('gcd'), ['6', '1', '25']);
  assert.deepStrictEqual(lines('bubble-sort'), ['[1, 2, 4, 5, 8]', 'گۆڕین: 6']);
  assert.deepStrictEqual(lines('time-format'), ['01:02:41', '00:00:05', '10:00:00']);
});

test('ئەلگۆریتمەکان: mustNotUse ڕێگە نادات بە میتۆدی ئامادەکراو', () => {
  const { lessons, check } = require('../docs/lessons.js');
  for (const [id, alt, forbidden] of [
    ['linear-search', 'کار بگەڕێ(ل، x) { گەڕێنەوە ل.شوێن(x) }\nبۆ i لە ١ تا ١ { }', 'شوێن'],
    ['bubble-sort', 'نەگۆڕ ل = [٥، ٢]\nل.ڕیزبکە((a، b) => a - b)\nبۆ i لە ١ تا ١ { ئەگەر ڕاست { } }', 'ڕیزبکە'],
  ]) {
    const l = lessons.find((x) => x.id === id);
    const r = out(alt);
    const c = check(l, r.lines, alt, K, r.gfx);
    assert.strictEqual(c.ok, false, id);
    assert.ok(c.reason.includes(forbidden), id);
  }
});

test('مەشقەکان: ئەنجامە زانراوەکانی بیرکاری (Euler، ژمارەی تەواو، ئارمسترۆنگ، دابەشکەرە سەرەتاییەکان)', () => {
  const { lessons } = require('../docs/lessons.js');
  const lines = (id) => out(lessons.find((x) => x.id === id).solution).lines;
  assert.deepStrictEqual(lines('euler1'), ['233168']);                         // Project Euler #1
  assert.deepStrictEqual(lines('euler2'), ['4613732']);                        // Project Euler #2
  assert.deepStrictEqual(lines('perfect-numbers'), ['[6, 28, 496]']);        // ژمارە تەواوەکان
  assert.deepStrictEqual(lines('armstrong'), ['[1, 2, 3, 4, 5, 6, 7, 8, 9, 153, 370, 371, 407]']);
  assert.deepStrictEqual(lines('prime-factors'), ['[2, 2, 2, 3, 3, 5]', '[2, 2, 3, 7]', '[97]']);
  assert.deepStrictEqual(lines('caesar'), ['khoor', 'hello', 'b c']);          // قەیسەر: شیفت ٣ ثم ٢٣
  assert.deepStrictEqual(lines('rle'), ['a3b2c1', 'z4', 'a1b1c1']);
  assert.deepStrictEqual(lines('leap-year'), ['2024: ڕاست', '1900: هەڵە', '2000: ڕاست', '2023: هەڵە']);
  assert.deepStrictEqual(lines('digit-sum'), ['15', '27', '7']);
  assert.deepStrictEqual(lines('reverse-number'), ['54321', '21', '7']);
});

test('مەشقەکان: وەڵامی بیرکاری ڕێگە نادات بە میتۆدی دەق (mustNotUse)', () => {
  const { lessons, check } = require('../docs/lessons.js');
  const viaString = 'کار کۆیژمارەکان(n) {\n  گۆڕاو کۆ = ٠\n  بۆ هەر ر لە بکەدەق(n).دابەشبکە("") { کۆ += بکەژمارە(ر) }\n  گەڕێنەوە کۆ\n}\nهەتا ٠ > ١ { خوارکە(١) }\nچاپ(کۆیژمارەکان(١٢٣٤٥))\nچاپ(کۆیژمارەکان(٩٩٩))\nچاپ(کۆیژمارەکان(٧))\n';
  const l = lessons.find((x) => x.id === 'digit-sum');
  const r = out(viaString);
  const c = check(l, r.lines, viaString, K, r.gfx);
  assert.strictEqual(c.ok, false);
  assert.match(c.reason, /دابەشبکە/);
});

test('compose: وانە بە after ی هەڵە بێدەنگی ون نابێت', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'docs', 'lessons.js'), 'utf8');
  // هەموو وانە زیادکراوەکان `after` یان ناوی وانەیەکی بنەڕەتییە
  const L = require('../docs/lessons.js');
  assert.ok(L.lessons.some((l) => l.id === 'falling-balls'), 'falling-balls ون بووە');
  const broken = src.replace('id: "falling-balls", after: "animation"', 'id: "falling-balls", after: "bounce"');
  assert.notStrictEqual(broken, src, 'جێگۆڕکێکە کاری نەکرد');
  const mod = { exports: {} };
  assert.throws(() => new Function('module', 'exports', broken)(mod, mod.exports), /وانەیەکی بنەڕەتی نییە/);
});

test('میتۆدە نوێیەکانی دەق: دەهەک، دووبارەبکەرەوە، پڕبکەرەوە، دەستپێدەکات، کۆتاییدێت', () => {
  const r = out('چاپ((١٠ / ٣).دەهەک(٢))\nچاپ("#".دووبارەبکەرەوە(٤))\nچاپ(بکەدەق(٧).پڕبکەرەوە(٣، "0"))\nچاپ("کۆدکەر".دەستپێدەکات("کۆد")، "کۆدکەر".کۆتاییدێت("ەر"))');
  assert.ok(r.ok, r.error);
  assert.deepStrictEqual(r.lines, ['3.33', '####', '007', 'ڕاست ڕاست']);
  assert.match(K.highlight('x.دەهەک(٢)'), /<span class="t-p">دەهەک<\/span>/);
  assert.ok(labels('٣.دەه', 5).includes('دەهەک'));
});

test('شیکاری داتا: ئەنجامە زانراوەکان (CSV، گرووپ، تێکڕا، کۆگا، سیرپینسکی)', () => {
  const { lessons } = require('../docs/lessons.js');
  const lines = (id) => out(lessons.find((x) => x.id === id).solution).lines;
  assert.deepStrictEqual(lines('csv-parse'), ['3', 'ئارام و شیرین و ڕێبین', '76']);
  assert.deepStrictEqual(lines('group-count'), ['{ هەولێر: 3, سلێمانی: 1, دهۆک: 1 }', 'زۆرترین: هەولێر']);
  assert.deepStrictEqual(lines('average-by-group'), ['کۆد: 85', 'بیرکاری: 70']);
  assert.deepStrictEqual(lines('project-gradebook'), ['ئارام: 80', 'شیرین: 90', 'ڕێبین: 67.5', 'باشترین: شیرین']);
  assert.deepStrictEqual(lines('project-inventory'), ['{ سێو: 7, پرتەقاڵ: 5 }', 'هەڵە: پێویست نییە: پرتەقاڵ', '12']);
  assert.deepStrictEqual(lines('top-n'), ['ڕێبین (91) - هێمن (83) - ئارام (72)']);
  // سیرپینسکی ئاستی ٣ = ٣^٣ = ٢٧ سێگۆشە
  const sp = lessons.find((x) => x.id === 'sierpinski');
  const r = out(sp.solution);
  assert.strictEqual(r.gfx.frames.flat().filter((c) => c[0] === 'tri').length, 27);
});

test('وانەی تۆپی کەوتوو: ڕەتی دەکاتەوە ئەگەر تۆپەکان نەکەون', () => {
  const { lessons, check } = require('../docs/lessons.js');
  const l = lessons.find((x) => x.id === 'falling-balls');
  const stay = 'قەبارە(٣٠٠، ٢٨٠)\nنەگۆڕ xەکان = [٣٠، ٩٠، ١٥٠، ٢١٠، ٢٧٠]\nبۆ t لە ٠ تا ٣٩ {\n  پاککەرەوە()\n  بۆ هەر x لە xەکان { بازنە(x، ٥٠، ١٢) }\n  فریم()\n}\n';
  const r = out(stay);
  const c = check(l, r.lines, stay, K, r.gfx);
  assert.strictEqual(c.ok, false);
  assert.match(c.reason, /بکەونە خوارەوە/);
  assert.ok(check(l, out(l.solution).lines, l.solution, K, out(l.solution).gfx).ok);
});

test('فۆنت: Vazirmatn (OFL) ڕێکخراوە، فایلەکان هەن، و مۆڵەتەکەی لەگەڵیانە', () => {
  const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const css = read('docs/style.css');
  assert.match(css, /--font:\s*"Vazirmatn"/, 'فۆنتی سەرەکی دەبێت Vazirmatn بێت');
  for (const w of [400, 700, 800]) {
    for (const sub of ['arabic', 'latin']) {
      const f = `docs/fonts/vazirmatn-${sub}-${w}-normal.woff2`;
      assert.ok(fs.existsSync(path.join(__dirname, '..', f)), f + ' نییە');
      assert.ok(css.includes(`fonts/vazirmatn-${sub}-${w}-normal.woff2`), f + ' لە @font-face نییە');
    }
  }
  assert.match(read('docs/fonts/OFL-Vazirmatn.txt'), /SIL OPEN FONT LICENSE/);
  // پیتە کوردییەکان دەبێت لە subset ی arabic دا بن (U+0600-06FF) 
  assert.match(css, /unicode-range:\s*U\+0600-06FF/);
  // کۆد بە monospace دەمێنێتەوە و Vazirmatn تەنها وەک یەدەگی پیتی کوردی لە کۆددایە
  assert.match(css, /--mono:\s*ui-monospace[^;]*"Vazirmatn"[^;]*monospace/);
});

test('فۆنت: فایلی فۆنتی سپێدە (مۆڵەتی تایبەت، بڵاوکردنەوەی قەدەغەیە) نابێت لە ڕیپۆدا بێت', () => {
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === 'node_modules' || e.name === '.git') return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
  const bad = walk(path.join(__dirname, '..')).filter((f) => /speda/i.test(path.basename(f)) && /\.(ttf|otf|woff2?|eot)$/i.test(f));
  assert.deepStrictEqual(bad, [], 'فۆنتی سپێدە نابێت بڵاو بکرێتەوە: ' + bad.join(', '));
  assert.ok(!fs.readFileSync(path.join(__dirname, '..', 'docs', 'style.css'), 'utf8').match(/url\([^)]*speda/i));
});

// ── یاری (game engine) ──
test('یاریبکە: session ی یاری و ئینپوت', () => {
  const r = K.run('قەبارە(٢٠٠، ١٠٠)\nگۆڕاو x = ١٠\nیاریبکە(() => {\n  ئەگەر کلیل("ڕاست") { x += ٥ }\n  بازنە(x، ٥٠، ٥)\n})', { print() {} });
  assert.ok(r.ok && r.game);
  assert.strictEqual(r.game.fps, 60);
  const at = (keys) => { const t = r.game.tick({ keys, mx: -1, my: -1, down: false, clicked: false }); assert.ok(t.ok); return t.cmds.find((c) => c[0] === 'circle')[1]; };
  assert.strictEqual(at({}), 10);
  assert.strictEqual(at({ 'ڕاست': true }), 15);
  assert.strictEqual(at({ 'ڕاست': true }), 20);
  assert.strictEqual(at({}), 20);
});

test('یاریبکە: ماوس، دووری، سنوور و ئێستا', () => {
  const lines = [];
  const r2 = K.run('یاریبکە(() => { چاپ(ماوسX()، ماوسY()، ماوسگیراوە()، کلیککراوە()، دووری(٠، ٠، ٣، ٤)، سنوور(٩٩، ٠، ١٠)) })', { print: (t) => lines.push(t) });
  r2.game.tick({ keys: {}, mx: 7, my: 8, down: true, clicked: true });
  assert.strictEqual(lines[0], '7 8 ڕاست ڕاست 5 10');
  const t = K.run('چاپ(ئێستا().سەعات >= ٠)', { print: (x) => lines.push(x) });
  assert.ok(t.ok && !t.game);
  assert.strictEqual(lines[1], 'ڕاست');
});

test('یاریبکە: هەڵەی ناو فریم ڕاپۆرت دەکرێت و یاریبکە بێ کار هەڵەیە', () => {
  const r = K.run('یاریبکە(() => { چاپ(نەبوو) })', { print() {} });
  const t = r.game.tick({ keys: {} });
  assert.strictEqual(t.ok, false);
  assert.ok(/پێناسە نەکراوە/.test(t.error));
  assert.strictEqual(K.run('یاریبکە(٥)', { print() {} }).ok, false);
});

test('نموونەی یارییەکان: هەموو فریمەکان بێ هەڵە کار دەکەن لەگەڵ هەموو جۆرە ئینپوتێک', () => {
  const dir = path.join(__dirname, '..', 'examples');
  const games = fs.readdirSync(dir).filter((f) => /^(16|17|18|19|20|21|23|24|25|26|27|28|29|30|31|32|33|34|35|36|37|38|39|40|41|42|43|44|45|46|47|49|50|51|52|53|54|55|56|57|58|59|61|62)-/.test(f));
  assert.ok(games.length >= 44);
  for (const f of games) {
    const r = K.run(fs.readFileSync(path.join(dir, f), 'utf8'), { print() {} });
    assert.ok(r.ok && r.game, f + ': ' + r.error);
    for (let i = 0; i < 400; i++) {
      const keys = i % 90 < 30 ? { 'ڕاست': true, 'بۆشایی': i % 7 === 0 } : i % 90 < 60 ? { 'چەپ': true } : { 'سەرەوە': true, 'خوارەوە': i % 2 === 0 };
      const t = r.game.tick({ keys, mx: (i * 7) % 400, my: (i * 5) % 300, down: i % 50 < 10, clicked: i % 97 === 0 });
      assert.ok(t.ok, `${f} فریم ${i}: ${t.error}`);
    }
  }
});

test('گەلەری نموونە: هەر نموونەیەک گرووپ و ناونیشانی هەیە', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'docs', 'examples.js'), 'utf8');
  const ex = JSON.parse(src.slice(src.indexOf('['), src.lastIndexOf(']') + 1));
  assert.ok(ex.length >= 62);
  assert.ok(ex.filter((e) => e.group === 'game').length >= 25);
  for (const e of ex) { assert.ok(['code', 'art', 'game'].includes(e.group), e.id); assert.ok(e.title && e.code, e.id); }
});
