import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { GameProvider } from './GameContext'
import { BLEControls } from './BLEControls.tsx'
import { ElevationChart } from './ElevationChart.tsx'
import { Game } from './Game.tsx'
import { Environment, Stats } from '@react-three/drei'

export const App = () => {
  return (
    <GameProvider>
      <div className="w-screen h-screen relative">
        <BLEControls/>
        <ElevationChart/>
        <Stats/>
        <Canvas shadows className="w-full h-full">
          <Suspense fallback={null}>
            <Environment background={true} preset="dawn"/>
            <ambientLight intensity={0.3}/>
            <directionalLight intensity={1} position={[0, 10, 5]}/>
            <Game/>
          </Suspense>
        </Canvas>
      </div>
    </GameProvider>
  )
}
