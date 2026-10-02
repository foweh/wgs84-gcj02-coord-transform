# WGS84 与 GCJ02 / BD09 坐标转换工具

## 解决什么问题
- GPS设备、卫星影像、开源地图都是WGS84坐标系
- 高德、腾讯地图国内是GCJ02火星坐标系
- 百度地图是BD09坐标系
- 三个坐标系之间差几百米，直接叠上去错位

## 完整JS代码
```javascript
const CoordTransform = (() => {
  const PI = 3.1415926535897932384626;
  const A = 6378245.0;
  const EE = 0.00669342162296594323;

  function tLat(x, y) {
    let r = -100 + 2*x + 3*y + 0.2*y*y + 0.1*x*y + 0.2*Math.sqrt(Math.abs(x));
    r += (20*Math.sin(6*x*PI) + 20*Math.sin(2*x*PI)) * 2/3;
    r += (20*Math.sin(y*PI) + 40*Math.sin(y/3*PI)) * 2/3;
    r += (160*Math.sin(y/12*PI) + 320*Math.sin(y*PI/30)) * 2/3;
    return r;
  }
  function tLng(x, y) {
    let r = 300 + x + 2*y + 0.1*x*x + 0.1*x*y + 0.1*Math.sqrt(Math.abs(x));
    r += (20*Math.sin(6*x*PI) + 20*Math.sin(2*x*PI)) * 2/3;
    r += (20*Math.sin(x*PI) + 40*Math.sin(x/3*PI)) * 2/3;
    r += (150*Math.sin(x/12*PI) + 300*Math.sin(x/30*PI)) * 2/3;
    return r;
  }

  function outOfChina(lng, lat) {
    return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
  }

  return {
    // WGS84 -> GCJ02
    wgs84ToGcj02(lng, lat) {
      if (outOfChina(lng, lat)) return [lng, lat];
      let dLat = tLat(lng-105, lat-35);
      let dLng = tLng(lng-105, lat-35);
      const radLat = lat/180*PI;
      let magic = Math.sin(radLat);
      magic = 1 - EE*magic*magic;
      const sqrtMagic = Math.sqrt(magic);
      dLat = (dLat*180) / ((A*(1-ee))/(magic*sqrtMagic)*PI);
      dLng = (dLng*180) / (A/sqrtMagic*Math.cos(radLat)*PI);
      return [lng+dLng, lat+dLat];
    },

    // GCJ02 -> WGS84（反向近似）
    gcj02ToWgs84(lng, lat) {
      const gcj = this.wgs84ToGcj02(lng, lat);
      return [lng*2 - gcj[0], lat*2 - gcj[1]];
    },

    // GCJ02 -> BD09
    gcj02ToBd09(lng, lat) {
      const z = Math.sqrt(lng*lng + lat*lat) + 0.00002*Math.sin(lat*PI*3000/180);
      const theta = Math.atan2(lat, lng) + 0.000003*Math.cos(lng*PI*3000/180);
      return [z*Math.cos(theta) + 0.0065, z*Math.sin(theta) + 0.006];
    },

    // BD09 -> GCJ02
    bd09ToGcj02(lng, lat) {
      const x = lng - 0.0065, y = lat - 0.006;
      const z = Math.sqrt(x*x + y*y) - 0.00002*Math.sin(y*PI*3000/180);
      const theta = Math.atan2(y, x) - 0.000003*Math.cos(x*PI*3000/180);
      return [z*Math.cos(theta), z*Math.sin(theta)];
    }
  };
})();

// 使用示例
console.log(CoordTransform.wgs84ToGcj02(126.48, 43.95));
// [126.484xxx, 43.952xxx] 偏移几百米
```

## 什么场景要用
- 你从GPS设备拿到的坐标要在高德/腾讯上显示
- 你从OpenStreetMap下的数据要叠在高德上
- 你爬百度地图POI要放到其他地图上
- Sentinel/Landsat卫星影像叠国内地图

## 注意
- 这个算法是公开的，不是官方公布的，是大家逆向后通用的版本
- 中国境外不用转，直接返回原坐标
- 反向转换是近似的，精度米级足够用

## 许可证
MIT
