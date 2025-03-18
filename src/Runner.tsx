import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera, SoftShadows, useAnimations, useFBX } from '@react-three/drei'
import idleUrl from './assets/idle.fbx?url'
import walkUrl from './assets/walk.fbx?url'
import runUrl from './assets/run.fbx?url'
import sprintUrl from './assets/sprint.fbx?url'
import { AnimationClip, CatmullRomCurve3, Group, Quaternion, Vector3 } from 'three'

interface RunnerProps {
  curve: CatmullRomCurve3;
  speed: number; // speed in km/h
}

export const Runner = ({ curve, speed }: RunnerProps) => {
  const runnerGroupRef = useRef<Group>(null)
  const progressRef = useRef(0)

  const idle = useFBX(idleUrl)
  const walk = useFBX(walkUrl)
  const run = useFBX(runUrl)
  const sprint = useFBX(sprintUrl)

  const model = idle
  const animations = useMemo(() => [
    { ...idle.animations[0], name: 'idle' },
    { ...walk.animations[0], name: 'walk' },
    { ...run.animations[0], name: 'run' },
    { ...sprint.animations[0], name: 'sprint' },
  ] as AnimationClip[], [idle, walk, run, sprint])

  const { actions, mixer, ref } = useAnimations(animations, runnerGroupRef)

  const [action, setAction] = useState('idle')

  useEffect(() => {
    if (speed <= 0) {
      setAction('idle')
    } else if (speed < 9) {
      mixer.timeScale = speed / 12
      setAction('walk')
    } else if (speed < 15) {
      mixer.timeScale = speed / 15
      setAction('run')
    } else {
      mixer.timeScale = speed / 20
      setAction('sprint')
    }
  }, [mixer, speed, actions])

  useEffect(() => {
    actions[action]?.fadeIn(0.5).play()
    return () => {
      actions[action]?.fadeOut(0.5).stop()
    }
  }, [actions, action])

  useFrame((_, delta) => {
    if (!runnerGroupRef.current) return
    // Convert speed from km/h to m/s
    const speedInMetersPerSecond = (speed * 1000) / 3600
    // Update progress based on the distance traveled along the curve
    progressRef.current = (progressRef.current + (speedInMetersPerSecond * delta) / curve.getLength()) % 1
    const pos = curve.getPointAt(progressRef.current)
    const runnerPos = pos.clone()
    runnerPos.y += 0
    runnerGroupRef.current.position.copy(runnerPos)

    // Compute horizontal tangent for orientation
    const tangent = curve.getTangentAt(progressRef.current).clone().setY(0).normalize()
    const targetAngle = Math.atan2(-tangent.x, -tangent.z)
    const targetQuat = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), targetAngle)
    // Smoothly interpolate runner's rotation
    runnerGroupRef.current.quaternion.slerp(targetQuat, 0.1)
  })

  const height = 1.73
  const cameraDistance = 2
  return (
    <group ref={runnerGroupRef}>
      <primitive ref={ref} object={model} scale={0.0055 * height} rotation={[0, Math.PI, 0]} position={[0, 0, 0]}/>
      <PerspectiveCamera
        makeDefault
        position={[0, cameraDistance, cameraDistance]}
        fov={65}
      />
      <SoftShadows/>
    </group>
  )
}
