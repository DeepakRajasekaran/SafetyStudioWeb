import React, { useState, useEffect } from 'react';
import { Image, Group, Circle, Line, Text, Shape } from 'react-konva';

let LIDAR_THEME = null;
const getLidarTheme = () => {
  if (!LIDAR_THEME && typeof document !== 'undefined') {
    const style = getComputedStyle(document.documentElement);
    LIDAR_THEME = {
      fill: style.getPropertyValue('--lidar-fill-color').trim() || '#F7374F',
      stroke: style.getPropertyValue('--lidar-stroke-color').trim() || 'white',
      text: style.getPropertyValue('--lidar-text-color').trim() || '#ccc',
      fontSize: parseFloat(style.getPropertyValue('--lidar-font-size')) || 15,
      fontFamily: style.getPropertyValue('--lidar-font-family').trim() || 'monospace',
      spacing: parseFloat(style.getPropertyValue('--lidar-text-spacing')) || 20,
      circleColor: style.getPropertyValue('--lidar-circle-color').trim() || 'rgba(255,255,255,0.4)',
      circleStroke: parseFloat(style.getPropertyValue('--lidar-circle-stroke')) || 1.0,
      innerColor: style.getPropertyValue('--lidar-inner-color').trim() || '#ffffff',
      visualScale: parseFloat(style.getPropertyValue('--lidar-visual-scale')) || 1.0,
      baseSize: parseFloat(style.getPropertyValue('--lidar-base-size')) || 20
    };
  }
  return LIDAR_THEME || { fill: '#F7374F', stroke: 'white', text: '#ccc', fontSize: 15, fontFamily: 'monospace', spacing: 20, circleColor: 'white', circleStroke: 1, innerColor: 'white', visualScale: 1, baseSize: 20 };
};

const LidarMarker = ({ x, y, rotation, scale, name, dia, SCALE_M = 100, draggable, selected, onDragEnd, onDragMove, onDragStart, onSelect }) => {
  const theme = getLidarTheme();
  // Visual radius is now decoupled from physical 'dia'
  const radius = (theme.baseSize * theme.visualScale) / scale;
  
  return (
    <Group 
      x={x} y={y} rotation={rotation} 
      draggable={draggable} 
      onDragEnd={onDragEnd}
      onDragMove={onDragMove}
      onDblClick={onSelect}
      onClick={onSelect}
    >
      {/* Selection Highlight Ring */}
      {selected && (
        <Circle 
          radius={radius * 1.5} 
          stroke="#00e5ff" 
          strokeWidth={2 / scale} 
          dash={[5 / scale, 5 / scale]}
          opacity={0.8}
        />
      )}
      {/* Unified Lidar Teardrop Shape */}
      <Shape
        fill={theme.fill}
        // User requested no stroke on the main shape
        strokeWidth={0}
        sceneFunc={(ctx, shape) => {
          const H = radius * 1.8; 
          const tangentAngle = Math.acos(radius / H); 
          ctx.beginPath();
          ctx.moveTo(0, -H); // Pointing Up (-Y)
          const startAngle = -Math.PI / 2 + tangentAngle;
          const endAngle = -Math.PI / 2 - tangentAngle + Math.PI * 2; 
          ctx.arc(0, 0, radius, startAngle, endAngle, false);
          ctx.closePath();
          ctx.fillStrokeShape(shape);
        }}
      />

      {/* Primary Decorative Circle (Outline style) */}
      <Circle 
        radius={radius} 
        stroke={theme.circleColor} 
        strokeWidth={theme.circleStroke / scale} 
      />

      {/* Interior Secondary Circle (Solid style, no outline) */}
      <Circle 
        radius={radius * 0.5} 
        fill={theme.innerColor} 
        strokeWidth={0}
      />
      

      {/* Label (Upright Nametag, positioned relative to Lidar's back) */}
      {name && (
        <Group x={0} y={radius + theme.spacing / scale + 5 / scale} rotation={-rotation} scaleX={1 / scale} scaleY={1 / scale}>
           <Text 
             text={name} 
             fill={theme.text} 
             fontSize={theme.fontSize} 
             fontFamily={theme.fontFamily}
             align="center" 
             width={160} 
             offsetX={80} 
             offsetY={theme.fontSize / 2}
             shadowColor="black" 
             shadowBlur={2}
           />
        </Group>
      )}
    </Group>
  );
};

export default LidarMarker;
