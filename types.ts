
export interface Point {
  x: number;
  y: number;
}

export interface Params {
  lcdZ: number;      // LCD 厚度 (mm)
  systemZ: number;   // 系統底座厚度 (mm)
  axisY: number;     // 前端面到轉軸中心的距離 (mm)
  axisZ: number;     // 頂面到轉軸中心的距離 (mm)
  initialGap: number; // 0度時 LCD 與底座的初始間隙 (mm)
  lcdFillet: number;  // LCD 右下角圓角 (mm)
  systemTopFillet: number;    // System 右上角圓角 (mm)
  systemBottomFillet: number; // System 右下角圓角 (mm)
  angle: number;     // 開合角度 (degrees)
  showTrace: boolean;
}

export enum SafetyStatus {
  SAFE = 'SAFE',
  WARNING = 'WARNING',
  COLLISION = 'COLLISION'
}

export interface SimResult {
  minGap: number;
  status: SafetyStatus;
  lcdPolys: Point[];
  systemPolys: Point[];
  pivot: Point;
}
