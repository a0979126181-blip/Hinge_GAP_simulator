
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Params, SafetyStatus, SimResult, Point } from './types';
import { rotatePoint, getMinDistance } from './utils/geometry';

// 仿真常量
const SCALE = 10; // 1mm = 10px
const SYSTEM_WIDTH = 250; // mm
const LCD_LENGTH = 200; // mm

/**
 * 產生圓角點序列
 */
const getFilletPoints = (centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number, segments: number = 10): Point[] => {
  if (radius <= 0) return [{ x: centerX, y: centerY }];
  const points: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const theta = startAngle + (endAngle - startAngle) * (i / segments);
    points.push({
      x: centerX + radius * Math.cos(theta),
      y: centerY + radius * Math.sin(theta)
    });
  }
  return points;
};

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [params, setParams] = useState<Params>({
    lcdZ: 5.5,
    systemZ: 18.0,
    axisY: 10.0,
    axisZ: 8.0,
    initialGap: 0.5,
    lcdFillet: 2.0,
    systemTopFillet: 1.0,
    systemBottomFillet: 3.0,
    angle: 0,
    showTrace: true
  });

  const [tracePoints, setTracePoints] = useState<Point[]>([]);

  // 計算幾何結果
  const simResult = useMemo((): SimResult => {
    const { lcdZ, systemZ, axisY, axisZ, initialGap, lcdFillet, systemTopFillet, systemBottomFillet, angle } = params;

    // 1. 系統底座頂點 (包含圓角近似)
    const systemPolys: Point[] = [
      { x: -SYSTEM_WIDTH, y: 0 }, // Top-Back
      // 右上圓角 (Top-Front)
      ...getFilletPoints(-systemTopFillet, systemTopFillet, systemTopFillet, -Math.PI / 2, 0),
      // 右下圓角 (Bottom-Front)
      ...getFilletPoints(-systemBottomFillet, systemZ - systemBottomFillet, systemBottomFillet, 0, Math.PI / 2),
      { x: -SYSTEM_WIDTH, y: systemZ } // Bottom-Back
    ];

    // 2. 轉軸中心 (Pivot)
    const pivot: Point = { x: -axisY, y: axisZ };

    // 3. LCD 初始頂點 (0度時)
    // LCD 右下角對應的是 Front-Bottom
    const lcdInitial: Point[] = [
      // 右下圓角 (Front-Bottom)
      ...getFilletPoints(-lcdFillet, -initialGap - lcdFillet, lcdFillet, 0, Math.PI / 2),
      { x: -LCD_LENGTH, y: -initialGap }, // Back-Bottom
      { x: -LCD_LENGTH, y: -(initialGap + lcdZ) }, // Back-Top
      { x: 0, y: -(initialGap + lcdZ) } // Front-Top
    ];

    // 4. 旋轉後的 LCD 頂點
    const lcdPolys = lcdInitial.map(p => rotatePoint(pivot, p, angle));

    // 5. 間隙計算
    const minGap = getMinDistance(lcdPolys, systemPolys);

    let status = SafetyStatus.SAFE;
    if (minGap < 0) status = SafetyStatus.COLLISION;
    else if (minGap < 0.8) status = SafetyStatus.WARNING;

    return { minGap, status, lcdPolys, systemPolys, pivot };
  }, [params]);

  // 更新軌跡 (以 LCD 旋轉後的最前端點為準)
  useEffect(() => {
    if (params.showTrace) {
      const nose = simResult.lcdPolys[0];
      setTracePoints(prev => [...prev.slice(-300), nose]);
    } else {
      setTracePoints([]);
    }
  }, [simResult.lcdPolys, params.showTrace]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const offsetX = canvas.width * 0.7;
    const offsetY = canvas.height * 0.4;
    ctx.save();
    ctx.translate(offsetX, offsetY);

    // 繪製網格
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -50; x <= 10; x += 5) {
      ctx.moveTo(x * SCALE, -200 * SCALE);
      ctx.lineTo(x * SCALE, 200 * SCALE);
    }
    for (let y = -20; y <= 40; y += 5) {
      ctx.moveTo(-500 * SCALE, y * SCALE);
      ctx.lineTo(100 * SCALE, y * SCALE);
    }
    ctx.stroke();

    // 繪製基準線
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-400 * SCALE, 0); ctx.lineTo(100 * SCALE, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -100 * SCALE); ctx.lineTo(0, 300 * SCALE);
    ctx.stroke();

    // 繪製軌跡
    if (params.showTrace && tracePoints.length > 1) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(tracePoints[0].x * SCALE, tracePoints[0].y * SCALE);
      for (let i = 1; i < tracePoints.length; i++) ctx.lineTo(tracePoints[i].x * SCALE, tracePoints[i].y * SCALE);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 繪製 System (Black)
    ctx.fillStyle = 'rgba(31, 41, 55, 0.9)';
    ctx.strokeStyle = '#111827';
    ctx.beginPath();
    const s = simResult.systemPolys;
    ctx.moveTo(s[0].x * SCALE, s[0].y * SCALE);
    for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].x * SCALE, s[i].y * SCALE);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 繪製 LCD (Red)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
    ctx.strokeStyle = '#b91c1c';
    ctx.beginPath();
    const l = simResult.lcdPolys;
    ctx.moveTo(l[0].x * SCALE, l[0].y * SCALE);
    for (let i = 1; i < l.length; i++) ctx.lineTo(l[i].x * SCALE, l[i].y * SCALE);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 繪製轉軸
    const p = simResult.pivot;
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x * SCALE, p.y * SCALE, 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo((p.x - 5) * SCALE, p.y * SCALE); ctx.lineTo((p.x + 5) * SCALE, p.y * SCALE);
    ctx.moveTo(p.x * SCALE, (p.y - 5) * SCALE); ctx.lineTo(p.x * SCALE, (p.y + 5) * SCALE);
    ctx.stroke();

    ctx.restore();

    ctx.fillStyle = '#6b7280';
    ctx.font = '12px Inter';
    ctx.fillText('前端面 Front Plane (X=0)', offsetX + 5, offsetY - 50);
    ctx.fillText('頂面 Top Plane (Y=0)', offsetX - 150, offsetY - 10);
  }, [simResult, params.showTrace, tracePoints]);

  useEffect(() => { draw(); }, [draw]);

  const getBgColor = () => {
    if (simResult.status === SafetyStatus.COLLISION) return 'bg-red-50';
    if (simResult.status === SafetyStatus.WARNING) return 'bg-yellow-50';
    return 'bg-green-50';
  };

  return (
    <div className={`flex flex-col h-screen ${getBgColor()} transition-colors duration-300`}>
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-800">筆記型電腦轉軸仿真器 (側視圖)</h1>
          <p className="text-sm text-gray-500">Laptop Hinge Mechanism Interference Simulator</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">當前最小間隙 (Min Gap)</div>
            <div className={`text-2xl font-mono font-bold ${simResult.minGap < 0 ? 'text-red-600' : 'text-gray-700'}`}>
              {simResult.minGap < 0 ? 'COLLISION' : `${simResult.minGap.toFixed(3)} mm`}
            </div>
          </div>
          <div className={`px-4 py-2 rounded-full font-bold text-lg shadow-sm text-white ${
            simResult.status === SafetyStatus.COLLISION ? 'bg-red-500' : 
            simResult.status === SafetyStatus.WARNING ? 'bg-yellow-500' : 'bg-green-500'
          }`}>
            {simResult.status === SafetyStatus.COLLISION ? '偵測到干涉！' : 
             simResult.status === SafetyStatus.WARNING ? '警告：間隙 < 0.8' : '安全'}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 bg-white border-r p-6 overflow-y-auto shadow-inner">
          <section className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">開合角度: {params.angle}°</label>
              <input 
                type="range" min="0" max="180" step="1" 
                value={params.angle} 
                onChange={(e) => setParams(p => ({...p, angle: parseFloat(e.target.value)}))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
                核心結構參數 (mm)
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'LCD 厚度 (LCD Z)', key: 'lcdZ' },
                  { label: '底座厚度 (System Z)', key: 'systemZ' },
                  { label: '轉軸水平偏移 (Axis Y)', key: 'axisY' },
                  { label: '轉軸垂直偏移 (Axis Z)', key: 'axisZ' },
                  { label: '初始合蓋間隙 (Initial Gap)', key: 'initialGap' },
                ].map(item => (
                  <div key={item.key}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-mono text-blue-600 font-bold">{params[item.key as keyof Params]}</span>
                    </div>
                    <input 
                      type="number" step="0.1"
                      value={params[item.key as keyof Params] as number}
                      onChange={(e) => setParams(p => ({...p, [item.key]: parseFloat(e.target.value) || 0}))}
                      className="w-full border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 text-indigo-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                圓角參數 (Fillets)
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'LCD 右下圓角', key: 'lcdFillet' },
                  { label: 'System 右上圓角', key: 'systemTopFillet' },
                  { label: 'System 右下圓角', key: 'systemBottomFillet' },
                ].map(item => (
                  <div key={item.key}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-mono text-indigo-600 font-bold">{params[item.key as keyof Params]}</span>
                    </div>
                    <input 
                      type="number" min="0" step="0.1"
                      value={params[item.key as keyof Params] as number}
                      onChange={(e) => setParams(p => ({...p, [item.key]: parseFloat(e.target.value) || 0}))}
                      className="w-full border rounded px-2 py-1 text-sm border-indigo-100 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={params.showTrace} 
                  onChange={(e) => setParams(p => ({...p, showTrace: e.target.checked}))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">顯示 Nose 運動軌跡</span>
              </label>
            </div>
          </section>
        </aside>

        <main className="flex-1 relative bg-white overflow-hidden flex items-center justify-center p-8">
          <canvas 
            ref={canvasRef} 
            width={1000} 
            height={700}
            className="max-w-full max-h-full rounded shadow-xl border border-gray-100 bg-white"
          />
          <div className="absolute top-4 left-4 bg-white/90 p-3 rounded border shadow-sm text-[11px] text-gray-500 space-y-1 font-mono">
            <p className="font-bold text-gray-700">座標定義提示：</p>
            <p>• 原點 (0,0) = 系統前端頂角</p>
            <p>• 系統圓角半徑會增加避讓空間</p>
            <p>• LCD 圓角會減少干涉風險</p>
          </div>
          <div className="absolute bottom-4 left-4 flex gap-4 text-[10px] text-gray-400 uppercase font-mono bg-white/80 px-2 py-1 rounded">
             <span>比例: 1mm = 10px</span>
             <span>單位: 毫米 (mm)</span>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
