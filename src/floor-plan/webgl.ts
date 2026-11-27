/**
 * Kan nettleseren tegne med WebGL? Spørres før 3D-visningen lastes
 * (SIGN-1981), så den som ikke kan vise den får beskjed uten å hente
 * tegnebiblioteket. Prøvekonteksten slippes med en gang: nettleseren har et
 * lite antall WebGL-kontekster per side.
 */
export const isWebGlAvailable = (): boolean => {
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')

    if (context === null) {
      return false
    }

    context.getExtension('WEBGL_lose_context')?.loseContext()

    return true
  } catch {
    return false
  }
}
