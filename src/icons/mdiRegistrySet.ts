import { h, type FunctionalComponent } from 'vue'
import type { IconProps, IconSet } from 'vuetify'
import { VSvgIcon } from 'vuetify/components'

/**
 * Vuetify-ikonsett som slår opp `mdi-*`-navn i et generert register av
 * @mdi/js-stier (SIGN-521). Appene beholder strengnavnene (`icon="mdi-
 * briefcase-outline"`), men bare ikonene som faktisk brukes havner i
 * bundelen — ingen 3,2 MB ikonfont. Registeret genereres av
 * `nk-mdi-registry` (bin i denne pakka) fra kildekoden.
 *
 * Verdier som ikke er navn (Vuetifys egne `$`-aliaser fra
 * `vuetify/iconsets/mdi-svg` er ferdige SVG-stier) sendes rett videre til
 * VSvgIcon, så settet er en drop-in-erstatning for `mdi` fra mdi-svg.
 */
export type MdiRegistry = Readonly<Record<string, string>>

export function mdiRegistryIconSet(registry: MdiRegistry): IconSet {
  const component: FunctionalComponent<IconProps> = (props) => {
    const icon = props.icon
    if (typeof icon === 'string' && icon.startsWith('mdi-')) {
      const path = registry[icon]
      if (!path) {
        // Ukjent navn = registeret er utdatert (eller skrivefeil). Bygget
        // regenererer det; i dev-serveren må `npm run icons:generate` kjøres.
        console.warn(`[nordikode] Ikonet «${icon}» finnes ikke i registeret — kjør npm run icons:generate.`)
        return h(VSvgIcon, { icon: '', tag: props.tag })
      }
      return h(VSvgIcon, { icon: path, tag: props.tag })
    }
    return h(VSvgIcon, { icon, tag: props.tag })
  }

  return { component }
}
