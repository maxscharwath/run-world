export const Sun = () => {
  return (
    <>
      <ambientLight intensity={0.2}/>
      <directionalLight
        intensity={2}
        castShadow={true}
      />
    </>
  )
}
