// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FloorPlanDrawing from '../../src/floor-plan/FloorPlanDrawing.vue'
import type { FloorPlanDocument } from '../../src/floor-plan/model'
import { bathroom, floorPlan, hall, kitchen } from './support/floorPlanFixture'
import { flush, mountWithApp } from './support/mount'

// Plantegningen som SVG (SIGN-794): gulv, vegger og åpninger tegnet av
// planens egne tall, med mål langs ytterveggene og navn i rommene. Hva noe
// er, leses fra typefeltet — en ukjent type tegnes nøytralt. Fiksturen er
// bad og kjøkken side om side med gangen under; de deler vegger.

/** The user's UI locale the drawing is mounted with. */
let locale = 'no'

const mount = async (plan: FloorPlanDocument = floorPlan(), props: Record<string, unknown> = {}) => {
  const mounted = mountWithApp(FloorPlanDrawing, { plan, label: 'Plantegning: 1. etasje', locale, ...props })
  await flush()

  return { ...mounted, svg: mounted.el.querySelector<SVGSVGElement>('svg') }
}

/** Intl bruker hardt mellomrom mellom tall og enhet. */
const plain = (text: string | null | undefined): string => (text ?? '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim()

const numbers = (text: string | null | undefined): number[] => (text ?? '').match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []

/** Hvor planen står i bildet: forskyvningen og hvor mange piksler en meter er. */
const placement = (svg: SVGSVGElement | null): { x: number; y: number; scale: number } => {
  const [x, y, scale] = numbers(svg?.querySelector('.fp-plan')?.getAttribute('transform'))

  return { x, y, scale }
}

/** Veggmålene: tekst, plass og vinkel, i rekkefølgen de er tegnet. */
const wallLabels = (svg: SVGSVGElement | null): { text: string; x: number; y: number; angle: number }[] =>
  [...(svg?.querySelectorAll('text.fp-wall-label') ?? [])].map((label) => ({
    text: plain(label.textContent),
    x: Number(label.getAttribute('x')),
    y: Number(label.getAttribute('y')),
    angle: numbers(label.getAttribute('transform'))[0],
  }))

describe('FloorPlanDrawing (SIGN-794)', () => {
  beforeEach(() => {
    locale = 'no'
  })

  it('er ett bilde med navn for skjermlesere', async () => {
    const { svg, unmount } = await mount()

    expect(svg?.getAttribute('role')).toBe('img')
    expect(svg?.getAttribute('aria-label')).toBe('Plantegning: 1. etasje')
    unmount()
  })

  it('rammen følger planens ytterkant med lik luft rundt', async () => {
    const { svg, unmount } = await mount()
    const [left, top, width, height] = numbers(svg?.getAttribute('viewBox'))
    const { x: padding, y, scale } = placement(svg)

    expect([left, top]).toEqual([0, 0])
    // Planen er 6,0 × 4,2 m: hjørnene står like langt fra kanten på alle sider.
    expect(y).toBeCloseTo(padding, 1)
    expect(6 * scale + padding * 2).toBeCloseTo(width, 0)
    expect(4.2 * scale + padding * 2).toBeCloseTo(height, 0)
    expect(padding).toBeGreaterThan(0)
    expect(Number(svg?.getAttribute('width'))).toBeCloseTo(width, 0)
    unmount()
  })

  it('en plan som ikke starter i origo flyttes inn i rammen', async () => {
    const { svg, unmount } = await mount({ rooms: [kitchen()] })
    const { x, y, scale } = placement(svg)
    const [, , width] = numbers(svg?.getAttribute('viewBox'))

    // Kjøkkenet går fra x = 2,4 til 6,0: venstre kant havner i lufta, høyre kant like langt fra høyre side.
    const leftEdge = 2.4 * scale + x
    const rightEdge = 6 * scale + x
    expect(leftEdge).toBeGreaterThan(0)
    expect(width - rightEdge).toBeCloseTo(leftEdge, 0)
    expect(y).toBeGreaterThan(0)
    unmount()
  })

  it('tegner ett fylt gulv per rom og ett veggelement per vegg', async () => {
    const { svg, unmount } = await mount()

    expect(svg?.querySelectorAll('polygon.fp-floor')).toHaveLength(3)
    expect(svg?.querySelector('[data-room-id="room-kjokken"]')?.getAttribute('points')).toBe('2.4,0 6,0 6,2.6 2.4,2.6')

    const walls = [...(svg?.querySelectorAll('line.fp-wall') ?? [])]
    expect(walls).toHaveLength(12)
    expect(walls.map((wall) => wall.getAttribute('data-wall-id'))).toEqual([
      'bad-n', 'bad-e', 'bad-s', 'bad-w',
      'kjokken-n', 'kjokken-e', 'kjokken-s', 'kjokken-w',
      'gang-n', 'gang-e', 'gang-s', 'gang-w',
    ])
    unmount()
  })

  it('skjærer hver åpning ut av veggene', async () => {
    const { svg, unmount } = await mount()
    const mask = svg?.querySelector('mask')

    expect(mask?.querySelectorAll('line.fp-mask-cut')).toHaveLength(6)
    expect(svg?.querySelector('.fp-walls')?.getAttribute('mask')).toBe(`url(#${mask?.getAttribute('id')})`)
    unmount()
  })

  it('en dør har blad og slagbue, et vindu en farget strek, en passasje en stiplet', async () => {
    const { svg, unmount } = await mount()

    const doors = [...(svg?.querySelectorAll('[data-kind="door"]') ?? [])]
    expect(doors).toHaveLength(3)
    expect(doors.every((door) => door.classList.contains('fp-opening--door') && door.querySelector('line.fp-door-leaf') !== null)).toBe(true)
    expect(doors[0].querySelector('path.fp-door-swing')?.getAttribute('d')).toBe('M 0.8 1.8 A 0.8 0.8 0 0 1 1.6 2.6')

    const windows = [...(svg?.querySelectorAll('[data-kind="window"]') ?? [])]
    expect(windows).toHaveLength(2)
    expect(windows.every((element) => element.tagName === 'line' && element.classList.contains('fp-opening--window'))).toBe(true)
    expect(windows.every((element) => element.getAttribute('stroke-dasharray') === null)).toBe(true)

    const passage = svg?.querySelector('[data-kind="opening"]')
    expect(passage?.classList.contains('fp-opening--opening')).toBe(true)
    expect(passage?.getAttribute('stroke-dasharray')).not.toBeNull()
    unmount()
  })

  it('dørene slår inn i rommet de hører til — aldri ut over målene på utsiden', async () => {
    const { svg, unmount } = await mount()
    const leafEnd = (index: number): { x: number; y: number } => {
      const leaf = svg?.querySelectorAll('[data-kind="door"] line.fp-door-leaf')[index]

      return { x: Number(leaf?.getAttribute('x2')), y: Number(leaf?.getAttribute('y2')) }
    }

    // Baddøra står i veggen mot gangen (y = 2,6) og hører til badet: bladet går opp i badet.
    expect(leafEnd(0)).toEqual({ x: 0.8, y: 1.8 })
    // Kjøkkendøra står i samme vegg og hører til kjøkkenet.
    expect(leafEnd(1).y).toBeLessThan(2.6)
    // Inngangsdøra står i ytterveggen (y = 4,2) og hører til gangen: bladet går inn, ikke ut.
    expect(leafEnd(2)).toEqual({ x: 2.6, y: 3.3 })

    // Samme dør i tegningen av gangen alene slår fortsatt inn.
    const alone = await mount({ rooms: [hall()] })
    expect(Number(alone.svg?.querySelector('line.fp-door-leaf')?.getAttribute('y2'))).toBeLessThan(4.2)
    alone.unmount()
    unmount()
  })

  it('en åpningstype tegneren ikke kjenner får et nøytralt merke — ikke dør, vindu eller passasje', async () => {
    const room = bathroom({
      openings: [{ id: 'x', kind: 'skylight', start: { x: 0.8, y: 0 }, end: { x: 1.6, y: 0 }, height: null, sill: null }],
    })
    const { svg, unmount } = await mount({ rooms: [room] })

    const unknown = svg?.querySelector('[data-kind="unknown"]')
    expect(unknown?.tagName).toBe('line')
    expect(unknown?.classList.contains('fp-opening--unknown')).toBe(true)
    expect(unknown?.getAttribute('stroke-dasharray')).toBeNull()
    expect(svg?.querySelector('.fp-door-leaf')).toBeNull()
    expect(svg?.querySelector('.fp-opening--window')).toBeNull()
    expect(svg?.querySelector('.fp-opening--door')).toBeNull()
    unmount()
  })

  it('inventar tegnes som typens symbol i sin egen ramme, og en ukjent type som et avrundet rektangel (SIGN-1987)', async () => {
    const room = bathroom({
      objects: [
        { id: 'wc', category: 'toilet', center: { x: 2, y: 0.5 }, width: 0.4, depth: 0.6, rotation: Math.PI / 2 },
        { id: 'jacuzzi', category: 'jacuzzi', center: { x: 1, y: 1.5 }, width: 1, depth: 1, rotation: 0 },
      ],
    })
    const { svg, unmount } = await mount({ rooms: [room] })
    const objects = [...(svg?.querySelectorAll('g.fp-object') ?? [])]

    expect(objects).toHaveLength(2)
    // Symbolet er regnet rundt inventarets midte: flyttet dit og dreid som inventaret står.
    expect(objects[0].getAttribute('transform')).toBe('translate(2 0.5) rotate(90)')
    expect(objects[0].getAttribute('data-category')).toBe('toilet')
    expect(objects[0].getAttribute('data-object-id')).toBe('wc')
    // Toalettet: skåla (med setet) og sisternen bak — sisternen mot baksiden (−y), i toalettets fulle bredde.
    expect(objects[0].querySelectorAll('ellipse')).toHaveLength(2)
    const cistern = objects[0].querySelector('rect')
    expect(Number(cistern?.getAttribute('y'))).toBeCloseTo(-0.3, 5)
    expect(Number(cistern?.getAttribute('height'))).toBeCloseTo(0.19, 5)
    expect(Number(cistern?.getAttribute('width'))).toBeCloseTo(0.4, 5)
    // Tekstalternativet er typens navn.
    expect(objects[0].querySelector('title')?.textContent).toBe('Toalett')

    // En kategori appen ikke kjenner gjettes ikke: ett avrundet rektangel over hele flaten, med det nøytrale navnet.
    expect(objects[1].getAttribute('data-category')).toBe('jacuzzi')
    const shapes = [...objects[1].querySelectorAll('.fp-object__shape')]
    expect(shapes).toHaveLength(1)
    expect(shapes[0].tagName).toBe('rect')
    expect([shapes[0].getAttribute('x'), shapes[0].getAttribute('y'), shapes[0].getAttribute('width'), shapes[0].getAttribute('height')]).toEqual(['-0.5', '-0.5', '1', '1'])
    expect(Number(shapes[0].getAttribute('rx'))).toBeCloseTo(0.18, 5)
    expect(objects[1].querySelector('title')?.textContent).toBe('Inventar')
    unmount()
  })

  it('et rundt bord og et firkantet bord er to symboler: utformingen er et felt, ikke målene (SIGN-1987)', async () => {
    const table = { category: 'table', center: { x: 1, y: 1 }, width: 0.9, depth: 0.9, rotation: 0 }
    const { svg, unmount } = await mount({
      rooms: [bathroom({ objects: [{ ...table, id: 'firkantet' }, { ...table, id: 'rundt', variant: 'round' }, { ...table, id: 'ukjent', variant: 'trekantet' }] })],
    })
    const outline = (id: string) => svg?.querySelector(`g.fp-object[data-object-id="${id}"] .fp-object__shape--outline`)?.tagName

    expect(outline('firkantet')).toBe('rect')
    expect(outline('rundt')).toBe('ellipse')
    // En utforming typen ikke har, er ikke oppgitt: typens eget symbol.
    expect(outline('ukjent')).toBe('rect')
    unmount()
  })

  it('et inventar som er tegnet lite, får bare omrisset av symbolet — og i miniatyren ikke noe navn (SIGN-1987)', async () => {
    const shapesIn = (svg: SVGSVGElement | null | undefined) => [...(svg?.querySelectorAll('g.fp-object .fp-object__shape') ?? [])]
    const isOutline = (shape: Element): boolean => (shape.getAttribute('class') ?? '').includes('fp-object__shape--outline')

    // I full størrelse er en meter rundt 100 px: symbolene har detaljer (setet i toalettet, skåla i servanten).
    const full = await mount()
    expect(shapesIn(full.svg).some((shape) => !isOutline(shape))).toBe(true)
    expect(full.svg?.querySelector('g.fp-object title')).not.toBeNull()
    full.unmount()

    // I miniatyren er en meter 15 px, og toalettet 6 px bredt: bare omrissene tegnes, men alle inventar er med.
    const small = await mount(floorPlan(), { compact: true })
    expect(small.svg?.querySelectorAll('g.fp-object')).toHaveLength(5)
    expect(shapesIn(small.svg).length).toBeGreaterThanOrEqual(5)
    expect(shapesIn(small.svg).every(isOutline)).toBe(true)
    // Toalettet er fortsatt et toalett: skåla og sisternen.
    expect(small.svg?.querySelectorAll('g.fp-object[data-category="toilet"] .fp-object__shape')).toHaveLength(2)
    expect(small.svg?.querySelector('g.fp-object title')).toBeNull()
    small.unmount()
  })

  it('i tegningen av hele planen får bare ytterveggene mål — en vegg som deles med et annet rom står uten', async () => {
    const { svg, unmount } = await mount()

    // Tolv vegger, fem av dem delt: badets øst- og sørvegg, kjøkkenets sør- og vestvegg, gangens nordvegg.
    expect(wallLabels(svg).map((label) => label.text)).toEqual([
      '2,40 m', // bad nord
      '2,60 m', // bad vest
      '3,60 m', // kjøkken nord
      '2,60 m', // kjøkken øst
      '1,60 m', // gang øst
      '6,00 m', // gang sør
      '1,60 m', // gang vest
    ])
    unmount()
  })

  it('ingen mål står inne i et rom', async () => {
    const { svg, unmount } = await mount()
    const { x, y, scale } = placement(svg)

    // Planen dekker hele rektangelet 6,0 × 4,2 m: alle mål står utenfor det.
    for (const label of wallLabels(svg)) {
      const inside = label.x > x && label.x < 6 * scale + x && label.y > y && label.y < 4.2 * scale + y

      expect(inside, label.text).toBe(false)
    }
    unmount()
  })

  it('rommet tegnet alene har mål på alle veggene — også dem som er delt i planen', async () => {
    const { svg, unmount } = await mount({ rooms: [bathroom()] })

    expect(svg?.querySelectorAll('line.fp-wall')).toHaveLength(4)
    expect(wallLabels(svg).map((label) => label.text)).toEqual(['2,40 m', '2,60 m', '2,40 m', '2,60 m'])
    unmount()
  })

  it('målene står på utsiden av rommet', async () => {
    const { svg, unmount } = await mount({ rooms: [bathroom()] })
    const [, , width, height] = numbers(svg?.getAttribute('viewBox'))
    const { x, y, scale } = placement(svg)
    const [north, east, south, west] = wallLabels(svg)

    expect(north.y).toBeLessThan(y)
    expect(east.x).toBeGreaterThan(2.4 * scale + x)
    expect(east.x).toBeLessThan(width)
    expect(south.y).toBeGreaterThan(2.6 * scale + y)
    expect(south.y).toBeLessThan(height)
    expect(west.x).toBeLessThan(x)
    expect(west.x).toBeGreaterThan(0)
    unmount()
  })

  it('mål langs en loddrett vegg leses nedenfra og opp på begge sider, og vannrette mål står rett', async () => {
    const { svg, unmount } = await mount({ rooms: [bathroom()] })
    const [north, east, south, west] = wallLabels(svg)

    // Østveggen er tegnet ovenfra og ned, vestveggen nedenfra og opp: samme leseretning.
    expect(east.angle).toBe(-90)
    expect(west.angle).toBe(-90)
    expect(north.angle).toBe(0)
    expect(south.angle).toBe(0)
    unmount()
  })

  it('ingen mål står opp ned, uansett vinkel på veggen', async () => {
    // Et skjevt rom: en rombe med vegger i fire ulike vinkler.
    const room = bathroom({
      outline: [
        { x: 2, y: 0 },
        { x: 4, y: 1.5 },
        { x: 2, y: 3 },
        { x: 0, y: 1.5 },
      ],
      walls: [
        { id: 'a', start: { x: 2, y: 0 }, end: { x: 4, y: 1.5 }, height: null },
        { id: 'b', start: { x: 4, y: 1.5 }, end: { x: 2, y: 3 }, height: null },
        { id: 'c', start: { x: 2, y: 3 }, end: { x: 0, y: 1.5 }, height: null },
        { id: 'd', start: { x: 0, y: 1.5 }, end: { x: 2, y: 0 }, height: null },
      ],
      openings: [],
      objects: [],
    })
    const { svg, unmount } = await mount({ rooms: [room] })
    const labels = wallLabels(svg)

    expect(labels).toHaveLength(4)

    for (const label of labels) {
      expect(label.angle).toBeGreaterThanOrEqual(-90)
      expect(label.angle).toBeLessThan(90)
    }
    unmount()
  })

  it('en vegg som er tegnet kortere enn 46 px får ikke mål', async () => {
    const room = bathroom()
    const withStub = {
      ...room,
      walls: [...room.walls, { id: 'stub', start: { x: 1, y: 1 }, end: { x: 1.2, y: 1 }, height: null }],
    }
    const { svg, unmount } = await mount({ rooms: [withStub] })

    // Stubben er 0,2 m: tegnet i full størrelse er den godt under grensen.
    expect(placement(svg).scale * 0.2).toBeLessThan(46)
    expect(svg?.querySelectorAll('line.fp-wall')).toHaveLength(5)
    expect(wallLabels(svg)).toHaveLength(4)
    unmount()
  })

  it('hva som får mål følger størrelsen tegningen faktisk har', async () => {
    // Badet er 2,4 × 2,6 m. Høyden styrer målestokken: (høyde − luft) / 2,6.
    const large = await mount({ rooms: [bathroom()] }, { maxHeight: 190 })
    // 50 px per meter: veggene er 120 og 130 px, rommet 120 × 130 px.
    expect(large.svg?.querySelectorAll('text.fp-wall-label')).toHaveLength(4)
    expect(large.svg?.querySelectorAll('text.fp-room-label')).toHaveLength(1)
    large.unmount()

    const medium = await mount({ rooms: [bathroom()] }, { maxHeight: 112 })
    // 20 px per meter: veggene er 48 og 52 px (over 46), rommet 48 × 52 px (smalere enn 56).
    expect(medium.svg?.querySelectorAll('text.fp-wall-label')).toHaveLength(4)
    expect(medium.svg?.querySelectorAll('text.fp-room-label')).toHaveLength(0)
    medium.unmount()

    const narrow = await mount({ rooms: [bathroom()] }, { maxHeight: 109 })
    // 18,8 px per meter: nord- og sørveggen er 45 px (under 46), øst og vest 49 px.
    expect(wallLabels(narrow.svg).map((label) => label.text)).toEqual(['2,60 m', '2,60 m'])
    narrow.unmount()

    const small = await mount({ rooms: [bathroom()] }, { maxHeight: 100 })
    // 15,4 px per meter: ingen vegg når 46 px.
    expect(small.svg?.querySelectorAll('text')).toHaveLength(0)
    expect(small.svg?.querySelectorAll('line.fp-wall')).toHaveLength(4)
    small.unmount()
  })

  it('et lavt rom får ikke navn og areal selv om det er bredt nok', async () => {
    // Gangen er 6,0 × 1,6 m. Ved 20 px per meter er den 120 × 32 px: under 34 px høy.
    const low = await mount({ rooms: [hall()] }, { maxHeight: 92 })
    expect(placement(low.svg).scale).toBeCloseTo(20, 1)
    expect(low.svg?.querySelectorAll('text.fp-room-label')).toHaveLength(0)
    low.unmount()

    // Ved 22,5 px per meter er den 135 × 36 px: navnet og arealet får plass.
    const enough = await mount({ rooms: [hall()] }, { maxHeight: 96 })
    expect(enough.svg?.querySelectorAll('text.fp-room-label')).toHaveLength(1)
    enough.unmount()
  })

  it('skriften er fast i piksler: teksten står utenfor den skalerte gruppa', async () => {
    const { svg, unmount } = await mount()

    expect(svg?.querySelector('.fp-plan text')).toBeNull()
    expect(svg?.querySelectorAll(':scope > text').length).toBeGreaterThan(0)
    unmount()
  })

  it('skriver navn og gulvareal i hvert rom', async () => {
    const { svg, unmount } = await mount()
    const roomLabels = [...(svg?.querySelectorAll('text.fp-room-label') ?? [])]

    expect(roomLabels).toHaveLength(3)
    expect(roomLabels.map((label) => plain(label.querySelector('.fp-room-name')?.textContent))).toEqual(['Bad', 'Kjøkken', 'Gang'])
    expect(roomLabels.map((label) => plain(label.querySelector('.fp-room-area')?.textContent))).toEqual(['6,2 m²', '9,4 m²', '9,6 m²'])
    unmount()
  })

  it('et rom uten gulvareal får navnet, men ikke et tall', async () => {
    const room = bathroom({ measurements: { ...bathroom().measurements, floorArea: null } })
    const { svg, unmount } = await mount({ rooms: [room] })
    const label = svg?.querySelector('text.fp-room-label')

    expect(plain(label?.querySelector('.fp-room-name')?.textContent)).toBe('Bad')
    expect(label?.querySelector('.fp-room-area')).toBeNull()
    expect(plain(label?.textContent)).not.toContain('0')
    unmount()
  })

  it('compact tegner planen uten mål og navn, i miniatyrstørrelse', async () => {
    const { svg, unmount } = await mount(floorPlan(), { compact: true })

    expect(svg?.querySelectorAll('text')).toHaveLength(0)
    expect(svg?.querySelectorAll('polygon.fp-floor')).toHaveLength(3)
    expect(svg?.querySelectorAll('line.fp-wall')).toHaveLength(12)
    expect(svg?.querySelector('[data-kind="door"] .fp-door-swing')).not.toBeNull()
    expect(Number(svg?.getAttribute('height'))).toBeLessThanOrEqual(72)
    unmount()
  })

  it('følger brukerens språk i målene', async () => {
    locale = 'en'
    const { svg, unmount } = await mount({ rooms: [bathroom()] })

    expect(plain(svg?.querySelector('text.fp-wall-label')?.textContent)).toBe('2.40 m')
    expect(plain(svg?.querySelector('.fp-room-area')?.textContent)).toBe('6.2 m²')
    unmount()
  })

  it('en plan uten et eneste punkt tegner ingenting', async () => {
    const { svg, unmount } = await mount({ rooms: [] })

    expect(svg).toBeNull()
    unmount()
  })
})

// Farger (SIGN-1980): gulv- og veggfarge er data personen har valgt, og kan
// være hva som helst. Uten dem tegnes planen i temaets toner, som før.
describe('FloorPlanDrawing: farger (SIGN-1980)', () => {
  beforeEach(() => {
    locale = 'no'
  })

  it('uten valgte farger har gulv og vegger ingen egen farge', async () => {
    const { svg, unmount } = await mount()

    expect([...(svg?.querySelectorAll('polygon.fp-floor') ?? [])].every((floor) => floor.getAttribute('style') === null)).toBe(true)
    expect([...(svg?.querySelectorAll('line.fp-wall') ?? [])].every((wall) => wall.getAttribute('style') === null)).toBe(true)
    expect(svg?.querySelectorAll('line.fp-wall-casing')).toHaveLength(0)
    unmount()
  })

  it('fyller gulvet med rommets gulvfarge', async () => {
    const { svg, unmount } = await mount({ rooms: [bathroom({ floorColor: '#d8b98a' }), kitchen()] })
    const [bad, kjokken] = [...(svg?.querySelectorAll<SVGElement>('polygon.fp-floor') ?? [])]

    expect(bad.style.fill).toBe('#d8b98a')
    expect(kjokken.getAttribute('style')).toBeNull()
    unmount()
  })

  it('en vegg tegnes i sin egen farge, ellers i rommets veggfarge, ellers i temaets', async () => {
    const room = bathroom({ wallColor: '#f4f1ea' })
    room.walls[0] = { ...room.walls[0], color: '#9fb1c1' }
    const { svg, unmount } = await mount({ rooms: [room, kitchen()] })
    const walls = [...(svg?.querySelectorAll<SVGElement>('line.fp-wall') ?? [])]

    expect(walls[0].style.stroke).toBe('#9fb1c1')
    expect(walls[1].style.stroke).toBe('#f4f1ea')
    // Kjøkkenet har ingen veggfarge.
    expect(walls[4].getAttribute('style')).toBeNull()
    // Hver farget vegg har en kant i blekk under seg, så en hvit vegg synes på et hvitt kort.
    expect(svg?.querySelectorAll('line.fp-wall-casing')).toHaveLength(4)
    // Fortsatt ett veggelement per vegg.
    expect(walls).toHaveLength(8)
    unmount()
  })

  it('navnet i rommet får blekket som leses på gulvfargen, med kant i gulvets farge', async () => {
    const light = await mount({ rooms: [bathroom({ floorColor: '#f4f1ea' })] })
    const onLight = light.svg?.querySelector<SVGElement>('text.fp-room-label')
    expect(onLight?.style.fill).toBe('rgb(13 28 38)')
    expect(onLight?.style.stroke).toBe('#f4f1ea')
    light.unmount()

    const dark = await mount({ rooms: [bathroom({ floorColor: '#4a4f54' })] })
    const onDark = dark.svg?.querySelector<SVGElement>('text.fp-room-label')
    expect(onDark?.style.fill).toBe('rgb(255 255 255)')
    expect(onDark?.style.stroke).toBe('#4a4f54')
    // Dørslaget og inventaret på gulvet følger samme blekk.
    expect(dark.svg?.querySelector<SVGElement>('[data-kind="door"]')?.style.stroke).toBe('rgb(255 255 255)')
    const furniture = dark.svg?.querySelector<SVGElement>('g.fp-object')
    expect(furniture?.style.color).toBe('rgb(255 255 255)')
    expect(furniture?.getAttribute('class')).toContain('fp-object--painted')
    dark.unmount()

    const plain_ = await mount({ rooms: [bathroom()] })
    expect(plain_.svg?.querySelector('text.fp-room-label')?.getAttribute('style')).toBeNull()
    plain_.unmount()
  })
})

// Redigeringen (SIGN-1980): tegningen er arbeidsflaten. Den endrer ingenting
// selv — den sier hva personen gjorde, og eieren bruker redigeringsreglene.
describe('FloorPlanDrawing: redigering (SIGN-1980)', () => {
  beforeEach(() => {
    locale = 'no'
  })

  type Handlers = Record<string, ReturnType<typeof vi.fn>>

  const mountEditor = async (props: Record<string, unknown> = {}) => {
    const handlers: Handlers = {
      onSelect: vi.fn(),
      onDrag: vi.fn(),
      onDragEnd: vi.fn(),
      onNudge: vi.fn(),
      onRemove: vi.fn(),
      onUndo: vi.fn(),
      onRedo: vi.fn(),
    }
    const mounted = await mount(floorPlan(), { interactive: true, selection: null, ...handlers, ...props })

    return { ...mounted, handlers }
  }

  /** En pekerhendelse på punktet (meter) i planen. happy-dom har ingen layout, så skjermens piksler er tegningens. */
  const pointer = (svg: SVGSVGElement | null, type: string, at: { x: number; y: number }, init: PointerEventInit = {}): void => {
    const { x, y, scale } = placement(svg)

    svg?.dispatchEvent(
      new PointerEvent(type, { bubbles: true, button: 0, pointerId: 1, pointerType: 'mouse', clientX: at.x * scale + x, clientY: at.y * scale + y, ...init }),
    )
  }

  const key = (svg: SVGSVGElement | null, init: KeyboardEventInit): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
    svg?.dispatchEvent(event)

    return event
  }

  it('uten redigering er tegningen et bilde uten håndtak, og et trykk velger ingenting', async () => {
    const handlers = { onSelect: vi.fn() }
    const { svg, unmount } = await mount(floorPlan(), handlers)

    expect(svg?.getAttribute('role')).toBe('img')
    expect(svg?.getAttribute('tabindex')).toBeNull()
    expect(svg?.querySelectorAll('circle.fp-corner')).toHaveLength(0)

    pointer(svg, 'pointerdown', { x: 1.2, y: 1.3 })
    expect(handlers.onSelect).not.toHaveBeenCalled()
    unmount()
  })

  it('i redigering er tegningen en arbeidsflate med navn, fokus og et håndtak i hvert hjørne', async () => {
    const { svg, unmount } = await mountEditor()

    expect(svg?.getAttribute('role')).toBe('application')
    expect(svg?.getAttribute('aria-label')).toBe('Plantegning: 1. etasje')
    expect(svg?.getAttribute('tabindex')).toBe('0')
    // Tre rom med fire hjørner hver.
    expect(svg?.querySelectorAll('circle.fp-corner')).toHaveLength(12)
    unmount()
  })

  it('et trykk velger det som ligger under: hjørne, åpning, inventar, vegg, rom — eller ingenting', async () => {
    const { svg, handlers, unmount } = await mountEditor()
    const selected = (at: { x: number; y: number }) => {
      handlers.onSelect.mockClear()
      pointer(svg, 'pointerdown', at)
      pointer(svg, 'pointerup', at)

      return handlers.onSelect.mock.calls[0]?.[0]
    }

    expect(selected({ x: 0, y: 0 })).toEqual({ kind: 'corner', roomId: 'room-bad', index: 0 })
    expect(selected({ x: 1.2, y: 2.6 })).toEqual({ kind: 'opening', roomId: 'room-bad', openingId: 'bad-door' })
    expect(selected({ x: 0.9, y: 0.3 })).toEqual({ kind: 'object', roomId: 'room-bad', objectId: 'object-sink' })
    expect(selected({ x: 1.2, y: 0 })).toEqual({ kind: 'wall', roomId: 'room-bad', wallId: 'bad-n' })
    expect(selected({ x: 4, y: 1.6 })).toEqual({ kind: 'room', roomId: 'room-kjokken' })
    expect(selected({ x: 6.2, y: 4.4 })).toBeNull()
    unmount()
  })

  it('en vegg to rom deler velges i rommet som alt er valgt', async () => {
    const { svg, handlers, unmount } = await mountEditor({ selection: { kind: 'room', roomId: 'room-kjokken' } })

    pointer(svg, 'pointerdown', { x: 2.4, y: 1.3 })

    expect(handlers.onSelect).toHaveBeenCalledWith({ kind: 'wall', roomId: 'room-kjokken', wallId: 'kjokken-w' })
    unmount()
  })

  it('markerer det valgte: rom, vegg, åpning, inventar og hjørne', async () => {
    const room = await mountEditor({ selection: { kind: 'room', roomId: 'room-bad' } })
    expect(room.svg?.querySelector('polygon.fp-selected--room')?.getAttribute('points')).toBe('0,0 2.4,0 2.4,2.6 0,2.6')
    room.unmount()

    const wall = await mountEditor({ selection: { kind: 'wall', roomId: 'room-bad', wallId: 'bad-n' } })
    const wallMark = wall.svg?.querySelector('line.fp-selected--wall')
    expect([wallMark?.getAttribute('x1'), wallMark?.getAttribute('y1'), wallMark?.getAttribute('x2'), wallMark?.getAttribute('y2')]).toEqual(['0', '0', '2.4', '0'])
    wall.unmount()

    const opening = await mountEditor({ selection: { kind: 'opening', roomId: 'room-bad', openingId: 'bad-door' } })
    expect(opening.svg?.querySelector('line.fp-selected--opening')?.getAttribute('x1')).toBe('0.8')
    opening.unmount()

    const object = await mountEditor({ selection: { kind: 'object', roomId: 'room-bad', objectId: 'object-toilet' } })
    expect(object.svg?.querySelector('rect.fp-selected--object')?.getAttribute('transform')).toBe('rotate(90 2 0.5)')
    object.unmount()

    const corner = await mountEditor({ selection: { kind: 'corner', roomId: 'room-bad', index: 2 } })
    const selectedCorners = [...(corner.svg?.querySelectorAll('circle.fp-corner--selected') ?? [])]
    expect(selectedCorners.map((handle) => handle.getAttribute('data-corner'))).toEqual(['room-bad:2'])
    expect(corner.svg?.querySelector('.fp-selected')).toBeNull()
    corner.unmount()

    const none = await mountEditor()
    expect(none.svg?.querySelector('.fp-selected')).toBeNull()
    expect(none.svg?.querySelector('.fp-corner--selected')).toBeNull()
    none.unmount()
  })

  it('et hjørne dras: tegningen melder hvor hjørnet er dratt, i planens tall, og når det slippes', async () => {
    const { svg, handlers, unmount } = await mountEditor()
    const corner = { kind: 'corner', roomId: 'room-gang', index: 2 }

    // Hjørnet nede til høyre (6,0, 4,2) dras 0,5 m til venstre og 0,3 m opp.
    pointer(svg, 'pointerdown', { x: 6, y: 4.2 })
    expect(handlers.onSelect).toHaveBeenCalledWith(corner)

    pointer(svg, 'pointermove', { x: 5.8, y: 4.1 })
    pointer(svg, 'pointermove', { x: 5.5, y: 3.9 })

    expect(handlers.onDrag).toHaveBeenCalledTimes(2)
    const last = handlers.onDrag.mock.calls[1][0]
    expect(last.selection).toEqual(corner)
    expect(last.to.x).toBeCloseTo(5.5, 2)
    expect(last.to.y).toBeCloseTo(3.9, 2)
    expect(handlers.onDragEnd).not.toHaveBeenCalled()

    pointer(svg, 'pointerup', { x: 5.5, y: 3.9 })
    expect(handlers.onDragEnd).toHaveBeenCalledWith(corner)

    // Etter slippet flytter pekeren ingenting.
    pointer(svg, 'pointermove', { x: 5, y: 3 })
    expect(handlers.onDrag).toHaveBeenCalledTimes(2)
    unmount()
  })

  it('inventar og åpninger dras fra ankerpunktet sitt, uansett hvor på dem de ble grepet', async () => {
    const { svg, handlers, unmount } = await mountEditor()

    // Vasken (midt i 0,9, 0,3) gripes 0,2 m til høyre for midten og dras 1 m ned.
    pointer(svg, 'pointerdown', { x: 1.1, y: 0.3 })
    pointer(svg, 'pointermove', { x: 1.1, y: 1.3 })
    pointer(svg, 'pointerup', { x: 1.1, y: 1.3 })

    const object = handlers.onDrag.mock.calls[0][0]
    expect(object.selection).toEqual({ kind: 'object', roomId: 'room-bad', objectId: 'object-sink' })
    expect(object.to.x).toBeCloseTo(0.9, 2)
    expect(object.to.y).toBeCloseTo(1.3, 2)

    // Baddøra (0,8–1,6 i sørveggen) dras 0,4 m mot høyre: midtpunktet går fra 1,2 til 1,6.
    handlers.onDrag.mockClear()
    pointer(svg, 'pointerdown', { x: 1, y: 2.6 })
    pointer(svg, 'pointermove', { x: 1.4, y: 2.6 })
    pointer(svg, 'pointerup', { x: 1.4, y: 2.6 })

    const opening = handlers.onDrag.mock.calls[0][0]
    expect(opening.selection).toEqual({ kind: 'opening', roomId: 'room-bad', openingId: 'bad-door' })
    expect(opening.to.x).toBeCloseTo(1.6, 2)
    expect(opening.to.y).toBeCloseTo(2.6, 2)
    unmount()
  })

  it('et trykk uten bevegelse er ikke et drag, og vegger og rom kan ikke dras', async () => {
    const { svg, handlers, unmount } = await mountEditor()

    pointer(svg, 'pointerdown', { x: 6, y: 4.2 })
    pointer(svg, 'pointermove', { x: 6.01, y: 4.2 })
    pointer(svg, 'pointerup', { x: 6.01, y: 4.2 })

    pointer(svg, 'pointerdown', { x: 4, y: 1.6 })
    pointer(svg, 'pointermove', { x: 5, y: 2 })
    pointer(svg, 'pointerup', { x: 5, y: 2 })

    expect(handlers.onDrag).not.toHaveBeenCalled()
    expect(handlers.onDragEnd).not.toHaveBeenCalled()
    unmount()
  })

  it('rammen står stille mens noe dras, så tegningen ikke skalerer seg om under pekeren', async () => {
    const { defineComponent, h, ref } = await import('vue')
    const plan = ref(floorPlan())
    const Host = defineComponent({
      setup: () => () => h(FloorPlanDrawing, { plan: plan.value, label: 'Plan', interactive: true, selection: null }),
    })
    const mounted = mountWithApp(Host, {})
    await flush()
    const svg = mounted.el.querySelector<SVGSVGElement>('svg')
    const before = svg?.getAttribute('viewBox')

    pointer(svg, 'pointerdown', { x: 6, y: 4.2 })
    pointer(svg, 'pointermove', { x: 7, y: 5 })
    // Eieren flytter hjørnet langt ut mens draget pågår: planen blir større.
    plan.value = floorPlan({ rooms: [bathroom(), kitchen(), { ...hall(), outline: [{ x: 0, y: 2.6 }, { x: 6, y: 2.6 }, { x: 9, y: 7 }, { x: 0, y: 4.2 }] }] })
    await flush()
    expect(svg?.getAttribute('viewBox')).toBe(before)

    pointer(svg, 'pointerup', { x: 7, y: 5 })
    await flush()
    // Sluppet: tegningen tilpasser seg planen igjen.
    expect(svg?.getAttribute('viewBox')).not.toBe(before)
    mounted.unmount()
  })

  it('piltastene flytter det valgte hjørnet eller inventaret én centimeter', async () => {
    const corner = { kind: 'corner', roomId: 'room-bad', index: 2 }
    const { svg, handlers, unmount } = await mountEditor({ selection: corner })

    const event = key(svg, { key: 'ArrowRight' })
    key(svg, { key: 'ArrowUp' })
    key(svg, { key: 'ArrowLeft' })
    key(svg, { key: 'ArrowDown' })

    expect(handlers.onNudge.mock.calls.map(([payload]) => [payload.dx, payload.dy])).toEqual([
      [0.01, 0],
      [0, -0.01],
      [-0.01, 0],
      [0, 0.01],
    ])
    expect(handlers.onNudge.mock.calls[0][0].selection).toEqual(corner)
    // Tasten er brukt: siden ruller ikke.
    expect(event.defaultPrevented).toBe(true)
    unmount()

    const object = await mountEditor({ selection: { kind: 'object', roomId: 'room-bad', objectId: 'object-sink' } })
    key(object.svg, { key: 'ArrowDown' })
    expect(object.handlers.onNudge).toHaveBeenCalledTimes(1)
    object.unmount()

    // En vegg, en åpning og et rom flyttes ikke med piltastene.
    const wall = await mountEditor({ selection: { kind: 'wall', roomId: 'room-bad', wallId: 'bad-n' } })
    expect(key(wall.svg, { key: 'ArrowDown' }).defaultPrevented).toBe(false)
    expect(wall.handlers.onNudge).not.toHaveBeenCalled()
    wall.unmount()
  })

  it('Delete fjerner den valgte åpningen eller det valgte inventaret — aldri en vegg eller et rom', async () => {
    const opening = { kind: 'opening', roomId: 'room-bad', openingId: 'bad-door' }
    const first = await mountEditor({ selection: opening })
    key(first.svg, { key: 'Delete' })
    expect(first.handlers.onRemove).toHaveBeenCalledWith(opening)
    first.unmount()

    const object = { kind: 'object', roomId: 'room-bad', objectId: 'object-sink' }
    const second = await mountEditor({ selection: object })
    key(second.svg, { key: 'Backspace' })
    expect(second.handlers.onRemove).toHaveBeenCalledWith(object)
    second.unmount()

    for (const selection of [{ kind: 'wall', roomId: 'room-bad', wallId: 'bad-n' }, { kind: 'room', roomId: 'room-bad' }, null]) {
      const mounted = await mountEditor({ selection })
      key(mounted.svg, { key: 'Delete' })
      expect(mounted.handlers.onRemove).not.toHaveBeenCalled()
      mounted.unmount()
    }
  })

  it('Cmd/Ctrl+Z angrer, med Shift eller Cmd/Ctrl+Y gjøres det om, og Esc slipper valget', async () => {
    const { svg, handlers, unmount } = await mountEditor({ selection: { kind: 'room', roomId: 'room-bad' } })

    const undo = key(svg, { key: 'z', metaKey: true })
    expect(handlers.onUndo).toHaveBeenCalledTimes(1)
    expect(undo.defaultPrevented).toBe(true)

    key(svg, { key: 'z', ctrlKey: true })
    expect(handlers.onUndo).toHaveBeenCalledTimes(2)

    key(svg, { key: 'Z', metaKey: true, shiftKey: true })
    key(svg, { key: 'y', ctrlKey: true })
    expect(handlers.onRedo).toHaveBeenCalledTimes(2)
    expect(handlers.onUndo).toHaveBeenCalledTimes(2)

    key(svg, { key: 'Escape' })
    expect(handlers.onSelect).toHaveBeenCalledWith(null)

    // En vanlig z er ikke en snarvei.
    key(svg, { key: 'z' })
    expect(handlers.onUndo).toHaveBeenCalledTimes(2)
    unmount()
  })

  it('tastene tegningen bruker stopper der, så siden ikke angrer én gang til', async () => {
    const { svg, unmount } = await mountEditor({ selection: { kind: 'room', roomId: 'room-bad' } })
    const seen = vi.fn()
    window.addEventListener('keydown', seen)

    key(svg, { key: 'z', metaKey: true })
    expect(seen).not.toHaveBeenCalled()

    // En tast tegningen ikke bruker går videre.
    key(svg, { key: 's', metaKey: true })
    expect(seen).toHaveBeenCalledTimes(1)

    window.removeEventListener('keydown', seen)
    unmount()
  })
})

