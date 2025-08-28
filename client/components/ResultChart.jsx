import React from "react";

export default function ResultChart() {
  const pointsV = [0, -0.5, 1.2, 1.0, 0.6, 0];
  const pointsH = [0, 6.0, 4.8, 3.0, 1.2, 0];
  const width = 700;
  const height = 320;
  const padding = 40;

  const xScale = (i) => padding + (i / (pointsV.length - 1)) * (width - padding * 2);
  const yScale = (v) => {
    const min = -15;
    const max = 15;
    return height - padding - ((v - min) / (max - min)) * (height - padding * 2);
  };

  const pathFrom = (arr) =>
    arr
      .map((v, i) => `${i === 0 ? "M" : "L"}${xScale(i)} ${yScale(v)}`)
      .join(" ");

  return (
    <div className="w-full h-full bg-gray-50 rounded-md p-4">
      <h2 className="text-lg font-bold mb-4">Result</h2>
      <div className="overflow-auto">
        <svg width={width} height={height} className="bg-white rounded">
          <rect x={padding} y={padding} width={width - padding * 2} height={height - padding * 2} fill="#111827" rx="6" />
          <g>
            <line x1={padding} x2={width - padding} y1={yScale(10)} y2={yScale(10)} stroke="#7f1d1d" strokeWidth="2" />
            <line x1={padding} x2={width - padding} y1={yScale(-10)} y2={yScale(-10)} stroke="#7f1d1d" strokeWidth="2" />
          </g>
          <path d={pathFrom(pointsH)} stroke="#60a5fa" fill="none" strokeWidth="3" />
          <path d={pathFrom(pointsV)} stroke="#f59e0b" fill="none" strokeWidth="3" />
        </svg>
      </div>
    </div>
  );
}


