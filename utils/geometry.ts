
import { Point } from '../types';

/**
 * 旋转点 Q 绕 P 点旋转 alpha 度
 */
export const rotatePoint = (p: Point, q: Point, angleDeg: number): Point => {
  const angleRad = (angleDeg * Math.PI) / 180;
  const s = Math.sin(angleRad);
  const c = Math.cos(angleRad);

  // 平移到原点
  const qx = q.x - p.x;
  const qy = q.y - p.y;

  // 旋转
  const xnew = qx * c - qy * s;
  const ynew = qx * s + qy * c;

  // 移回
  return {
    x: xnew + p.x,
    y: ynew + p.y
  };
};

/**
 * 点到线段的距离
 */
export const distToSegment = (p: Point, v: Point, w: Point): number => {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const proj = {
    x: v.x + t * (w.x - v.x),
    y: v.y + t * (w.y - v.y)
  };
  return Math.sqrt((p.x - proj.x) ** 2 + (p.y - proj.y) ** 2);
};

/**
 * 判断点是否在凸多边形内部 (Ray casting / Winding number)
 */
export const isPointInPolygon = (p: Point, poly: Point[]): boolean => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > p.y) !== (yj > p.y)) &&
        (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

/**
 * 两个凸多边形之间的最小距离
 */
export const getMinDistance = (polyA: Point[], polyB: Point[]): number => {
  // 1. 检查是否有碰撞 (点在多边形内)
  for (const p of polyA) if (isPointInPolygon(p, polyB)) return -1;
  for (const p of polyB) if (isPointInPolygon(p, polyA)) return -1;

  // 2. 检查线段相交
  // (简化处理：如果所有点都不在内部且没有碰撞，计算点到边的最小距离)
  let minD = Infinity;

  // PolyA 的点到 PolyB 的边
  for (const p of polyA) {
    for (let i = 0; i < polyB.length; i++) {
      const v = polyB[i];
      const w = polyB[(i + 1) % polyB.length];
      minD = Math.min(minD, distToSegment(p, v, w));
    }
  }

  // PolyB 的点到 PolyA 的边
  for (const p of polyB) {
    for (let i = 0; i < polyA.length; i++) {
      const v = polyA[i];
      const w = polyA[(i + 1) % polyA.length];
      minD = Math.min(minD, distToSegment(p, v, w));
    }
  }

  return minD;
};
