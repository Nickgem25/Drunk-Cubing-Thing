import React from 'react';
import 'cubing/twisty';

// Grey everything except the yellow stickers (last layer orientation only)
const OLL_MASK = 'EDGES:IIIIOOOOIIII,CORNERS:IIIIOOOO,CENTERS:IIIII-';

// Shows the case that `alg` solves, yellow on top.
export default function CubeView({ alg, category, mode, size = 150 }) {
  return (
    <twisty-player
      alg={alg}
      puzzle="3x3x3"
      background="none"
      control-panel="none"
      visualization={mode === '2D' ? 'experimental-2D-LL' : '3D'}
      experimental-setup-alg="z2"
      experimental-setup-anchor="end"
      experimental-stickering-mask-orbits={category === 'OLL' ? OLL_MASK : undefined}
      style={{ width: size, height: size }}
    ></twisty-player>
  );
}
