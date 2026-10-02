/**
 * 简单自测：node test.js
 * 覆盖：正/反向转换、境外不偏移、回程误差。
 */
const T = require('./coord-transform.js');

let pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗', name); }
}

const [lng, lat] = [126.48, 43.95];

const gcj = T.wgs84ToGcj02(lng, lat);
const back = T.gcj02ToWgs84(gcj[0], gcj[1]);

console.log('WGS84  ->', lng, lat);
console.log('GCJ02  ->', gcj[0].toFixed(6), gcj[1].toFixed(6));
console.log('偏移   ->', T.distanceMeters(lng, lat, gcj[0], gcj[1]).toFixed(1), 'm');
console.log('回程   ->', back[0].toFixed(6), back[1].toFixed(6));
console.log('回程误差 ->', T.distanceMeters(lng, lat, back[0], back[1]).toFixed(3), 'm');
console.log('');

ok('偏移在 100~900m（中国境内典型值）', (() => {
  const d = T.distanceMeters(lng, lat, gcj[0], gcj[1]);
  return d > 100 && d < 900;
})());
ok('回程误差 < 1m', T.distanceMeters(lng, lat, back[0], back[1]) < 1);
ok('境外(东京)不偏移', (() => {
  const t = T.wgs84ToGcj02(139.69, 35.68);
  return t[0] === 139.69 && t[1] === 35.68;
})());
ok('GCJ02->BD09->GCJ02 闭合', (() => {
  const bd = T.gcj02ToBd09(gcj[0], gcj[1]);
  const g = T.bd09ToGcj02(bd[0], bd[1]);
  return T.distanceMeters(gcj[0], gcj[1], g[0], g[1]) < 1;
})());

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
