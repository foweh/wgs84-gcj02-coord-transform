/**
 * 中国地图坐标系转换：WGS84 <-> GCJ02 <-> BD09（纯 JS，零依赖）
 *
 *   WGS84  GPS / 卫星影像 / OpenStreetMap 用的国际坐标系
 *   GCJ02  高德 / 腾讯地图用的「火星坐标系」("国测局坐标")
 *   BD09   百度地图坐标系（在 GCJ02 上再加一层偏移）
 *
 * 浏览器：<script src="coord-transform.js"></script> 后直接用 window.CoordTransform
 * Node  ：const CoordTransform = require('./coord-transform.js')
 *
 * ⚠️ 该偏移算法是社区逆向后公开通行的版本，非官方公布；境外(lng/lat 超出中国范围)不偏移，原样返回。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CoordTransform = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const PI = 3.1415926535897932384626;
  const A = 6378245.0;            // 克拉索夫斯基椭球长半轴
  const EE = 0.00669342162296594323; // 偏心率平方

  function tLat(x, y) {
    let r = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    r += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3;
    r += (20 * Math.sin(y * PI) + 40 * Math.sin(y / 3 * PI)) * 2 / 3;
    r += (160 * Math.sin(y / 12 * PI) + 320 * Math.sin(y * PI / 30)) * 2 / 3;
    return r;
  }
  function tLng(x, y) {
    let r = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    r += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3;
    r += (20 * Math.sin(x * PI) + 40 * Math.sin(x / 3 * PI)) * 2 / 3;
    r += (150 * Math.sin(x / 12 * PI) + 300 * Math.sin(x / 30 * PI)) * 2 / 3;
    return r;
  }

  /** 是否在中国境外（境外不做偏移） */
  function outOfChina(lng, lat) {
    return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
  }

  /** WGS84 -> GCJ02 */
  function wgs84ToGcj02(lng, lat) {
    if (outOfChina(lng, lat)) return [lng, lat];
    let dLat = tLat(lng - 105, lat - 35);
    let dLng = tLng(lng - 105, lat - 35);
    const radLat = lat / 180 * PI;
    let magic = Math.sin(radLat);
    magic = 1 - EE * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI);
    dLng = (dLng * 180) / (A / sqrtMagic * Math.cos(radLat) * PI);
    return [lng + dLng, lat + dLat];
  }

  /** GCJ02 -> WGS84（迭代逼近，米级精度） */
  function gcj02ToWgs84(lng, lat) {
    if (outOfChina(lng, lat)) return [lng, lat];
    let wlng = lng, wlat = lat;
    for (let i = 0; i < 3; i++) {
      const g = wgs84ToGcj02(wlng, wlat);
      wlng += lng - g[0];
      wlat += lat - g[1];
    }
    return [wlng, wlat];
  }

  /** GCJ02 -> BD09 */
  function gcj02ToBd09(lng, lat) {
    const z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * PI * 3000 / 180);
    const theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * PI * 3000 / 180);
    return [z * Math.cos(theta) + 0.0065, z * Math.sin(theta) + 0.006];
  }

  /** BD09 -> GCJ02 */
  function bd09ToGcj02(lng, lat) {
    const x = lng - 0.0065, y = lat - 0.006;
    const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * PI * 3000 / 180);
    const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * PI * 3000 / 180);
    return [z * Math.cos(theta), z * Math.sin(theta)];
  }

  /** 两个经纬度之间的地面距离（米），用于看偏移量 */
  function distanceMeters(lng1, lat1, lng2, lat2) {
    const R = 6371008.8;
    const dLat = (lat2 - lat1) * PI / 180;
    const dLng = (lng2 - lng1) * PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * PI / 180) * Math.cos(lat2 * PI / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  return { wgs84ToGcj02, gcj02ToWgs84, gcj02ToBd09, bd09ToGcj02, outOfChina, distanceMeters };
});
