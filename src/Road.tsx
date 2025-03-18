import { useMemo } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Float32BufferAttribute,
  FrontSide,
  RepeatWrapping,
  TextureLoader,
  Vector3
} from 'three'
import { useLoader } from '@react-three/fiber'
import textureUrl from './assets/roadTexture.png'

interface RoadProps {
  curve: CatmullRomCurve3;
  roadWidth?: number;
  segments?: number;
}

export const Road = ({ curve, roadWidth = 6, segments = 1 }: RoadProps) => {
  const texture = useLoader(TextureLoader, textureUrl)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping

  const geometry = useMemo<BufferGeometry>(() => {
    const points = curve.getPoints(curve.points.length * segments)
    const n = points.length
    const halfWidth = roadWidth / 2

    const vertices: number[] = []
    const uvs: number[] = []
    const indices: number[] = []
    let totalLength = 0
    const segmentLengths: number[] = [0]

    // Helper: get horizontal tangent (ignoring y)
    const getHorizontalTangent = (i: number): Vector3 => {
      const pPrev = points[Math.max(i - 1, 0)]
      const pNext = points[Math.min(i + 1, n - 1)]
      const diff = new Vector3(pNext.x - pPrev.x, 0, pNext.z - pPrev.z)
      return diff.normalize()
    }

    // Build vertices and compute cumulative horizontal distance for UVs
    for (let i = 0; i < n; i++) {
      const p = points[i]
      const tangent = getHorizontalTangent(i)
      // Perpendicular in horizontal plane
      const leftDir = new Vector3(-tangent.z, 0, tangent.x).normalize()
      const leftPt = new Vector3().copy(p).addScaledVector(leftDir, halfWidth)
      const rightPt = new Vector3().copy(p).addScaledVector(leftDir, -halfWidth)

      vertices.push(leftPt.x, leftPt.y, leftPt.z)
      vertices.push(rightPt.x, rightPt.y, rightPt.z)

      if (i > 0) {
        const prevCenter = points[i - 1].clone().setY(0)
        const currCenter = p.clone().setY(0)
        totalLength += currCenter.distanceTo(prevCenter)
      }
      segmentLengths.push(totalLength)
    }

    // Set UVs so that texture repeats along the road.
    // Repeat every 10 meters.
    const repeatFactor = 1 / 10
    for (let i = 0; i < n; i++) {
      const u = segmentLengths[i] * repeatFactor
      uvs.push(u, 0, u, 1)
    }

    // Create indices for the road mesh
    for (let i = 0; i < n - 1; i++) {
      const a = 2 * i
      const b = 2 * i + 1
      const c = 2 * (i + 1)
      const d = 2 * (i + 1) + 1
      indices.push(a, c, b)
      indices.push(b, c, d)
    }

    const bufferGeometry = new BufferGeometry()
    bufferGeometry.setAttribute(
      'position',
      new Float32BufferAttribute(vertices, 3)
    )
    bufferGeometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
    bufferGeometry.setIndex(indices)

    // Compute flat normals (upwards)
    const normals = new Float32Array(vertices.length)
    for (let i = 0; i < vertices.length / 3; i++) {
      normals[3 * i + 0] = 0
      normals[3 * i + 1] = 1
      normals[3 * i + 2] = 0
    }
    bufferGeometry.setAttribute('normal', new BufferAttribute(normals, 3))
    bufferGeometry.computeBoundingSphere()
    return bufferGeometry
  }, [curve, roadWidth, segments])

  return (
    <mesh geometry={geometry} castShadow={true} receiveShadow={true}>
      <meshPhongMaterial
        map={texture}
        side={FrontSide}
        flatShading={true}
        shadowSide={FrontSide}
      />
    </mesh>
  )
}
