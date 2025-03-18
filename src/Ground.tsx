// src/Ground.tsx
import React, { useMemo } from 'react'
import { CatmullRomCurve3, FrontSide, PlaneGeometry, RepeatWrapping, TextureLoader, Vector3 } from 'three'
import textureUrl from './assets/grassTexture.png'
import { useLoader } from '@react-three/fiber'

interface GroundProps {
  curve: CatmullRomCurve3  // Road curve defining the baseline elevation
  size?: number           // Padding base for terrain size (default: 500 units)
  segments?: number       // Terrain grid resolution (default: 150 segments per side)
}

// A smoothstep function for gradual blending.
const smoothStep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

// Linear interpolation helper.
const lerp = (a: number, b: number, t: number): number => a + t * (b - a)

export const Ground: React.FC<GroundProps> = ({ curve, size = 100, segments = 120 }) => {
  const texture = useLoader(TextureLoader, textureUrl)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(segments * 1.5, segments * 1.5)
  texture.rotation = Math.PI / 2

  // Pre-sample points along the road curve for efficiency.
  const roadSamples = useMemo(() => {
    const sampleCount = Math.max(curve.getLength() * 0.5, 100)
    const samples: Vector3[] = []
    for (let i = 0; i <= sampleCount; i++) {
      const t = i / sampleCount
      const p = curve.getPointAt(t)
      samples.push(new Vector3(p.x, p.y, p.z))
    }
    return samples
  }, [curve])

  // Define thresholds (in world units) for blending:
  // - Within innerThreshold: terrain fully follows the road height.
  // - Beyond outerThreshold: terrain is flat (baseline height).
  const innerThreshold = 5
  const outerThreshold = 200

  // Create terrain geometry using a PlaneGeometry whose size is determined by the bounding box of the curve plus padding.
  const terrainGeometry = useMemo(() => {
    // Compute bounding box of the curve in the XZ-plane.
    const points = curve.getPoints(100)
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    for (const p of points) {
      minX = Math.min(minX, p.x)
      maxX = Math.max(maxX, p.x)
      minZ = Math.min(minZ, p.z)
      maxZ = Math.max(maxZ, p.z)
    }
    const padding = size
    const width = (maxX - minX) + padding
    const height = (maxZ - minZ) + padding
    const centerX = (minX + maxX) / 2
    const centerZ = (minZ + maxZ) / 2

    const geom = new PlaneGeometry(width, height, segments, segments)
    // Rotate the plane so that it lies horizontally (XZ-plane).
    geom.rotateX(-Math.PI / 2)
    // Translate geometry so that it's centered on the curve's bounding box.
    geom.translate(centerX, 0, centerZ)
    const positions = geom.attributes.position

    // Baseline height (flat ground far from the road).
    const baseline = 0

    for (let i = 0; i < positions.count; i++) {
      const worldX = positions.getX(i)
      const worldZ = positions.getZ(i)

      // For each vertex, find the closest point on the road curve (projected in XZ).
      let minDist = Infinity
      let roadHeight = baseline
      for (const sample of roadSamples) {
        const dx = worldX - sample.x
        const dz = worldZ - sample.z
        const d = Math.sqrt(dx * dx + dz * dz)
        if (d < minDist) {
          minDist = d
          roadHeight = sample.y
        }
      }

      // Compute influence: 1 when vertex is within innerThreshold,
      // and 0 when beyond outerThreshold.
      const influence = 1 - smoothStep(innerThreshold, outerThreshold, minDist)
      // Final height: blend between baseline and the road's height.
      const finalHeight = lerp(baseline, roadHeight, influence)
      positions.setY(i, finalHeight)
    }

    geom.computeVertexNormals()
    return geom
  }, [curve, segments, roadSamples, innerThreshold, outerThreshold, size])

  return (
    <mesh geometry={terrainGeometry} castShadow={true} receiveShadow={true} position={[0, -0.2, 0]}>
      <meshPhongMaterial
        map={texture}
        side={FrontSide}
        shadowSide={FrontSide}
      />
    </mesh>
  )
}
